import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { bounded, createFixtureSession, loadFixtureSDK } from './fixture.mjs';
import { ProbeError, probeResult, safeError } from './envelope.mjs';

const delay = ms => new Promise(done => setTimeout(done, ms));
function requireObservation(value, code, observations = {}) {
  if (value) return;
  const error = new ProbeError(code);
  error.observations = observations;
  throw error;
}

// A finished SDK inspection deliberately returns no pids. Check the original
// Linux process identities as well, so an empty inspection cannot hide a leak.
async function processIdentity(pid) {
  try {
    const text = await readFile(`/proc/${pid}/stat`, 'utf8');
    const fields = text.slice(text.lastIndexOf(')') + 2).trim().split(/\s+/);
    requireObservation(fields.length >= 20 && /^\d+$/.test(fields[19]), 'SHELL_PROCESS_INSPECTION_FAILED');
    return { pid, startTime: fields[19], state: fields[0] };
  } catch (error) {
    if (error.code === 'ENOENT' || error.code === 'ESRCH') return undefined;
    throw error;
  }
}

export async function runSuite(context) {
  const probes = [];
  const timeoutMs = Math.min(context.timeoutMs, 12000);
  const fixtures = new Set();
  const managers = new Set();
  const processes = [];
  let BashTool;
  let AsyncJobManager;
  let inlineBytes;
  let inlineBudget;
  try {
    await loadFixtureSDK(context);
    const load = relative => import(pathToFileURL(join(context.sourceDir, relative)).href);
    const [bash, jobs, output, metadata] = await bounded(Promise.all([
      load('packages/coding-agent/src/tools/bash.ts'),
      load('packages/coding-agent/src/async/job-manager.ts'),
      load('packages/tui/src/tools/streaming-output.ts'),
      load('packages/coding-agent/src/tools/output-meta.ts'),
    ]), timeoutMs, 'SHELL_SDK_IMPORT_TIMEOUT');
    BashTool = bash.BashTool;
    AsyncJobManager = jobs.AsyncJobManager;
    inlineBytes = output.DEFAULT_MAX_BYTES;
    inlineBudget = metadata.resolveInlineByteCapBudget;
  } catch (error) {
    return [probeResult('guest-shell-sdk', 'real OMP BashTool execution availability', 'unavailable', { timeoutMs, exitCode: 1, cleanup: { resourcesCreated: false } }, [safeError(error, 'SHELL_SDK_UNAVAILABLE')])];
  }

  async function until(read, code) {
    const deadline = performance.now() + timeoutMs;
    do {
      const value = await read();
      if (value) return value;
      await delay(20);
    } while (performance.now() < deadline);
    throw new ProbeError(code);
  }
  async function exited() {
    for (const original of processes) {
      const current = await processIdentity(original.pid);
      if (current?.startTime === original.startTime && current.state !== 'Z' && current.state !== 'X') return false;
    }
    return true;
  }
  function createManager(options = {}) {
    const manager = new AsyncJobManager(options);
    managers.add(manager);
    return manager;
  }
  async function create(manager, ownerId, ownsManager = false) {
    const fixture = await createFixtureSession(context, {
      persistent: true,
      responses: [{ content: ['Controlled shell fixture.'] }],
      agentId: ownerId,
      asyncJobManager: manager,
      ownedAsyncJobManager: ownsManager ? manager : undefined,
      settings: { 'async.enabled': true, 'bash.autoBackground.enabled': false },
    });
    fixtures.add(fixture);
    // Only supply the ToolSession context. BashTool owns registration, native
    // execution, output capture and abort; there is no fixture run callback.
    fixture.bash = new BashTool({
      cwd: context.workspace,
      settings: fixture.session.settings,
      asyncJobManager: manager,
      getAgentId: () => fixture.session.getAgentId(),
      getSessionId: () => fixture.manager.getSessionId(),
      getSessionFile: () => fixture.manager.getSessionFile(),
      getArtifactsDir: () => fixture.manager.getArtifactsDir(),
      sessionManager: fixture.manager,
      allocateOutputArtifact: type => fixture.manager.allocateArtifactPath(type),
    });
    return fixture;
  }
  async function start(fixture, command, options = {}) {
    requireObservation(fixture, 'SHELL_SESSION_NOT_CREATED');
    const result = await fixture.bash.execute('m0-shell', { command, async: true, timeout: 0, ...options });
    const details = result.details?.async;
    requireObservation(details?.state === 'running' && details.type === 'bash' && details.jobId, 'SHELL_START_HANDLE_MISSING');
    const manager = fixture.session.asyncJobManager;
    const job = manager.getJob(details.jobId);
    requireObservation(job && job.type === 'bash', 'SHELL_JOB_NOT_REGISTERED');
    // These probes inspect execution, not model wakeups. Prevent the real
    // session delivery sink from starting unrelated controlled-model turns.
    manager.acknowledgeDeliveries([job.id]);
    return job;
  }
  async function running(fixture, job, marker) {
    return until(async () => {
      const inspection = fixture.session.inspectAsyncJob(job.id);
      if (job.status !== 'running' || !inspection?.output?.includes(marker) || !inspection.pids.length) return false;
      const identities = await Promise.all(inspection.pids.map(processIdentity));
      if (identities.some(identity => !identity || identity.state === 'Z' || identity.state === 'X')) return false;
      processes.push(...identities);
      return inspection;
    }, 'SHELL_LIVE_OUTPUT_OR_PROCESS_MISSING');
  }
  async function settle(job) {
    await bounded(job.promise, timeoutMs, 'SHELL_SETTLEMENT_TIMEOUT');
    requireObservation(job.status !== 'running' && Number.isFinite(job.endTime), 'SHELL_TERMINAL_STATUS_MISSING');
  }
  async function cancel(fixture, job) {
    requireObservation(fixture.session.cancelAsyncJob(job.id), 'SHELL_CANCEL_REJECTED');
    await settle(job);
  }
  async function observe(id, capability, work) {
    const startedAt = new Date().toISOString();
    const started = performance.now();
    let result;
    try { result = probeResult(id, capability, 'passed', await bounded(work(), timeoutMs)); }
    catch (error) {
      result = probeResult(id, capability, error instanceof ProbeError ? error.status : 'failed', error instanceof ProbeError ? error.observations ?? {} : {}, [safeError(error, 'SHELL_SDK_OPERATION_FAILED')]);
      // A failed observation must not leave a capacity slot or a native
      // command running into the next independent observation.
      for (const ownedManager of managers) {
        ownedManager.cancelAll();
        try { await bounded(ownedManager.waitForAll(), timeoutMs, 'SHELL_FAILED_PROBE_REAP_TIMEOUT'); }
        catch (cleanupError) { result.errors.push(safeError(cleanupError, 'SHELL_FAILED_PROBE_REAP_FAILED')); }
      }
    }
    Object.assign(result.observations, { startedAt, durationMs: Number((performance.now() - started).toFixed(3)), timeoutMs, exitCode: result.status === 'passed' ? 0 : 1 });
    probes.push(result);
  }

  let manager;
  let primary;
  let sibling;
  try {
    await observe('guest-shell-start-output', 'real asynchronous command start and live output inspection', async () => {
      manager = createManager({ maxRunningJobs: 2 });
      primary = await create(manager, 'M0ShellOwner', true);
      const job = await start(primary, "printf 'm0-live-start\\n'; /usr/bin/sleep 1; printf 'm0-live-end\\n'");
      const live = await running(primary, job, 'm0-live-start');
      const snapshot = primary.session.getAsyncJobSnapshot();
      const row = snapshot?.running.find(row => row.id === job.id);
      requireObservation(row?.status === 'running' && row.type === 'bash' && !live.output.includes('m0-live-end'), 'SHELL_RUNNING_SNAPSHOT_MISMATCH');
      requireObservation(live.cwd === context.workspace && live.command === job.process.command, 'SHELL_EXECUTION_CONTEXT_MISMATCH');
      const liveBytes = Buffer.byteLength(live.output);
      await settle(job);
      const ended = primary.session.inspectAsyncJob(job.id);
      const recent = primary.session.getAsyncJobSnapshot()?.recent.find(row => row.id === job.id);
      requireObservation(job.status === 'completed' && recent?.status === 'completed' && ended?.exitCode === 0 && ended.output.includes('m0-live-start') && ended.output.includes('m0-live-end') && ended.pids.length === 0, 'SHELL_COMPLETION_OR_OUTPUT_MISMATCH');
      return { seam: 'BashTool.execute async -> native executeBash -> AsyncJobManager; AgentSession snapshot and inspect', runningStatus: row.status, terminalStatus: recent.status, commandExitCode: ended.exitCode, liveOutputBytes: liveBytes, completedOutputBytes: Buffer.byteLength(ended.output), liveProcessCount: live.pids.length, workspaceMatched: true, startAndEndMarkersObserved: true, rawSuccessfulExitCodePresent: job.latestDetails?.exitCode !== undefined, successfulExitCodeSource: 'AgentSession.inspectAsyncJob synthesizes zero for completed bash', runtimeEvidence: 'one disposable Linux SDK worker, not a connected service' };
    });

    await observe('guest-shell-nonzero', 'nonzero exit status and retained failed output', async () => {
      const job = await start(primary, "printf 'm0-nonzero\\n'; exit 42");
      await settle(job);
      const inspection = primary.session.inspectAsyncJob(job.id);
      const recent = primary.session.getAsyncJobSnapshot()?.recent.find(row => row.id === job.id);
      requireObservation(job.status === 'failed' && recent?.status === 'failed' && inspection?.exitCode === 42 && job.latestDetails?.exitCode === 42 && inspection.output.includes('m0-nonzero'), 'SHELL_NONZERO_STATUS_MISMATCH');
      requireObservation(!primary.session.cancelAsyncJob(job.id), 'SHELL_TERMINAL_CANCEL_ACCEPTED');
      return { terminalStatus: recent.status, commandExitCode: inspection.exitCode, rawReportedExitCode: job.latestDetails.exitCode, failedOutputBytes: Buffer.byteLength(inspection.output), endedAtRecorded: Number.isFinite(recent.endTime), repeatedStopAccepted: false };
    });

    await observe('guest-shell-output-limit', 'bounded inline output and raw SDK output artifact', async () => {
      const job = await start(primary, "printf 'm0-output-head\\n'; /usr/bin/seq 1 20000; printf 'm0-output-tail\\n'");
      await settle(job);
      const inspection = primary.session.inspectAsyncJob(job.id);
      const truncation = job.latestDetails?.meta?.truncation;
      requireObservation(job.status === 'completed' && inspection?.exitCode === 0 && truncation?.totalBytes > inlineBytes && inspection.artifactId, 'SHELL_OUTPUT_TRUNCATION_MISSING');
      const outputBytes = Buffer.byteLength(inspection.output);
      const budget = inlineBudget(primary.session.settings);
      // OutputSink counts the middle-elision marker and separators in
      // outputBytes; only the retained head/tail data shares the 50 KiB cap.
      const retainedDataBytes = truncation.totalBytes - truncation.elidedBytes;
      requireObservation(truncation.direction === 'middle' && truncation.elidedBytes > 0 && retainedDataBytes > 0 && retainedDataBytes <= inlineBytes && truncation.outputBytes >= retainedDataBytes && outputBytes >= truncation.outputBytes && outputBytes <= budget && inspection.output.includes('m0-output-tail'), 'SHELL_OUTPUT_BOUND_OR_TAIL_MISMATCH', { outputBytes, retainedDataBytes, composedBodyBytes: truncation.outputBytes, inlineDataLimitBytes: inlineBytes, finalInlineLimitBytes: budget });
      const artifactPath = await primary.manager.getArtifactPath(inspection.artifactId);
      requireObservation(artifactPath, 'SHELL_OUTPUT_ARTIFACT_NOT_RESOLVABLE');
      const raw = await readFile(artifactPath, 'utf8');
      requireObservation(Buffer.byteLength(raw) === truncation.totalBytes && raw.startsWith('m0-output-head\n') && raw.endsWith('m0-output-tail\n'), 'SHELL_RAW_OUTPUT_ARTIFACT_MISMATCH');
      return { terminalStatus: job.status, generatedBytes: truncation.totalBytes, retainedDataBytes, composedBodyBytes: truncation.outputBytes, inlineCompositionOverheadBytes: truncation.outputBytes - retainedDataBytes, finalNoticeBytes: outputBytes - truncation.outputBytes, retainedInlineBytes: outputBytes, inlineDataLimitBytes: inlineBytes, finalInlineLimitBytes: budget, rawArtifactBytes: Buffer.byteLength(raw), truncationDirection: truncation.direction, rawArtifactResolved: true, artifactDiskCap: { sourceDefaultBytes: 16 * 1024 * 1024, capOverflowExercised: false }, retrieval: 'inspectAsyncJob returns the latest inline string and an optional artifactId, not a byte cursor' };
    });

    await observe('guest-shell-owner-cancel', 'owner-filtered snapshots, inspection and cancellation of real commands', async () => {
      requireObservation(primary && manager, 'SHELL_SESSION_NOT_CREATED');
      sibling = await create(manager, 'M0ShellSibling');
      const ownJob = await start(primary, "printf 'm0-own-running\\n'; /usr/bin/sleep 30; printf 'm0-own-unexpected\\n'");
      const otherJob = await start(sibling, "printf 'm0-other-running\\n'; /usr/bin/sleep 30; printf 'm0-other-unexpected\\n'");
      const ownLive = await running(primary, ownJob, 'm0-own-running');
      const otherLive = await running(sibling, otherJob, 'm0-other-running');
      const ownRows = primary.session.getAsyncJobSnapshot().running;
      const otherRows = sibling.session.getAsyncJobSnapshot().running;
      requireObservation(ownRows.length === 1 && ownRows[0].id === ownJob.id && otherRows.length === 1 && otherRows[0].id === otherJob.id && manager.getRunningJobs({ ownerId: 'M0ShellOwner' }).length === 1, 'SHELL_OWNER_LIST_LEAK');
      requireObservation(primary.session.inspectAsyncJob(otherJob.id) === undefined && sibling.session.inspectAsyncJob(ownJob.id) === undefined && !primary.session.cancelAsyncJob(otherJob.id) && !manager.cancel(otherJob.id, { ownerId: 'M0ShellOwner' }) && otherJob.status === 'running', 'SHELL_OWNER_INSPECT_OR_CANCEL_LEAK');
      requireObservation(manager.atCapacity, 'SHELL_RUNNING_CAPACITY_NOT_OBSERVED');
      let capacityRejected = false;
      try { await start(primary, "printf 'm0-capacity-unexpected\\n'"); }
      catch (error) { capacityRejected = error instanceof Error && error.message.startsWith('Background job limit reached (2).'); }
      requireObservation(capacityRejected && manager.getRunningJobs().length === 2, 'SHELL_CAPACITY_EXCEEDED');
      await cancel(primary, ownJob);
      requireObservation(ownJob.status === 'cancelled' && otherJob.status === 'running' && !primary.session.inspectAsyncJob(ownJob.id).output?.includes('m0-own-unexpected'), 'SHELL_STOP_STATE_OR_SIBLING_MISMATCH');
      const ownInspection = primary.session.inspectAsyncJob(ownJob.id);
      requireObservation(!primary.session.cancelAsyncJob(ownJob.id) && !primary.session.cancelAsyncJob('m0-unknown-job'), 'SHELL_REPEATED_OR_UNKNOWN_STOP_ACCEPTED');
      await cancel(sibling, otherJob);
      await until(exited, 'SHELL_CANCELLED_PROCESS_STILL_LIVE');
      requireObservation(otherJob.status === 'cancelled' && manager.getRunningJobs().length === 0, 'SHELL_CANCELLED_STATUS_LOST');
      return { sameManagerDistinctAgentOwners: true, ownerFilteredRunningCounts: [ownRows.length, otherRows.length], foreignInspectionReturned: false, foreignStopAccepted: false, configuredRunningLimit: 2, capacityRejected, terminalStatuses: [ownJob.status, otherJob.status], stopExitCode: ownInspection.exitCode ?? null, underlyingProcessesExited: true, capturedLiveProcessCounts: [ownLive.pids.length, otherLive.pids.length], siblingSurvivedOtherOwnerStop: true, limitation: 'agent owner filtering is not session, project or Guest capability authorization' };
    });

    await observe('guest-shell-retention', 'retention expiry removes real command inspection and snapshots', async () => {
      const retentionMs = 600;
      const consumedResultEvictionMs = 100;
      const retainedManager = createManager({ retentionMs, consumedResultEvictionMs });
      const retained = await create(retainedManager, 'M0ShellRetention', true);
      const job = await start(retained, "printf 'm0-retained\\n'");
      await settle(job);
      requireObservation(retained.session.inspectAsyncJob(job.id)?.output?.includes('m0-retained') && retained.session.getAsyncJobSnapshot().recent.some(row => row.id === job.id) && !retainedManager.isJobResultConsumed(job.id), 'SHELL_RETAINED_RESULT_MISSING');
      const settledAt = performance.now();
      await until(() => !retainedManager.getJob(job.id), 'SHELL_RETENTION_NOT_EVICTED');
      const unconsumedEvictionMs = performance.now() - settledAt;
      requireObservation(retained.session.inspectAsyncJob(job.id) === undefined && !retained.session.getAsyncJobSnapshot().recent.some(row => row.id === job.id), 'SHELL_EVICTED_HANDLE_STILL_READABLE');
      const consumed = await start(retained, "printf 'm0-consumed\\n'");
      await settle(consumed);
      requireObservation(retainedManager.consumeJobResults([consumed.id]) === 1, 'SHELL_RESULT_NOT_CONSUMED');
      const consumedAt = performance.now();
      await until(() => !retainedManager.getJob(consumed.id), 'SHELL_CONSUMED_RESULT_NOT_EVICTED');
      requireObservation(retained.session.inspectAsyncJob(consumed.id) === undefined, 'SHELL_CONSUMED_HANDLE_STILL_READABLE');
      return { configuredRetentionMs: retentionMs, configuredConsumedEvictionMs: consumedResultEvictionMs, observedUnconsumedEvictionMs: Number(unconsumedEvictionMs.toFixed(3)), observedConsumedEvictionMs: Number((performance.now() - consumedAt).toFixed(3)), bothHandlesUnavailableAfterEviction: true, defaultRetentionFromPinnedSource: { unconsumedMs: 300000, consumedMs: 30000, defaultDurationsRuntimeExercised: false }, limitation: 'SDK expiry is time-based; Guest newest-200 ended history requires a separate observation store' };
    });

    await observe('guest-shell-dispose', 'owning session shutdown cancels and reaps a live native command', async () => {
      const job = await start(primary, "printf 'm0-dispose-running\\n'; /usr/bin/sleep 30; printf 'm0-dispose-unexpected\\n'");
      const live = await running(primary, job, 'm0-dispose-running');
      await bounded(primary.dispose(), timeoutMs, 'SHELL_SESSION_DISPOSE_TIMEOUT');
      fixtures.delete(primary);
      await settle(job);
      await until(exited, 'SHELL_DISPOSED_PROCESS_STILL_LIVE');
      requireObservation(primary.session.isDisposed && job.status === 'cancelled' && manager.getAllJobs().length === 0 && manager.getDeliveryState().queued === 0 && primary.session.inspectAsyncJob(job.id) === undefined, 'SHELL_DISPOSE_STATE_NOT_CLEARED');
      return { owningSessionDisposed: true, terminalStatus: job.status, capturedLiveProcessCount: live.pids.length, underlyingProcessesExited: true, managerRowsAfterDispose: manager.getAllJobs().length, pendingDeliveriesAfterDispose: manager.getDeliveryState().queued, handleReadableAfterDispose: false };
    });

    probes.push(probeResult('guest-shell-service-boundary', 'SDK execution owner and remaining service requirements', 'passed', {
      evidence: 'pinned-source inspection; boundary classification only, not service runtime acceptance',
      executionOwner: 'native BashTool execution retained by worker-local AsyncJobManager and AgentSession',
      snapshotMethods: ['getAsyncJobSnapshot', 'inspectAsyncJob', 'cancelAsyncJob'],
      serviceAcceptanceExercised: false,
      reconnectAndWorkerRestart: 'requires service registry and execution lifecycle; no reconstructable cross-worker SDK handle',
      outputCursor: 'requires service byte-cursor storage with skipped detection; SDK inline strings can elide output',
      sessionProjectGlobalScope: 'requires service ownership index and Guest capability checks; agent ownerId is not project authorization',
      endedHistory: 'requires Guest observation retention capped at newest 200; SDK job rows expire by time',
      terminalReason: 'service must preserve stop and timeout reasons; SDK failed status alone does not distinguish nonzero exit from timeout',
      scopeOfPass: 'identifying these boundaries only; task 12 must exercise service guarantees',
    }));
  } finally {
    await observe('guest-shell-cleanup', 'all created SDK sessions, managers and captured native processes cleaned up', async () => {
      const failures = [];
      for (const fixture of fixtures) {
        try { await bounded(fixture.dispose(), timeoutMs, 'SHELL_CLEANUP_SESSION_TIMEOUT'); }
        catch (error) { failures.push(safeError(error, 'SHELL_CLEANUP_SESSION_FAILED')); }
      }
      for (const ownedManager of managers) {
        try {
          const drained = await bounded(ownedManager.dispose({ timeoutMs: 3000 }), timeoutMs, 'SHELL_CLEANUP_MANAGER_TIMEOUT');
          if (!drained || ownedManager.getAllJobs().length !== 0 || ownedManager.getDeliveryState().queued !== 0) failures.push('SHELL_CLEANUP_MANAGER_NOT_DRAINED');
        } catch (error) { failures.push(safeError(error, 'SHELL_CLEANUP_MANAGER_FAILED')); }
      }
      await until(exited, 'SHELL_CLEANUP_PROCESS_STILL_LIVE');
      requireObservation(failures.length === 0, 'SHELL_CLEANUP_FAILED', { sessionCount: fixtures.size, managerCount: managers.size, failureCodes: failures });
      return { sessionsDisposed: true, managersDisposed: true, managerCount: managers.size, trackedNativeProcessCount: processes.length, trackedNativeProcessesExited: true, directoryAndWorkerGroupCleanupOwner: 'outer disposable runner', cleanupRunsInFinally: true };
    });
  }
  return probes;
}
