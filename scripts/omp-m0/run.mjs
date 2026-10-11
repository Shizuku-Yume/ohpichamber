#!/usr/bin/env bun
import { spawn } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { finishEnvelope, identifySource, ProbeError, probeResult, safeError, serializeEnvelope } from './envelope.mjs';
import { captureProcessGroup, cleanupProcessGroup } from './process-group.mjs';

const directory = dirname(fileURLToPath(import.meta.url));
const run = { sourceRevision: null, packageVersion: null, bunVersion: Bun.version, platform: `${process.platform}-${process.arch}`, startedAt: new Date().toISOString(), command: 'bun run scripts/omp-m0/run.mjs --suite lifecycle --fixture --output <report>', fixture: true };
let sandbox;
let child;
let workerGroup;
let interrupted = false;
let deadline;
let timedOut = false;
const cancellation = new AbortController();
const probes = [];
const cleanup = { temporaryDirectoriesRemoved: false, workerExited: true, workerDescendantsExited: true, processGroupVerified: true, remainingProcessesDetected: false, signal: null };
let output;
let exitCode = 1;

function killWorker() {
  if (!child?.pid || child.exitCode !== null || child.signalCode !== null) return;
  try { if (process.platform === 'win32') child.kill('SIGKILL'); else process.kill(-child.pid, 'SIGKILL'); }
  catch { child.kill('SIGKILL'); }
}

function interrupt(signal) {
  interrupted = true;
  cleanup.signal = signal;
  cancellation.abort();
  killWorker();
}
process.on('SIGINT', () => interrupt('SIGINT'));
process.on('SIGTERM', () => interrupt('SIGTERM'));
process.stdout.on('error', () => { process.exitCode = 1; });

try {
  const args = process.argv.slice(2);
  let suite = 'lifecycle';
  let fixture = false;
  let realProvider = false;
  let timeoutMs = 60000;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--fixture') fixture = true;
    else if (args[i] === '--real-provider') realProvider = true;
    else if (args[i] === '--suite') suite = args[++i];
    else if (args[i] === '--output') output = args[++i];
    else if (args[i] === '--timeout-ms') timeoutMs = Number(args[++i]);
    else throw new ProbeError('INVALID_ARGUMENTS');
  }
  if (!fixture || !['lifecycle', 'isolation', 'capabilities', 'restart-pending'].includes(suite) || !output || !Number.isInteger(timeoutMs) || timeoutMs < 100 || timeoutMs > 300000 || (realProvider && suite !== 'capabilities')) throw new ProbeError('INVALID_ARGUMENTS');
  run.command = `bun run scripts/omp-m0/run.mjs --suite ${suite} --fixture${realProvider ? ' --real-provider' : ''} --output <report> --timeout-ms ${timeoutMs}`;
  run.suite = suite;
  run.realProvider = realProvider;
  run.timeoutMs = timeoutMs;
  deadline = setTimeout(() => {
    timedOut = true;
    cancellation.abort();
    killWorker();
  }, timeoutMs);
  const sourceDir = process.env.OMP_SOURCE_DIR ? resolve(process.env.OMP_SOURCE_DIR) : null;
  const expected = JSON.parse(await readFile(join(directory, '../../.workflow/omp-migration/m0/source-identity.json'), 'utf8'));
  Object.assign(run, await identifySource(sourceDir, expected, cancellation.signal));
  if (interrupted || timedOut) throw new ProbeError(interrupted ? 'RUN_INTERRUPTED' : 'SUITE_TIMEOUT');
  probes.push(probeResult('source-identity', 'source/package identity', 'passed', { fingerprintMatched: true, timeoutMs, exitCode: 0, cleanup: { resourcesCreated: false } }));
  // Deliberately stays inside the selected working tree and is removed on every exit.
  sandbox = await mkdtemp(join(process.cwd(), '.omp-m0-'));
  for (const name of ['home', 'agent', 'workspace', 'tmp']) await mkdir(join(sandbox, name));
  run.directories = { home: '<temporary-home>', agent: '<temporary-agent>', workspace: '<temporary-workspace>' };
  run.workerExitPolicy = 'explicit exit after suite resource cleanup; no implicit dependency installation';
  const providerEnv = {};
  if (realProvider) {
    for (const name of ['OMP_M0_PROVIDER_API', 'OMP_M0_PROVIDER_API_KEY', 'OMP_M0_PROVIDER_BASE_URL', 'OMP_M0_PROVIDER_MODEL']) {
      if (process.env[name]) providerEnv[name] = process.env[name];
    }
  }
  await writeFile(join(sandbox, 'input.json'), JSON.stringify({ sourceDir, sandbox, suite, timeoutMs, realProvider }));
  if (interrupted || timedOut) throw new ProbeError(interrupted ? 'RUN_INTERRUPTED' : 'SUITE_TIMEOUT');
  if (process.platform !== 'linux') throw new ProbeError('PROCESS_GROUP_INSPECTION_UNAVAILABLE', 'unavailable');
  child = spawn(process.execPath, ['--no-install', join(directory, 'worker.mjs'), join(sandbox, 'input.json')], {
    cwd: join(sandbox, 'workspace'),
    env: { HOME: join(sandbox, 'home'), USERPROFILE: join(sandbox, 'home'), XDG_CONFIG_HOME: join(sandbox, 'home/.config'), XDG_CACHE_HOME: join(sandbox, 'home/.cache'), TMPDIR: join(sandbox, 'tmp'), PI_CODING_AGENT_DIR: join(sandbox, 'agent'), OMP_AGENT_DIR: join(sandbox, 'agent'), PATH: '/usr/bin:/bin', NO_COLOR: '1', TERM: 'dumb', ...providerEnv },
    stdio: 'ignore',
    windowsHide: true,
    detached: process.platform !== 'win32',
  });
  cleanup.workerExited = false;
  const workerCode = await new Promise((done) => {
    child.once('error', () => done(1));
    child.once('spawn', () => { workerGroup = captureProcessGroup(child.pid); });
    child.once('exit', (code) => done(code ?? 1));
  });
  cleanup.workerExited = child.exitCode !== null || child.signalCode !== null;
  let result;
  try { result = JSON.parse(await readFile(join(sandbox, 'result.json'), 'utf8')); }
  catch { throw new ProbeError('WORKER_RESULT_UNAVAILABLE', 'unavailable'); }
  if (!Array.isArray(result.probes) || result.probes.length === 0) throw new ProbeError('EMPTY_SUITE_RESULT');
  probes.push(...result.probes);
  if (timedOut) throw new ProbeError('SUITE_TIMEOUT');
  if (interrupted) throw new ProbeError('RUN_INTERRUPTED');
  if (workerCode !== 0 && !probes.some(probe => ['failed', 'partial', 'unavailable', 'unknown'].includes(probe.status))) throw new ProbeError('WORKER_FAILED');
  exitCode = probes.some(probe => ['failed', 'partial', 'unavailable', 'unknown'].includes(probe.status)) ? 1 : 0;
} catch (error) {
  const code = interrupted ? 'RUN_INTERRUPTED' : timedOut ? 'SUITE_TIMEOUT' : safeError(error, 'RUNNER_UNAVAILABLE');
  const status = interrupted || timedOut ? 'failed' : error instanceof ProbeError ? error.status : 'unavailable';
  probes.push(probeResult('runner', 'disposable suite runner', status, { timeoutMs: run.timeoutMs ?? null, exitCode: 1 }, [code]));
} finally {
  clearTimeout(deadline);
  let safeToRemoveSandbox = true;
  if (child?.pid) {
    const groupCleanup = await cleanupProcessGroup(workerGroup ?? captureProcessGroup(child.pid));
    Object.assign(cleanup, { workerDescendantsExited: groupCleanup.allProcessesExited, processGroupVerified: groupCleanup.verified, remainingProcessesDetected: groupCleanup.remainingProcessesDetected });
    safeToRemoveSandbox = groupCleanup.verified && groupCleanup.allProcessesExited;
    if (groupCleanup.errors.length) {
      probes.push(probeResult('process-group-cleanup', 'suite worker descendant cleanup', groupCleanup.verified ? 'failed' : 'unavailable', { remainingProcessCount: groupCleanup.remainingProcessCount, terminationRequested: groupCleanup.terminationRequested, allProcessesExited: groupCleanup.allProcessesExited }, groupCleanup.errors));
      exitCode = 1;
    }
  }
  if (sandbox && safeToRemoveSandbox) {
    try {
      await rm(sandbox, { recursive: true, force: true });
      try { await stat(sandbox); } catch (error) { if (error.code === 'ENOENT') cleanup.temporaryDirectoriesRemoved = true; }
    } catch { probes.push(probeResult('cleanup', 'temporary cleanup', 'failed', {}, ['CLEANUP_FAILED'])); exitCode = 1; }
  } else if (!sandbox) cleanup.temporaryDirectoriesRemoved = true;
}

let report;
try { report = serializeEnvelope(finishEnvelope(run, probes, cleanup, exitCode)); }
catch { exitCode = 1; report = serializeEnvelope(finishEnvelope({ bunVersion: Bun.version, platform: `${process.platform}-${process.arch}`, startedAt: run.startedAt, command: 'bun run scripts/omp-m0/run.mjs' }, [probeResult('serialization', 'safe serialization', 'failed', {}, ['SERIALIZATION_FAILED'])], cleanup, 1)); }
if (output) {
  try { await writeFile(resolve(output), report, { mode: 0o600 }); }
  catch { exitCode = 1; report = serializeEnvelope(finishEnvelope(run, [probeResult('output', 'report output', 'failed', {}, ['REPORT_WRITE_FAILED'])], cleanup, 1)); }
}
process.exitCode = exitCode;
try { process.stdout.write(report); } catch { process.exitCode = 1; }