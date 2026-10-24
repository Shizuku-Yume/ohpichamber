import { expect, test } from 'bun:test';
import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SessionManager } from '@oh-my-pi/pi-coding-agent/session/session-manager';

import { SessionRegistry } from '../sessions/registry.ts';
import { WorkerRegistry, WORKER_CAPACITY_POLICY } from './workers.ts';

const workerEntrypoint = fileURLToPath(new URL('../worker/index.ts', import.meta.url));

const waitFor = async (predicate: () => boolean, timeoutMs = 8_000) => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (predicate()) return;
    await Bun.sleep(20);
  }
  throw new Error('Timed out waiting for the worker lifecycle');
};

test('an idle root is evicted and reopens cold with native history; a turn and approval are never evicted', async () => {
  const root = await mkdtemp(join(tmpdir(), 'worker-eviction-'));
  const previousHome = process.env.HOME;
  process.env.HOME = root;
  const cwd = join(root, 'workspace');
  const agentDirectory = join(root, 'agent');
  await Promise.all([cwd, agentDirectory].map(directory => mkdir(directory, { recursive: true })));
  const sessionsDirectory = SessionManager.getDefaultSessionDir(cwd, agentDirectory);
  const manager = SessionManager.create(cwd, sessionsDirectory);
  manager.appendMessage({ role: 'user', content: 'Retained eviction prompt', timestamp: Date.now() });
  manager.appendMessage({ role: 'assistant', content: [{ type: 'text' as const, text: 'Retained eviction reply' }],
    api: 'openai-completions' as const, provider: 'fixture', model: 'fixture', stopReason: 'stop' as const,
    timestamp: Date.now(), usage: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, totalTokens: 0,
      cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 } } });
  await manager.ensureOnDisk();
  await manager.flush();
  const sessionFile = manager.getSessionFile();
  await manager.close();
  if (!sessionFile) throw new Error('Native session file is required');

  let sessions: SessionRegistry | undefined;
  const workers = new WorkerRegistry({
    workerEntrypoint, workerRuntime: process.execPath,
    startupTimeoutMs: 30_000, stopTimeoutMs: 3_000,
    capacityPolicy: { ...WORKER_CAPACITY_POLICY, idleEvictionTimeoutMs: 150, reapIntervalMs: 20 },
    policyCheck: async () => ({ allowed: true }),
    isSessionIdle: rootSessionId => sessions?.isIdleForEviction(rootSessionId) ?? false,
    callbacks: {
      onOpened: (...args) => sessions!.onOpened(...args),
      onEvents: (...args) => sessions!.onEvents(...args),
      onInteraction: (...args) => sessions!.onInteraction(...args),
      onExit: (...args) => sessions!.onExit(...args),
    },
  });
  const registry = new SessionRegistry(join(root, 'service-state'), workers);
  sessions = registry;
  const source = {
    rootSessionId: 'root-eviction', projectId: 'project', workspaceId: 'workspace',
    cwd, agentDirectory, agentDirectoryId: 'agent-owner', displayPath: 'workspace',
    sessionFile, sessionsDirectory,
    env: { HOME: root, USERPROFILE: root, PI_CONFIG_DIR: '.omp', PI_CODING_AGENT_DIR: agentDirectory,
      OMP_PROFILE: '', PI_PROFILE: '', XDG_CONFIG_HOME: join(root, 'config'), XDG_DATA_HOME: join(root, 'data'),
      XDG_STATE_HOME: join(root, 'state'), XDG_CACHE_HOME: join(root, 'cache') },
  };
  try {
    await registry.initialize();
    await registry.open(source);
    expect(registry.isIdleForEviction(source.rootSessionId)).toBe(true);
    await waitFor(() => workers.info(source.rootSessionId) === undefined);
    expect(registry.runtime(source.rootSessionId).runtimeStatus).toBe('unavailable');

    await registry.reopen(source);
    const reopened = await registry.history({ sessionId: source.rootSessionId });
    expect(JSON.stringify(reopened.messages)).toContain('Retained eviction prompt');
    expect(JSON.stringify(reopened.messages)).toContain('Retained eviction reply');

    const generation = workers.authorizationScope(source.rootSessionId)?.workerGeneration;
    if (!generation) throw new Error('A live worker generation is required');
    registry.onEvents(source.rootSessionId, generation, [{ timestamp: Date.now(),
      event: { type: 'session.status', runtimeStatus: 'running', activeRunId: 'run-active' } }]);
    expect(registry.isIdleForEviction(source.rootSessionId)).toBe(false);
    await Bun.sleep(400);
    expect(workers.info(source.rootSessionId)?.state).toBe('ready');

    registry.onEvents(source.rootSessionId, generation, [{ timestamp: Date.now(),
      event: { type: 'session.status', runtimeStatus: 'idle', activeRunId: null } }]);
    await waitFor(() => workers.info(source.rootSessionId) === undefined);

    await registry.reopen(source);
    const approvalGeneration = workers.authorizationScope(source.rootSessionId)?.workerGeneration;
    if (!approvalGeneration) throw new Error('A live worker generation is required');
    registry.onInteraction(source.rootSessionId, approvalGeneration, {
      kind: 'approval', approvalId: 'approval-pending', toolCallId: 'tool-pending', toolName: 'bash',
      actionType: 'bash_command', commandSummary: 'run a command', details: {},
      policyTarget: { toolName: 'bash', pattern: 'native-input' }, turnId: 'turn-pending',
    });
    expect(registry.approvals(source.rootSessionId)).toHaveLength(1);
    expect(registry.isIdleForEviction(source.rootSessionId)).toBe(false);
    await Bun.sleep(400);
    expect(workers.info(source.rootSessionId)?.state).toBe('ready');
    expect(registry.approvals(source.rootSessionId)).toHaveLength(1);
  } finally {
    try { await registry.close(); } finally {
      try { await workers.close(); } finally {
        if (previousHome === undefined) delete process.env.HOME; else process.env.HOME = previousHome;
        await rm(root, { recursive: true, force: true });
      }
    }
  }
}, 60_000);
