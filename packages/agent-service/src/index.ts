import { extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
import { AgentService } from './supervisor/service.ts';
import { HostApprovalPolicies } from './interaction/host-policy.ts';
import { HostWorkerAuthorization } from './supervisor/host-authorization.ts';
import { HostSkillSources } from './supervisor/host-skill-sources.ts';

function requestedPort(args: string[]): number {
  if (args.length === 0) return 0;
  if (args.length !== 2 || args[0] !== '--port') throw new Error('Invalid Agent Service arguments');
  const port = Number(args[1]);
  if (!Number.isInteger(port) || port < 0 || port > 65_535) throw new Error('Invalid Agent Service port');
  return port;
}

const SECRET_REQUEST_TYPE = 'agent-service.internal-secret.request';
const SECRET_MESSAGE_TYPE = 'agent-service.internal-secret';
const SECRET_TIMEOUT_MS = 10_000;

const SecretMessageSchema = z.object({ type: z.literal(SECRET_MESSAGE_TYPE), secret: z.string().regex(/^[a-f0-9]{64}$/i) });
type IpcMessage = Parameters<NonNullable<typeof process.send>>[0];

/**
 * Read the internal token from the Host over the private spawn IPC channel.
 * The environment is readable through `/proc/<service pid>/environ` by every
 * same-UID worker, so the token is never passed there.
 */
const receiveInternalSecret = (): Promise<string> => {
  if (!process.send) return Promise.reject(new Error('Agent Service requires an IPC channel for the internal secret'));
  const { promise, resolve, reject } = Promise.withResolvers<string>();
  let settled = false;
  const finish = (error: Error | null, secret?: string) => {
    if (settled) return;
    settled = true;
    clearTimeout(timer);
    clearInterval(requester);
    process.off('message', onMessage);
    process.off('disconnect', onDisconnect);
    if (error) reject(error); else resolve(secret ?? '');
  };
  const onMessage = (message: IpcMessage) => {
    const parsed = SecretMessageSchema.safeParse(message);
    if (parsed.success) finish(null, parsed.data.secret);
  };
  const onDisconnect = () => finish(new Error('Agent Service IPC channel disconnected before the secret arrived'));
  const request = () => { try { process.send?.({ type: SECRET_REQUEST_TYPE }); } catch { /* parent already gone */ } };
  const timer = setTimeout(() => finish(new Error('Agent Service secret handshake timed out')), SECRET_TIMEOUT_MS);
  // The Host may attach its handler just after this process starts; ask until it answers.
  const requester = setInterval(request, 250);
  process.on('message', onMessage);
  process.once('disconnect', onDisconnect);
  request();
  return promise;
};

async function main(): Promise<void> {
  let service: AgentService | undefined;
  const policies = new HostApprovalPolicies();
  const authorization = new HostWorkerAuthorization(rootSessionId => service?.authorizationScope(rootSessionId));
  const skillSources = new HostSkillSources();
  try {
    const internalSecret = await receiveInternalSecret();
    const current = fileURLToPath(import.meta.url);
    const workerFile = extname(current) === '.ts' ? './worker/index.ts' : './worker/index.js';
    service = new AgentService({
      workerEntrypoint: fileURLToPath(new URL(workerFile, import.meta.url)),
      workerRuntime: process.env.OHPICHAMBER_BUN ?? undefined,
      internalSecret,
      stateDirectory: join(process.cwd(), 'agent-state'),
      port: requestedPort(process.argv.slice(2)),
      approvalPolicyCommit: policies.commit,
      approvalPolicyLoad: policies.load,
      policyCheck: authorization.authorize,
      invokeHostAction: authorization.invoke,
      hostSkillSource: skillSources.execute,
    });
    const owned = service;
    const stop = () => {
      authorization.close();
      skillSources.close();
      void owned.stop().then(() => { policies.close(); process.exit(0); }, () => { policies.close(); process.exit(1); });
    };
    process.once('SIGTERM', stop);
    process.once('SIGINT', stop);
    await owned.start();
  } catch {
    process.stderr.write('Agent Service startup failed\n');
    authorization.close();
    skillSources.close();
    try { await service?.stop(); } finally { policies.close(); process.exitCode = 1; }
  }
}

if (import.meta.main) void main();
