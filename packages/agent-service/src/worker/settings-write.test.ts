import { afterEach, beforeEach, expect, test } from 'bun:test';
import { mkdir, mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { YAML } from 'bun';
import { lookup } from '@oh-my-pi/pi-coding-agent/config/registry';
import { Settings, resetSettingsForTest } from '@oh-my-pi/pi-coding-agent/config/settings';
import { ProjectionError } from '../projection/journal.ts';
import { NativeSettings } from './catalog-settings.ts';

/**
 * A control that writes an OMP key must reach a setting the catalog knows. The
 * Chat selector writes `suggestion.generator`, a service-owned key that only
 * resolves because `catalog-settings.ts` imports `./suggestion.ts`; dropping
 * that import turns the write into an `Unknown OMP setting` 400 that a text
 * anchor test cannot see. These tests write through the UI's own route.
 */

beforeEach(resetSettingsForTest);
afterEach(resetSettingsForTest);

async function fixture() {
  const root = await mkdtemp(join(tmpdir(), 'settings-write-'));
  const cwd = join(root, 'workspace');
  const agentDirectory = join(root, 'agent');
  await mkdir(cwd, { recursive: true });
  await mkdir(agentDirectory, { recursive: true });
  const settings = await Settings.loadIsolated({ cwd, agentDir: agentDirectory });
  return {
    settings, agentDirectory, path: join(agentDirectory, 'config.yml'), native: new NativeSettings(settings, agentDirectory),
    async close() {
      settings.cancelPendingSaves();
      await rm(root, { recursive: true, force: true });
    },
  };
}

test('the Chat selector write for suggestion.generator lands in OMP settings', async () => {
  expect(lookup('suggestion.generator')).toBeDefined();
  const f = await fixture();
  try {
    const read = await f.native.read('workspace_1', '1');
    const written = await f.native.write('workspace_1', '2', {
      expectedRevision: read.revision,
      changes: [{ id: 'suggestion.generator', value: 'small' }],
    });
    expect(written.revision).toBe('2');
    expect(YAML.parse(await readFile(f.path, 'utf8'))).toMatchObject({ suggestion: { generator: 'small' } });
  } finally { await f.close(); }
});

test('a write to an id no control owns is refused, not silently dropped', async () => {
  const f = await fixture();
  try {
    const read = await f.native.read('workspace_1', '1');
    await expect(f.native.write('workspace_1', '2', {
      expectedRevision: read.revision,
      changes: [{ id: 'not.a.real.setting', value: true }],
    })).rejects.toBeInstanceOf(ProjectionError);
  } finally { await f.close(); }
});
