import { describe, expect, test } from 'bun:test';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { PassThrough } from 'node:stream';
import { readFrames, MAX_CHANNEL_BYTES } from './worker-channel.mjs';
import { launchWorker } from './worker-launcher.mjs';
import { inspectProcessTree, sampleResources, terminateIdentity } from './resources.mjs';

async function withWorker(mode, run, timeoutMs = 2000) {
  const directory = await mkdtemp(join(process.cwd(), '.omp-isolation-test-'));
  let worker;
  try {
    const script = join(directory, 'controlled-worker.mjs');
    await mkdir(join(directory, 'home'));
    await writeFile(script, `
      import { spawn } from 'node:child_process';
      import { connectWorkerChannel } from ${JSON.stringify(new URL('./worker-channel.mjs', import.meta.url).href)};
      const mode = process.argv[2];
      if (mode === 'descendant-hang') spawn(process.execPath, ['-e', 'setInterval(() => {}, 1000)'], { env: { PATH: '/usr/bin:/bin' }, stdio: 'ignore' });
      const channel = connectWorkerChannel(message => {
        if (message.type === 'crash') process.exit(7);
        if (message.type === 'run') {
          channel.send({ type: 'active' });
          if (mode === 'events') channel.send({ type: 'event' });
          if (mode === 'oversized') channel.output.write('x'.repeat(2 * 1024 * 1024));
          if (mode === 'stderr') process.stderr.write('x'.repeat(2 * 1024 * 1024));
        }
        if (message.type === 'shutdown' && !mode.endsWith('hang')) {
          channel.send({ type: 'closed' });
          channel.close();
        }
      });
      channel.send({ type: 'ready', pid: process.pid });
    `);
    worker = launchWorker({ script, args: [mode], cwd: directory, env: { HOME: join(directory, 'home'), PATH: '/usr/bin:/bin' }, timeoutMs });
    return await run(worker);
  } finally {
    if (worker) await worker.cleanup();
    await rm(directory, { recursive: true, force: true });
  }
}

describe('isolation worker lifecycle', () => {
  test('records real readiness, sampling, exit and no tracked orphan', async () => {
    await withWorker('normal', async worker => {
      const ready = await worker.waitFor('ready');
      expect(ready.pid).toBe(worker.observations.pid);
      expect(worker.observations.startupMs).toBeGreaterThan(0);
      const sample = await worker.sample();
      expect(sample.status).toBe(process.platform === 'linux' ? 'passed' : 'unavailable');
      if (sample.status === 'passed') expect(sample.rssBytes).toBeGreaterThan(0);
      worker.send({ type: 'shutdown' });
      await worker.waitFor('closed');
      const cleanup = await worker.cleanup();
      expect(cleanup.directChildExited).toBe(true);
      expect(worker.observations.exitCode).toBe(0);
      expect(cleanup.complete).toBe(process.platform === 'linux');
      if (cleanup.complete) expect(cleanup.descendantInspection.members).toEqual([]);
    });
  });

  test('abnormal exit rejects missing result and preserves exit code', async () => {
    await withWorker('normal', async worker => {
      await worker.waitFor('ready');
      worker.send({ type: 'crash' });
      await expect(worker.waitFor('result')).rejects.toMatchObject({ code: 'WORKER_EARLY_EXIT' });
      const cleanup = await worker.cleanup();
      expect(cleanup.directChildExited).toBe(true);
      expect(worker.observations.exitCode).toBe(7);
    });
  });

  test('timeout fails closed and terminates the real process', async () => {
    await withWorker('hang', async worker => {
      await worker.waitFor('ready');
      await expect(worker.waitFor('result')).rejects.toMatchObject({ code: 'WORKER_TIMEOUT' });
      const cleanup = await worker.cleanup();
      expect(worker.observations.timedOut).toBe(true);
      expect(cleanup.directChildExited).toBe(true);
    }, 250);
  });

  test.skipIf(process.platform !== 'linux')('timeout terminates tracked descendants and checks their identities', async () => {
    await withWorker('descendant-hang', async worker => {
      await worker.waitFor('ready');
      await expect(worker.waitFor('result')).rejects.toMatchObject({ code: 'WORKER_TIMEOUT' });
      const cleanup = await worker.cleanup();
      expect(cleanup.trackedPids.length).toBeGreaterThan(1);
      expect(cleanup.directChildExited).toBe(true);
      expect(cleanup.complete).toBe(true);
    }, 350);
  });

  test('counts late SDK event messages but not close control acknowledgments', async () => {
    await withWorker('events', async worker => {
      await worker.waitFor('ready');
      worker.markClosed();
      worker.send({ type: 'run' });
      await worker.waitFor('event');
      expect(worker.observations.messagesAfterClosed).toBe(1);
      await worker.cleanup();
      expect(worker.observations.messagesAfterClosed).toBe(1);
    });
  });

  test('oversized IPC fails without retaining an unbounded payload', async () => {
    await withWorker('oversized', async worker => {
      await worker.waitFor('ready');
      worker.send({ type: 'run' });
      await expect(worker.waitFor('result')).rejects.toMatchObject({ code: 'WORKER_IPC_LIMIT' });
      expect((await worker.cleanup()).directChildExited).toBe(true);
    });
  });

  test('stderr overflow terminates the real worker', async () => {
    await withWorker('stderr', async worker => {
      await worker.waitFor('ready');
      worker.send({ type: 'run' });
      await expect(worker.waitFor('result')).rejects.toMatchObject({ code: 'WORKER_STDERR_LIMIT' });
      expect((await worker.cleanup()).directChildExited).toBe(true);
    });
  });
});

test('resource instruments observe a live process and mark missing metrics unavailable', async () => {
  const live = await sampleResources(process.pid);
  const tree = await inspectProcessTree(process.pid);
  if (process.platform === 'linux') {
    expect(live.status).toBe('passed');
    expect(live.rssBytes).toBeGreaterThan(0);
    expect(tree.members.some(member => member.pid === process.pid)).toBe(true);
  } else {
    expect(live.status).toBe('unavailable');
    expect(tree.status).toBe('unavailable');
  }
  expect((await sampleResources(2147483647)).status).toBe('unavailable');
});

test('one oversized multibyte frame is rejected before JSON decoding', () => {
  const stream = new PassThrough();
  let decodedFrames = 0;
  let failure;
  readFrames(stream, () => { decodedFrames++; }, code => { failure = code; });
  stream.write('"');
  const chunk = Buffer.from('λ'.repeat(8192));
  for (let bytes = 0; bytes <= MAX_CHANNEL_BYTES; bytes += chunk.length) stream.write(chunk);
  stream.end('"\n');
  expect(failure).toBe('WORKER_IPC_LIMIT');
  expect(decodedFrames).toBe(0);
});

test.skipIf(process.platform !== 'linux')('stale process identity cannot authorize a kill', async () => {
  const tree = await inspectProcessTree(process.pid);
  const identity = tree.members.find(member => member.pid === process.pid);
  expect(terminateIdentity({ ...identity, startTicks: '0' }, 'SIGKILL')).toBe(false);
  expect((await sampleResources(process.pid)).status).toBe('passed');
});

test('startup failure settles cleanup without waiting for a nonexistent exit event', async () => {
  const directory = await mkdtemp(join(process.cwd(), '.omp-isolation-start-test-'));
  const worker = launchWorker({ script: join(directory, 'missing-worker.mjs'), cwd: join(directory, 'missing-workspace'), env: { PATH: '/usr/bin:/bin' }, timeoutMs: 2000 });
  try {
    await expect(worker.waitFor('ready')).rejects.toMatchObject({ code: 'WORKER_START_FAILED' });
    const cleanup = await worker.cleanup();
    expect(cleanup.directChildExited).toBe(true);
    expect(cleanup.complete).toBe(false);
    expect(cleanup.descendantInspection.status).toBe('unavailable');
  } finally { await worker.cleanup(); await rm(directory, { recursive: true, force: true }); }
});
