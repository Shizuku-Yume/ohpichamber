import { spawn } from 'node:child_process';
import { readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { inspectProcessTree, terminateIdentity } from './resources.mjs';
import { probeResult, safeError } from './envelope.mjs';

const workerPath = join(import.meta.dir, 'restart-pending-worker.mjs');
const spawnErrors = new WeakMap();

function waitForExit(child, timeoutMs = null) {
  return new Promise(resolve => {
    if (child.exitCode !== null || child.signalCode !== null) return resolve({ code: child.exitCode, signal: child.signalCode, error: null, timedOut: false });
    let timer;
    let settled = false;
    const cleanup = () => { child.removeListener('error', onError); child.removeListener('exit', onExit); clearTimeout(timer); };
    const finish = value => { if (!settled) { settled = true; cleanup(); resolve(value); } };
    const onError = error => finish({ code: 1, signal: null, error, timedOut: false });
    const onExit = (code, signal) => finish({ code, signal, error: null, timedOut: false });
    child.once('error', onError);
    child.once('exit', onExit);
    if (timeoutMs !== null) timer = setTimeout(() => finish({ code: null, signal: null, error: null, timedOut: true }), timeoutMs);
  });
}

function boundedExit(child, timeoutMs) { return waitForExit(child, timeoutMs); }

async function readJson(path) {
  try { return JSON.parse(await readFile(path, 'utf8')); }
  catch { return undefined; }
}

async function captureIdentity(child, timeoutMs) {
  const deadline = Date.now() + Math.min(timeoutMs, 2000);
  while (Date.now() < deadline && child.exitCode === null && child.signalCode === null && !spawnErrors.has(child)) {
    const tree = await inspectProcessTree(child.pid);
    const identity = tree.members?.find(member => member.pid === child.pid);
    if (identity) return { pid: identity.pid, startTicks: identity.startTicks };
    await new Promise(resolve => setTimeout(resolve, 10));
  }
  return null;
}

export async function waitForMarkerOrError(markerPath, resultPath, errorPath, child, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const spawnError = spawnErrors.get(child);
    if (spawnError) return { kind: 'error', value: { error: 'RESTART_PENDING_WORKER_SPAWN_FAILED' } };
    const marker = await readJson(markerPath);
    if (marker) return { kind: 'marker', value: marker };
    const result = await readJson(resultPath);
    if (result) return { kind: 'result', value: result };
    const error = await readJson(errorPath);
    if (error) return { kind: 'error', value: error };
    if (child.exitCode !== null || child.signalCode !== null) {
      // Terminal output can be published after an earlier read, but before exit.
      // Once the worker has exited, reread its final state before declaring failure.
      const finalMarker = await readJson(markerPath);
      if (finalMarker) return { kind: 'marker', value: finalMarker };
      const finalResult = await readJson(resultPath);
      if (finalResult) return { kind: 'result', value: finalResult };
      const finalError = await readJson(errorPath);
      if (finalError) return { kind: 'error', value: finalError };
      return { kind: 'error', value: { error: 'RESTART_PENDING_WORKER_EARLY_EXIT' } };
    }
    await new Promise(resolve => setTimeout(resolve, 10));
  }
  throw new Error('RESTART_PENDING_MARKER_TIMEOUT');
}

function spawnPhase(context, input) {
  const env = {
    HOME: join(context.sandbox, 'home'), USERPROFILE: join(context.sandbox, 'home'),
    XDG_CONFIG_HOME: join(context.sandbox, 'home/.config'), XDG_CACHE_HOME: join(context.sandbox, 'home/.cache'),
    TMPDIR: join(context.sandbox, 'tmp'), PI_CODING_AGENT_DIR: join(context.sandbox, 'agent'), OMP_AGENT_DIR: join(context.sandbox, 'agent'),
    PATH: '/usr/bin:/bin', NO_COLOR: '1', TERM: 'dumb',
  };
  const child = spawn(process.execPath, ['--no-install', workerPath, input], { cwd: join(context.sandbox, 'workspace'), env, stdio: 'ignore', detached: false });
  child.once('error', error => spawnErrors.set(child, error));
  return child;
}

async function stopChild(child, identity, timeoutMs) {
  if (!child) return { stopped: true, code: null, signal: null, timedOut: false };
  if (child.exitCode === null && child.signalCode === null) {
    try {
      if (identity) terminateIdentity(identity, 'SIGKILL');
      else child.kill('SIGKILL');
    } catch { try { child.kill('SIGKILL'); } catch {} }
  }
  const exit = await boundedExit(child, Math.min(timeoutMs, 2000));
  if (exit.timedOut) { try { child.kill('SIGKILL'); } catch {} }
  return { stopped: !exit.timedOut, code: exit.code, signal: exit.signal, timedOut: exit.timedOut === true };
}

const unavailableCodes = new Set(['SDK_DEPENDENCY_UNAVAILABLE', 'SDK_IMPORT_TIMEOUT', 'MODULE_NOT_FOUND', 'ERR_MODULE_NOT_FOUND']);

export function failureProbes(code, observations = {}) {
  const status = unavailableCodes.has(code) ? 'unavailable' : 'failed';
  return [
    probeResult('restart-pending.approval', 'Approval pending worker restart cleanup', status, observations, [code]),
    probeResult('restart-pending.question', 'Question pending worker restart cleanup', status, observations, [code]),
    probeResult('restart-pending.cleanup', 'Restart-pending worker cleanup', status, observations, [code]),
  ];
}
function controllerFailureCode(error) {
  if (error instanceof Error && /^RESTART_PENDING_/.test(error.message)) return error.message;
  return safeError(error, 'RESTART_PENDING_PROBE_FAILED');
}

export async function runSuite(context) {
  const markerFile = join(context.sandbox, 'restart-pending.marker.json');
  const resultFile = join(context.sandbox, 'restart-pending.result.json');
  const errorFile = join(context.sandbox, 'restart-pending.error.json');
  const pendingInputFile = join(context.sandbox, 'restart-pending.pending-input.json');
  const freshInputFile = join(context.sandbox, 'restart-pending.fresh-input.json');
  const common = { sourceDir: context.sourceDir, sandbox: context.sandbox, timeoutMs: context.timeoutMs, markerFile, resultFile, errorFile };
  let pendingChild;
  let freshChild;
  let pendingIdentity;
  let freshIdentity;
  let pendingMarker;
  let freshResult;
  let failureCode;
  let pendingCleanup;
  let freshCleanup;
  try {
    await Promise.all([rm(markerFile, { force: true }), rm(resultFile, { force: true }), rm(errorFile, { force: true }), rm(join(context.sandbox, 'restart-pending.events.jsonl'), { force: true })]);
    await writeFile(pendingInputFile, JSON.stringify({ ...common, phase: 'pending' }));
    pendingChild = spawnPhase(context, pendingInputFile);
    pendingIdentity = await captureIdentity(pendingChild, context.timeoutMs);
    const pendingState = await waitForMarkerOrError(markerFile, resultFile, errorFile, pendingChild, context.timeoutMs);
    if (pendingState.kind !== 'marker') { failureCode = pendingState.value.error ?? 'RESTART_PENDING_WORKER_FAILED'; }
    else {
      pendingMarker = pendingState.value;
      pendingCleanup = await stopChild(pendingChild, pendingIdentity, context.timeoutMs);
      await writeFile(freshInputFile, JSON.stringify({ ...common, phase: 'fresh' }));
      freshChild = spawnPhase(context, freshInputFile);
      freshIdentity = await captureIdentity(freshChild, context.timeoutMs);
      const freshState = await waitForMarkerOrError(join(context.sandbox, 'restart-pending.fresh-marker.json'), resultFile, errorFile, freshChild, context.timeoutMs);
      if (freshState.kind !== 'result') failureCode = freshState.value.error ?? 'RESTART_PENDING_FRESH_WORKER_FAILED';
      else {
        freshResult = freshState.value;
        const naturalExit = await boundedExit(freshChild, Math.min(context.timeoutMs, 2000));
        freshCleanup = naturalExit.timedOut ? await stopChild(freshChild, freshIdentity, context.timeoutMs) : { stopped: true, code: naturalExit.code, signal: naturalExit.signal, timedOut: false };
      }
    }
  } catch (error) {
    failureCode = controllerFailureCode(error);
  } finally {
    if (!pendingCleanup) pendingCleanup = await stopChild(pendingChild, pendingIdentity, context.timeoutMs);
    if (!freshCleanup) freshCleanup = await stopChild(freshChild, freshIdentity, context.timeoutMs);
  }

  const identitiesDistinct = Boolean(pendingIdentity && freshIdentity && (pendingIdentity.pid !== freshIdentity.pid || pendingIdentity.startTicks !== freshIdentity.startTicks));
  const cleanup = {
    pendingWorkerStopped: pendingCleanup?.stopped === true,
    freshWorkerStopped: freshCleanup?.stopped === true,
    pendingIdentity,
    freshIdentity,
    distinctWorker: identitiesDistinct,
    pendingExitSignal: pendingCleanup?.signal ?? null,
    freshExitCode: freshCleanup?.code ?? null,
  };
  if (failureCode || !pendingMarker || !freshResult) return failureProbes(failureCode ?? 'RESTART_PENDING_EVIDENCE_UNAVAILABLE', { ...cleanup, pendingObservedBeforeStop: pendingMarker?.approvalPending === true && pendingMarker?.questionPending === true, freshSessionReady: freshResult?.freshSessionReady === true });
  return assessRestartEvidence({ pendingMarker, freshResult, cleanup, identitiesDistinct });
}

export function assessRestartEvidence({ pendingMarker, freshResult, cleanup, identitiesDistinct }) {
  if (!pendingMarker || !freshResult) return failureProbes('RESTART_PENDING_EVIDENCE_UNAVAILABLE', cleanup);
  const eventCounts = freshResult.eventCounts;
  const approvalEvidenceValid = pendingMarker.approvalPending === true && pendingMarker.toolExecutionCount === 0 && freshResult.approval.pendingObservedBeforeStop === true && freshResult.approval.before.toolExecutionCount === 0 && freshResult.approval.after.toolExecutionCount === freshResult.approval.before.toolExecutionCount + 1 && freshResult.approval.lateExecutionObserved === false;
  const questionEvidenceValid = pendingMarker.questionPending === true && pendingMarker.answerCount === 0 && freshResult.question.pendingObservedBeforeStop === true && freshResult.question.before.answerCount === 0 && freshResult.question.after.answerCount === freshResult.question.before.answerCount + 1 && freshResult.question.lateAnswerObserved === false;
  const eventEvidenceValid = Number.isInteger(eventCounts?.lateObservationWindowMs) && eventCounts.lateObservationWindowMs > 0 && eventCounts.pendingAtStop === pendingMarker.eventCount && eventCounts.pendingAfterStop === eventCounts.pendingAtStop;
  const cleanupPassed = cleanup.pendingWorkerStopped && cleanup.freshWorkerStopped && cleanup.freshExitCode === 0 && cleanup.distinctWorker;
  const boundaryValid = cleanupPassed && freshResult.freshSessionReady === true && identitiesDistinct && freshResult.distinctWorker === true;
  const commonObservations = {
    pendingObservedBeforeStop: pendingMarker.approvalPending === true && pendingMarker.questionPending === true,
    workerStopped: cleanup.pendingWorkerStopped,
    freshWorkerStarted: freshResult.freshSessionReady === true,
    distinctWorker: identitiesDistinct && freshResult.distinctWorker === true,
    staleResolution: { status: 'unavailable', reason: 'The controlled fixture exposes no cross-worker request handle or durable pending registry.' },
    eventCounts,
  };
  const approvalValid = approvalEvidenceValid && eventEvidenceValid && boundaryValid;
  const questionValid = questionEvidenceValid && eventEvidenceValid && boundaryValid;
  const approvalObservations = { ...commonObservations, pendingObservedBeforeStop: freshResult.approval.pendingObservedBeforeStop, staleResolutionRejected: freshResult.approval.staleResolutionRejected, lateExecutionObserved: freshResult.approval.lateExecutionObserved, before: freshResult.approval.before, after: freshResult.approval.after, toolExecutionCountBeforeStop: pendingMarker.toolExecutionCount, measurementValid: approvalValid };
  const questionObservations = { ...commonObservations, pendingObservedBeforeStop: freshResult.question.pendingObservedBeforeStop, staleResolutionRejected: freshResult.question.staleResolutionRejected, lateAnswerObserved: freshResult.question.lateAnswerObserved, before: freshResult.question.before, after: freshResult.question.after, answerCountBeforeStop: pendingMarker.answerCount, measurementValid: questionValid };
  return [
    probeResult('restart-pending.approval', 'Approval pending worker restart cleanup', approvalValid ? 'partial' : 'failed', approvalObservations, approvalValid ? ['APPROVAL_RESTART_REGISTRY_UNAVAILABLE'] : ['APPROVAL_RESTART_MEASUREMENTS_INVALID']),
    probeResult('restart-pending.question', 'Question pending worker restart cleanup', questionValid ? 'partial' : 'failed', questionObservations, questionValid ? ['QUESTION_RESTART_REGISTRY_UNAVAILABLE'] : ['QUESTION_RESTART_MEASUREMENTS_INVALID']),
    probeResult('restart-pending.cleanup', 'Restart-pending worker cleanup', cleanupPassed ? 'passed' : 'failed', { ...cleanup, eventCounts }, cleanupPassed ? [] : ['RESTART_WORKER_CLEANUP_INCOMPLETE']),
  ];
}
