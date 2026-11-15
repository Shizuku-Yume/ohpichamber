import { expect, test } from 'bun:test';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { WorkerBootstrap } from '../protocol.ts';
import { WorkerRegistry } from './workers.ts';

/**
 * A spare is a worker process with no session. This fixture reports `idle`
 * immediately, then `warm` once it finished its background work, which is the
 * signal the supervisor uses to prefer an already-warm process.
 */
const SPARE_FIXTURE = [
  "import { appendFileSync } from 'node:fs';",
  "import { join } from 'node:path';",
  // A worker's environment is the supervisor's allowlist, so the fixture reports
  // into its own working directory's parent, which the test owns.
  "const log = join(process.cwd(), '..', 'spare.log');",
  "const note = line => { try { appendFileSync(log, line + '\\n'); } catch { } };",
  "const send = message => { if (process.connected) process.send(message); };",
  "note(`spawn ${process.pid}`);",
  "send({ type: 'idle' });",
  "setTimeout(() => { note(`warm ${process.pid}`); send({ type: 'warm' }); }, 50);",
  "process.on('message', message => {",
  "  if (message?.type === 'bootstrap') { note(`bootstrap ${process.pid}`); send({ type: 'ready', workerGeneration: message.workerGeneration }); }",
  "  if (message?.type === 'stop') process.exit(0);",
  "});",
  "process.on('disconnect', () => process.exit(0));",
  "process.on('SIGTERM', () => process.exit(0));",
].join('\n');

const fixture = async () => {
  const root = await mkdtemp(join(tmpdir(), 'worker-spare-'));
  const cwd = join(root, 'workspace');
  const agentDirectory = join(root, 'agent');
  const entrypoint = join(root, 'spare-worker.mjs');
  const log = join(root, 'spare.log');
  await Promise.all([mkdir(cwd), mkdir(agentDirectory)]);
  await writeFile(entrypoint, SPARE_FIXTURE);
  return { root, cwd, agentDirectory, entrypoint, log, remove: () => rm(root, { recursive: true, force: true }) };
};

const registryFor = (entrypoint: string) => new WorkerRegistry({
  workerEntrypoint: entrypoint,
  workerRuntime: process.execPath,
  isSessionIdle: () => true,
  prepareBootstrap: async input => input,
});

const bootstrap = (rootSessionId: string, cwd: string, agentDirectory: string): WorkerBootstrap =>
  ({ rootSessionId, projectId: 'project', workspaceId: 'workspace', cwd, agentDirectory });

const spawnCount = async (log: string): Promise<number> => {
  const text = await Bun.file(log).text().catch(() => '');
  return text.split('\n').filter(line => line.startsWith('spawn ')).length;
};

const linePids = async (log: string, prefix: string): Promise<string[]> =>
  (await Bun.file(log).text().catch(() => '')).split('\n').filter(line => line.startsWith(prefix)).map(line => line.slice(prefix.length).trim());

const pids = (log: string): Promise<string[]> => linePids(log, 'spawn ');

const waitFor = async (predicate: () => Promise<boolean> | boolean, timeoutMs = 10_000): Promise<void> => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await predicate()) return;
    await Bun.sleep(20);
  }
  throw new Error(`Timed out after ${timeoutMs} ms`);
};

// Integration test: WorkerRegistry spawns real child processes and uses the
// platform clock, so the pool is observed through its effect on process starts.
test('adopting a spare leaves a replacement loading so the next new chat adopts too', async () => {
  const f = await fixture();
  const registry = registryFor(f.entrypoint);
  try {
    registry.warmSessionWorker({ cwd: f.cwd, agentDirectory: f.agentDirectory });
    await waitFor(async () => await spawnCount(f.log) >= 1);
    // The pool holds two slots: the first adoptable spare and one replacement.
    await waitFor(async () => await spawnCount(f.log) >= 2);

    await registry.start(bootstrap('first', f.cwd, f.agentDirectory));
    // Adoption consumed one slot, so the pool must still hold a loading spare and
    // refill again rather than leaving the next launch to a cold spawn.
    await waitFor(async () => await spawnCount(f.log) >= 3);
    await registry.start(bootstrap('second', f.cwd, f.agentDirectory));
    expect(registry.info('second')?.state).toBe('ready');
  } finally {
    await registry.close();
    await f.remove();
  }
}, 30_000);

// A second launch must adopt the loading replacement rather than spawn its own.
// Asserting only that a third spawn happened leaves this green with adoption
// disabled, so the spawn count after the second start is the assertion that
// actually distinguishes the two behaviours.
test('the second new chat adopts the replacement instead of spawning a third worker', async () => {
  const f = await fixture();
  const registry = registryFor(f.entrypoint);
  try {
    registry.warmSessionWorker({ cwd: f.cwd, agentDirectory: f.agentDirectory });
    await waitFor(async () => await spawnCount(f.log) >= 2);
    await registry.start(bootstrap('first', f.cwd, f.agentDirectory));
    await waitFor(async () => await spawnCount(f.log) >= 3);
    // Adoption means the process that served the second session had already been
    // spawned before the second launch began. A spawn count cannot say that: the
    // refill pads the pool back to two either way, so both paths end at the same
    // total. The bootstrapped pid is the direct signal.
    const spawnedBeforeSecond = new Set(await pids(f.log));
    expect(spawnedBeforeSecond.size).toBeGreaterThanOrEqual(3);
    await registry.start(bootstrap('second', f.cwd, f.agentDirectory));
    expect(registry.info('second')?.state).toBe('ready');
    const bootstrapped = await linePids(f.log, 'bootstrap ');
    const servedSecond = bootstrapped.at(-1);
    expect(servedSecond).toBeDefined();
    expect(spawnedBeforeSecond.has(servedSecond!)).toBe(true);
  } finally {
    await registry.close();
    await f.remove();
  }
}, 30_000);

// The pool must never retry fast enough to starve the service's event loop. The
// shape here is the reported one: a worktree lease refuses every spawn, so no
// attempt can ever add a spare and the only thing that can stop the retries is
// the code under test.
//
// Note for whoever breaks this next: with the retry restored the failure shows up
// as a hang to this file's timeout, not as a red assertion. The retry loop keeps
// the macrotask queue starved, so `Bun.sleep` and the interval never run and the
// expectations are never reached. A hang here means the refill spins.
test('a refused refill does not retry from its own settle', async () => {
  const f = await fixture();
  const registry = registryFor(f.entrypoint);
  try {
    await registry.acquireWorktreeLease('lease-under-test', f.cwd);
    const warm = (registry as unknown as { warmSessionWorker: (...args: unknown[]) => void }).warmSessionWorker.bind(registry);
    let attempts = 0;
    (registry as unknown as { warmSessionWorker: unknown }).warmSessionWorker = ((...args: unknown[]) => {
      attempts += 1;
      return warm(...args);
    }) as unknown;

    registry.warmSessionWorker({ cwd: f.cwd, agentDirectory: f.agentDirectory });

    // Timers are the measurement: a retry loop that restarts from its own settle
    // never yields to the macrotask queue, so this timer would not fire at all.
    let ticks = 0;
    const timer = setInterval(() => { ticks += 1; }, 100);
    try { await Bun.sleep(1_000); } finally { clearInterval(timer); }
    expect(ticks).toBeGreaterThanOrEqual(3);
    // One refused attempt, and nothing that retries it within the interval.
    expect(attempts).toBe(1);
    expect(await spawnCount(f.log)).toBe(0);
  } finally {
    await registry.releaseWorktreeLease('lease-under-test').catch(() => undefined);
    await registry.close();
    await f.remove();
  }
}, 30_000);
