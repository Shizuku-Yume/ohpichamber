import { expect, test } from 'bun:test';
import { spawn } from 'node:child_process';
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { terminateIdentity } from './pidfd-process.mjs';

async function identityOf(pid) {
  const stat = await readFile(`/proc/${pid}/stat`, 'utf8');
  const fields = stat.slice(stat.lastIndexOf(')') + 2).trim().split(/\s+/);
  return { pid, startTicks: fields[19] };
}

async function withChild(run) {
  const directory = await mkdtemp(join(process.cwd(), '.omp-pidfd-test-'));
  let child;
  let exited;
  try {
    child = spawn(process.execPath, ['--no-install', '-e', "setTimeout(() => process.exit(0), 800); process.stdout.write('ready');"], {
      cwd: directory, env: { HOME: directory, TMPDIR: directory, PATH: '/usr/bin:/bin' },
      stdio: ['ignore', 'pipe', 'ignore'], windowsHide: true,
    });
    exited = new Promise(resolve => {
      child.once('exit', (code, signal) => resolve({ code, signal }));
      child.once('error', () => resolve({ code: null, signal: null }));
    });
    await new Promise((resolve, reject) => {
      child.stdout.once('data', resolve);
      child.once('error', () => reject(new Error('PIDFD_TEST_CHILD_UNAVAILABLE')));
      child.once('exit', () => reject(new Error('PIDFD_TEST_CHILD_EARLY_EXIT')));
    });
    return await run(await identityOf(child.pid), exited, child);
  } finally {
    // The controlled child self-expires even if the kernel lacks pidfd support.
    // Test cleanup must not introduce a numeric-PID signalling fallback.
    if (exited) await exited;
    await rm(directory, { recursive: true, force: true });
  }
}

test.skipIf(process.platform !== 'linux')('pidfd sends SIGKILL to the verified real child', async () => {
  await withChild(async (identity, exited) => {
    expect(terminateIdentity(identity, 'SIGKILL')).toBe(true);
    expect((await exited).signal).toBe('SIGKILL');
    expect(terminateIdentity(identity, 'SIGKILL')).toBe(false);
  });
});

test.skipIf(process.platform !== 'linux')('pidfd rejects stale birth identity without killing the child', async () => {
  await withChild(async (identity, _exited, child) => {
    expect(terminateIdentity({ ...identity, startTicks: '0' }, 'SIGKILL')).toBe(false);
    expect(child.exitCode).toBe(null);
    expect(child.signalCode).toBe(null);
    expect(terminateIdentity(identity, 'SIGTERM')).toBe(true);
  });
});

test.skipIf(process.platform !== 'linux')('pidfd is closed on each rejected identity', async () => {
  const identity = { ...await identityOf(process.pid), startTicks: '0' };
  // Load libc before counting descriptors so library loading is not measured.
  expect(terminateIdentity(identity, 'SIGKILL')).toBe(false);
  const before = (await readdir('/proc/self/fd')).length;
  for (let index = 0; index < 16; index++) expect(terminateIdentity(identity, 'SIGKILL')).toBe(false);
  expect((await readdir('/proc/self/fd')).length).toBe(before);
});

test('unsupported signals are rejected before native signalling', () => {
  expect(() => terminateIdentity({ pid: process.pid, startTicks: '0' }, 'INVALID')).toThrow('PIDFD_SIGNAL_INVALID');
});
