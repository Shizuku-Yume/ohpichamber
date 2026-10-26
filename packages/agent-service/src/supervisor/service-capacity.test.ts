import { expect, test } from 'bun:test';
import { randomBytes, randomUUID } from 'node:crypto';
import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';

import { WORKER_CAPACITY_POLICY } from './workers.ts';
import type { HostSkillSourceResult } from './file-resources-host-protocol.ts';
import { AgentService } from './service.ts';

const ListeningPortSchema = z.object({ port: z.number().int().positive() });
const freePort = () => new Promise<number>((resolve, reject) => {
  const probe = createServer();
  probe.once('error', reject);
  probe.listen(0, '127.0.0.1', () => {
    const address = ListeningPortSchema.safeParse(probe.address());
    probe.close(() => address.success ? resolve(address.data.port) : reject(new Error('A free loopback port is required')));
  });
});

test('a root at the cap evicts the least recently active idle worker and opens', async () => {
  const root = await mkdtemp(join(tmpdir(), 'service-capacity-'));
  const previousHome = process.env.HOME;
  process.env.HOME = root;
  const cwd = join(root, 'workspace');
  const agentDirectory = join(root, 'agent');
  await Promise.all([cwd, agentDirectory].map(directory => mkdir(directory, { recursive: true })));
  const secret = randomBytes(32).toString('hex');
  const projectId = randomUUID();
  const workspaceId = randomUUID();
  const port = await freePort();
  const env = { HOME: root, USERPROFILE: root, PI_CONFIG_DIR: '.omp', PI_CODING_AGENT_DIR: agentDirectory,
    OMP_PROFILE: '', PI_PROFILE: '', XDG_CONFIG_HOME: join(root, 'config'), XDG_DATA_HOME: join(root, 'data'),
    XDG_STATE_HOME: join(root, 'state'), XDG_CACHE_HOME: join(root, 'cache') };
  const service = new AgentService({
    workerEntrypoint: fileURLToPath(new URL('../worker/index.ts', import.meta.url)),
    internalSecret: secret,
    stateDirectory: join(root, 'service-state'),
    port,
    policyCheck: async () => ({ allowed: true }),
    invokeHostAction: async () => { throw new Error('Unexpected Host action'); },
    hostSkillSource: async (operation): Promise<HostSkillSourceResult> => (
      operation.action === 'reconcile' ? { status: 'reconciled', sources: { workspace: '0', agent: '0' } }
        : { status: 'failed', code: 'SERVICE_UNAVAILABLE' }),
    workerCapacityPolicy: { ...WORKER_CAPACITY_POLICY, maxActiveRootWorkers: 2, idleEvictionTimeoutMs: 600_000, reapIntervalMs: 60_000 },
  });
  try {
    await service.start();
    const request = async (pathname: string, init: RequestInit = {}) => {
      const headers = new Headers({ 'x-internal-secret': secret, accept: 'application/json' });
      if (init.body) headers.set('content-type', 'application/json');
      const response = await fetch(`http://127.0.0.1:${port}${pathname}`, { ...init, headers });
      return { status: response.status, body: await response.json() };
    };
    expect((await request(`/internal/workspaces/${encodeURIComponent(workspaceId)}`, { method: 'POST',
      body: JSON.stringify({ projectId, cwd, agentDirectory, agentDirectoryId: 'service-owner', env }) })).status).toBe(201);
    const open = (rootSessionId: string) => request('/internal/sessions', { method: 'POST',
      body: JSON.stringify({ rootSessionId, projectId, workspaceId, cwd, agentDirectory, agentDirectoryId: 'service-owner', displayPath: 'workspace', env }) });
    expect((await open('root-one')).status).toBe(201);
    expect((await open('root-two')).status).toBe(201);

    expect((await open('root-three')).status).toBe(201);
    const workers = await request('/internal/workers');
    expect(workers.body.workers.filter((worker: { kind: string }) => worker.kind === 'session')
      .map((worker: { rootSessionId: string; state: string }) => [worker.rootSessionId, worker.state]).sort())
      .toEqual([['root-three', 'ready'], ['root-two', 'ready']]);
  } finally {
    await service.stop();
    if (previousHome === undefined) delete process.env.HOME; else process.env.HOME = previousHome;
    await rm(root, { recursive: true, force: true });
  }
}, 60_000);
