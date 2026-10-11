import { expect, test } from 'bun:test';
import { spawn, spawnSync } from 'node:child_process';
import { once } from 'node:events';
import { mkdtemp, mkdir, open, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { assessRestartEvidence, failureProbes, runSuite, waitForMarkerOrError } from './restart-pending.mjs';

function evidence(overrides = {}) {
  return {
    pendingMarker: { approvalPending: true, questionPending: true, toolExecutionCount: 0, answerCount: 0, eventCount: 2 },
    freshResult: {
      freshSessionReady: true,
      distinctWorker: true,
      approval: { pendingObservedBeforeStop: true, staleResolutionRejected: null, lateExecutionObserved: false, before: { toolExecutionCount: 0, eventCount: 2 }, after: { toolExecutionCount: 1, eventCount: 7 } },
      question: { pendingObservedBeforeStop: true, staleResolutionRejected: null, lateAnswerObserved: false, before: { answerCount: 0, eventCount: 2 }, after: { answerCount: 1, eventCount: 7 } },
      eventCounts: { before: 2, after: 7, pendingAtStop: 2, pendingAfterStop: 2, lateObservationWindowMs: 100 },
    },
    cleanup: { pendingWorkerStopped: true, freshWorkerStopped: true, freshExitCode: 0, distinctWorker: true },
    identitiesDistinct: true,
    ...overrides,
  };
}

test('classifies missing SDK startup as unavailable but runtime failure as failed', () => {
  expect(failureProbes('SDK_DEPENDENCY_UNAVAILABLE').every(probe => probe.status === 'unavailable')).toBe(true);
  expect(failureProbes('RESTART_PENDING_WORKER_FAILED').every(probe => probe.status === 'failed')).toBe(true);
});

test('accepts measured zero-before and one-after counters as partial restart evidence', () => {
  const probes = assessRestartEvidence(evidence());
  expect(probes.find(probe => probe.id === 'restart-pending.approval')).toMatchObject({ status: 'partial', observations: { toolExecutionCountBeforeStop: 0, measurementValid: true } });
  expect(probes.find(probe => probe.id === 'restart-pending.question')).toMatchObject({ status: 'partial', observations: { answerCountBeforeStop: 0, measurementValid: true } });
  expect(probes.find(probe => probe.id === 'restart-pending.cleanup')).toMatchObject({ status: 'passed' });
  expect(probes[0].observations.staleResolutionRejected).toBeNull();
});

test('fails incomplete pending or late-event measurements instead of promoting partial evidence', () => {
  const probes = assessRestartEvidence(evidence({
    pendingMarker: { approvalPending: true, questionPending: true, toolExecutionCount: 1, answerCount: 0, eventCount: 2 },
    freshResult: { ...evidence().freshResult, eventCounts: { ...evidence().freshResult.eventCounts, pendingAfterStop: 3 } },
  }));
  expect(probes.find(probe => probe.id === 'restart-pending.approval')).toMatchObject({ status: 'failed' });
  expect(probes.find(probe => probe.id === 'restart-pending.question')).toMatchObject({ status: 'failed' });
  expect(probes.find(probe => probe.id === 'restart-pending.cleanup')).toMatchObject({ status: 'passed' });
});

test('abnormal fresh worker exit cannot produce a cleanup pass', () => {
  const probes = assessRestartEvidence(evidence({ cleanup: { pendingWorkerStopped: true, freshWorkerStopped: true, freshExitCode: 1, distinctWorker: true } }));
  expect(probes.some(probe => probe.status === 'passed')).toBe(false);
  expect(probes.find(probe => probe.id === 'restart-pending.cleanup')).toMatchObject({ status: 'failed' });
});

test('bounded termination evidence remains failed when a worker does not stop', () => {
  const probes = assessRestartEvidence(evidence({ cleanup: { pendingWorkerStopped: false, freshWorkerStopped: true, freshExitCode: 0, distinctWorker: true } }));
  expect(probes.find(probe => probe.id === 'restart-pending.cleanup')).toMatchObject({ status: 'failed', errors: ['RESTART_WORKER_CLEANUP_INCOMPLETE'] });
});

test('reports real missing-source startup as unavailable and cleans the spawned worker', async () => {
  const sandbox = await mkdtemp('/tmp/omp-restart-pending-startup-');
  for (const name of ['home', 'agent', 'workspace', 'tmp']) await mkdir(join(sandbox, name));
  const started = performance.now();
  try {
    const probes = await runSuite({ sourceDir: join(sandbox, 'missing-source'), sandbox, timeoutMs: 3000 });
    expect(performance.now() - started).toBeLessThan(5000);
    expect(probes.every(probe => probe.status === 'unavailable' && probe.errors.includes('SDK_DEPENDENCY_UNAVAILABLE'))).toBe(true);
    expect(probes.every(probe => probe.observations.pendingWorkerStopped === true)).toBe(true);
    expect(probes.every(probe => probe.observations.freshSessionReady === false)).toBe(true);
  } finally {
    await rm(sandbox, { recursive: true, force: true });
  }
});

test.skipIf(process.platform !== 'linux' || !Bun.which('mkfifo'))('observes a terminal result published between polling reads and child exit', async () => {
  const sandbox = await mkdtemp(join(tmpdir(), 'omp-restart-terminal-'));
  const markerFile = join(sandbox, 'marker.json');
  const resultFile = join(sandbox, 'result.json');
  const errorFile = join(sandbox, 'error.json');
  let child;
  let writer;
  let terminal;
  try {
    const fifo = spawnSync('mkfifo', [errorFile]);
    if (fifo.status !== 0) throw new Error('Unable to create terminal-read synchronization FIFO');
    child = spawn(process.execPath, ['--no-install', '-e', 'process.stdin.once("data", async () => { await Bun.write(process.argv[1], JSON.stringify({ status: "ready" })); process.exit(0); });', resultFile], { stdio: ['pipe', 'ignore', 'ignore'] });
    const exited = once(child, 'exit');
    terminal = waitForMarkerOrError(markerFile, resultFile, errorFile, child, 2000);
    // The FIFO opens only after the result read has found no file. Keep the
    // error read pending until the real worker has published its result and exited.
    writer = await open(errorFile, 'w');
    child.stdin.end('publish\n');
    await exited;
    await writer.close();
    writer = undefined;
    expect(await terminal).toEqual({ kind: 'result', value: { status: 'ready' } });
  } finally {
    if (writer) await writer.close();
    if (child && child.exitCode === null && child.signalCode === null) {
      const exited = once(child, 'exit');
      child.kill('SIGKILL');
      await exited;
    }
    if (terminal) await terminal.catch(() => {});
    await rm(sandbox, { recursive: true, force: true });
  }
}, 5000);
