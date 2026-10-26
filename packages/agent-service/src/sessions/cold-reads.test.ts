import { expect, test } from 'bun:test';
import { randomBytes, randomUUID } from 'node:crypto';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SessionManager } from '@oh-my-pi/pi-coding-agent/session/session-manager';
import { HistoryPageSchema, SessionSnapshotSchema } from '@openchamber/agent-contract';
import { AgentService } from '../supervisor/service.ts';

test('snapshot and history read a persisted session without starting a worker', async () => {
  const root = await mkdtemp(join(tmpdir(), 'cold-reads-'));
  const previousHome = process.env.HOME;
  process.env.HOME = root;
  const cwd = join(root, 'workspace');
  const agentDirectory = join(root, 'agent');
  await Promise.all([cwd, agentDirectory].map(directory => mkdir(directory, { recursive: true })));
  const sessionsDirectory = SessionManager.getDefaultSessionDir(cwd, agentDirectory);
  const manager = SessionManager.create(cwd, sessionsDirectory);
  manager.appendMessage({ role: 'user', content: 'Cold prompt', timestamp: Date.now() });
  manager.appendMessage({ role: 'assistant', content: [{ type: 'text', text: 'Cold answer' }], timestamp: Date.now() });
  await manager.ensureOnDisk();
  await manager.flush();
  const sessionFile = manager.getSessionFile();
  await manager.close();
  if (!sessionFile) throw new Error('Native session file is required');

  const stateDirectory = join(root, 'service-state');
  await mkdir(stateDirectory, { recursive: true });
  const rootSessionId = randomUUID();
  const now = Date.now();
  await writeFile(join(stateDirectory, 'session-references.json'), JSON.stringify({
    references: {
      [rootSessionId]: {
        rootSessionId, projectId: randomUUID(), workspaceId: randomUUID(), cwd, agentDirectory, displayPath: 'workspace',
        sessionFile, sessionsDirectory, createdAt: now, updatedAt: now,
      },
    },
    subagents: {},
    relocations: {},
  }), { mode: 0o600 });

  const secret = randomBytes(32).toString('hex');
  const port = await new Promise<number>((resolve, reject) => {
    const probe = Bun.serve({ hostname: '127.0.0.1', port: 0, fetch: () => new Response() });
    const bound = probe.port;
    probe.stop(true).then(() => resolve(bound), reject);
  });
  const service = new AgentService({
    workerEntrypoint: fileURLToPath(new URL('../worker/index.ts', import.meta.url)),
    internalSecret: secret, stateDirectory, port,
    policyCheck: async () => ({ allowed: true }),
    invokeHostAction: async () => { throw new Error('Unexpected Host action'); },
    hostSkillSource: async operation => operation.action === 'reconcile'
      ? { status: 'reconciled', sources: { workspace: '0', agent: '0' } }
      : { status: 'failed', code: 'SERVICE_UNAVAILABLE' },
  });
  const request = async (pathname: string) => {
    const response = await fetch(`http://127.0.0.1:${port}${pathname}`, { headers: { 'x-internal-secret': secret, accept: 'application/json' } });
    return { status: response.status, body: await response.json() };
  };
  try {
    await service.start();
    expect((await request('/internal/workers')).body.workers).toEqual([]);

    const snapshotResponse = await request(`/api/agent/v1/sessions/${rootSessionId}/snapshot`);
    expect(snapshotResponse.status).toBe(200);
    const snapshot = SessionSnapshotSchema.parse(snapshotResponse.body);
    expect(snapshot.session.runtimeStatus).toBe('unavailable');
    expect(snapshot.messages.map(message => message.role)).toEqual(['user', 'assistant']);

    const historyResponse = await request(`/api/agent/v1/sessions/${rootSessionId}/history?limit=10`);
    expect(historyResponse.status).toBe(200);
    const history = HistoryPageSchema.parse(historyResponse.body);
    expect(history.messages.map(message => message.role)).toEqual(['user', 'assistant']);
    expect((await request('/internal/workers')).body.workers).toEqual([]);
  } finally {
    await service.stop();
    if (previousHome === undefined) delete process.env.HOME; else process.env.HOME = previousHome;
    await rm(root, { recursive: true, force: true });
  }
}, 30_000);
