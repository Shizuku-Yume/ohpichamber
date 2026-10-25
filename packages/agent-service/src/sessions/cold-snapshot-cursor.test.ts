import { expect, test } from 'bun:test';
import { randomBytes, randomUUID } from 'node:crypto';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SessionManager } from '@oh-my-pi/pi-coding-agent/session/session-manager';
import { z } from 'zod';
import { RuntimeSessionSchema, SessionSnapshotSchema } from '@openchamber/agent-contract';
import { AgentService } from '../supervisor/service.ts';
const ListeningPortSchema = z.object({ port: z.number().int().positive() });

test('a cold deleted-space snapshot cursor is accepted by the session stream', async () => {
  const root = await mkdtemp(join(tmpdir(), 'cold-snapshot-cursor-'));
  const previousHome = process.env.HOME;
  process.env.HOME = root;
  const cwd = join(root, 'workspace');
  const agentDirectory = join(root, 'agent');
  const deletedSpaceDirectory = join(root, 'deleted-space');
  await Promise.all([cwd, agentDirectory, deletedSpaceDirectory].map(directory => mkdir(directory, { recursive: true })));
  const sessionsDirectory = SessionManager.getDefaultSessionDir(cwd, agentDirectory);
  const manager = SessionManager.create(cwd, sessionsDirectory);
  manager.appendMessage({ role: 'user', content: 'Archived prompt', timestamp: Date.now() });
  await manager.ensureOnDisk();
  await manager.flush();
  const sessionFile = manager.getSessionFile();
  await manager.close();
  if (!sessionFile) throw new Error('Native session file is required');

  const stateDirectory = join(root, 'service-state');
  await mkdir(stateDirectory, { recursive: true });
  const rootSessionId = randomUUID();
  const archivedAt = Date.now();
  await writeFile(join(stateDirectory, 'session-references.json'), JSON.stringify({
    references: {
      [rootSessionId]: {
        rootSessionId, projectId: randomUUID(), workspaceId: randomUUID(), cwd, agentDirectory, displayPath: 'archived',
        sessionFile, sessionsDirectory, createdAt: archivedAt, updatedAt: archivedAt,
        deletedSpace: { spaceId: randomUUID(), archivedAt, directory: deletedSpaceDirectory, privateRoots: [] },
      },
    },
    subagents: {},
    relocations: {},
  }), { mode: 0o600 });

  const secret = randomBytes(32).toString('hex');
  const port = await new Promise<number>((resolve, reject) => {
    const probe = createServer();
    probe.once('error', reject);
    probe.listen(0, '127.0.0.1', () => {
      const bound = ListeningPortSchema.safeParse(probe.address());
      probe.close(() => bound.success ? resolve(bound.data.port) : reject(new Error('A loopback port is required')));
    });
  });
  const service = new AgentService({
    workerEntrypoint: fileURLToPath(new URL('../worker/index.ts', import.meta.url)),
    internalSecret: secret,
    stateDirectory,
    port,
    policyCheck: async () => ({ allowed: true }),
    invokeHostAction: async () => { throw new Error('Unexpected Host action'); },
    hostSkillSource: async operation => operation.action === 'reconcile'
      ? { status: 'reconciled', sources: { workspace: '0', agent: '0' } }
      : { status: 'failed', code: 'SERVICE_UNAVAILABLE' },
  });
  try {
    await service.start();
    const headers = { 'x-internal-secret': secret, accept: 'application/json' };
    const [snapshotResponse, repeatSnapshotResponse] = await Promise.all([0, 1].map(() =>
      fetch(`http://127.0.0.1:${port}/api/agent/v1/sessions/${rootSessionId}/snapshot`, { headers })));
    expect(snapshotResponse.status).toBe(200);
    const snapshot = SessionSnapshotSchema.parse(await snapshotResponse.json());
    expect(repeatSnapshotResponse.status).toBe(200);
    const repeatSnapshot = SessionSnapshotSchema.parse(await repeatSnapshotResponse.json());
    expect(repeatSnapshot.cursor).toBe(snapshot.cursor);
    expect(repeatSnapshot.session.epoch).toBe(snapshot.session.epoch);

    const runtimeResponse = await fetch(`http://127.0.0.1:${port}/api/agent/v1/sessions/${rootSessionId}`, { headers });
    expect(runtimeResponse.status).toBe(200);
    const runtime = RuntimeSessionSchema.parse(await runtimeResponse.json());
    expect(runtime.epoch).toBe(snapshot.session.epoch);
    expect(runtime.headSequence).toBe(snapshot.session.headSequence);
    expect(snapshot.session.headSequence).toBe('0');

    const controller = new AbortController();
    const streamResponse = await fetch(`http://127.0.0.1:${port}/api/agent/v1/sessions/${rootSessionId}/events?cursor=${encodeURIComponent(snapshot.cursor)}`,
      { headers: { ...headers, accept: 'text/event-stream' }, signal: controller.signal });
    expect(streamResponse.status).toBe(200);
    expect(streamResponse.headers.get('content-type')).toBe('text/event-stream');
    controller.abort();
    const deleteResponse = await fetch(`http://127.0.0.1:${port}/api/agent/v1/sessions/${rootSessionId}`, { method: 'DELETE', headers });
    expect(deleteResponse.status).toBe(200);
    const missingSnapshot = await fetch(`http://127.0.0.1:${port}/api/agent/v1/sessions/${rootSessionId}/snapshot`, { headers });
    expect(missingSnapshot.status).toBe(404);
  } finally {
    await service.stop();
    if (previousHome === undefined) delete process.env.HOME; else process.env.HOME = previousHome;
    await rm(root, { recursive: true, force: true });
  }
});
