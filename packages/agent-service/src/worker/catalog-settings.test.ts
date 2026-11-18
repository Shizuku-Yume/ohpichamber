import { afterEach, beforeEach, expect, test } from 'bun:test';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { YAML } from 'bun';
import './suggestion.ts';
import * as contract from '@openchamber/agent-contract';
import { orderedSettings } from '@oh-my-pi/pi-coding-agent/config/all-settings';
import { OMP_SETTING_EXPOSED_IDS, OMP_SETTING_PLACEMENTS } from './settings-ui.ts';
import { Settings, resetSettingsForTest } from '@oh-my-pi/pi-coding-agent/config/settings';
import { cfgCompactionThresholdPercent } from '@oh-my-pi/pi-coding-agent/session/context-settings';
import { NativeSettings } from './catalog-settings.ts';
import { openNativeRuntime } from './native-runtime.ts';

beforeEach(resetSettingsForTest);
afterEach(resetSettingsForTest);

async function fixture() {
  const root = await mkdtemp(join(tmpdir(), 'catalog-settings-'));
  const cwd = join(root, 'workspace');
  const agentDirectory = join(root, 'agent');
  await mkdir(cwd, { recursive: true });
  await mkdir(agentDirectory, { recursive: true });
  const settings = await Settings.loadIsolated({ cwd, agentDir: agentDirectory });
  return {
    settings, cwd, agentDirectory, path: join(agentDirectory, 'config.yml'), native: new NativeSettings(settings),
    async close() {
      settings.cancelPendingSaves();
      await rm(root, { recursive: true, force: true });
    },
  };
}

test('the setting list is derived from orderedSettings and never exposes credentials', async () => {
  expect((contract as Record<string, unknown>).OMP_SETTING_IDS).toBeUndefined();
  const all = orderedSettings();
  const credentials = all.filter(s => s.isCredential).map(s => s.id);
  expect(credentials.length).toBeGreaterThan(0);

  const f = await fixture();
  try {
    const state = await f.native.read('workspace_1', '0');
    expect(state.totalCount).toBe(all.length);
    const ids = new Set(state.settings.map(s => s.id));
    for (const cred of credentials) {
      expect(ids.has(cred)).toBe(false);
    }
    const boundaryIds = Object.keys(OMP_SETTING_PLACEMENTS).filter(id => OMP_SETTING_PLACEMENTS[id].type === 'boundary');
    for (const id of ['dev.autoqa', 'spotlight.experiment.enabled', 'dev.autoqaPush.endpoint']) {
      expect(boundaryIds, id).toContain(id);
    }
    for (const id of boundaryIds) expect(ids.has(id), id).toBe(false);
    const shown = all.filter(s => !s.isCredential && OMP_SETTING_EXPOSED_IDS.has(s.id));
    expect(state.settings.length).toBe(shown.length);
    for (const s of all) if (!shown.includes(s)) expect(ids.has(s.id), s.id).toBe(false);
    expect(state.settings.find(s => s.id === 'compaction.thresholdPercent')).toMatchObject({
      type: 'number', label: 'Compaction Threshold', group: 'Compaction', tab: 'context',
    });
    expect(JSON.stringify(state)).not.toContain('apiKey');
  } finally { await f.close(); }
});

test('writes through OMP Settings, flushes the atomic config file and reloads external edits', async () => {
  const f = await fixture();
  try {
    const read = await f.native.read('workspace_1', '0');
    const written = await f.native.write('workspace_1', '1', {
      expectedRevision: read.revision,
      changes: [{ id: 'compaction.thresholdPercent', value: 55 }],
    });
    expect(written.settings.find(setting => setting.id === 'compaction.thresholdPercent')).toMatchObject({ value: 55, configured: true });
    expect(YAML.parse(await readFile(f.path, 'utf8'))).toMatchObject({ compaction: { thresholdPercent: 55 } });

    // A different Settings instance sees the flushed file, then an external
    // edit appears on the next read without a restart.
    const second = await Settings.loadIsolated({ cwd: f.cwd, agentDir: f.agentDirectory });
    expect(await new NativeSettings(second).read('workspace_1', '1')).toMatchObject({
      settings: expect.arrayContaining([expect.objectContaining({ id: 'compaction.thresholdPercent', value: 55 })]),
    });
    second.cancelPendingSaves();
    const parsed = YAML.parse(await readFile(f.path, 'utf8'));
    await writeFile(f.path, YAML.stringify({ ...parsed, compaction: { ...parsed.compaction, thresholdPercent: 65 } }), { mode: 0o600 });
    expect((await f.native.read('workspace_1', '1')).settings.find(setting => setting.id === 'compaction.thresholdPercent')?.value).toBe(65);
  } finally { await f.close(); }
});
test('refuses to write a setting no GUI surface places', async () => {
  const f = await fixture();
  try {
    const read = await f.native.read('workspace_1', '0');
    await expect(f.native.write('workspace_1', '1', {
      expectedRevision: read.revision,
      changes: [{ id: 'enabledProviders', value: [] }],
    })).rejects.toMatchObject({ status: 400, code: 'INVALID_REQUEST' });
    await expect(f.native.write('workspace_1', '1', {
      expectedRevision: read.revision,
      changes: [{ id: 'collab.relayUrl', value: 'https://relay.example' }],
    })).rejects.toMatchObject({ status: 400, code: 'INVALID_REQUEST' });
  } finally { await f.close(); }
});

test('writes engine settings and refuses settings no GUI owner writes', async () => {
  const f = await fixture();
  try {
    const read = await f.native.read('workspace_1', '0');
    const written = await f.native.write('workspace_1', '1', {
      expectedRevision: read.revision,
      changes: [{ id: 'tools.artifactSpillThreshold', value: 80 }],
    });
    expect(written.settings.find(s => s.id === 'tools.artifactSpillThreshold')).toMatchObject({ value: 80, configured: true });
    for (const change of [{ id: 'stt.enabled', value: true }, { id: 'tui.renderSvg', value: false }, { id: 'composer.predictions', value: true }, { id: 'skills.registryUrl', value: 'https://skills.example' }]) {
      await expect(f.native.write('workspace_1', '1', { expectedRevision: read.revision, changes: [change] }), change.id)
        .rejects.toMatchObject({ status: 400, code: 'INVALID_REQUEST' });
    }
  } finally { await f.close(); }
});


test('rejects a malformed value before touching the config file', async () => {
  const f = await fixture();
  try {
    const read = await f.native.read('workspace_1', '0');
    await expect(f.native.write('workspace_1', '1', {
      expectedRevision: read.revision,
      changes: [{ id: 'compaction.thresholdPercent', value: 'not-a-number' }],
    })).rejects.toMatchObject({ status: 400, code: 'INVALID_REQUEST' });
    expect(await readFile(f.path, 'utf8').catch(() => '')).not.toContain('thresholdPercent');
  } finally { await f.close(); }
});

test('a freshly opened native runtime sees the persisted behaviour value', async () => {
  const f = await fixture();
  try {
    const read = await f.native.read('workspace_1', '0');
    await f.native.write('workspace_1', '1', {
      expectedRevision: read.revision,
      changes: [{ id: 'compaction.thresholdPercent', value: 54 }],
    });
    // `openNativeRuntime` is the session-start entry point: it constructs the
    // Settings instance from the same agent directory before a run exists.
    const runtime = await openNativeRuntime({ cwd: f.cwd, agentDirectory: f.agentDirectory });
    try { expect(cfgCompactionThresholdPercent.get(runtime.settings)).toBe(54); }
    finally { runtime.authStorage.close(); }
  } finally { await f.close(); }
});
