import { expect, test } from 'bun:test';
import { randomBytes, randomUUID } from 'node:crypto';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SessionManager } from '@oh-my-pi/pi-coding-agent/session/session-manager';
import { z } from 'zod';
import {
  CacheWarmingStateSchema,
  SessionCacheWarmingApplyResultSchema,
  SessionCacheWarmingStateSchema,
  type CacheWarmingMode,
  type CacheWarmingState,
  type JsonValue,
} from '@openchamber/agent-contract';
import type { WorkerBootstrap, WorkerInfo, WorkerOperation, WorkerOperationResult } from '../protocol.ts';
import { SessionRegistry } from '../sessions/registry.ts';
import { AgentService } from './service.ts';
import { SessionWarming } from './session-warming.ts';
import { WORKER_CAPACITY_POLICY, WorkerOperationError, WorkerRegistry, type RegisteredWorkerInfo, type StatelessWorkerInput } from './workers.ts';
import { WorkspaceCatalogs } from './workspaces.ts';

const ListeningPortSchema = z.object({ port: z.number().int().positive() });
const CapacityWorkerEntrypoint = fileURLToPath(new URL('./fixtures/capacity-worker.mjs', import.meta.url));
const RealWorkerEntrypoint = fileURLToPath(new URL('../worker/index.ts', import.meta.url));

class WarmingWorkers extends WorkerRegistry {
  readonly entries = new Map<string, RegisteredWorkerInfo>();
  readonly requests: { rootSessionId: string; operation: WorkerOperation; expectedGeneration?: string }[] = [];
  readonly failing = new Set<string>();
  readonly beforeApply = new Map<string, () => void>();
  constructor(private readonly directory: string) {
    super({ workerEntrypoint: 'unused-test-worker' });
  }
  override list(): RegisteredWorkerInfo[] {
    return [...this.entries.values()].map(worker => ({ ...worker }));
  }
  override info(rootSessionId: string): WorkerInfo | undefined {
    const worker = this.entries.get(rootSessionId);
    return worker && { ...worker };
  }
  add(rootSessionId: string, workspaceId = 'workspace', state: WorkerInfo['state'] = 'ready', kind: RegisteredWorkerInfo['kind'] = 'session') {
    const worker: RegisteredWorkerInfo = {
      rootSessionId,
      workspaceId,
      projectId: 'project',
      workerGeneration: `generation-${rootSessionId}`,
      state,
      kind,
    };
    this.entries.set(rootSessionId, worker);
    return worker;
  }
  override async startStateless(input: StatelessWorkerInput): Promise<WorkerInfo> {
    return this.entries.get(input.rootSessionId) ?? this.add(input.rootSessionId, input.workspaceId, 'ready', 'stateless');
  }
  override async request(rootSessionId: string, operation: WorkerOperation, expectedGeneration?: string): Promise<WorkerOperationResult> {
    this.requests.push({ rootSessionId, operation, expectedGeneration });
    if (operation.type !== 'catalog') throw new Error('Unexpected non-catalog operation');
    const worker = this.entries.get(rootSessionId);
    if (!worker) throw new Error('Unknown worker');
    const catalog = operation.operation;
    if (catalog.type === 'catalog.warming.apply') {
      this.beforeApply.get(rootSessionId)?.();
      if (this.failing.has(rootSessionId) || worker.workerGeneration !== expectedGeneration || worker.state !== 'ready') {
        throw new WorkerOperationError(503, 'SERVICE_UNAVAILABLE', 'Worker failed to apply warming');
      }
      return { type: 'catalog', result: { type: 'catalog.warming.applied', mode: catalog.mode } };
    }
    const file = join(this.directory, `${worker.workspaceId}.json`);
    if (catalog.type === 'catalog.warming.persist') {
      const state: CacheWarmingState = { workspaceId: worker.workspaceId, revision: operation.revision, mode: catalog.request.mode };
      await writeFile(file, JSON.stringify(state));
      return { type: 'catalog', result: { type: 'catalog.warming', state } };
    }
    if (catalog.type !== 'catalog.warming.read') throw new Error('Unexpected catalog operation');
    let mode: CacheWarmingMode = 'off';
    try {
      mode = CacheWarmingStateSchema.parse(JSON.parse(await readFile(file, 'utf8'))).mode;
    } catch (error) {
      if (!(error instanceof Error && 'code' in error && error.code === 'ENOENT')) throw error;
    }
    return { type: 'catalog', result: { type: 'catalog.warming', state: { workspaceId: worker.workspaceId, revision: operation.revision, mode } } };
  }
  applications() {
    return this.requests.filter(request => request.operation.type === 'catalog' && request.operation.operation.type === 'catalog.warming.apply');
  }
}

async function coordinatorFixture() {
  const directory = await mkdtemp(join(tmpdir(), 'session-warming-'));
  const workers = new WarmingWorkers(directory);
  const stateDirectory = join(directory, 'supervisor');
  type WarmingAccess = { current?: SessionWarming };
  const warmingAccess: WarmingAccess = {};
  const catalogs = new WorkspaceCatalogs(
    stateDirectory,
    workers,
    undefined,
    rootSessionId => warmingAccess.current?.overrideMode(rootSessionId) ?? null,
  );
  await catalogs.initialize();
  await catalogs.register('workspace', {
    projectId: 'project',
    cwd: join(directory, 'workspace'),
    agentDirectory: join(directory, 'workspace', 'agent'),
    agentDirectoryId: 'agent-workspace',
    env: {},
  });
  const sessionWarming = new SessionWarming(stateDirectory, catalogs, workers);
  warmingAccess.current = sessionWarming;
  await sessionWarming.initialize();
  return {
    directory,
    stateDirectory,
    workers,
    catalogs,
    sessionWarming,
    cleanup: async () => {
      await workers.close();
      await rm(directory, { recursive: true, force: true });
    },
  };
}

const freePort = () => {
  const { promise, resolve, reject } = Promise.withResolvers<number>();
  const probe = createServer();
  probe.once('error', reject);
  probe.listen(0, '127.0.0.1', () => {
    const address = ListeningPortSchema.safeParse(probe.address());
    probe.close(() => address.success ? resolve(address.data.port) : reject(new Error('A free loopback port is required')));
  });
  return promise;
};

// Integration test: WorkerRegistry spawns real child processes and drives reaping from a platform timer loop.
const waitFor = async (predicate: () => boolean, timeoutMs = 10_000) => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (predicate()) return;
    await Bun.sleep(20);
  }
  throw new Error(`Timed out after ${timeoutMs}ms waiting for predicate`);
};

// Integration test: polling real worker process state across platform reaper intervals.
const expectAliveFor = async (registry: WorkerRegistry, rootSessionId: string, ms: number) => {
  const deadline = Date.now() + ms;
  while (Date.now() < deadline) {
    expect(registry.info(rootSessionId)?.state).toBe('ready');
    await Bun.sleep(20);
  }
  expect(registry.info(rootSessionId)?.state).toBe('ready');
};

test('session warming defaults to workspace mode without persisting and enforces CAS across restart', async () => {
  const f = await coordinatorFixture();
  try {
    expect(await f.sessionWarming.read('session-a', 'workspace')).toEqual({
      sessionId: 'session-a',
      workspaceId: 'workspace',
      revision: '0',
      mode: null,
      workspaceMode: 'off',
      effectiveMode: 'off',
    });
    const persistedPath = join(f.stateDirectory, 'session-cache-warming.json');
    await expect(readFile(persistedPath, 'utf8')).rejects.toMatchObject({ code: 'ENOENT' });

    const coldApply = await f.sessionWarming.update('session-a', 'workspace', { expectedRevision: '0', mode: 'idle' });
    expect(coldApply).toEqual({
      persisted: {
        sessionId: 'session-a',
        workspaceId: 'workspace',
        revision: '1',
        mode: 'idle',
        workspaceMode: 'off',
        effectiveMode: 'idle',
      },
      status: 'no-active-worker',
      worker: null,
    });
    expect(f.workers.applications()).toEqual([]);

    const concurrent = await Promise.allSettled([
      f.sessionWarming.update('session-a', 'workspace', { expectedRevision: '1', mode: 'streaming' }),
      f.sessionWarming.update('session-a', 'workspace', { expectedRevision: '1', mode: 'off' }),
    ]);
    expect(concurrent.filter(result => result.status === 'fulfilled')).toHaveLength(1);
    expect(concurrent.find(result => result.status === 'rejected')).toMatchObject({
      reason: { status: 409, code: 'CATALOG_CONFLICT', details: { currentRevision: '2' } },
    });

    const reopenedWarming = new SessionWarming(f.stateDirectory, f.catalogs, f.workers);
    await reopenedWarming.initialize();
    const afterReopen = await reopenedWarming.read('session-a', 'workspace');
    expect(afterReopen).toEqual({
      sessionId: 'session-a',
      workspaceId: 'workspace',
      revision: '2',
      mode: 'streaming',
      workspaceMode: 'off',
      effectiveMode: 'streaming',
    });
  } finally {
    await f.cleanup();
  }
});

test('live session warming applies to active worker, reports failure on error or stale generation, and rolls back on disk failure', async () => {
  const f = await coordinatorFixture();
  try {
    f.workers.add('live-session');
    const applied = await f.sessionWarming.update('live-session', 'workspace', { expectedRevision: '0', mode: 'idle' });
    expect(applied).toEqual({
      persisted: {
        sessionId: 'live-session',
        workspaceId: 'workspace',
        revision: '1',
        mode: 'idle',
        workspaceMode: 'off',
        effectiveMode: 'idle',
      },
      status: 'applied',
      worker: {
        worker: { workspaceId: 'workspace', rootSessionId: 'live-session', workerGeneration: 'generation-live-session' },
        outcome: 'applied',
        mode: 'idle',
      },
    });
    expect(f.workers.applications()).toHaveLength(1);

    f.workers.failing.add('live-session');
    const failed = await f.sessionWarming.update('live-session', 'workspace', { expectedRevision: '1', mode: 'streaming' });
    expect(failed).toMatchObject({
      persisted: { revision: '2', mode: 'streaming', effectiveMode: 'streaming' },
      status: 'failed',
      worker: {
        worker: { rootSessionId: 'live-session', workerGeneration: 'generation-live-session' },
        outcome: 'failed',
        mode: 'streaming',
        error: { code: 'SERVICE_UNAVAILABLE', retryable: true },
      },
    });

    f.workers.failing.delete('live-session');
    f.workers.beforeApply.set('live-session', () => {
      f.workers.entries.set('live-session', { ...f.workers.entries.get('live-session')!, workerGeneration: 'replacement-gen' });
    });
    const replaced = await f.sessionWarming.update('live-session', 'workspace', { expectedRevision: '2', mode: 'off' });
    expect(replaced).toMatchObject({
      persisted: { revision: '3', mode: 'off', effectiveMode: 'off' },
      status: 'failed',
      worker: { worker: { workerGeneration: 'generation-live-session' }, outcome: 'failed', mode: 'off' },
    });

    const stateFile = join(f.stateDirectory, 'session-cache-warming.json');
    await rm(stateFile);
    await mkdir(stateFile);
    await expect(f.sessionWarming.update('live-session', 'workspace', { expectedRevision: '3', mode: 'idle' })).rejects.toThrow();
    expect(f.sessionWarming.overrideMode('live-session')).toBe('off');
  } finally {
    await f.cleanup();
  }
});

test('per-session override takes precedence over workspace fanout and restoring null re-inherits workspace mode', async () => {
  const f = await coordinatorFixture();
  try {
    f.workers.add('session-a');
    f.workers.add('session-b');

    await f.sessionWarming.update('session-a', 'workspace', { expectedRevision: '0', mode: 'idle' });
    expect(await f.sessionWarming.read('session-a', 'workspace')).toMatchObject({
      revision: '1',
      mode: 'idle',
      workspaceMode: 'off',
      effectiveMode: 'idle',
    });
    expect(await f.sessionWarming.read('session-b', 'workspace')).toMatchObject({
      revision: '0',
      mode: null,
      workspaceMode: 'off',
      effectiveMode: 'off',
    });

    f.workers.requests.length = 0;
    const workspaceUpdate = await f.catalogs.updateCacheWarming('workspace', { expectedRevision: '0', mode: 'streaming' });
    expect(workspaceUpdate).toEqual({
      persisted: { workspaceId: 'workspace', revision: '1', mode: 'streaming' },
      status: 'applied',
      workers: [
        {
          worker: { workspaceId: 'workspace', rootSessionId: 'session-b', workerGeneration: 'generation-session-b' },
          outcome: 'applied',
          mode: 'streaming',
        },
      ],
    });
    expect(f.workers.applications().map(req => req.rootSessionId)).toEqual(['session-b']);
    expect(await f.sessionWarming.read('session-a', 'workspace')).toMatchObject({
      revision: '1',
      mode: 'idle',
      workspaceMode: 'streaming',
      effectiveMode: 'idle',
    });

    // Clear session-a back to null: revision advances monotonically to '2', inherits 'streaming', and applies to live worker.
    const cleared = await f.sessionWarming.update('session-a', 'workspace', { expectedRevision: '1', mode: null });
    expect(cleared).toEqual({
      persisted: {
        sessionId: 'session-a',
        workspaceId: 'workspace',
        revision: '2',
        mode: null,
        workspaceMode: 'streaming',
        effectiveMode: 'streaming',
      },
      status: 'applied',
      worker: {
        worker: { workspaceId: 'workspace', rootSessionId: 'session-a', workerGeneration: 'generation-session-a' },
        outcome: 'applied',
        mode: 'streaming',
      },
    });

    // Now session-a inherits workspace fanout again, while a workspace with only overridden workers reports no-active-workers.
    await f.sessionWarming.update('session-a', 'workspace', { expectedRevision: '2', mode: 'off' });
    await f.sessionWarming.update('session-b', 'workspace', { expectedRevision: '0', mode: 'idle' });
    const skippedAll = await f.catalogs.updateCacheWarming('workspace', { expectedRevision: '1', mode: 'idle' });
    expect(skippedAll).toEqual({
      persisted: { workspaceId: 'workspace', revision: '2', mode: 'idle' },
      status: 'no-active-workers',
      workers: [],
    });
  } finally {
    await f.cleanup();
  }
});

test('idle reaper skips sessions kept warm while reaping off/unconfigured sessions and preserving hard-capacity eviction', async () => {
  const root = await mkdtemp(join(tmpdir(), 'warming-reaper-'));
  const cwd = join(root, 'workspace');
  const agentDirectory = join(root, 'agent');
  await Promise.all([mkdir(cwd), mkdir(agentDirectory)]);
  const keptWarm = new Set<string>(['warm-idle', 'warm-streaming']);
  const registry = new WorkerRegistry({
    workerEntrypoint: CapacityWorkerEntrypoint,
    workerRuntime: process.execPath,
    startupTimeoutMs: 10_000,
    stopTimeoutMs: 2_000,
    isSessionKeptWarm: rootSessionId => keptWarm.has(rootSessionId),
    capacityPolicy: { ...WORKER_CAPACITY_POLICY, maxActiveRootWorkers: 3, idleEvictionTimeoutMs: 120, reapIntervalMs: 25 },
  });
  const start = (rootSessionId: string) => {
    const bootstrap: WorkerBootstrap = { rootSessionId, projectId: 'project', workspaceId: 'workspace', cwd, agentDirectory };
    return registry.start(bootstrap);
  };
  try {
    await start('warm-idle');
    await start('warm-streaming');
    await start('warm-off');

    await waitFor(() => registry.info('warm-off') === undefined);
    await expectAliveFor(registry, 'warm-idle', 250);
    await expectAliveFor(registry, 'warm-streaming', 250);

    // Fill hard capacity (maxActiveRootWorkers = 3) with kept-warm sessions: hard capacity still evicts LRU warm-idle.
    keptWarm.add('third');
    await start('third');
    // Distinct monotonic activity timestamp for LRU ordering in WorkerRegistry.
    await Bun.sleep(5);
    await start('fourth');
    const liveIds = registry.list().filter(worker => worker.kind === 'session').map(worker => worker.rootSessionId);
    expect(liveIds.sort()).toEqual(['fourth', 'third', 'warm-streaming']);
  } finally {
    try { await registry.close(); } finally { await rm(root, { recursive: true, force: true }); }
  }
}, 30_000);

test('AgentService session cache-warming HTTP routes persist across restart and clear on session delete', async () => {
  const root = await mkdtemp(join(tmpdir(), 'service-session-warming-'));
  const previousHome = process.env.HOME;
  process.env.HOME = root;
  const cwd = join(root, 'workspace');
  const agentDirectory = join(root, 'agent');
  await Promise.all([cwd, agentDirectory].map(directory => mkdir(directory, { recursive: true })));
  await mkdir(join(cwd, '.omp'), { recursive: true });
  await writeFile(join(cwd, '.omp', 'config.yml'), 'providers:\n  cacheWarming: "off"\n');
  const stateDirectory = join(root, 'service-state');
  const secret = randomBytes(32).toString('hex');
  const projectId = randomUUID();
  const workspaceId = randomUUID();
  const env = {
    HOME: root,
    USERPROFILE: root,
    PI_CONFIG_DIR: '.omp',
    PI_CODING_AGENT_DIR: agentDirectory,
    OMP_PROFILE: '',
    PI_PROFILE: '',
    XDG_CONFIG_HOME: join(root, 'config'),
    XDG_DATA_HOME: join(root, 'data'),
    XDG_STATE_HOME: join(root, 'state'),
    XDG_CACHE_HOME: join(root, 'cache'),
  };

  const makeService = async () => {
    const port = await freePort();
    const service = new AgentService({
      workerEntrypoint: RealWorkerEntrypoint,
      internalSecret: secret,
      stateDirectory,
      port,
      policyCheck: async () => ({ allowed: true }),
      invokeHostAction: async () => { throw new Error('Unexpected Host action'); },
      hostSkillSource: async operation => (
        operation.action === 'reconcile'
          ? { status: 'reconciled', sources: { workspace: '0', agent: '0' } }
          : { status: 'failed', code: 'SERVICE_UNAVAILABLE' }
      ),
      workerCapacityPolicy: { ...WORKER_CAPACITY_POLICY, idleEvictionTimeoutMs: 250, reapIntervalMs: 30 },
    });
    await service.start();
    const request = async (pathname: string, init: RequestInit = {}) => {
      const headers = new Headers({ 'x-internal-secret': secret, accept: 'application/json' });
      if (init.body) headers.set('content-type', 'application/json');
      const response = await fetch(`http://127.0.0.1:${port}${pathname}`, { ...init, headers });
      const parsed: JsonValue = await response.json();
      return { status: response.status, body: parsed };
    };
    return { service, request };
  };

  let current = await makeService();
  try {
    expect((await current.request(`/internal/workspaces/${encodeURIComponent(workspaceId)}`, {
      method: 'POST',
      body: JSON.stringify({ projectId, cwd, agentDirectory, agentDirectoryId: 'service-owner', env }),
    })).status).toBe(201);

    expect((await current.request('/api/agent/v1/sessions/missing-session/cache-warming')).status).toBe(404);

    const rootSessionId = randomUUID();
    expect((await current.request('/internal/sessions', {
      method: 'POST',
      body: JSON.stringify({
        rootSessionId,
        projectId,
        workspaceId,
        cwd,
        agentDirectory,
        agentDirectoryId: 'service-owner',
        displayPath: 'workspace',
        env,
      }),
    })).status).toBe(201);

    const initialGet = await current.request(`/api/agent/v1/sessions/${encodeURIComponent(rootSessionId)}/cache-warming`);
    expect(initialGet.status).toBe(200);
    expect(SessionCacheWarmingStateSchema.parse(initialGet.body)).toEqual({
      sessionId: rootSessionId,
      workspaceId,
      revision: '0',
      mode: null,
      workspaceMode: 'off',
      effectiveMode: 'off',
    });

    const livePut = await current.request(`/api/agent/v1/sessions/${encodeURIComponent(rootSessionId)}/cache-warming`, {
      method: 'PUT',
      body: JSON.stringify({ expectedRevision: '0', mode: 'idle' }),
    });
    expect(livePut.status).toBe(200);
    const liveResult = SessionCacheWarmingApplyResultSchema.parse(livePut.body);
    expect(liveResult).toMatchObject({
      persisted: {
        sessionId: rootSessionId,
        workspaceId,
        revision: '1',
        mode: 'idle',
        workspaceMode: 'off',
        effectiveMode: 'idle',
      },
      status: 'applied',
      worker: { worker: { rootSessionId, workspaceId }, outcome: 'applied', mode: 'idle' },
    });

    // Stale CAS returns 409 with currentRevision.
    const conflictPut = await current.request(`/api/agent/v1/sessions/${encodeURIComponent(rootSessionId)}/cache-warming`, {
      method: 'PUT',
      body: JSON.stringify({ expectedRevision: '0', mode: 'streaming' }),
    });
    expect(conflictPut.status).toBe(409);
    expect(conflictPut.body).toMatchObject({ code: 'CATALOG_CONFLICT', details: { currentRevision: '1' } });

    // Integration test: real AgentService reaper runs on a platform timer interval; verify kept-warm survives >1 reap window.
    await Bun.sleep(450);
    const workersBeforeRestart = await current.request('/internal/workers');
    expect(workersBeforeRestart.body).toMatchObject({
      workers: expect.arrayContaining([expect.objectContaining({ rootSessionId, kind: 'session', state: 'ready' })]),
    });

    // Restart AgentService: cold GET preserves revision & override without booting a worker, and cold PUT updates cleanly.
    await current.service.stop();
    current = await makeService();
    expect((await current.request(`/internal/workspaces/${encodeURIComponent(workspaceId)}`, {
      method: 'POST',
      body: JSON.stringify({ projectId, cwd, agentDirectory, agentDirectoryId: 'service-owner', env }),
    })).status).toBe(201);

    const coldGet = await current.request(`/api/agent/v1/sessions/${encodeURIComponent(rootSessionId)}/cache-warming`);
    expect(coldGet.status).toBe(200);
    expect(SessionCacheWarmingStateSchema.parse(coldGet.body)).toEqual({
      sessionId: rootSessionId,
      workspaceId,
      revision: '1',
      mode: 'idle',
      workspaceMode: 'off',
      effectiveMode: 'idle',
    });

    const coldPut = await current.request(`/api/agent/v1/sessions/${encodeURIComponent(rootSessionId)}/cache-warming`, {
      method: 'PUT',
      body: JSON.stringify({ expectedRevision: '1', mode: 'streaming' }),
    });
    expect(coldPut.status).toBe(200);
    expect(SessionCacheWarmingApplyResultSchema.parse(coldPut.body)).toEqual({
      persisted: {
        sessionId: rootSessionId,
        workspaceId,
        revision: '2',
        mode: 'streaming',
        workspaceMode: 'off',
        effectiveMode: 'streaming',
      },
      status: 'no-active-worker',
      worker: null,
    });
    const workersWhileCold = await current.request('/internal/workers');
    expect(workersWhileCold.body).toMatchObject({
      workers: expect.not.arrayContaining([expect.objectContaining({ rootSessionId })]),
    });

    // Reopen session: startup applies override ('streaming'), and deleting the session clears persisted warming state.
    expect((await current.request(`/internal/sessions/${encodeURIComponent(rootSessionId)}/reopen`, {
      method: 'POST',
      body: JSON.stringify({
        rootSessionId,
        projectId,
        workspaceId,
        cwd,
        agentDirectory,
        agentDirectoryId: 'service-owner',
        displayPath: 'workspace',
        env,
      }),
    })).status).toBe(200);

    expect((await current.request(`/api/agent/v1/sessions/${encodeURIComponent(rootSessionId)}`, { method: 'DELETE' })).status).toBe(200);
    const persistedAfterDelete = JSON.parse(await readFile(join(stateDirectory, 'session-cache-warming.json'), 'utf8'));
    expect(persistedAfterDelete).toEqual({ sessions: [] });
  } finally {
    await current.service.stop();
    if (previousHome === undefined) delete process.env.HOME; else process.env.HOME = previousHome;
    await rm(root, { recursive: true, force: true });
  }
}, 60_000);

test('coldDelete and deleteWorktreeArchiveFamily clear persisted session warming entries', async () => {
  const root = await mkdtemp(join(tmpdir(), 'registry-warming-cleanup-'));
  const cwd = join(root, 'workspace');
  const agentDirectory = join(root, 'agent');
  const deletedSpaceDirectory = join(root, 'deleted-space');
  const stateDirectory = join(root, 'service-state');
  await Promise.all([cwd, agentDirectory, deletedSpaceDirectory, stateDirectory].map(directory => mkdir(directory, { recursive: true })));

  const sessionsDirectory = SessionManager.getDefaultSessionDir(cwd, agentDirectory);
  const coldManager = SessionManager.create(cwd, sessionsDirectory);
  await coldManager.ensureOnDisk();
  await coldManager.flush();
  const coldSessionFile = coldManager.getSessionFile();
  await coldManager.close();
  if (!coldSessionFile) throw new Error('Cold session file is required');

  const worktreeCwd = join(root, 'worktree-gone');
  await mkdir(worktreeCwd, { recursive: true });
  const wtSessionsDir = SessionManager.getDefaultSessionDir(worktreeCwd, agentDirectory);
  const wtManager = SessionManager.create(worktreeCwd, wtSessionsDir);
  await wtManager.ensureOnDisk();
  await wtManager.flush();
  const wtSessionFile = wtManager.getSessionFile();
  await wtManager.close();
  if (!wtSessionFile) throw new Error('Worktree session file is required');
  await rm(worktreeCwd, { recursive: true, force: true });

  const coldId = randomUUID();
  const worktreeId = randomUUID();
  const now = Date.now();
  await writeFile(join(stateDirectory, 'session-references.json'), JSON.stringify({
    references: {
      [coldId]: {
        rootSessionId: coldId,
        projectId: 'project',
        workspaceId: 'workspace',
        cwd,
        agentDirectory,
        displayPath: 'archived',
        sessionFile: coldSessionFile,
        sessionsDirectory,
        createdAt: now,
        updatedAt: now,
        deletedSpace: { spaceId: randomUUID(), archivedAt: now, directory: deletedSpaceDirectory, privateRoots: [] },
      },
      [worktreeId]: {
        rootSessionId: worktreeId,
        projectId: 'project',
        workspaceId: 'workspace',
        cwd: worktreeCwd,
        agentDirectory,
        agentDirectoryId: 'agent-owner',
        displayPath: 'worktree',
        sessionFile: wtSessionFile,
        sessionsDirectory: wtSessionsDir,
        createdAt: now,
        updatedAt: now,
      },
    },
    subagents: {},
    relocations: {},
  }), { mode: 0o600 });

  const workers = new WarmingWorkers(root);
  const catalogs = new WorkspaceCatalogs(stateDirectory, workers);
  await catalogs.initialize();
  await catalogs.register('workspace', {
    projectId: 'project',
    cwd,
    agentDirectory,
    agentDirectoryId: 'agent-owner',
    env: {},
  });
  const sessionWarming = new SessionWarming(stateDirectory, catalogs, workers);
  await sessionWarming.initialize();
  await sessionWarming.update(coldId, 'workspace', { expectedRevision: '0', mode: 'idle' });
  await sessionWarming.update(worktreeId, 'workspace', { expectedRevision: '0', mode: 'streaming' });

  const registry = new SessionRegistry(stateDirectory, workers, undefined, undefined, undefined, ids => sessionWarming.clear(ids));
  await registry.initialize();
  try {
    await registry.delete(coldId);
    expect(sessionWarming.overrideMode(coldId)).toBeNull();
    expect(sessionWarming.overrideMode(worktreeId)).toBe('streaming');

    await registry.deleteWorktreeArchiveFamily(worktreeId, {
      operationId: 'wt-op-1',
      projectId: 'project',
      workspaceId: 'workspace',
      agentDirectoryId: 'agent-owner',
      sessionIds: [worktreeId],
    });
    expect(sessionWarming.overrideMode(worktreeId)).toBeNull();
    const persisted = JSON.parse(await readFile(join(stateDirectory, 'session-cache-warming.json'), 'utf8'));
    expect(persisted).toEqual({ sessions: [] });
  } finally {
    await registry.close();
    await workers.close();
    await rm(root, { recursive: true, force: true });
  }
});

test('warmingScope resolves child subagent ids to their rootSessionId and workspaceId', async () => {
  const root = await mkdtemp(join(tmpdir(), 'warming-child-scope-'));
  const cwd = join(root, 'workspace');
  const agentDirectory = join(root, 'agent');
  const stateDirectory = join(root, 'service-state');
  await Promise.all([cwd, agentDirectory, stateDirectory].map(directory => mkdir(directory, { recursive: true })));
  const sessionsDirectory = SessionManager.getDefaultSessionDir(cwd, agentDirectory);
  const rootManager = SessionManager.create(cwd, sessionsDirectory);
  await rootManager.ensureOnDisk();
  await rootManager.flush();
  const rootFile = rootManager.getSessionFile();
  await rootManager.close();
  if (!rootFile) throw new Error('Root session file is required');

  const childDir = join(rootFile.slice(0, -'.jsonl'.length), 'task', 'child-1');
  await mkdir(childDir, { recursive: true });
  const childManager = await SessionManager.open(join(childDir, 'child.jsonl'), childDir, undefined, { initialCwd: cwd, parentSession: rootFile });
  await childManager.ensureOnDisk();
  await childManager.flush();
  const childFile = childManager.getSessionFile();
  const childSessionId = childManager.getSessionId();
  await childManager.close();
  if (!childFile || !childSessionId) throw new Error('Child session file and id are required');

  const rootSessionId = randomUUID();
  const now = Date.now();
  await writeFile(join(stateDirectory, 'session-references.json'), JSON.stringify({
    references: {
      [rootSessionId]: {
        rootSessionId,
        projectId: 'project',
        workspaceId: 'workspace-child-test',
        cwd,
        agentDirectory,
        displayPath: 'workspace',
        sessionFile: rootFile,
        sessionsDirectory,
        createdAt: now,
        updatedAt: now,
      },
    },
    subagents: {
      [rootSessionId]: [
        {
          subagentId: 'subagent-1',
          parentSessionId: rootSessionId,
          childSessionId,
          role: 'task',
          status: 'completed',
          rootSessionId,
          workspaceId: 'workspace-child-test',
          projectId: 'project',
          sessionFile: childFile,
        },
      ],
    },
    relocations: {},
  }), { mode: 0o600 });

  const workers = new WarmingWorkers(root);
  const registry = new SessionRegistry(stateDirectory, workers);
  await registry.initialize();
  try {
    expect(registry.warmingScope(rootSessionId)).toEqual({ rootSessionId, workspaceId: 'workspace-child-test' });
    expect(registry.warmingScope(childSessionId)).toEqual({ rootSessionId, workspaceId: 'workspace-child-test' });
    expect(() => registry.warmingScope('unknown-session')).toThrow();
  } finally {
    await registry.close();
    await workers.close();
    await rm(root, { recursive: true, force: true });
  }
});
