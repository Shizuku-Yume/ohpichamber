import { expect, test } from 'bun:test';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { WorkerFailure } from './worker-launcher.mjs';
import { runSuite } from './isolation.mjs';
import { serializeEnvelope } from './envelope.mjs';

function scriptedLauncher({ sdkUnavailable = false, failDedicatedLabel, idleBytes = 1024, orphanUnavailable = false, wrongBinding = false, wrongRestoration = false, sharedIsolated = false, exitSignal = null } = {}) {
  return () => {
    let config;
    const observations = { pid: 1, exitCode: 0, signal: null, forcedTermination: false, timedOut: false, messagesAfterClosed: 0 };
    return {
      observations,
      send(message) { if (message.type === 'initialize') config = message.config; },
      markClosed() {},
      async waitFor(type) {
        const shared = config.mode.startsWith('shared-');
        const labels = shared ? ['a', 'b'] : [config.label];
        const bound = config.mode !== 'shared-private-unbound';
        if (sdkUnavailable) { observations.exitCode = 1; throw new WorkerFailure('SDK_UNAVAILABLE'); }
        if (!shared && config.label === failDedicatedLabel) { observations.exitCode = 7; throw new WorkerFailure('WORKER_EARLY_EXIT'); }
        if (type === 'ready') return { type, sessionCount: labels.length };
        if (type === 'active') return { type, label: config.label };
        if (type === 'result') return { type, concurrentToolsObserved: shared ? 2 : 0, rows: labels.map(label => ({
          label, sessionMarker: label, sessionCwdMatches: true,
          processMarker: shared && !sharedIsolated ? 'b' : label,
          environmentMarker: shared && !sharedIsolated ? 'b' : label,
          registryOwnsSession: true,
          processSettingsBinding: wrongBinding ? 'other' : bound ? labels.at(-1) : 'none',
        })) };
        if (type === 'closed') return { type, disposeFailed: false, lateEvents: 0, bindingRestoration: labels.toReversed().map((label, index) => ({
          disposedLabel: label, processSettingsBinding: wrongRestoration ? 'other' : bound && index < labels.length - 1 ? labels[0] : 'none',
        })) };
        throw new WorkerFailure('WORKER_PROBE_FAILED');
      },
      async sample() { return { status: 'passed', method: 'controlled-test-fixture', rssBytes: idleBytes }; },
      async cleanup() {
        if (exitSignal) { observations.exitCode = null; observations.signal = exitSignal; }
        return { directChildExited: true, complete: !orphanUnavailable, remnantsObserved: orphanUnavailable ? null : 0, descendantInspection: orphanUnavailable ? { status: 'unavailable' } : { status: 'passed', members: [] } };
      },
    };
  };
}

async function scriptedSuite(options, inspect) {
  const directory = await mkdtemp(join(process.cwd(), '.omp-isolation-suite-test-'));
  try {
    const probes = await runSuite({ sandbox: directory, timeoutMs: 6000 }, { launch: scriptedLauncher(options) });
    await inspect(probes, directory);
  } finally { await rm(directory, { recursive: true, force: true }); }
}

test('expected shared contamination stays failed and completed probes are safely checkpointed', async () => {
  await scriptedSuite({}, async (probes, directory) => {
    expect(probes.filter(probe => probe.id.startsWith('isolation-shared')).every(probe => probe.status === 'failed' && probe.errors.includes('SHARED_PROCESS_CWD_OR_ENV_LEAK'))).toBe(true);
    expect(probes.find(probe => probe.id === 'isolation-dedicated-workers').status).toBe('passed');
    expect(probes.every(probe => probe.observations.timeoutMs === 1000 && Number.isInteger(probe.observations.exitCode))).toBe(true);
    const checkpoint = await readFile(join(directory, 'result.json'), 'utf8');
    expect(JSON.parse(checkpoint).probes).toEqual(probes);
    expect(checkpoint).not.toContain(directory);
    expect(() => serializeEnvelope({ probes })).not.toThrow();
  });
});

test('idle budget violations fail PROBE-02 rather than passing metric collection', async () => {
  await scriptedSuite({ idleBytes: 100 * 1024 * 1024 }, probes => {
    const resources = probes.find(probe => probe.id === 'isolation-worker-resources');
    expect(resources.status).toBe('failed');
    expect(resources.errors).toContain('IDLE_RSS_BUDGET_EXCEEDED');
    expect(resources.observations.idleUnderArchitectureHypothesis).toBe(false);
    expect(resources.observations.samplingComplete).toBe(true);
  });
});

test('failed sibling preserves healthy worker startup, samples, result and shutdown', async () => {
  await scriptedSuite({ failDedicatedLabel: 'b' }, probes => {
    const dedicated = probes.find(probe => probe.id === 'isolation-dedicated-workers');
    expect(dedicated.status).toBe('failed');
    const healthy = dedicated.observations.workers.find(worker => worker.label === 'a');
    expect(healthy.status).toBe('passed');
    expect(healthy.startup.type).toBe('ready');
    expect(healthy.idle.rssBytes).toBeGreaterThan(0);
    expect(healthy.active.rssBytes).toBeGreaterThan(0);
    expect(healthy.measurement.rows).toHaveLength(1);
    expect(healthy.shutdown.lateEvents).toBe(0);
    const resources = probes.find(probe => probe.id === 'isolation-worker-resources');
    expect(resources.status).toBe('unavailable');
    expect(resources.observations.samples[0].idle.rssBytes).toBeGreaterThan(0);
    expect(resources.observations.samples[1].idle).toBeNull();
  });
});

test('unavailable orphan inspection is unavailable, not a fabricated cleanup failure', async () => {
  await scriptedSuite({ orphanUnavailable: true }, probes => {
    const dedicated = probes.find(probe => probe.id === 'isolation-dedicated-workers');
    expect(dedicated.status).toBe('unavailable');
    expect(dedicated.errors).toContain('ORPHAN_INSPECTION_UNAVAILABLE');
    expect(dedicated.errors).not.toContain('WORKER_CLEANUP_OR_EXIT_FAILED');
    expect(probes.filter(probe => probe.id.startsWith('isolation-shared')).every(probe => probe.status === 'failed')).toBe(true);
  });
});

test('binding acquisition and restoration are asserted independently of cwd isolation', async () => {
  for (const option of ['wrongBinding', 'wrongRestoration']) await scriptedSuite({ [option]: true, sharedIsolated: true }, probes => {
    const expected = option === 'wrongBinding' ? 'PROCESS_STATE_BINDING_FAILED' : 'PROCESS_STATE_RESTORATION_FAILED';
    expect(probes.filter(probe => probe.id !== 'isolation-worker-resources').every(probe => probe.status === 'failed' && probe.errors.includes(expected))).toBe(true);
  });
});

test('explicit SDK unavailability remains unavailable after its controlled exit', async () => {
  await scriptedSuite({ sdkUnavailable: true }, probes => {
    expect(probes.every(probe => probe.status === 'unavailable')).toBe(true);
    expect(probes.filter(probe => probe.id !== 'isolation-worker-resources').every(probe => probe.errors.includes('SDK_UNAVAILABLE') && !probe.errors.includes('WORKER_CLEANUP_OR_EXIT_FAILED'))).toBe(true);
  });
});

test('signaled exit after successful control frames fails the lifecycle probe', async () => {
  for (const exitSignal of ['SIGTERM', 'SIGKILL']) await scriptedSuite({ exitSignal, sharedIsolated: true }, probes => {
    const lifecycle = probes.filter(probe => probe.id !== 'isolation-worker-resources');
    expect(lifecycle.every(probe => probe.status === 'failed' && probe.errors.includes('WORKER_CLEANUP_OR_EXIT_FAILED'))).toBe(true);
    const dedicated = probes.find(probe => probe.id === 'isolation-dedicated-workers');
    expect(dedicated.observations.workers.every(worker => worker.shutdown.type === 'closed' && worker.lifecycle.exitCode === null && worker.lifecycle.signal === exitSignal)).toBe(true);
  });
});
