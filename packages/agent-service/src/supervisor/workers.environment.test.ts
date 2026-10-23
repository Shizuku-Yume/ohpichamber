import { expect, test } from 'bun:test';
import { EventEmitter } from 'node:events';
import type { ChildProcess, SpawnOptions } from 'node:child_process';
import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { WorkerRegistry } from './workers.ts';

const sentinels = {
  OPENCHAMBER_UI_PASSWORD: 'ui-password-sentinel-1f3a',
  OPENCHAMBER_UNRELATED_TOKEN: 'unrelated-token-sentinel-9c2b',
  OHPICHAMBER_INTERNAL_SECRET: 'internal-secret-sentinel-4d7e',
  OPENAI_API_KEY: 'provider-key-sentinel-8a1c',
};

test('worker spawn receives the allowlist, the directory overlay and no Host secret', async () => {
  const root = await mkdtemp(join(tmpdir(), 'worker-environment-'));
  const cwd = join(root, 'workspace');
  const agentDirectory = join(root, 'agent');
  await mkdir(cwd);
  await mkdir(agentDirectory);

  const saved: Record<string, string | undefined> = Object.fromEntries(Object.keys(sentinels).map(key => [key, process.env[key]]));
  Object.assign(process.env, sentinels);
  process.env.PATH = '/usr/bin:/bin';
  process.env.OMP_PROFILE = 'default';
  process.env.OPENCHAMBER_MANAGED_PROCESS_TOKEN = 'tree-token';

  let captured: SpawnOptions | undefined;
  // SAFETY: WorkerRegistry only calls send, kill and the EventEmitter surface,
  // all of which are defined here; the rest of ChildProcess is unused.
  const child = new EventEmitter() as ChildProcess;
  Object.assign(child, {
    pid: 424242,
    connected: true,
    exitCode: null,
    signalCode: null,
    send(command: { type?: string; workerGeneration?: string }, callback?: (error: Error | null) => void) {
      callback?.(null);
      if (command?.type === 'stop') {
        queueMicrotask(() => { this.emit('exit', 0, null); this.emit('close'); });
        return;
      }
      if (command?.type === 'bootstrap') {
        queueMicrotask(() => this.emit('message', { type: 'ready', workerGeneration: command.workerGeneration }));
      }
    },
    kill(signal: NodeJS.Signals) {
      this.connected = false;
      this.signalCode = signal;
      queueMicrotask(() => { this.emit('exit', null, signal); this.emit('close'); });
      return true;
    },
  });

  const registry = new WorkerRegistry({
    workerEntrypoint: '/unused-worker-entrypoint.js',
    workerRuntime: '/usr/bin/bun',
    spawn: (_file, _args, options) => {
      captured = options;
      return child;
    },
  });

  try {
    const worker = await registry.start({
      rootSessionId: 'root-session', projectId: 'project', workspaceId: 'workspace',
      cwd, agentDirectory, env: { PROJECT_ALLOWED_VARIABLE: 'allowed', OPENAI_API_KEY: 'overlay-key' },
    });
    expect(worker.state).toBe('ready');
    expect(captured.env).toMatchObject({
      PATH: '/usr/bin:/bin',
      OMP_PROFILE: 'default',
      OPENCHAMBER_MANAGED_PROCESS_TOKEN: 'tree-token',
      PI_CODING_AGENT_DIR: agentDirectory,
      PROJECT_ALLOWED_VARIABLE: 'allowed',
      OPENAI_API_KEY: 'overlay-key',
    });
    for (const key of Object.keys(sentinels)) {
      if (key === 'OPENAI_API_KEY') continue;
      expect(captured.env).not.toHaveProperty(key);
    }
    // Provider credentials come from the authorized overlay or AuthStorage, never
    // from the service's inherited environment.
    expect(captured.env.OPENAI_API_KEY).toBe('overlay-key');
    expect(captured.env.OPENAI_API_KEY).not.toBe(sentinels.OPENAI_API_KEY);
  } finally {
    await registry.close();
    for (const [key, value] of Object.entries(saved)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    await rm(root, { recursive: true, force: true });
  }
});
