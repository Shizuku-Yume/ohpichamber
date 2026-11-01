import { describe, expect, test } from 'bun:test';
import { createHash } from 'node:crypto';
import { spawn, spawnSync } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { identifySource } from './envelope.mjs';
import { cleanupProcessGroup } from './process-group.mjs';
import { terminateIdentity } from './pidfd-process.mjs';

const runner = resolve('scripts/omp-m0/run.mjs');

async function disposable(work) {
  const directory = await mkdtemp(join(process.cwd(), '.omp-m0-test-'));
  try { return await work(directory); }
  finally { await rm(directory, { recursive: true, force: true }); }
}

describe('M0 disposable runner failure contract', () => {
  test('cleanup refuses unowned groups without signaling the runner itself', async () => {
    const cleanup = await cleanupProcessGroup({ pid: process.pid, startTime: '0', isolated: true });
    expect(cleanup.verified).toBe(false);
    expect(cleanup.terminationRequested).toBe(false);
    expect(cleanup.allProcessesExited).toBe(false);
    expect(cleanup.errors).toEqual([process.platform === 'linux' ? 'PROCESS_GROUP_OWNERSHIP_UNAVAILABLE' : 'PROCESS_GROUP_INSPECTION_UNAVAILABLE']);
  });

  test('missing source emits one safe envelope and nonzero status', async () => {
    await disposable(async directory => {
      const output = join(directory, 'report.json');
      const child = spawnSync(process.execPath, [runner, '--suite', 'lifecycle', '--fixture', '--output', output], { env: { PATH: '/usr/bin:/bin', HOME: directory }, encoding: 'utf8', timeout: 10000 });
      expect(child.status).toBe(1);
      expect(child.stderr).toBe('');
      const report = JSON.parse(child.stdout);
      expect(report.summary.unavailable).toBe(1);
      expect(report.probes[0].errors).toEqual(['SOURCE_NOT_SELECTED']);
      expect(report.run.exitCode).toBe(1);
      expect(report.cleanup.temporaryDirectoriesRemoved).toBe(true);
      expect(await readFile(output, 'utf8')).toBe(child.stdout);
      expect(child.stdout).not.toContain(directory);
    });
  });

  test('invalid suite is rejected before reading source', async () => {
    await disposable(async directory => {
      const child = spawnSync(process.execPath, [runner, '--suite', 'invalid', '--fixture', '--output', join(directory, 'report.json')], { env: { PATH: '/usr/bin:/bin', HOME: directory }, encoding: 'utf8', timeout: 10000 });
      expect(child.status).toBe(1);
      expect(child.stderr).toBe('');
      expect(JSON.parse(child.stdout).probes[0].errors).toEqual(['INVALID_ARGUMENTS']);
    });
  });

  test('source mismatch cannot acquire the pinned revision', async () => {
    await disposable(async directory => {
      await mkdir(join(directory, 'packages/coding-agent'), { recursive: true });
      await writeFile(join(directory, 'package.json'), '{}');
      await writeFile(join(directory, 'bun.lock'), 'fixture-lock');
      await writeFile(join(directory, 'packages/coding-agent/package.json'), JSON.stringify({ name: '@oh-my-pi/pi-coding-agent', version: '0.0.0-mismatch' }));
      await expect(identifySource(directory, { packageName: '@oh-my-pi/pi-coding-agent', packageVersion: '18.8.9', sourceFingerprint: 'not-a-valid-fingerprint', fingerprintFileCount: 3 })).rejects.toMatchObject({ code: 'SOURCE_IDENTITY_MISMATCH', status: 'unavailable' });
    });
  });

  for (const ending of ['normal', 'abrupt', 'timeout', 'interrupt', 'detached-siblings']) {
    const cancelled = ending === 'timeout' || ending === 'interrupt';
    test.skipIf(process.platform !== 'linux')(`suite ${ending} preserves completed probes and accounts for inherited descendants`, async () => {
      await disposable(async directory => {
        const tools = join(directory, 'scripts/omp-m0');
        const evidence = join(directory, '.workflow/omp-migration/m0');
        const source = join(directory, 'source');
        await mkdir(tools, { recursive: true });
        await mkdir(evidence, { recursive: true });
        await mkdir(join(source, 'packages/coding-agent'), { recursive: true });
        for (const file of ['run.mjs', 'envelope.mjs', 'process-group.mjs', 'pidfd-process.mjs']) await writeFile(join(tools, file), await readFile(resolve('scripts/omp-m0', file)));
        const files = { 'package.json': '{}', 'bun.lock': 'fixture-lock', 'packages/coding-agent/package.json': JSON.stringify({ name: 'm0-runner-test-only', version: '0.0.0-test' }) };
        const hash = createHash('sha256');
        for (const path of Object.keys(files).sort()) {
          await writeFile(join(source, path), files[path]);
          hash.update(path).update('\0').update(createHash('sha256').update(files[path]).digest());
        }
        await writeFile(join(evidence, 'source-identity.json'), JSON.stringify({ packageName: 'm0-runner-test-only', packageVersion: '0.0.0-test', sourceFingerprint: hash.digest('hex'), fingerprintFileCount: 3 }));
        await writeFile(join(tools, 'worker.mjs'), `
          import { spawn } from 'node:child_process';
          import { readFileSync, writeFileSync } from 'node:fs';
          import { join } from 'node:path';
          const input = JSON.parse(readFileSync(process.argv[2], 'utf8'));
          const children = ${ending === 'detached-siblings' ? "[spawn('/usr/bin/setsid', ['/usr/bin/sleep', '30'], { stdio: 'ignore' }), spawn('/usr/bin/setsid', ['/usr/bin/sleep', '30'], { stdio: 'ignore' })]" : "[spawn(process.execPath, ['-e', 'setInterval(() => {}, 1000)'], { stdio: 'ignore', detached: false })]"};
          await Promise.all(children.map(child => new Promise((done, reject) => { child.once('spawn', done); child.once('error', reject); })));
          if (${ending === 'detached-siblings'}) {
            for (let attempt = 0; attempt < 100; attempt++) {
              const rows = children.map(child => {
                const text = readFileSync('/proc/' + child.pid + '/stat', 'utf8');
                return text.slice(text.lastIndexOf(')') + 2).trim().split(/\\s+/);
              });
              if (rows.every((row, index) => Number(row[3]) === children[index].pid)) break;
              if (attempt === 99) throw new Error('DETACHED_CHILD_NOT_READY');
              await Bun.sleep(10);
            }
          }
          writeFileSync(join(input.sourceDir, 'orphan.pid'), JSON.stringify(children.map(child => {
            const text = readFileSync('/proc/' + child.pid + '/stat', 'utf8');
            return { pid: child.pid, startTicks: text.slice(text.lastIndexOf(')') + 2).trim().split(/\\s+/)[19] };
          })));
          writeFileSync(join(input.sandbox, 'result.json'), JSON.stringify({ probes: [{ id: 'fixture', capability: 'runner test only', status: 'passed', observations: {}, errors: [], artifacts: [], redactions: [] }] }));
          ${ending === 'abrupt' || ending === 'detached-siblings' ? "process.kill(process.pid, 'SIGKILL');" : ending === 'normal' ? 'process.exit(0);' : ending === 'interrupt' ? "process.kill(process.ppid, 'SIGTERM'); setInterval(() => {}, 1000);" : 'setInterval(() => {}, 1000);'}
        `);
        let descendants = [];
        let unrelated;
        let unrelatedIdentity;
        try {
          if (ending === 'detached-siblings') {
            unrelated = spawn('/usr/bin/sleep', ['30'], { stdio: 'ignore' });
            await new Promise((done, reject) => { unrelated.once('spawn', done); unrelated.once('error', reject); });
            const text = await readFile(`/proc/${unrelated.pid}/stat`, 'utf8');
            unrelatedIdentity = { pid: unrelated.pid, startTicks: text.slice(text.lastIndexOf(')') + 2).trim().split(/\s+/)[19] };
          }
          const child = spawnSync(process.execPath, [join(tools, 'run.mjs'), '--suite', 'lifecycle', '--fixture', '--output', join(directory, 'report.json'), '--timeout-ms', '500'], { cwd: directory, env: { OMP_SOURCE_DIR: source, PATH: '/usr/bin:/bin', HOME: directory }, encoding: 'utf8', timeout: 10000 });
          descendants = JSON.parse(await readFile(join(source, 'orphan.pid'), 'utf8'));
          expect(child.status).toBe(1);
          expect(child.stderr).toBe('');
          const report = JSON.parse(child.stdout);
          expect(report.run.exitCode).toBe(1);
          expect(report.probes.find(probe => probe.id === 'fixture')?.status).toBe('passed');
          expect(report.cleanup).toMatchObject({ workerExited: true, workerDescendantsExited: true, processGroupVerified: true, remainingProcessesDetected: !cancelled, temporaryDirectoriesRemoved: true });
          if (cancelled) expect(report.probes.find(probe => probe.id === 'runner')).toMatchObject({ status: 'failed', errors: [ending === 'timeout' ? 'SUITE_TIMEOUT' : 'RUN_INTERRUPTED'] });
          else expect(report.probes.find(probe => probe.id === 'process-group-cleanup')).toMatchObject({ status: 'failed', errors: ['WORKER_DESCENDANTS_REMAINED'], observations: { terminationRequested: true, allProcessesExited: true } });
          for (const descendant of descendants) {
            let live = false;
            try {
              const stat = await readFile(`/proc/${descendant.pid}/stat`, 'utf8');
              const row = stat.slice(stat.lastIndexOf(')') + 2).trim().split(/\s+/);
              live = row[19] === descendant.startTicks && !['Z', 'X'].includes(row[0]);
            } catch (error) {
              // The process may exit after procfs opens stat but before its read.
              if (error.code !== 'ENOENT' && error.code !== 'ESRCH') throw error;
            }
            expect(live).toBe(false);
          }
          if (unrelatedIdentity) {
            const text = await readFile(`/proc/${unrelatedIdentity.pid}/stat`, 'utf8');
            const row = text.slice(text.lastIndexOf(')') + 2).trim().split(/\s+/);
            expect(row[19]).toBe(unrelatedIdentity.startTicks);
            expect(['Z', 'X']).not.toContain(row[0]);
            expect(descendants).toHaveLength(2);
          }
        } finally {
          for (const descendant of descendants) terminateIdentity(descendant, 'SIGKILL');
          if (unrelatedIdentity && unrelated.exitCode === null && unrelated.signalCode === null) {
            const exited = new Promise(done => unrelated.once('exit', done));
            terminateIdentity(unrelatedIdentity, 'SIGKILL');
            await exited;
          }
        }
      });
    });
  }
});