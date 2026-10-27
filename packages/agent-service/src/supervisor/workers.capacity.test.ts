import { expect, test } from 'bun:test';
import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { WorkerBootstrap } from '../protocol.ts';
import { WORKER_CAPACITY_POLICY, WorkerOperationError, WorkerRegistry, type WorkerCapacityPolicy } from './workers.ts';

const workerEntrypoint = fileURLToPath(new URL('./fixtures/capacity-worker.mjs', import.meta.url));

const policy = (overrides: Partial<WorkerCapacityPolicy> = {}): WorkerCapacityPolicy => ({ ...WORKER_CAPACITY_POLICY, ...overrides });

const workspace = async (name: string) => {
  const root = await mkdtemp(join(tmpdir(), `worker-capacity-${name}-`));
  const cwd = join(root, 'workspace');
  const agentDirectory = join(root, 'agent');
  await Promise.all([mkdir(cwd), mkdir(agentDirectory)]);
  return { root, cwd, agentDirectory, remove: () => rm(root, { recursive: true, force: true }) };
};

const startSession = (registry: WorkerRegistry, rootSessionId: string, cwd: string, agentDirectory: string, env?: Record<string, string>) => {
  const bootstrap: WorkerBootstrap = { rootSessionId, projectId: 'project', workspaceId: 'workspace', cwd, agentDirectory };
  if (env !== undefined) bootstrap.env = env;
  return registry.start(bootstrap);
};

/**
 * The reaper runs on a real interval and every eviction probe is an operation
 * on the worker, so a fixed sleep races the probe and the process exit under
 * load. Wait for the observable state instead: the registry entry disappears
 * only after the worker's process has been stopped and reaped.
 * Integration test: WorkerRegistry spawns real child processes and uses an
 * unmockable platform timer loop, so deterministic time control will not work.
 */
const waitForEviction = async (registry: WorkerRegistry, rootSessionId: string, timeoutMs = 10_000) => {
  const deadline = Date.now() + timeoutMs;
  while (registry.info(rootSessionId) !== undefined) {
    if (Date.now() >= deadline) {
      throw new Error(`Timed out after ${timeoutMs} ms waiting for ${rootSessionId} to be evicted`);
    }
    // Integration test: polling real worker process exit against platform clock
    await Bun.sleep(20);
  }
  expect(registry.info(rootSessionId)).toBeUndefined();
};

/**
 * The negative half of the same rule: while an operation or a restart
 * reservation is outstanding the worker must survive several reap intervals.
 * Polling keeps the assertion on the observable state rather than on how long
 * one sleep happened to take.
 * Integration test: WorkerRegistry spawns real child processes and uses an
 * unmockable platform timer loop, so deterministic time control will not work.
 */
const expectNotEvictedFor = async (registry: WorkerRegistry, rootSessionId: string, milliseconds: number) => {
  const deadline = Date.now() + milliseconds;
  while (Date.now() < deadline) {
    expect(registry.info(rootSessionId)?.state).toBe('ready');
    // Integration test: polling real worker process state against platform clock
    await Bun.sleep(20);
  }
  expect(registry.info(rootSessionId)?.state).toBe('ready');
};

test('the measured Task17 policy is the production default', () => {
  expect(WORKER_CAPACITY_POLICY).toEqual({
    maxActiveRootWorkers: 5,
    idleEvictionTimeoutMs: 600_000,
    reapIntervalMs: 30_000,
  });
});

test('a new root past the cap is refused and existing workers stay untouched', async () => {
  const tree = await workspace('refusal');
  const registry = new WorkerRegistry({ workerEntrypoint, workerRuntime: process.execPath,
    startupTimeoutMs: 10_000, stopTimeoutMs: 2_000,
    capacityPolicy: policy({ maxActiveRootWorkers: 2, idleEvictionTimeoutMs: 60_000, reapIntervalMs: 60_000 }) });
  try {
    await registry.startStateless({ rootSessionId: 'catalog-root', projectId: 'project', workspaceId: 'workspace',
      cwd: tree.cwd, agentDirectory: tree.agentDirectory, agentDirectoryId: 'agent', catalogRevision: '1' });
    await startSession(registry, 'root-one', tree.cwd, tree.agentDirectory);
    await startSession(registry, 'root-two', tree.cwd, tree.agentDirectory);

    const refusal = await startSession(registry, 'root-three', tree.cwd, tree.agentDirectory).catch(error => error);
    expect(refusal).toBeInstanceOf(WorkerOperationError);
    if (!(refusal instanceof WorkerOperationError)) throw new Error('Expected a typed capacity refusal');
    expect(refusal).toMatchObject({ status: 503, code: 'SERVICE_UNAVAILABLE',
      details: { reason: 'worker_capacity', activeRootWorkers: 2, maxActiveRootWorkers: 2 } });
    expect(refusal.message).toBe('Session capacity is full (2 of 2 active). Close another session or try again later.');

    const workers = registry.list();
    expect(workers.filter(worker => worker.kind === 'session').map(worker => worker.rootSessionId).sort()).toEqual(['root-one', 'root-two']);
    expect(workers.find(worker => worker.kind === 'stateless')?.rootSessionId).toBe('catalog-root');
    expect(workers.filter(worker => worker.kind === 'session').every(worker => worker.state === 'ready')).toBe(true);

    await registry.stop('root-one');
    await startSession(registry, 'root-three', tree.cwd, tree.agentDirectory);
    expect(registry.info('root-three')?.state).toBe('ready');
  } finally {
    try { await registry.close(); } finally { await tree.remove(); }
  }
}, 30_000);

test('simultaneous opens cannot oversubscribe the cap', async () => {
  const tree = await workspace('concurrent');
  const registry = new WorkerRegistry({ workerEntrypoint, workerRuntime: process.execPath,
    startupTimeoutMs: 10_000, stopTimeoutMs: 2_000,
    capacityPolicy: policy({ maxActiveRootWorkers: 2, idleEvictionTimeoutMs: 60_000, reapIntervalMs: 60_000 }) });
  try {
    const outcomes = await Promise.allSettled(['a', 'b', 'c'].map(id => startSession(registry, `root-${id}`, tree.cwd, tree.agentDirectory)));
    expect(outcomes.filter(outcome => outcome.status === 'fulfilled')).toHaveLength(2);
    const rejected = outcomes.find(outcome => outcome.status === 'rejected');
    expect(rejected?.status === 'rejected' ? rejected.reason : null).toMatchObject({ status: 503, code: 'SERVICE_UNAVAILABLE' });
    expect(registry.list().filter(worker => worker.kind === 'session')).toHaveLength(2);
  } finally {
    try { await registry.close(); } finally { await tree.remove(); }
  }
}, 30_000);

test('an idle worker is evicted while active-turn and pending-approval roots stay', async () => {
  const tree = await workspace('idle');
  const blocked = new Set(['root-active-turn', 'root-pending-approval']);
  const registry = new WorkerRegistry({ workerEntrypoint, workerRuntime: process.execPath,
    startupTimeoutMs: 10_000, stopTimeoutMs: 2_000,
    capacityPolicy: policy({ idleEvictionTimeoutMs: 100, reapIntervalMs: 20 }),
    isSessionIdle: rootSessionId => !blocked.has(rootSessionId) });
  try {
    for (const id of ['root-idle', 'root-active-turn', 'root-pending-approval']) await startSession(registry, id, tree.cwd, tree.agentDirectory);
    await Bun.sleep(400);
    expect(registry.list().filter(worker => worker.kind === 'session').map(worker => worker.rootSessionId).sort())
      .toEqual(['root-active-turn', 'root-pending-approval']);

    blocked.delete('root-active-turn');
    await Bun.sleep(400);
    expect(registry.list().filter(worker => worker.kind === 'session').map(worker => worker.rootSessionId))
      .toEqual(['root-pending-approval']);

    blocked.delete('root-pending-approval');
    await Bun.sleep(400);
    expect(registry.list().filter(worker => worker.kind === 'session')).toEqual([]);
  } finally {
    try { await registry.close(); } finally { await tree.remove(); }
  }
}, 30_000);

test('a pending worker operation and a restart reservation each postpone eviction', async () => {
  const tree = await workspace('pending');
  const registry = new WorkerRegistry({ workerEntrypoint, workerRuntime: process.execPath,
    startupTimeoutMs: 10_000, stopTimeoutMs: 2_000,
    capacityPolicy: policy({ idleEvictionTimeoutMs: 80, reapIntervalMs: 20 }),
    isSessionIdle: () => true });
  try {
    await startSession(registry, 'root-pending-operation', tree.cwd, tree.agentDirectory, { WORKER_OPERATION_DELAY_MS: '250' });
    const pending = registry.request('root-pending-operation', { type: 'shell', operation: { type: 'snapshot' } });
    // Real child processes and the registry's own interval share no fake
    // clock, so the postponement window is observed against the live reaper.
    await expectNotEvictedFor(registry, 'root-pending-operation', 150);
    await pending;
    await waitForEviction(registry, 'root-pending-operation');

    await startSession(registry, 'root-reserved', tree.cwd, tree.agentDirectory);
    const generation = registry.info('root-reserved')?.workerGeneration;
    if (!generation) throw new Error('A ready worker generation is required');
    const reservation = registry.reserveRestart('root-reserved', generation);
    await expectNotEvictedFor(registry, 'root-reserved', 300);
    reservation.release();
    await waitForEviction(registry, 'root-reserved');
  } finally {
    try { await registry.close(); } finally { await tree.remove(); }
  }
}, 30_000);

test('a running background shell job postpones eviction until it ends', async () => {
  const tree = await workspace('shell-job');
  const registry = new WorkerRegistry({ workerEntrypoint, workerRuntime: process.execPath,
    startupTimeoutMs: 10_000, stopTimeoutMs: 2_000,
    capacityPolicy: policy({ idleEvictionTimeoutMs: 100, reapIntervalMs: 20 }),
    isSessionIdle: () => true });
  try {
    await startSession(registry, 'root-shell-job', tree.cwd, tree.agentDirectory, { WORKER_SHELL_JOB_MS: '900' });
    // Real child processes and the registry's interval share no fake clock; the
    // idle window itself is the behavior under test.
    await Bun.sleep(400);
    expect(registry.info('root-shell-job')?.state).toBe('ready');

    await Bun.sleep(1_200);
    expect(registry.info('root-shell-job')).toBeUndefined();
  } finally {
    try { await registry.close(); } finally { await tree.remove(); }
  }
}, 30_000);
