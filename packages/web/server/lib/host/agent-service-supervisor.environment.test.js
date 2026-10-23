import { execFileSync, spawn as nodeSpawn } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createAgentServiceSupervisor } from './agent-service-supervisor.js';

const hasBun = (() => {
  try {
    execFileSync('bun', ['--version'], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
})();

// A stand-in service that proves the secret handshake: it answers readiness
// only when the request carries the token it received over private IPC.
const FIXTURE = `
import { createServer } from 'node:http';
const REQUEST = 'agent-service.internal-secret.request';
const MESSAGE = 'agent-service.internal-secret';
let secret = '';
process.on('message', message => {
  if (message?.type === MESSAGE && typeof message.secret === 'string') secret = message.secret;
});
const ask = () => { process.send?.({ type: REQUEST }); };
ask();
const asker = setInterval(ask, 50);
const server = createServer((request, response) => {
  if (!secret || request.url !== '/api/agent/v1/ready' || request.headers['x-internal-secret'] !== secret) {
    response.writeHead(403); response.end(); return;
  }
  response.writeHead(200, { 'content-type': 'application/json' });
  response.end(JSON.stringify({ ready: true, engine: 'omp', version: '1.0.0' }));
});
server.listen(0, '127.0.0.1', () => {
  clearInterval(asker);
  console.log(JSON.stringify({ type: 'agent-service.listening', port: server.address().port }));
});
`;

const registry = {
  reapOrphanedProcesses: vi.fn(async () => ({ inspected: 0, reaped: 0 })),
  registerManagedProcess: vi.fn(async () => {}),
  unregisterManagedProcess: vi.fn(async () => {}),
  terminateManagedProcess: vi.fn(async () => false),
};

const sentinels = {
  OPENCHAMBER_UI_PASSWORD: 'ui-password-sentinel-1f3a',
  OPENCHAMBER_UNRELATED_TOKEN: 'unrelated-token-sentinel-9c2b',
};

let root;
let service;

afterEach(async () => {
  await service?.stop();
  service = null;
  if (root) await fs.rm(root, { recursive: true, force: true });
  root = null;
});

describe('Agent Service spawn environment', () => {
  it.skipIf(!hasBun || process.platform !== 'linux')('passes no Host secret in the environment and delivers the internal token over IPC', async () => {
    root = await fs.mkdtemp(path.join(os.tmpdir(), 'agent-service-env-'));
    const entrypoint = path.join(root, 'service-fixture.mjs');
    await fs.writeFile(entrypoint, FIXTURE);

    const saved = new Map(Object.keys(sentinels).map(key => [key, process.env[key]]));
    Object.assign(process.env, sentinels);
    let spawnOptions;
    try {
      let spawnCalls = 0;
      service = createAgentServiceSupervisor({
        bunPath: 'bun',
        entrypoint,
        dataDir: root,
        registry,
        // Fixed bytes make the generated internal token observable to the assertions.
        randomBytes: (size) => Buffer.alloc(size, 0x2a),
        spawn: (file, args, options) => {
          spawnCalls += 1;
          spawnOptions = options;
          return (nodeSpawn(file, args, options));
        },
      });
      const state = await service.start();
      expect(spawnCalls).toBe(1);
      expect(state.phase).toBe('ready');

      for (const key of Object.keys(sentinels)) {
        expect(spawnOptions.env).not.toHaveProperty(key);
      }
      expect(spawnOptions.env).not.toHaveProperty('OHPICHAMBER_INTERNAL_SECRET');
      expect(spawnOptions.env.OPENCHAMBER_MANAGED_PROCESS_TOKEN).toMatch(/^[a-f0-9]{32}$/);

      const environ = await fs.readFile(`/proc/${state.pid}/environ`, 'utf8');
      for (const value of [...Object.values(sentinels), '2a'.repeat(32)]) {
        expect(environ).not.toContain(value);
      }
    } finally {
      for (const [key, value] of saved) {
        if (value === undefined) delete process.env[key];
        else process.env[key] = value;
      }
    }
  }, 30_000);

  it.skipIf(!hasBun || process.platform !== 'linux')('the real Agent Service process carries no Host secret in /proc/<pid>/environ', async () => {
    root = await fs.mkdtemp(path.join(os.tmpdir(), 'agent-service-real-env-'));
    const entrypoint = fileURLToPath(new URL('../../../../agent-service/src/index.ts', import.meta.url));
    const saved = new Map(Object.keys(sentinels).map(key => [key, process.env[key]]));
    Object.assign(process.env, sentinels);
    try {
      service = createAgentServiceSupervisor({
        bunPath: 'bun',
        entrypoint,
        dataDir: root,
        registry,
        randomBytes: (size) => Buffer.alloc(size, 0x2a),
      });
      const state = await service.start();
      expect(state.phase).toBe('ready');
      const environ = await fs.readFile(`/proc/${state.pid}/environ`, 'utf8');
      for (const value of [...Object.values(sentinels), '2a'.repeat(32)]) {
        expect(environ).not.toContain(value);
      }
    } finally {
      for (const [key, value] of saved) {
        if (value === undefined) delete process.env[key];
        else process.env[key] = value;
      }
    }
  }, 30_000);
});
