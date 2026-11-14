import { afterEach, beforeEach, expect, mock, spyOn, test } from 'bun:test';
import type { Spy } from 'bun:test';
import type { Root } from 'react-dom/client';
import type { CanonicalClient } from '@/api/canonicalClient';
import { Window } from 'happy-dom';
import type { ModelCatalog, OmpSetting, OmpSettingsState } from '@openchamber/agent-contract';

const browser = new Window({ url: 'http://localhost/' });
Object.assign(globalThis, {
  window: browser,
  document: browser.document,
  navigator: browser.navigator,
  localStorage: browser.localStorage,
  sessionStorage: browser.sessionStorage,
  Node: browser.Node,
  Element: browser.Element,
  HTMLElement: browser.HTMLElement,
  HTMLInputElement: browser.HTMLInputElement,
  HTMLTextAreaElement: browser.HTMLTextAreaElement,
  Event: browser.Event,
  FocusEvent: browser.FocusEvent,
  CustomEvent: browser.CustomEvent,
  KeyboardEvent: browser.KeyboardEvent,
  PointerEvent: browser.PointerEvent,
  MutationObserver: browser.MutationObserver,
  ResizeObserver: browser.ResizeObserver,
  getComputedStyle: browser.getComputedStyle.bind(browser),
  requestAnimationFrame: browser.requestAnimationFrame.bind(browser),
  cancelAnimationFrame: browser.cancelAnimationFrame.bind(browser),
  IS_REACT_ACT_ENVIRONMENT: true,
});

mock.module('@/hooks/useSettingsDirectory', () => ({ useSettingsDirectory: () => '/repo' }));
const revealPath = mock(async () => ({ success: true }));
mock.module('@/hooks/useRuntimeAPIs', () => ({
  useRuntimeAPIs: () => ({ files: { revealPath } }),
}));

// React DOM must initialize after happy-dom is installed; a static import would evaluate before this setup.
const { act } = await import('react');
const { createRoot } = await import('react-dom/client');
const { I18nProvider, useI18nStore } = await import('@/lib/i18n');
const { CanonicalApiError, canonicalClient } = await import('@/api/canonicalClient');
const { OmpSettingsPage } = await import('./OmpSettingsPage');
const { ompSettingsI18n } = await import('@/lib/i18n/messages/omp-settings.i18n');

const CONFIG_PATH = '/home/user/.omp/agent/config.yml';

/** One row per placement, so the page's filtering is observable. */
const setting = (overrides: Partial<OmpSetting> & Pick<OmpSetting, 'id' | 'type'>): OmpSetting => ({
  value: null, default: null, configured: false, placement: { type: 'engine' },
  ...overrides,
} as OmpSetting);

const state = {
  workspaceId: 'workspace_1',
  revision: '7',
  configPath: CONFIG_PATH,
  totalCount: 15,
  settings: [
    setting({ id: 'compaction.enabled', type: 'boolean', value: true, label: 'Auto-Compact', tab: 'context' }),
    setting({
      id: 'compaction.thresholdPercent', type: 'number', value: 50, label: 'Compaction Threshold', tab: 'context',
      options: [
        { value: 'default', label: 'Default' },
        { value: '50', label: '50%' },
      ],
    }),
    // Terminal presentation and internals must not reach the page.
    setting({ id: 'tui.maxFps', type: 'number', value: 30, placement: { type: 'tui-only' }, label: 'Max FPS' }),
    setting({ id: 'cycleOrder', type: 'array', value: ['smol', 'default'], placement: { type: 'tui-only' } }),
    setting({ id: 'tools.artifactTailLines', type: 'number', value: 1000, placement: { type: 'page', page: 'tools', section: 'limits' } }),
    // A concept another page owns is not drawn here at all.
    setting({ id: 'enabledModels', type: 'array', value: [], placement: { type: 'owned-by', owner: 'providers.models' } }),
    setting({ id: 'recap.enabled', type: 'boolean', value: true, placement: { type: 'page', page: 'chat', section: 'recap' } }),
    // One row per section, so every heading renders and is checked as prose.
    setting({ id: 'lsp.enabled', type: 'boolean', value: true, label: 'LSP', tab: 'lsp' }),
    setting({ id: 'task.maxConcurrency', type: 'number', value: 3, label: 'Task concurrency' }),
    setting({ id: 'skills.enabled', type: 'boolean', value: true, label: 'Skills' }),
    setting({ id: 'mcp.enableProjectConfig', type: 'boolean', value: false, label: 'Project MCP config' }),
    // OMP's own condition gates these two.
    setting({ id: 'retry.usageReservePct', type: 'number', value: 15, condition: 'usageAwareFallbackEnabled', conditionActive: false, label: 'Usage reserve' }),
    setting({ id: 'plan.defaultOnStartup', type: 'boolean', value: false, condition: 'planModeEnabled', conditionActive: true, label: 'Start in plan mode' }),
    // Chips come from the enumerated options.
    setting({
      id: 'retry.fallbackOn', type: 'enum', value: 'any', label: 'Fall Back On',
      enumValues: ['any', 'usage-limit', 'except-usage-limit'],
    }),
    setting({
      id: 'modelRoles', type: 'record', value: { vision: 'anthropic/claude-3-7-sonnet:high' },
      label: 'Model Roles',
    }),
  ],
};

const mockModelCatalog = {
  workspaceId: 'workspace_1',
  revision: '1',
  imageModels: [], planRoleAvailable: true,
  defaults: { model: { providerId: 'anthropic', modelId: 'claude-3-7-sonnet' }, thinkingLevel: 'auto' },
  models: [
    {
      modelId: 'claude-3-7-sonnet', provider: 'anthropic', name: 'Claude 3.7 Sonnet',
      modalities: ['text', 'image'], contextWindow: 200000, maxOutputTokens: 64000,
      reasoningEffortSupported: true,
      reasoningOptions: [
        { reasoningEffort: 'low', label: 'Low', budgetTokens: 2048 },
        { reasoningEffort: 'high', label: 'High', budgetTokens: 32000 },
      ],
      variants: [], pricing: null,
    },
  ],
};

let resolveWorkspace: Spy<CanonicalClient['resolveWorkspace']>;
let getSettings: Spy<CanonicalClient['getOmpSettings']>;
let updateSettings: Spy<CanonicalClient['updateOmpSettings']>;
let getModels: Spy<CanonicalClient['getModels']>;
let container: HTMLDivElement;
let root: Root;

const settle = async () => {
  await act(async () => { await new Promise<void>(resolve => setTimeout(resolve, 0)); });
};

beforeEach(async () => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  resolveWorkspace = spyOn(canonicalClient, 'resolveWorkspace').mockResolvedValue({ workspaceId: 'workspace_1', projectId: 'project_1', name: 'repo' });
  getSettings = spyOn(canonicalClient, 'getOmpSettings').mockResolvedValue(state as unknown as OmpSettingsState);
  getModels = spyOn(canonicalClient, 'getModels').mockResolvedValue(mockModelCatalog as unknown as ModelCatalog);
  updateSettings = spyOn(canonicalClient, 'updateOmpSettings').mockImplementation(async (_workspaceId, request) => ({
    ...state,
    revision: String(Number(request.expectedRevision) + 1),
    settings: state.settings.map(entry => {
      const change = request.changes.find(candidate => candidate.id === entry.id);
      return change ? { ...entry, value: change.value } : entry;
    }),
  }) as unknown as OmpSettingsState);
});

afterEach(async () => {
  await act(async () => root.unmount());
  resolveWorkspace.mockRestore();
  getSettings.mockRestore();
  updateSettings.mockRestore();
  getModels.mockRestore();
  container.remove();
  browser.close();
});

test('renders only the engine rows and saves a changed value with the captured revision', async () => {
  await act(async () => { root.render(<I18nProvider><OmpSettingsPage /></I18nProvider>); });
  await settle();

  const enabledRow = container.querySelector('[data-settings-item="omp.compaction.enabled"]');
  expect(enabledRow?.textContent).toContain('Compaction');
  const thresholdRow = container.querySelector('[data-settings-item="omp.compaction.thresholdPercent"]');
  expect(thresholdRow?.textContent).toContain('Compact at');

  if (!(enabledRow instanceof HTMLElement)) throw new Error('settings row missing');
  await act(async () => { enabledRow.click(); });
  await settle();
  expect(updateSettings).toHaveBeenCalledWith('workspace_1', {
    expectedRevision: '7',
    changes: [{ id: 'compaction.enabled', value: false }],
  });
});

test('renders a number setting with a default option as a select showing Default for -1 and 默认 in zh-CN', async () => {
  const numberSettingState = {
    ...state,
    settings: [
      setting({
        id: 'compaction.thresholdPercent',
        type: 'number',
        value: -1,
        default: -1,
        label: 'Compaction Threshold',
        tab: 'context',
        options: [
          { value: 'default', label: 'Default' },
          { value: '10', label: '10%' },
          { value: '50', label: '50%' },
        ],
      }),
    ],
  };
  getSettings.mockResolvedValueOnce(numberSettingState as unknown as OmpSettingsState);

  await act(async () => { root.render(<I18nProvider><OmpSettingsPage /></I18nProvider>); });
  await settle();

  const select = container.querySelector('[data-settings-item="omp.compaction.thresholdPercent"]');
  expect(select).not.toBeNull();
  expect(select?.textContent).toContain('Default');

  // In zh-CN
  await act(async () => {
    useI18nStore.getState().setLocale('zh-CN');
  });
  while (useI18nStore.getState().loadingLocale) {
    await settle();
  }
  try {
    getSettings.mockResolvedValueOnce(numberSettingState as unknown as OmpSettingsState);
    await act(async () => { root.render(<I18nProvider><OmpSettingsPage /></I18nProvider>); });
    await settle();
    const selectZh = container.querySelector('[data-settings-item="omp.compaction.thresholdPercent"]');
    expect(selectZh?.textContent).toContain('默认');
  } finally {
    await act(async () => {
      useI18nStore.getState().setLocale('en');
    });
    while (useI18nStore.getState().loadingLocale) {
      await settle();
    }
  }
});

test('leaves terminal-only, page and duplicate settings off the page', async () => {
  await act(async () => { root.render(<I18nProvider><OmpSettingsPage /></I18nProvider>); });
  await settle();

  for (const id of ['tui.maxFps', 'cycleOrder', 'tools.artifactTailLines', 'enabledModels', 'recap.enabled']) {
    expect(`${id}: ${container.querySelector(`[data-settings-item="omp.${id}"]`) === null}`).toBe(`${id}: true`);
  }
  // The page counts what it left out instead of drawing it.
  expect(container.textContent).toContain('7 settings');
});

test('hides a row whose condition is off and keeps one whose condition holds', async () => {
  await act(async () => { root.render(<I18nProvider><OmpSettingsPage /></I18nProvider>); });
  await settle();

  expect(container.querySelector('[data-settings-item="omp.retry.usageReservePct"]')).toBeNull();
  expect(container.querySelector('[data-settings-item="omp.plan.defaultOnStartup"]')).not.toBeNull();
});

test('offers the config file for the settings it does not render', async () => {
  await act(async () => { root.render(<I18nProvider><OmpSettingsPage /></I18nProvider>); });
  await settle();

  expect(container.textContent).toContain(CONFIG_PATH);
  const openConfig = Array.from(container.querySelectorAll('button')).find(button => button.textContent?.includes('Open config.yml'));
  if (!openConfig) throw new Error('open config button missing');
  await act(async () => { openConfig.click(); });
  expect(revealPath).toHaveBeenCalledWith(CONFIG_PATH);
});

test('model roles live on concept-owning pages and stay off the OMP page', async () => {
  await act(async () => { root.render(<I18nProvider><OmpSettingsPage /></I18nProvider>); });
  await settle();

  // Model roles are managed on owning pages, not on the OMP page
  for (const role of ['default', 'smol', 'slow', 'commit', 'vision', 'image', 'memory', 'task', 'advisor']) {
    expect(`${role}: ${container.querySelector(`[data-settings-item="omp.modelRoles.${role}"]`) === null}`).toBe(`${role}: true`);
  }
});

test('shows a retry path when the settings read fails', async () => {
  getSettings.mockRejectedValue(new Error('offline'));
  await act(async () => { root.render(<I18nProvider><OmpSettingsPage /></I18nProvider>); });
  await settle();
  expect(container.textContent).toContain(ompSettingsI18n.en['settings.omp.loadFailed']);
  expect(container.textContent).toContain(ompSettingsI18n.en['settings.omp.retry']);
});

test('retries once at the refreshed revision when another mutation wins', async () => {
  await act(async () => { root.render(<I18nProvider><OmpSettingsPage /></I18nProvider>); });
  await settle();
  getSettings.mockResolvedValueOnce({ ...state, revision: '8' } as unknown as OmpSettingsState);
  updateSettings.mockRejectedValueOnce(new CanonicalApiError({
    type: 'urn:ohpichamber:problem:CATALOG_CONFLICT', title: 'Request refused', status: 409,
    code: 'CATALOG_CONFLICT', detail: 'stale revision', retryable: false,
  }));
  const row = container.querySelector('[data-settings-item="omp.compaction.enabled"]');
  if (!(row instanceof HTMLElement)) throw new Error('settings row missing');
  await act(async () => { row.click(); });
  await settle();
  expect(updateSettings).toHaveBeenCalledTimes(2);
  expect(updateSettings).toHaveBeenLastCalledWith('workspace_1', {
    expectedRevision: '8',
    changes: [{ id: 'compaction.enabled', value: false }],
  });
});

test('shows the choices as chips and never a raw control for an enum', async () => {
  await act(async () => { root.render(<I18nProvider><OmpSettingsPage /></I18nProvider>); });
  await settle();

  const row = container.querySelector('[data-settings-item="omp.retry.fallbackOn"]');
  expect(row).not.toBeNull();
  const chips = row?.querySelector('[role="group"]');
  expect(chips).not.toBeNull();
  // Three short choices; the selected one is pressed.
  const buttons = chips?.querySelectorAll('button');
  expect(buttons?.length).toBe(3);
  expect(Array.from(buttons ?? []).some(button => button.getAttribute('aria-pressed') === 'true')).toBe(true);
});

test('renders every page row translated in zh-CN with no raw setting id on screen', async () => {
  await act(async () => {
    useI18nStore.getState().setLocale('zh-CN');
  });
  while (useI18nStore.getState().loadingLocale) {
    await settle();
  }
  try {
    await act(async () => { root.render(<I18nProvider><OmpSettingsPage /></I18nProvider>); });
    await settle();

    expect(container.textContent).toContain(ompSettingsI18n['zh-CN']['settings.omp.items.lsp.enabled.label']);
    expect(container.textContent).toContain(ompSettingsI18n['zh-CN']['settings.omp.items.compaction.enabled.label']);
    // A section heading is addressed by key like every row, so a heading the
    // vocabulary forgot would render as `settings.omp.group.<id>.label`.
    for (const key of [
      'settings.omp.group.retry_fallback.label',
      'settings.omp.group.compaction.label',
      'settings.omp.group.lsp.label',
      'settings.omp.group.modes.label',
      'settings.omp.group.commands_skills.label',
    ] as const) {
      expect(container.textContent, key).toContain(ompSettingsI18n['zh-CN'][key]);
    }
    expect(container.textContent).not.toContain('settings.omp.group.');
    // No raw `setting.id` leaks: the ids are snake/dot vocabulary, never prose.
    for (const raw of ['compaction.enabled', 'compaction.thresholdPercent', 'retry.fallbackOn', 'plan.defaultOnStartup', 'modelRoles']) {
      expect(`${raw}: ${(container.textContent ?? "").includes(raw)}`).toBe(`${raw}: false`);
    }
  } finally {
    await act(async () => {
      useI18nStore.getState().setLocale('en');
    });
    while (useI18nStore.getState().loadingLocale) {
      await settle();
    }
  }
});
