import { afterEach, beforeEach, expect, test } from 'bun:test';
import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import * as contract from '@openchamber/agent-contract';
import { orderedSettings } from '@oh-my-pi/pi-coding-agent/config/all-settings';
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
    settings, agentDirectory, native: new NativeSettings(settings, agentDirectory),
    async close() {
      settings.cancelPendingSaves();
      await rm(root, { recursive: true, force: true });
    },
  };
}

test('every TUI-visible OMP setting has a placement and no hand-kept id list remains', () => {
  expect((contract as Record<string, unknown>).OMP_SETTING_IDS).toBeUndefined();
  const all = orderedSettings();
  const tuiVisible = all.filter(s => s.ui?.tab !== undefined);
  expect(tuiVisible.length).toBe(450);

  for (const setting of tuiVisible) {
    const placement = OMP_SETTING_PLACEMENTS[setting.id];
    expect(placement, `Missing placement for TUI-visible setting ${setting.id}`).toBeDefined();
    expect(placement.type, `Placement for ${setting.id} must not be hidden`).not.toBe('hidden');
    expect(['page', 'engine', 'tui-only', 'owned-by'], setting.id).toContain(placement.type);
    if (placement.type === 'owned-by') {
      expect(placement.owner.length, setting.id).toBeGreaterThan(0);
    }
  }

  // Untabbed settings default to hidden when not explicitly placed
  const untabbedHidden = presentOmpSetting('some.unplaced.untabbed.setting', undefined, null as unknown as Settings);
  expect(untabbedHidden.placement).toEqual({ type: 'hidden' });
});

test('misclassifications are fixed: followUpMode is not a chat owner; recap belongs to Chat → Session recap', () => {
  expect(OMP_SETTING_PLACEMENTS['followUpMode']).toEqual({ type: 'page', page: 'sessions', section: 'execution' });
  expect(OMP_SETTING_PLACEMENTS['recap.enabled']).toEqual({ type: 'owned-by', owner: 'chat.session-recap' });
  expect(OMP_SETTING_PLACEMENTS['recap.idleSeconds']).toEqual({ type: 'owned-by', owner: 'chat.session-recap' });
  expect(OMP_SETTING_OWNER_IDS).not.toContain('chat.follow-up-behavior');
});

test('an owned-by placement names an owner control, and all placement types stay populated', () => {
  expect(OMP_SETTING_OWNER_IDS).toEqual(['chat.session-recap', 'chat.suggestion-generator']);
  const counts = { page: 0, engine: 0, 'tui-only': 0, 'owned-by': 0, hidden: 0 };
  for (const placement of Object.values(OMP_SETTING_PLACEMENTS)) {
    counts[placement.type] += 1;
  }
  expect(counts.page).toBeGreaterThan(0);
  expect(counts.engine).toBeGreaterThan(0);
  expect(counts['tui-only']).toBeGreaterThan(0);
  expect(counts['owned-by']).toBeGreaterThan(0);
});

test('reads surface, owner and condition from the pinned definitions', async () => {
  const f = await fixture();
  try {
    const state = await f.native.read('workspace_1', '0');
    // The page needs the file it hides settings from, not a second renderer.
    expect(state.configPath).toBe(join(f.agentDirectory, 'config.yml'));
    const byId = new Map(state.settings.map(setting => [setting.id, setting]));
    expect(byId.get('compaction.thresholdPercent')).toMatchObject({ placement: { type: 'engine' } });
    expect(byId.get('enabledModels')).toMatchObject({ placement: { type: 'hidden' } });
    expect(byId.get('tui.renderMermaid')).toMatchObject({ placement: { type: 'tui-only' } });
    expect(byId.get('tools.artifactTailLines')).toMatchObject({ placement: { type: 'engine' } });
    expect(byId.get('cycleOrder')).toMatchObject({ placement: { type: 'tui-only' } });
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
      placement: { type: 'engine' }, condition: 'someClosedSourceCondition', conditionActive: true,
    });
  } finally { await f.close(); }
});
