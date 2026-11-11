import { afterEach, beforeEach, expect, test } from 'bun:test';
import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { OMP_SETTING_IDS } from '@openchamber/agent-contract';
import { Settings, resetSettingsForTest } from '@oh-my-pi/pi-coding-agent/config/settings';
import { OMP_SETTING_OWNER_IDS, OMP_SETTING_PLACEMENTS, presentOmpSetting } from './settings-ui.ts';
import { NativeSettings } from './catalog-settings.ts';

beforeEach(resetSettingsForTest);
afterEach(resetSettingsForTest);

async function fixture() {
  const root = await mkdtemp(join(tmpdir(), 'settings-ui-'));
  const cwd = join(root, 'workspace');
  const agentDirectory = join(root, 'agent');
  await mkdir(cwd, { recursive: true });
  await mkdir(agentDirectory, { recursive: true });
  const settings = await Settings.loadIsolated({ cwd, agentDir: agentDirectory });
  return {
    settings, native: new NativeSettings(settings),
    async close() {
      settings.cancelPendingSaves();
      await rm(root, { recursive: true, force: true });
    },
  };
}

test('every allowlisted OMP setting is classified exactly once', () => {
  expect(Object.keys(OMP_SETTING_PLACEMENTS)).toHaveLength(OMP_SETTING_IDS.length);
  for (const id of OMP_SETTING_IDS) {
    const placement = OMP_SETTING_PLACEMENTS[id];
    expect(placement, id).toBeDefined();
    expect(['gui', 'tui-only', 'duplicate', 'advanced'], id).toContain(placement.surface);
    if (placement.surface === 'duplicate') expect(placement.owner.length, id).toBeGreaterThan(0);
    else expect(placement, id).not.toHaveProperty('owner');
  }
  // Nothing outside the allowlist can be classified, so a retired id cannot
  // linger as a row nobody renders.
  expect(new Set(Object.keys(OMP_SETTING_PLACEMENTS))).toEqual(new Set(OMP_SETTING_IDS));
});

test('a duplicate names an owner control, and the four meaningful surfaces stay populated', () => {
  expect(new Set(OMP_SETTING_OWNER_IDS).size).toBe(OMP_SETTING_OWNER_IDS.length);
  const counts = { gui: 0, 'tui-only': 0, duplicate: 0, advanced: 0 };
  for (const id of OMP_SETTING_IDS) counts[OMP_SETTING_PLACEMENTS[id].surface] += 1;
  expect(counts.gui).toBeGreaterThan(0);
  expect(counts['tui-only']).toBeGreaterThan(0);
  expect(counts.duplicate).toBeGreaterThan(0);
  expect(counts.advanced).toBeGreaterThan(0);
});

test('reads surface, owner and condition from the pinned definitions', async () => {
  const f = await fixture();
  try {
    const state = await f.native.read('workspace_1', '0');
    const byId = new Map(state.settings.map(setting => [setting.id, setting]));
    expect(byId.get('compaction.thresholdPercent')).toMatchObject({ surface: 'gui' });
    expect(byId.get('enabledModels')).toMatchObject({ surface: 'duplicate', owner: 'providers.models' });
    expect(byId.get('tui.renderMermaid')).toMatchObject({ surface: 'duplicate', owner: 'chat.mermaid-rendering' });
    expect(byId.get('tools.artifactTailLines')).toMatchObject({ surface: 'advanced' });
    expect(byId.get('cycleOrder')).toMatchObject({ surface: 'tui-only' });
    // OMP's own `ui.condition` travels with the descriptor and is evaluated
    // against this worker's settings, not a process-wide singleton.
    expect(byId.get('retry.usageReservePct')).toMatchObject({
      condition: 'usageAwareFallbackEnabled', conditionActive: false,
    });
    // The pinned definition gates both plan rows on plan mode itself;
    // `planAutosaveEnabled` belongs to `plan.autosaveDir`, which the
    // allowlist does not expose.
    expect(byId.get('plan.defaultOnStartup')).toMatchObject({ condition: 'planModeEnabled', conditionActive: true });
    expect(byId.get('plan.autosave')).toMatchObject({ condition: 'planModeEnabled', conditionActive: true });
    expect(byId.get('tier.advisor')).toMatchObject({ condition: 'advisorEnabled', conditionActive: false });
    expect(byId.get('composer.predictionAlternatives')).toMatchObject({
      condition: 'composerPredictionsEnabled', conditionActive: false,
    });
    // A setting without a condition never claims one.
    expect(byId.get('compaction.enabled')).not.toHaveProperty('condition');
  } finally { await f.close(); }
});

test('a condition turns true when the setting it reads is turned on', async () => {
  const f = await fixture();
  try {
    const read = await f.native.read('workspace_1', '0');
    await f.native.write('workspace_1', '1', {
      expectedRevision: read.revision,
      changes: [
        { id: 'retry.usageAwareFallback', value: true },
        { id: 'plan.enabled', value: false },
      ],
    });
    const after = await f.native.read('workspace_1', '2');
    const byId = new Map(after.settings.map(setting => [setting.id, setting]));
    expect(byId.get('retry.usageReservePct')).toMatchObject({ conditionActive: true });
    expect(byId.get('retry.usageReservePolicy')).toMatchObject({ conditionActive: true });
    // A condition reading a setting the allowlist does not expose still
    // evaluates against the same handle, so plan mode being off hides its rows.
    expect(byId.get('plan.defaultOnStartup')).toMatchObject({ conditionActive: false });
    expect(byId.get('plan.autosave')).toMatchObject({ conditionActive: false });
  } finally { await f.close(); }
});

test('an unknown condition name keeps the row visible', async () => {
  const f = await fixture();
  try {
    expect(presentOmpSetting('compaction.enabled', 'someClosedSourceCondition', f.settings)).toEqual({
      surface: 'gui', condition: 'someClosedSourceCondition', conditionActive: true,
    });
  } finally { await f.close(); }
});
