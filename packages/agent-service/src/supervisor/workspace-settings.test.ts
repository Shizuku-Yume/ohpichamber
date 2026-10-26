import { afterEach, beforeEach, expect, spyOn, test } from 'bun:test';
import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Settings, resetSettingsForTest } from '@oh-my-pi/pi-coding-agent/config/settings';
import type { WorkerOperationResult } from '../protocol.ts';
import { NativeSettings } from '../worker/catalog-settings.ts';
import { WorkspaceCatalogs } from './workspaces.ts';
import { WorkerRegistry } from './workers.ts';

beforeEach(resetSettingsForTest);
afterEach(resetSettingsForTest);

async function fixture() {
  const directory = await mkdtemp(join(tmpdir(), 'workspace-settings-'));
  const cwd = join(directory, 'workspace');
  const agentDirectory = join(directory, 'agent');
  await mkdir(cwd, { recursive: true });
  await mkdir(agentDirectory, { recursive: true });
  const settings = await Settings.loadIsolated({ cwd, agentDir: agentDirectory });
  const native = new NativeSettings(settings);
  const workers = new WorkerRegistry({ workerEntrypoint: 'unused-test-entrypoint' });
  const catalogs = new WorkspaceCatalogs(directory, workers);
  await catalogs.initialize();
  await catalogs.register('workspace', { projectId: 'project', agentDirectoryId: 'agent', cwd, agentDirectory, env: {} });
  const owner = spyOn(catalogs, 'stateless').mockResolvedValue('owner');
  let requests = 0;
  const request = spyOn(workers, 'request').mockImplementation(async (_root, operation): Promise<WorkerOperationResult> => {
    if (operation.type !== 'catalog') throw new Error('Unexpected operation');
    requests += 1;
    if (operation.operation.type === 'catalog.settings.read') {
      return { type: 'catalog', result: { type: 'catalog.settings', state: await native.read('workspace', operation.revision) } };
    }
    if (operation.operation.type === 'catalog.settings.write') {
      return { type: 'catalog', result: { type: 'catalog.settings.mutated', state: await native.write('workspace', operation.revision, operation.operation.request) } };
    }
    throw new Error('Unexpected catalog operation');
  });
  return {
    catalogs, calls: () => requests,
    async close() {
      request.mockRestore();
      owner.mockRestore();
      settings.cancelPendingSaves();
      await rm(directory, { recursive: true, force: true });
    },
  };
}

test('settings reads and writes advance the workspace revision with stale-write rejection', async () => {
  const f = await fixture();
  try {
    const read = await f.catalogs.operation('workspace', { type: 'catalog.settings.read' });
    expect(read).toMatchObject({ type: 'catalog.settings', state: { workspaceId: 'workspace', revision: '0' } });
    const write = await f.catalogs.operation('workspace', {
      type: 'catalog.settings.write',
      request: { expectedRevision: '0', changes: [{ id: 'compaction.thresholdPercent', value: 40 }] },
    });
    expect(write).toMatchObject({ type: 'catalog.settings.mutated', state: { revision: '1' } });
    expect(f.catalogs.revision('workspace')).toBe('1');
    const before = f.calls();
    await expect(f.catalogs.operation('workspace', {
      type: 'catalog.settings.write',
      request: { expectedRevision: '0', changes: [{ id: 'compaction.thresholdPercent', value: 50 }] },
    })).rejects.toMatchObject({ status: 409, code: 'CATALOG_CONFLICT' });
    expect(f.calls()).toBe(before);
  } finally { await f.close(); }
});
