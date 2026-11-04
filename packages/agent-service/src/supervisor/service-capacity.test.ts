import { expect, test } from 'bun:test';
import { randomBytes, randomUUID } from 'node:crypto';
import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import { get } from 'node:http';
import { createServer } from 'node:net';
import { SessionManager } from '@oh-my-pi/pi-coding-agent/session/session-manager';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';

import { WORKER_CAPACITY_POLICY } from './workers.ts';
import type { HostSkillSourceResult } from './file-resources-host-protocol.ts';
import { AgentService } from './service.ts';
import { SessionRegistry } from '../sessions/registry.ts';

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

test('unauthorized callers to DELETE /internal/workers/:id are rejected with 403', async () => {
  const root = await mkdtemp(join(tmpdir(), 'service-unauth-'));
  const previousHome = process.env.HOME;
  process.env.HOME = root;
  const secret = randomBytes(32).toString('hex');
  const port = await freePort();
  const service = new AgentService({
    workerEntrypoint: fileURLToPath(new URL('../worker/index.ts', import.meta.url)),
    internalSecret: secret,
    stateDirectory: join(root, 'service-state'),
    port,
    policyCheck: async () => ({ allowed: true }),
    invokeHostAction: async () => { throw new Error('Unexpected Host action'); },
    hostSkillSource: async () => ({ status: 'failed', code: 'SERVICE_UNAVAILABLE' }),
  });
  try {
    await service.start();
    const noAuth = await fetch(`http://127.0.0.1:${port}/internal/workers/ses-1`, { method: 'DELETE' });
    expect(noAuth.status).toBe(403);
    expect(await noAuth.json()).toMatchObject({
      type: 'urn:ohpichamber:problem:UNAUTHORIZED',
      status: 403,
      code: 'UNAUTHORIZED',
      detail: 'Private loopback authentication is required',
    });

    const badAuth = await fetch(`http://127.0.0.1:${port}/internal/workers/ses-1`, {
      method: 'DELETE',
      headers: { 'x-internal-secret': randomBytes(32).toString('hex') },
    });
    expect(badAuth.status).toBe(403);
    expect(await badAuth.json()).toMatchObject({
      type: 'urn:ohpichamber:problem:UNAUTHORIZED',
      status: 403,
      code: 'UNAUTHORIZED',
      detail: 'Private loopback authentication is required',
    });
  } finally {
    await service.stop();
    if (previousHome === undefined) delete process.env.HOME; else process.env.HOME = previousHome;
    await rm(root, { recursive: true, force: true });
  }
}, 30_000);

test('DELETE /internal/workers/:id unloads an idle worker through eviction with a subscribed client, and the session reopens cold with history intact', async () => {
  const root = await mkdtemp(join(tmpdir(), 'service-unload-'));
  const previousHome = process.env.HOME;
  process.env.HOME = root;
  const cwd = join(root, 'workspace');
  const agentDirectory = join(root, 'agent');
  await Promise.all([cwd, agentDirectory].map(directory => mkdir(directory, { recursive: true })));
  const sessionsDirectory = SessionManager.getDefaultSessionDir(cwd, agentDirectory);
  const manager = SessionManager.create(cwd, sessionsDirectory);
  manager.appendMessage({ role: 'user', content: 'Unload test prompt', timestamp: Date.now() });
  manager.appendMessage({
    role: 'assistant', content: [{ type: 'text' as const, text: 'Unload test reply' }],
    api: 'openai-completions' as const, provider: 'fixture', model: 'fixture', stopReason: 'stop' as const,
    timestamp: Date.now(), usage: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, totalTokens: 0,
      cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 } },
  });
  await manager.ensureOnDisk();
  await manager.flush();
  const sessionFile = manager.getSessionFile();
  await manager.close();
  if (!sessionFile) throw new Error('Native session file is required');

  const secret = randomBytes(32).toString('hex');
  const rootSessionId = 'ses-unload-test';
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
  });
  try {
    await service.start();
    const request = async (pathname: string, init: RequestInit = {}) => {
      const headers = new Headers({ 'x-internal-secret': secret, accept: 'application/json' });
      if (init.body) headers.set('content-type', 'application/json');
      const response = await fetch(`http://127.0.0.1:${port}${pathname}`, { ...init, headers });
      const text = await response.text();
      return { status: response.status, body: text ? JSON.parse(text) : null };
    };
    expect((await request(`/internal/workspaces/${encodeURIComponent(workspaceId)}`, { method: 'POST',
      body: JSON.stringify({ projectId, cwd, agentDirectory, agentDirectoryId: 'service-owner', env }) })).status).toBe(201);
    const bootstrap = { rootSessionId, projectId, workspaceId, cwd, agentDirectory, agentDirectoryId: 'service-owner', displayPath: 'workspace', env };
    const opened = await request('/internal/sessions', { method: 'POST', body: JSON.stringify({ ...bootstrap, sessionFile, sessionsDirectory }) });
    expect(opened.status).toBe(201);
    const cursor = `${opened.body.epoch}:0`;

    const connected = Promise.withResolvers<void>();
    const invalidated = Promise.withResolvers<void>();
    const stream = get({
      host: '127.0.0.1',
      port,
      path: `/api/agent/v1/sessions/${encodeURIComponent(rootSessionId)}/events?cursor=${encodeURIComponent(cursor)}`,
      headers: { 'x-internal-secret': secret, accept: 'text/event-stream' },
    }, response => {
      expect(response.statusCode).toBe(200);
      connected.resolve();
      response.on('data', chunk => {
        const text = chunk.toString('utf8');
        if (text.includes('stream.invalidated') && text.includes('EPOCH_CHANGED')) {
          invalidated.resolve();
        }
      });
    });

    await connected.promise;
    // An active run refuses eviction with 409 RUN_ACTIVE
    const sessions: unknown = Object.getOwnPropertyDescriptor(service, 'sessions')?.value;
    if (sessions instanceof SessionRegistry) {
      const currentWorkers = await request('/internal/workers');
      const gen = currentWorkers.body.workers.find((w: { rootSessionId: string }) => w.rootSessionId === rootSessionId)?.workerGeneration;
      sessions.onEvents(rootSessionId, gen, [{
        timestamp: Date.now(),
        event: { type: 'session.status', runtimeStatus: 'running', activeRunId: 'run-active' },
      }]);
      const busyUnload = await request(`/internal/workers/${encodeURIComponent(rootSessionId)}`, { method: 'DELETE' });
      expect(busyUnload.status).toBe(409);
      expect(busyUnload.body).toMatchObject({ status: 409, code: 'RUN_ACTIVE' });
      sessions.onEvents(rootSessionId, gen, [{
        timestamp: Date.now(),
        event: { type: 'session.status', runtimeStatus: 'idle', activeRunId: null },
      }]);
    }

    const unloadResponse = await request(`/internal/workers/${encodeURIComponent(rootSessionId)}`, { method: 'DELETE' });
    expect(unloadResponse.status).toBe(204);
    await invalidated.promise;
    stream.destroy();

    const workers = await request('/internal/workers');
    expect(workers.body.workers.some((w: { rootSessionId: string }) => w.rootSessionId === rootSessionId)).toBe(false);

    const reopened = await request(`/internal/sessions/${encodeURIComponent(rootSessionId)}/reopen`, {
      method: 'POST',
      body: JSON.stringify(bootstrap),
    });
    expect(reopened.status).toBe(200);
    expect(reopened.body.runtimeStatus).toBe('idle');

    const history = await request(`/api/agent/v1/sessions/${encodeURIComponent(rootSessionId)}/history`);
    expect(history.status).toBe(200);
    const historyText = JSON.stringify(history.body);
    expect(historyText).toContain('Unload test prompt');
    expect(historyText).toContain('Unload test reply');
  } finally {
    await service.stop();
    if (previousHome === undefined) delete process.env.HOME; else process.env.HOME = previousHome;
    await rm(root, { recursive: true, force: true });
  }
}, 60_000);
