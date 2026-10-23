import { EventEmitter } from 'node:events';
import { PassThrough } from 'node:stream';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createAgentServiceSupervisor } from './agent-service-supervisor.js';

const registry = {
  reapOrphanedProcesses: vi.fn(async () => ({ inspected: 0, reaped: 0 })),
  registerManagedProcess: vi.fn(async () => {}),
  unregisterManagedProcess: vi.fn(async () => {}),
  terminateManagedProcess: vi.fn(async () => false),
};

const createChild = (pid = 50001) => {
  const child = new EventEmitter();
  Object.assign(child, {
    pid,
    connected: true,
    exitCode: null,
    signalCode: null,
    stdout: new PassThrough(),
    stderr: new PassThrough(),
    send(_message, callback) { callback?.(null); },
    kill(signal) {
      this.connected = false;
      this.signalCode = signal;
      queueMicrotask(() => { this.emit('exit', null, signal); this.emit('close'); });
      return true;
    },
  });
  queueMicrotask(() => child.stdout.write(`${JSON.stringify({ type: 'agent-service.listening', port: 41000 })}\n`));
  return child;
};

const services = [];
afterEach(async () => {
  for (const service of services.splice(0)) await service.stop();
});

describe('Agent Service diagnostics', () => {
  it('records one root/generation-tagged worker line, redacts secrets, and bounds the buffer', async () => {
    const child = createChild();
    const logged = [];
    let spawnOptions;
    const service = createAgentServiceSupervisor({
      bunPath: '/usr/bin/bun',
      entrypoint: '/srv/agent-service/index.js',
      registry,
      maxDiagnostics: 5,
      diagnosticsLevel: 'warn',
      logDiagnostic: line => logged.push(line),
      spawn: (_file, _args, options) => { spawnOptions = options; return child; },
      fetchImpl: async () => Response.json({ ready: true, engine: 'omp', version: '1.0.0' }),
    });
    services.push(service);
    await service.start();

    child.stderr.write(`${JSON.stringify({
      type: 'agent-service.diagnostic', level: 'error', rootSessionId: 'root-session',
      workerGeneration: 'generation-1', message: 'Authorization: Bearer abc123 password="two words" api_key=sk-live12345678',
    })}\n`);
    await new Promise(resolve => setTimeout(resolve, 20));

    const entries = service.getDiagnostics();
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({ source: 'worker', level: 'error', rootSessionId: 'root-session', workerGeneration: 'generation-1' });
    expect(entries[0].message).not.toContain('abc123');
    expect(entries[0].message).not.toContain('two words');
    expect(entries[0].message).not.toContain('sk-live12345678');
    expect(entries[0].message).toContain('[REDACTED]');
    expect(logged).toHaveLength(1);
    expect(spawnOptions.env.OPENCHAMBER_AGENT_DIAGNOSTICS_LEVEL).toBe('warn');

    child.stderr.write('x'.repeat(20_000));
    await new Promise(resolve => setTimeout(resolve, 20));
    expect(service.getDiagnostics().at(-1).message.length).toBeLessThanOrEqual(2_048);

    for (let index = 0; index < 2_000; index += 1) child.stderr.write(`raw service line ${index}\n`);
    await new Promise(resolve => setTimeout(resolve, 30));
    expect(service.getDiagnostics()).toHaveLength(5);
    expect(logged.length).toBeLessThan(30);
  });
});
