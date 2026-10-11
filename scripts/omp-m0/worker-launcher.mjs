import { spawn } from 'node:child_process';
import { inspectProcessTree, sampleResources, terminateIdentity } from './resources.mjs';
import { readFrames } from './worker-channel.mjs';

export class WorkerFailure extends Error {
  constructor(code, diagnostic = null) { super(code); this.code = code; this.diagnostic = diagnostic; }
}

export function launchWorker({ script, cwd, env, timeoutMs, args = [] }) {
  const started = performance.now();
  const child = spawn(process.execPath, ['--no-install', script, ...args], {
    cwd, env, detached: false, windowsHide: true,
    stdio: ['pipe', 'pipe', 'pipe'],
  });
  const observations = { pid: child.pid ?? null, startedAt: new Date().toISOString(), startupMs: null, exitCode: null, signal: null, stderrBytes: 0, messagesAfterClosed: 0, timedOut: false, forcedTermination: false };
  const messages = [];
  const waiters = new Set();
  let exited = false;
  let closed = false;
  let failure;
  const tracked = [];
  let identityScanObserved = false;
  const initialScan = inspectProcessTree(child.pid ?? null).then(tree => {
    if (tree.members?.some(member => member.pid === child.pid)) identityScanObserved = true;
    if (tree.members) tracked.push(...tree.members);
  });
  child.stderr.on('data', chunk => {
    observations.stderrBytes += chunk.length;
    if (observations.stderrBytes > 1024 * 1024 && failure?.code !== 'WORKER_STDERR_LIMIT') { failure = new WorkerFailure('WORKER_STDERR_LIMIT'); void terminate('SIGKILL'); wake(); }
  });
  const onParentExit = () => {
    if (exited) return;
    const identity = tracked.find(member => member.pid === child.pid);
    try { if (identity) terminateIdentity(identity, 'SIGKILL'); else if (process.platform !== 'linux') child.kill('SIGKILL'); }
    catch { /* The runner's group sweep remains the final cleanup authority. */ }
  };
  process.once('exit', onParentExit);
  const terminate = async signal => {
    const current = await inspectProcessTree(exited ? null : child.pid, tracked);
    for (const identity of [...(current.members ?? [])].reverse()) {
      if (identity.pid === child.pid) continue;
      try { terminateIdentity(identity, signal); }
      catch (error) { if (error.code !== 'ESRCH') failure ??= new WorkerFailure('WORKER_TERMINATION_FAILED'); }
    }
    if (!exited && current.members?.some(identity => identity.pid !== child.pid)) await new Promise(resolve => setTimeout(resolve, 100));
    if (!exited && child.pid) {
      const identity = current.members?.find(member => member.pid === child.pid);
      try {
        if (identity) terminateIdentity(identity, signal);
        else if (process.platform !== 'linux') child.kill(signal);
      } catch { failure ??= new WorkerFailure('WORKER_TERMINATION_FAILED'); }
    }
  };
  const wake = () => { for (const waiter of waiters) waiter(); };
  child.stdin.on('error', () => { failure ??= new WorkerFailure('WORKER_CHANNEL_FAILED'); wake(); });
  readFrames(child.stdout, message => {
    if (closed && message?.type === 'event') observations.messagesAfterClosed++;
    if (message?.type === 'ready' && observations.startupMs === null) observations.startupMs = Number((performance.now() - started).toFixed(3));
    messages.push(message);
    wake();
  }, code => { failure = new WorkerFailure(code); void terminate('SIGKILL'); wake(); });
  child.on('error', () => { failure = new WorkerFailure('WORKER_START_FAILED'); wake(); });
  const exit = new Promise(resolve => {
    child.once('error', () => { exited = true; observations.exitCode = 1; clearTimeout(deadline); process.removeListener('exit', onParentExit); resolve(); });
    child.once('exit', (code, signal) => {
      exited = true;
      observations.exitCode = code;
      observations.signal = signal;
      observations.exitedAt = new Date().toISOString();
      observations.lifetimeMs = Number((performance.now() - started).toFixed(3));
      clearTimeout(deadline);
      process.removeListener('exit', onParentExit);
      wake();
      resolve();
    });
  });
  const deadline = setTimeout(() => {
    observations.timedOut = true;
    failure = new WorkerFailure('WORKER_TIMEOUT');
    void terminate('SIGKILL');
    wake();
  }, timeoutMs);

  async function waitFor(type) {
    for (;;) {
      const index = messages.findIndex(message => message?.type === type);
      if (index !== -1) {
        const tree = await inspectProcessTree(exited ? null : child.pid, tracked);
        if (tree.members) tracked.push(...tree.members);
        if (tree.members?.some(member => member.pid === child.pid)) identityScanObserved = true;
        return messages.splice(index, 1)[0];
      }
      const error = messages.find(message => message?.type === 'error');
      if (error) {
        const allowed = ['SDK_UNAVAILABLE', 'SESSION_CREATION_FAILED', 'SESSION_PROMPT_FAILED'];
        const stages = ['fixture-import', 'sdk-import', 'mock-registration', 'capability-import'];
        const causes = ['SDK_DEPENDENCY_UNAVAILABLE', 'SDK_IMPORT_TIMEOUT', 'MODULE_NOT_FOUND', 'ERR_MODULE_NOT_FOUND', 'SDK_IMPORT_REJECTED'];
        const diagnostic = { stage: stages.includes(error.stage) ? error.stage : 'session-operation', causeCode: causes.includes(error.causeCode) ? error.causeCode : 'SESSION_OPERATION_REJECTED' };
        if (error.diagnostic) {
          const classes = ['Error', 'TypeError', 'RangeError', 'ValidationError', 'SDKError'];
          diagnostic.errorClass = classes.includes(error.diagnostic.errorClass) ? error.diagnostic.errorClass : 'SDKError';
          const names = ['memory.backend', 'worktree.onStart', 'worktree.onExit', 'worktree.cleanSource', 'disabledProviders', 'theme', 'isolation_observe', 'skills', 'rules', 'toolNames', 'parameters'];
          diagnostic.optionNamesMentioned = names.filter(name => error.diagnostic.optionNamesMentioned?.includes(name));
          diagnostic.functionNames = (error.diagnostic.functionNames ?? []).filter(name => /^[A-Za-z_$][A-Za-z0-9_$.]{0,80}$/.test(name)).slice(0, 5);
        }
        throw new WorkerFailure(allowed.includes(error.code) ? error.code : 'WORKER_PROBE_FAILED', diagnostic);
      }
      if (failure) throw failure;
      if (exited) throw new WorkerFailure('WORKER_EARLY_EXIT');
      await new Promise(resolve => {
        const waiter = () => { waiters.delete(waiter); resolve(); };
        waiters.add(waiter);
      });
    }
  }

  async function cleanup() {
    closed = true;
    await initialScan;
    const before = await inspectProcessTree(exited ? null : child.pid, tracked);
    if (before.members) tracked.push(...before.members);
    if (before.members?.some(member => member.pid === child.pid)) identityScanObserved = true;
    if (!exited && !child.stdin.destroyed) child.stdin.write(`${JSON.stringify({ type: 'shutdown' })}\n`);
    let graceTimer;
    await Promise.race([exit, new Promise(resolve => { graceTimer = setTimeout(resolve, 1000); })]);
    clearTimeout(graceTimer);
    if (!exited) {
      observations.forcedTermination = true;
      await terminate('SIGKILL');
      let killTimer;
      await Promise.race([exit, new Promise(resolve => { killTimer = setTimeout(resolve, 1000); })]);
      clearTimeout(killTimer);
    }
    // Keep start ticks so a recycled PID cannot be mistaken for an orphan.
    let tree = await inspectProcessTree(null, tracked);
    const remnantsObserved = tree.members?.length ?? null;
    if (remnantsObserved > 0) {
      await terminate('SIGKILL');
      await new Promise(resolve => setTimeout(resolve, 100));
      tree = await inspectProcessTree(null, tracked);
    }
    if (process.platform === 'linux' && !identityScanObserved) tree = { status: 'unavailable', reason: 'Worker exited before process identity inspection; the runner must audit its complete suite group.' };
    clearTimeout(deadline);
    process.removeListener('exit', onParentExit);
    return { directChildExited: exited, identityScanObserved, descendantInspection: tree, trackedPids: [...new Set(tracked.map(row => row.pid))], remnantsObserved, complete: exited && tree.status === 'passed' && tree.members.length === 0 };
  }

  return {
    observations, waitFor, cleanup,
    send(message) { if (child.stdin.destroyed || exited) throw new WorkerFailure('WORKER_NOT_CONNECTED'); child.stdin.write(`${JSON.stringify(message)}\n`); },
    sample() { return sampleResources(child.pid); },
    markClosed() { closed = true; },
  };
}
