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
  "  if (message?.type === 'bootstrap') send({ type: 'ready', workerGeneration: message.workerGeneration });",
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
