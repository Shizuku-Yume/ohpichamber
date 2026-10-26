import { expect, test } from 'bun:test';
import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { WorkerBootstrap, WorkerInfo, WorkerOperation, WorkerOperationResult, WorkerApprovalPolicy } from '../protocol.ts';
import { WorkerRegistry } from '../supervisor/workers.ts';
import { SessionRegistry } from './registry.ts';

type Callbacks = ConstructorParameters<typeof WorkerRegistry>[0]['callbacks'];

class AdmissionWorkers extends WorkerRegistry {
  readonly observations: boolean[] = [];
  private readonly callbacks: NonNullable<Callbacks>;
  constructor(callbacks: NonNullable<Callbacks>) {
    super({ workerEntrypoint: 'unused-test-worker' });
    this.callbacks = callbacks;
  }
  override async start(input: WorkerBootstrap, _replace?: boolean, _policies?: WorkerApprovalPolicy[], _restartGeneration?: string): Promise<WorkerInfo> {
    this.callbacks.onOpened?.(input.rootSessionId, 'generation', join(input.cwd, 'session.jsonl'), {
      createdAt: 1, updatedAt: 1, mode: { kind: 'main' },
      branch: { branchId: 'branch', branchVersion: '1', leafMessageId: null }, turns: [], messages: [],
    });
    return { rootSessionId: input.rootSessionId, workspaceId: input.workspaceId, projectId: input.projectId,
      workerGeneration: 'generation', state: 'ready' };
  }
  override async request(rootSessionId: string, operation: WorkerOperation): Promise<WorkerOperationResult> {
    if (operation.type !== 'prompt') throw new Error(`Unexpected operation ${operation.type}`);
    // The registry's idle predicate is what the reaper and capacity eviction
    // read. It must see the admission reservation while the prompt is in flight.
    this.observations.push(sessions.isIdleForEviction(rootSessionId));
    this.callbacks.onEvents?.(rootSessionId, 'generation', [
      { timestamp: 1, event: { type: 'run.started', runId: operation.runId, origin: 'host', createdAt: 1 } },
    ]);
    return { type: 'prompt', run: { runId: operation.runId, sessionId: rootSessionId, status: 'running', origin: 'host', createdAt: 1 } };
  }
}

let sessions: SessionRegistry;

test('prompt admission is visible to the idle predicate before and after the worker reply', async () => {
  const root = await mkdtemp(join(tmpdir(), 'registry-prompt-admission-'));
  const stateDirectory = join(root, 'state');
  await mkdir(stateDirectory);
  try {
    let registry: SessionRegistry | undefined;
    const workers = new AdmissionWorkers({
      onOpened: (...args) => registry!.onOpened(...args),
      onEvents: (...args) => registry!.onEvents(...args),
      onInteraction: (...args) => registry!.onInteraction(...args),
      onExit: (...args) => registry!.onExit(...args),
    });
    registry = new SessionRegistry(stateDirectory, workers);
    sessions = registry;
    await registry.initialize();
    await registry.open({ rootSessionId: 'root', projectId: 'project', workspaceId: 'workspace',
      cwd: root, agentDirectory: join(root, 'agent'), displayPath: 'workspace' });
    expect(registry.isIdleForEviction('root')).toBe(true);

    const run = await registry.prompt('root', { type: 'prompt', runId: 'run-admission',
      request: { input: { text: 'Prompt', attachments: [], context: [] },
        options: { providerId: null, modelId: null, agentId: null, variant: null, reasoningEffort: null } } });

    expect(workers.observations).toEqual([false]);
    expect(run.runId).toBe('run-admission');
    // The reservation is released, but the worker emitted run.started before its
    // reply, so eviction still sees the active run instead of an idle worker.
    expect(registry.isIdleForEviction('root')).toBe(false);
    expect(registry.runtime('root')).toMatchObject({ runtimeStatus: 'running', activeRunId: 'run-admission' });
    await registry.close();
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}, 30_000);
