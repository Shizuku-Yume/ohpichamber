import { mkdir, rename, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { launchWorker, WorkerFailure } from './worker-launcher.mjs';
import { RESOURCE_LIMITATIONS } from './resources.mjs';
import { probeResult, serializeEnvelope } from './envelope.mjs';

const workerScript = fileURLToPath(new URL('./isolation-worker.mjs', import.meta.url));
const result = probeResult;

function workerEnvironment(context, label) {
  const root = join(context.sandbox, `isolation-${label}`);
  return {
    HOME: join(root, 'home'), USERPROFILE: join(root, 'home'),
    XDG_CONFIG_HOME: join(root, 'home', '.config'), XDG_DATA_HOME: join(root, 'home', '.local', 'share'),
    XDG_STATE_HOME: join(root, 'home', '.local', 'state'), XDG_CACHE_HOME: join(root, 'home', '.cache'),
    TMPDIR: join(root, 'tmp'), PI_CODING_AGENT_DIR: join(root, 'agent'),
    PATH: '/usr/bin:/bin', NO_COLOR: '1', TERM: 'dumb', OMP_M0_OVERLAY: label,
  };
}

function start(context, mode, label, launch) {
  const worker = launch({
    script: workerScript, cwd: join(context.sandbox, `isolation-${label}`, 'workspace'),
    env: workerEnvironment(context, label), timeoutMs: Math.max(100, Math.floor(context.timeoutMs / 6)),
  });
  worker.send({ type: 'initialize', config: { context, mode, label } });
  return worker;
}

function safeFailure(error) {
  return error instanceof WorkerFailure ? error.code : 'ISOLATION_PROBE_FAILED';
}

function cleanupStatus(worker, cleanup, sdkUnavailable = false) {
  const unexpectedExit = worker.observations.exitCode !== 0 && !(sdkUnavailable && worker.observations.exitCode === 1);
  if (!cleanup.directChildExited || cleanup.remnantsObserved > 0 || worker.observations.forcedTermination || worker.observations.timedOut || unexpectedExit || worker.observations.messagesAfterClosed !== 0) return 'failed';
  if (cleanup.descendantInspection.status === 'unavailable') return 'unavailable';
  return cleanup.complete ? 'passed' : 'failed';
}

function bindingRestored(shutdown, labels, bound) {
  return shutdown.bindingRestoration?.length === labels.length && shutdown.bindingRestoration.every((row, index) =>
    row.disposedLabel === labels[index] && row.processSettingsBinding === (bound && index < labels.length - 1 ? labels[index + 1] : 'none'));
}

async function sharedProcess(context, mode, launch) {
  let worker;
  const observations = {
    mode, privateAgentRegistry: mode !== 'shared-default', bindProcessState: mode !== 'shared-private-unbound',
    overlayMethod: 'Host installs controlled cwd and environment overlay before each session creation.',
    observationPath: 'SDK custom tool reads a marker relative to SessionManager.getCwd() and separately relative to process.cwd(); only the public fixture environment marker is inspected.',
    adr03Changed: false,
  };
  const errors = [];
  let status = 'failed';
  try {
    worker = start(context, mode, 'a', launch);
    observations.startup = await worker.waitFor('ready');
    worker.send({ type: 'run' });
    const measured = await worker.waitFor('result');
    observations.measurement = measured;
    observations.sessionScopedCwdIsolated = measured.rows.length === 2 && measured.rows.every(row => row.sessionCwdMatches && row.sessionMarker === row.label);
    observations.ambientProcessCwdIsolated = measured.rows.length === 2 && measured.rows.every(row => row.processMarker === row.label);
    observations.ambientEnvironmentIsolated = measured.rows.length === 2 && measured.rows.every(row => row.environmentMarker === row.label);
    observations.registryOwnsBothSessions = measured.rows.length === 2 && measured.rows.every(row => row.registryOwnsSession);
    const isolated = measured.rows.length === 2 && measured.concurrentToolsObserved === 2 && measured.rows.every(row =>
      row.sessionCwdMatches && row.sessionMarker === row.label && row.processMarker === row.label && row.environmentMarker === row.label && row.registryOwnsSession);
    status = isolated ? 'passed' : 'failed';
    if (!isolated) errors.push('SHARED_PROCESS_CWD_OR_ENV_LEAK');
    observations.processSettingsBindingCorrect = measured.rows.every(row => row.processSettingsBinding === (mode === 'shared-private-unbound' ? 'none' : 'b'));
    if (!observations.processSettingsBindingCorrect) { errors.push('PROCESS_STATE_BINDING_FAILED'); status = 'failed'; }
    worker.send({ type: 'shutdown' });
    observations.shutdown = await worker.waitFor('closed');
    worker.markClosed();
    observations.processSettingsRestored = bindingRestored(observations.shutdown, ['b', 'a'], mode !== 'shared-private-unbound');
    if (!observations.processSettingsRestored) { errors.push('PROCESS_STATE_RESTORATION_FAILED'); status = 'failed'; }
    if (observations.shutdown.disposeFailed || observations.shutdown.lateEvents !== 0) {
      errors.push('SESSION_SHUTDOWN_FAILED'); status = 'failed';
    }
  } catch (error) {
    errors.push(safeFailure(error));
    if (error instanceof WorkerFailure) observations.failureDiagnostic = error.diagnostic;
    status = safeFailure(error) === 'SDK_UNAVAILABLE' ? 'unavailable' : 'failed';
  } finally {
    if (worker) {
      observations.cleanup = await worker.cleanup();
      observations.worker = worker.observations;
      const cleanupOutcome = cleanupStatus(worker, observations.cleanup, errors.includes('SDK_UNAVAILABLE'));
      if (cleanupOutcome !== 'passed') {
        errors.push(cleanupOutcome === 'failed' ? 'WORKER_CLEANUP_OR_EXIT_FAILED' : 'ORPHAN_INSPECTION_UNAVAILABLE');
        if (cleanupOutcome === 'failed' || status === 'passed') status = cleanupOutcome;
      }
    } else observations.cleanup = { workerCreated: false };
  }
  return result(`isolation-${mode}`, 'PROBE-01 concurrent cwd/environment isolation', status, observations, errors);
}

async function dedicatedWorkers(context, launch) {
  const observations = { platform: `${process.platform}-${process.arch}`, workers: [], limitations: RESOURCE_LIMITATIONS, adr03Changed: false };
  const errors = [];
  const activeGate = Promise.withResolvers();
  let activeSettled = 0;
  const outcomes = await Promise.all(['a', 'b'].map(async label => {
    const row = { label };
    observations.workers.push(row);
    let worker;
    let activeArrived = false;
    function settleActive() {
      if (activeArrived) return;
      activeArrived = true;
      if (++activeSettled === 2) activeGate.resolve();
    }
    let status = 'failed';
    try {
      worker = start(context, 'dedicated', label, launch);
      row.startup = await worker.waitFor('ready');
      row.idle = await worker.sample();
      worker.send({ type: 'run' });
      row.activeAcknowledgment = await worker.waitFor('active');
      row.active = await worker.sample();
      settleActive();
      await activeGate.promise;
      worker.send({ type: 'release-active' });
      row.measurement = await worker.waitFor('result');
      const isolated = row.measurement.rows.length === 1 && row.measurement.rows[0].label === label && row.measurement.rows[0].sessionCwdMatches && row.measurement.rows[0].sessionMarker === label && row.measurement.rows[0].processMarker === label && row.measurement.rows[0].environmentMarker === label && row.measurement.rows[0].registryOwnsSession;
      status = isolated ? 'passed' : 'failed';
      if (!isolated) errors.push('DEDICATED_WORKER_ISOLATION_FAILED');
      row.processSettingsBindingCorrect = row.measurement.rows.every(measured => measured.processSettingsBinding === label);
      if (!row.processSettingsBindingCorrect) { errors.push('PROCESS_STATE_BINDING_FAILED'); status = 'failed'; }
      worker.send({ type: 'shutdown' });
      row.shutdown = await worker.waitFor('closed');
      worker.markClosed();
      row.processSettingsRestored = bindingRestored(row.shutdown, [label], true);
      if (!row.processSettingsRestored) { errors.push('PROCESS_STATE_RESTORATION_FAILED'); status = 'failed'; }
      if (row.shutdown.disposeFailed || row.shutdown.lateEvents !== 0) { errors.push('SESSION_SHUTDOWN_FAILED'); status = 'failed'; }
    } catch (error) {
      const code = safeFailure(error);
      row.errors = [code];
      if (error instanceof WorkerFailure) row.failureDiagnostic = error.diagnostic;
      errors.push(code);
      status = code === 'SDK_UNAVAILABLE' ? 'unavailable' : 'failed';
    } finally {
      settleActive();
      if (worker) {
        row.cleanup = await worker.cleanup();
        row.lifecycle = worker.observations;
        const cleanupOutcome = cleanupStatus(worker, row.cleanup, row.errors?.includes('SDK_UNAVAILABLE'));
        if (cleanupOutcome !== 'passed') {
          errors.push(cleanupOutcome === 'failed' ? 'WORKER_CLEANUP_OR_EXIT_FAILED' : 'ORPHAN_INSPECTION_UNAVAILABLE');
          if (cleanupOutcome === 'failed' || status === 'passed') status = cleanupOutcome;
        }
      } else row.cleanup = { workerCreated: false };
    }
    row.status = status;
    return status;
  }));
  const status = outcomes.includes('failed') ? 'failed' : outcomes.includes('unavailable') ? 'unavailable' : 'passed';
  const probes = [result('isolation-dedicated-workers', 'Bun worker cwd/environment and lifecycle isolation', status, observations, [...new Set(errors)])];
  const samples = observations.workers.flatMap(worker => [worker.idle, worker.active]);
  const samplingComplete = samples.length === 4 && samples.every(sample => sample?.status === 'passed');
  const idleBudgetBytes = 100 * 1024 * 1024;
  const measuredIdle = observations.workers.filter(worker => worker.idle?.status === 'passed');
  const budgetExceeded = measuredIdle.some(worker => worker.idle.rssBytes >= idleBudgetBytes);
  const resourceStatus = budgetExceeded ? 'failed' : samplingComplete ? 'passed' : 'unavailable';
  const resourceErrors = [];
  if (!samplingComplete) resourceErrors.push('RESOURCE_SAMPLING_UNAVAILABLE');
  if (budgetExceeded) resourceErrors.push('IDLE_RSS_BUDGET_EXCEEDED');
  probes.push(result('isolation-worker-resources', 'PROBE-02 idle/active worker resources', resourceStatus, {
    platform: observations.platform, method: 'linux-procfs', samples: observations.workers.map(worker => ({ label: worker.label, idle: worker.idle ?? null, active: worker.active ?? null })),
    activePhase: 'A real SDK prompt is running with its controlled tool blocked until the supervisor completes the resource sample.',
    idleBudgetBytes, samplingComplete,
    idleUnderArchitectureHypothesis: budgetExceeded ? false : measuredIdle.length === 2 ? true : null,
    limitations: RESOURCE_LIMITATIONS,
  }, resourceErrors));
  return probes;
}

export async function runSuite(context, { launch = launchWorker } = {}) {
  for (const label of ['a', 'b']) {
    const root = join(context.sandbox, `isolation-${label}`);
    for (const directory of ['workspace', 'agent', 'home', 'tmp']) await mkdir(join(root, directory), { recursive: true });
    await writeFile(join(root, 'workspace', 'isolation-marker.txt'), label, { mode: 0o600 });
  }
  const probes = [];
  const timeoutMs = Math.max(100, Math.floor(context.timeoutMs / 6));
  async function observe(work) {
    const startedAt = new Date().toISOString();
    const started = performance.now();
    const rows = await work();
    for (const probe of rows) Object.assign(probe.observations, { startedAt, durationMs: Number((performance.now() - started).toFixed(3)), timeoutMs, exitCode: probe.status === 'passed' ? 0 : 1 });
    probes.push(...rows);
    const checkpoint = join(context.sandbox, 'isolation-result.tmp');
    await writeFile(checkpoint, serializeEnvelope({ probes }), { mode: 0o600 });
    await rename(checkpoint, join(context.sandbox, 'result.json'));
  }
  for (const mode of ['shared-default', 'shared-private-bound', 'shared-private-unbound']) await observe(async () => [await sharedProcess(context, mode, launch)]);
  await observe(() => dedicatedWorkers(context, launch));
  return probes;
}
