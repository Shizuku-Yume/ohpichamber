import { afterEach, beforeEach, expect, test } from 'bun:test';
import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import * as contract from '@openchamber/agent-contract';
import { orderedSettings } from '@oh-my-pi/pi-coding-agent/config/all-settings';
import { Settings, resetSettingsForTest } from '@oh-my-pi/pi-coding-agent/config/settings';
import { OMP_SETTING_EXPOSED_IDS, OMP_SETTING_OWNER_IDS, OMP_SETTING_PLACEMENTS, presentOmpSetting } from './settings-ui.ts';
import { NativeSettings } from './catalog-settings.ts';
import { readFileSync, readdirSync, statSync } from 'node:fs';

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
    expect(['page', 'engine', 'tui-only', 'owned-by', 'config-only', 'boundary'], setting.id).toContain(placement.type);
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
  expect([...OMP_SETTING_OWNER_IDS].sort()).toEqual([
    'chat.session-recap', 'chat.suggestion-generator', 'omp.modelRoles', 'sessions.fallback-model',
  ]);
  const counts = { page: 0, engine: 0, 'tui-only': 0, 'owned-by': 0, 'config-only': 0, hidden: 0, boundary: 0 };
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
    expect(byId.get('compaction.thresholdPercent')).toMatchObject({ placement: { type: 'page', page: 'sessions', section: 'compaction' } });
    expect(byId.has('enabledModels')).toBe(false);
    expect(byId.has('tui.renderMermaid')).toBe(false);
    expect(byId.get('tools.artifactTailLines')).toMatchObject({ placement: { type: 'engine' } });
    expect(byId.has('cycleOrder')).toBe(false);
    // OMP's own `ui.condition` travels with the descriptor and is evaluated
    // against this worker's settings, not a process-wide singleton.
    expect(byId.get('retry.usageReservePct')).toMatchObject({
      condition: 'usageAwareFallbackEnabled', conditionActive: false,
    });
    // The pinned definition gates both plan rows on plan mode itself;
    // `planAutosaveEnabled` belongs to `plan.autosaveDir`, which the
    // no GUI owner draws.
    expect(byId.get('plan.defaultOnStartup')).toMatchObject({ condition: 'planModeEnabled', conditionActive: true });
    expect(byId.get('plan.autosave')).toMatchObject({ condition: 'planModeEnabled', conditionActive: true });
    expect(byId.get('retry.usageReservePolicy')).toMatchObject({ condition: 'usageAwareFallbackEnabled', conditionActive: false });
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
    // A condition reading a setting no GUI owner draws still
    // evaluates against the same handle, so plan mode being off hides its rows.
    expect(byId.get('plan.defaultOnStartup')).toMatchObject({ conditionActive: false });
    expect(byId.get('plan.autosave')).toMatchObject({ conditionActive: false });
  } finally { await f.close(); }
});

test('an unknown condition name keeps the row visible', async () => {
  const f = await fixture();
  try {
    expect(presentOmpSetting('compaction.enabled', 'someClosedSourceCondition', f.settings)).toEqual({
      placement: { type: 'page', page: 'sessions', section: 'compaction' }, condition: 'someClosedSourceCondition', conditionActive: true,
    });
  } finally { await f.close(); }
});

test('every engine placement carries OMP label and description from the pinned registry', () => {
  for (const setting of orderedSettings()) {
    if (setting.isCredential) continue;
    if (OMP_SETTING_PLACEMENTS[setting.id]?.type !== 'engine') continue;
    expect(setting.ui?.label, `${setting.id} needs an OMP label`).toBeTruthy();
    expect(setting.ui?.description, `${setting.id} needs an OMP description`).toBeTruthy();
  }
});

test('only GUI-owned settings are exposed: boundary, tui-only and unwritten page placements are not', () => {
  for (const id of ['skills.registryUrl', 'plan.autosaveDir', 'tui.renderSvg', 'stt.enabled', 'collab.relayUrl']) {
    expect(OMP_SETTING_EXPOSED_IDS.has(id), id).toBe(false);
  }
  // Record/Array engine settings with no generic choices cannot be edited via GUI controls and stay in config.yml
  for (const id of ['tools.approval', 'bash.patterns', 'model.toolCallLoopGuard.exemptTools']) {
    expect(OMP_SETTING_EXPOSED_IDS.has(id), id).toBe(false);
  }
  for (const id of ['compaction.thresholdPercent', 'recap.enabled', 'defaultThinkingLevel', 'modelRoles', 'steeringMode', 'plan.enabled', 'goal.enabled', 'retry.fallbackChains']) {
    expect(OMP_SETTING_EXPOSED_IDS.has(id), id).toBe(true);
  }
});

test('every exposed page row is drawn by the section a GUI owner renders', () => {
  // A placement on a page section nobody draws makes the row writable but
  // invisible: the "hollow setting" this effort exists to remove. The section
  // names are read from the components that render them, so a deleted section
  // fails here instead of being excused by this test's own list.
  const unwritten: string[] = [];
  for (const id of OMP_SETTING_EXPOSED_IDS) {
    const placement = OMP_SETTING_PLACEMENTS[id];
    if (placement?.type !== 'page') continue;
    const rendered = renderedSections(placement.page);
    if (rendered !== undefined && !rendered.has(placement.section)) {
      unwritten.push(`${id} → ${placement.page}:${placement.section}`);
    }
  }
  expect(unwritten).toEqual([]);
});

test('a value no generic row can draw is owned by the control that writes it, or config-only', () => {
  // A per-model record or a bare array has no option list, so an OmpRowControl
  // would draw an empty chip group. Those values either name the control that
  // writes them or stay in config.yml; none sits on a page as a hollow row.
  expect(OMP_SETTING_PLACEMENTS['retry.fallbackChains']).toEqual({ type: 'owned-by', owner: 'sessions.fallback-model' });
  expect(OMP_SETTING_EXPOSED_IDS.has('retry.fallbackChains')).toBe(true);
  for (const id of ['tools.approval', 'tools.restrictedFolders', 'compaction.methodOrder', 'ttsr.disabledRules', 'bash.patterns', 'model.toolCallLoopGuard.exemptTools', 'task.perCallModelAllow', 'goal.continuationModes', 'tools.xdevInlineDevices']) {
    expect(OMP_SETTING_PLACEMENTS[id], id).toEqual({ type: 'config-only' });
    expect(OMP_SETTING_EXPOSED_IDS.has(id), id).toBe(false);
  }
});

test('every page or engine placement can actually draw a control', () => {
  // The Audit reads placement type alone to decide whether the route exposes a
  // row, because it cannot see OMP's descriptors. That is only sound while a
  // value the generic row cannot draw is never placed on a page or `engine`.
  const byId = new Map(orderedSettings().map((setting) => [setting.id, setting]));
  const undrawable: string[] = [];
  for (const [id, placement] of Object.entries(OMP_SETTING_PLACEMENTS)) {
    if (placement.type !== 'page' && placement.type !== 'engine') continue;
    const setting = byId.get(id);
    if (!setting) continue; // a synthetic id the route resolves from OMP's own registry
    const type = setting.type;
    const choices = setting.ui?.options ?? setting.enumValues ?? [];
    const drawable = type === 'boolean' || type === 'number' || type === 'string' || choices.length > 0;
    if (!drawable) undrawable.push(`${id} (${type}) → ${placement.type}`);
  }
  expect(undrawable).toEqual([]);
});

/**
 * The page sections the UI draws, read from the components themselves: an OMP
 * page section is rendered by `getSectionRows('<section>')`,
 * `getSectionSettings('<section>')` or a `<s>Settings` binding built from
 * `getSectionSettings('<section>')` in `packages/ui/src`.
 */
function renderedSections(page: string): ReadonlySet<string> | undefined {
  const root = new URL('../../../ui/src/components/sections', import.meta.url);
  const files = walk(String(root.pathname));
  const sections = new Set<string>();
  let found = false;
  for (const file of files) {
    const source = readFileSync(file, 'utf8');
    if (!source.includes(`useOmpPageSettings('${page}')`)) continue;
    found = true;
    for (const match of source.matchAll(/getSectionRows\('([^']+)'\)/g)) sections.add(match[1]);
    for (const match of source.matchAll(/getSectionSettings\('([^']+)'\)/g)) sections.add(match[1]);
  }
  return found ? sections : undefined;
}

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = `${dir}/${entry}`;
    if (statSync(full).isDirectory()) return walk(full);
    return /\.tsx$/.test(entry) && !/\.test\.tsx$/.test(entry) ? [full] : [];
  });
}
