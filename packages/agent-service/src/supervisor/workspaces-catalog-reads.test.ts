import { afterEach, expect, spyOn, test } from 'bun:test';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { WorkerOperationResult } from '../protocol.ts';
import { WorkerOperationError, WorkerRegistry } from './workers.ts';
import { WorkspaceCatalogs } from './workspaces.ts';

const cleanups: Array<() => Promise<void>> = [];
afterEach(async () => { for (const close of cleanups.splice(0).reverse()) await close(); });

const catalogResult = (type: 'models' | 'providers'): WorkerOperationResult => ({
  type: 'catalog',
  result: type === 'models'
    ? { type: 'catalog.models', catalog: { workspaceId: 'workspace', revision: '0', models: [], defaults: { model: null, thinkingLevel: null }, planRoleAvailable: false } }
    : { type: 'catalog.providers', catalog: { workspaceId: 'workspace', revision: '0', providers: [] } },
});

async function fixture() {
  const directory = await mkdtemp(join(tmpdir(), 'workspace-catalog-reads-'));
  const workers = new WorkerRegistry({ workerEntrypoint: 'unused-test-entrypoint' });
  const catalogs = new WorkspaceCatalogs(directory, workers);
  await catalogs.initialize();
  cleanups.push(async () => { await rm(directory, { recursive: true, force: true }); });
  await catalogs.register('workspace', {
    projectId: 'project', cwd: join(directory, 'workspace'), agentDirectory: join(directory, 'agent'), agentDirectoryId: 'agent', env: {},
  });
  return { catalogs, workers };
}

test('stateless model and provider reads run concurrently instead of behind the mutation queue', async () => {
  const { catalogs, workers } = await fixture();
  const owner = spyOn(catalogs, 'stateless').mockResolvedValue('catalog-owner');
  let inFlight = 0;
  let peak = 0;
  // Each read holds the other open until both have started: a serialized pair
  // deadlocks instead of measuring peak concurrency, so the assertion is exact.
  const release = Promise.withResolvers<void>();
  let arrivals = 0;
  const request = spyOn(workers, 'request').mockImplementation(async (_root, operation): Promise<WorkerOperationResult> => {
    if (operation.type !== 'catalog') throw new Error('Unexpected operation');
    inFlight += 1;
    peak = Math.max(peak, inFlight);
    arrivals += 1;
    if (arrivals === 2) release.resolve();
    try {
      await release.promise;
      return catalogResult(operation.operation.type === 'catalog.models.read' ? 'models' : 'providers');
    } finally { inFlight -= 1; }
  });
  try {
    const results = await Promise.all([
      catalogs.operation('workspace', { type: 'catalog.models.read' }),
      catalogs.operation('workspace', { type: 'catalog.providers.read' }),
    ]);
    expect(results.map(result => result.type)).toEqual(['catalog.models', 'catalog.providers']);
    expect(peak).toBe(2);
    // Pure reads advance no owner revision.
    expect(catalogs.revision('workspace')).toBe('0');
  } finally { request.mockRestore(); owner.mockRestore(); }
});

test('a read may run beside a pending mutation without consuming its CAS revision', async () => {
  const { catalogs, workers } = await fixture();
  const owner = spyOn(catalogs, 'stateless').mockResolvedValue('catalog-owner');
  const mutationStarted = Promise.withResolvers<void>();
  const releaseMutation = Promise.withResolvers<void>();
  let readStarted = false;
  const request = spyOn(workers, 'request').mockImplementation(async (_root, operation): Promise<WorkerOperationResult> => {
    if (operation.type !== 'catalog') throw new Error('Unexpected operation');
    if (operation.operation.type !== 'catalog.warming.persist') {
      readStarted = true;
      return catalogResult('models');
    }
    mutationStarted.resolve();
    await releaseMutation.promise;
    return { type: 'catalog', result: { type: 'catalog.warming', state: { workspaceId: 'workspace', revision: operation.revision, mode: operation.operation.request.mode } } };
  });
  try {
    const mutation = catalogs.updateCacheWarming('workspace', { expectedRevision: '0', mode: 'idle' });
    await mutationStarted.promise;
    // The read is not queued behind the mutation lock.
    await catalogs.operation('workspace', { type: 'catalog.models.read' });
    expect(readStarted).toBe(true);
    releaseMutation.resolve();
    await mutation;
    expect(catalogs.revision('workspace')).toBe('1');
  } finally { request.mockRestore(); owner.mockRestore(); }
});

test('catalog mutations still serialize so only one CAS writer wins', async () => {
  const { catalogs, workers } = await fixture();
  const owner = spyOn(catalogs, 'stateless').mockResolvedValue('catalog-owner');
  let inFlight = 0;
  let peak = 0;
  const request = spyOn(workers, 'request').mockImplementation(async (_root, operation): Promise<WorkerOperationResult> => {
    if (operation.type !== 'catalog' || operation.operation.type !== 'catalog.warming.persist') throw new Error('Unexpected operation');
    inFlight += 1;
    peak = Math.max(peak, inFlight);
    try {
      return { type: 'catalog', result: { type: 'catalog.warming', state: { workspaceId: 'workspace', revision: operation.revision, mode: operation.operation.request.mode } } };
    } finally { inFlight -= 1; }
  });
  try {
    const results = await Promise.allSettled((['idle', 'streaming'] as const)
      .map(mode => catalogs.updateCacheWarming('workspace', { expectedRevision: '0', mode })));
    expect(results.filter(result => result.status === 'fulfilled')).toHaveLength(1);
    expect(peak).toBe(1);
    expect(catalogs.revision('workspace')).toBe('1');
  } finally { request.mockRestore(); owner.mockRestore(); }
});

async function prewarmFixture() {
  const directory = await mkdtemp(join(tmpdir(), 'workspace-catalog-prewarm-'));
  const workers = new WorkerRegistry({ workerEntrypoint: 'unused-test-entrypoint' });
  const catalogs = new WorkspaceCatalogs(directory, workers);
  await catalogs.initialize();
  cleanups.push(async () => { await rm(directory, { recursive: true, force: true }); });
  return { directory, catalogs, workers };
}

test('registering a workspace pre-warms the stateless worker without failing registration', async () => {
  const { directory, catalogs, workers } = await prewarmFixture();
  const started: string[] = [];
  const start = spyOn(workers, 'startStateless').mockImplementation(async input => {
    started.push(input.workspaceId);
    throw new WorkerOperationError(503, 'SERVICE_UNAVAILABLE');
  });
  try {
    const registration = await catalogs.register('workspace', {
      projectId: 'project', cwd: join(directory, 'workspace'), agentDirectory: join(directory, 'agent'), agentDirectoryId: 'agent', env: {},
    });
    expect(registration.workspaceId).toBe('workspace');
    expect(started).toEqual(['workspace']);
    // A failed prewarm surfaces only when a real read asks for the worker.
    await expect(catalogs.operation('workspace', { type: 'catalog.models.read' })).rejects.toMatchObject({ code: 'SERVICE_UNAVAILABLE' });
  } finally { start.mockRestore(); }
});

test('the read path reuses the stateless worker the registry already started', async () => {
  const { directory, catalogs, workers } = await prewarmFixture();
  const starts: string[] = [];
  const start = spyOn(workers, 'startStateless').mockImplementation(async input => {
    starts.push(input.workspaceId);
    return { rootSessionId: input.rootSessionId, workspaceId: input.workspaceId, projectId: 'project', workerGeneration: 'prewarmed', state: 'ready' };
  });
  const request = spyOn(workers, 'request').mockImplementation(async (_root, operation): Promise<WorkerOperationResult> => {
    if (operation.type !== 'catalog') throw new Error('Unexpected operation');
    return catalogResult('models');
  });
  try {
    await catalogs.register('workspace', {
      projectId: 'project', cwd: join(directory, 'workspace'), agentDirectory: join(directory, 'agent'), agentDirectoryId: 'agent', env: {},
    });
    // The pre-warm started the worker before any catalog read asked for it.
    expect(starts).toEqual(['workspace']);
    const read = await catalogs.operation('workspace', { type: 'catalog.models.read' });
    expect(read.type).toBe('catalog.models');
  } finally { request.mockRestore(); start.mockRestore(); }
});
