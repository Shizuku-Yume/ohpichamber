import { afterEach, beforeEach, expect, mock, spyOn, test } from 'bun:test';
import type { Mock } from 'bun:test';
import type { Root } from 'react-dom/client';
import type { CanonicalClient } from '@/api/canonicalClient';
import { Window } from 'happy-dom';

const browser = new Window({ url: 'http://localhost/' });
Object.assign(globalThis, {
  window: browser,
  document: browser.document,
  navigator: browser.navigator,
  Node: browser.Node,
  Element: browser.Element,
  HTMLElement: browser.HTMLElement,
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

// React DOM must initialize after happy-dom is installed; a static import would evaluate before this setup.
const { act } = await import('react');
const { createRoot } = await import('react-dom/client');
const { I18nProvider } = await import('@/lib/i18n');
const { CanonicalApiError, canonicalClient } = await import('@/api/canonicalClient');
import type { ModelCatalog } from '@openchamber/agent-contract';
import { OMP_MODEL_ROLES, parseRoleSelector, formatRoleSelector, resolveRoleFallback } from './ompModelRoles';
import { ompSettingsI18n } from '@/lib/i18n/messages/ompSettingsI18n';
const { OmpSettingsPage } = await import('./OmpSettingsPage');

const state = {
  workspaceId: 'workspace_1',
  revision: '7',
  settings: [
    { id: 'compaction.enabled' as const, type: 'boolean' as const, value: true, default: true, configured: true, label: 'Auto-Compact', group: 'Compaction', tab: 'context' },
    { id: 'compaction.thresholdPercent' as const, type: 'number' as const, value: 50, default: -1, configured: true, label: 'Compaction Threshold', group: 'Compaction', tab: 'context' },
  ],
};
const mockModelCatalog = {
  workspaceId: 'workspace_1',
  revision: '1',
  planRoleAvailable: true,
  defaults: { model: { providerId: 'anthropic', modelId: 'claude-3-7-sonnet' }, thinkingLevel: 'auto' },
  models: [
    {
      modelId: 'claude-3-7-sonnet',
      provider: 'anthropic',
      name: 'Claude 3.7 Sonnet',
      modalities: ['text', 'image'] as const,
      contextWindow: 200000,
      maxOutputTokens: 64000,
      reasoningEffortSupported: true,
      reasoningOptions: [
        { reasoningEffort: 'low', label: 'Low', budgetTokens: 2048 },
        { reasoningEffort: 'medium', label: 'Medium', budgetTokens: 8192 },
        { reasoningEffort: 'high', label: 'High', budgetTokens: 32000 },
      ],
      variants: [],
      pricing: null,
    },
    {
      modelId: 'gpt-4o-mini',
      provider: 'openai',
      name: 'GPT-4o mini',
      modalities: ['text', 'image'] as const,
      contextWindow: 128000,
      maxOutputTokens: 16000,
      reasoningEffortSupported: false,
      reasoningOptions: [],
      variants: [],
      pricing: null,
    },
  ],
};

const stateWithRoles = {
  workspaceId: 'workspace_1',
  revision: '7',
  settings: [
    ...state.settings,
    {
      id: 'modelRoles' as const,
      type: 'record' as const,
      value: { default: 'anthropic/claude-3-7-sonnet', smol: 'openai/gpt-4o-mini' },
      default: {},
      configured: true,
    },
    {
      id: 'cycleOrder' as const,
      type: 'array' as const,
      value: ['smol', 'default', 'slow'],
      default: ['smol', 'default', 'slow'],
      configured: true,
    },
    {
      id: 'steeringMode' as const,
      type: 'enum' as const,
      value: 'one-at-a-time',
      default: 'one-at-a-time',
      configured: true,
      enumValues: ['all', 'one-at-a-time'],
      label: 'Steering Mode',
      group: 'Input',
      tab: 'interaction',
    },
  ],
};

let resolveWorkspace: Mock<CanonicalClient['resolveWorkspace']>;
let getSettings: Mock<CanonicalClient['getOmpSettings']>;
let updateSettings: Mock<CanonicalClient['updateOmpSettings']>;
let getModels: Mock<CanonicalClient['getModels']>;
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
  getSettings = spyOn(canonicalClient, 'getOmpSettings').mockResolvedValue(state);
  getModels = spyOn(canonicalClient, 'getModels').mockResolvedValue(mockModelCatalog as unknown as ModelCatalog);
  updateSettings = spyOn(canonicalClient, 'updateOmpSettings').mockImplementation(async (_workspaceId, request) => ({
    ...state,
    revision: String(Number(request.expectedRevision) + 1),
    settings: state.settings.map(setting => {
      const change = request.changes.find(candidate => candidate.id === setting.id);
      return change ? { ...setting, value: change.value } : setting;
    }),
  }));
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

test('loads OMP metadata and saves a changed value with the captured revision', async () => {
  await act(async () => { root.render(<I18nProvider><OmpSettingsPage /></I18nProvider>); });
  await settle();
  expect(container.textContent).toContain('Auto-Compact');
  expect(container.textContent).toContain('Compaction Threshold');
  const row = container.querySelector('[data-settings-item="omp.compaction.enabled"]');
  if (!(row instanceof HTMLElement)) throw new Error('settings row missing');
  await act(async () => { row.click(); });
  await settle();
  expect(updateSettings).toHaveBeenCalledWith('workspace_1', {
    expectedRevision: '7',
    changes: [{ id: 'compaction.enabled', value: false }],
  });
  expect(container.textContent).toContain('OMP');
});

test('shows a retry path when the settings read fails', async () => {
  getSettings.mockRejectedValue(new Error('offline'));
  await act(async () => { root.render(<I18nProvider><OmpSettingsPage /></I18nProvider>); });
  await settle();
  expect(container.textContent).toContain('Could not read OMP settings');
  expect(container.textContent).toContain('Retry');
});

test('retries once at the refreshed revision when another mutation wins', async () => {
  await act(async () => { root.render(<I18nProvider><OmpSettingsPage /></I18nProvider>); });
  await settle();
  getSettings.mockResolvedValueOnce({ ...state, revision: '8' });
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

test('role fallback and selector helpers handle all 16 roles and format correctly', () => {
  expect(OMP_MODEL_ROLES.length).toBe(16);
  expect(ompSettingsI18n.en['settings.omp.modelRoles.title']).toBe('Model Roles');
  const roleIds = OMP_MODEL_ROLES.map(r => r.id);
  expect(roleIds).toEqual([
    'default', 'smol', 'slow', 'vision', 'plan', 'commit', 'tiny', 'memory',
    'task', 'advisor', 'widget', 'image', 'web', 'speech', 'dictation', 'judge',
  ]);

  // Fallback chaining
  expect(resolveRoleFallback('commit', { smol: 'openai/gpt-4o-mini' })).toEqual({ role: 'smol', model: 'openai/gpt-4o-mini' });
  expect(resolveRoleFallback('commit', { default: 'anthropic/claude-3-7-sonnet' })).toEqual({ role: 'default', model: 'anthropic/claude-3-7-sonnet' });
  expect(resolveRoleFallback('memory', { smol: 'openai/gpt-4o-mini' })).toEqual({ role: 'smol', model: 'openai/gpt-4o-mini' });
  expect(resolveRoleFallback('advisor', { slow: 'anthropic/claude-3-7-sonnet:high' })).toEqual({ role: 'slow', model: 'anthropic/claude-3-7-sonnet:high' });
  expect(resolveRoleFallback('default', {})).toBeNull();

  // Parsing & formatting
  expect(parseRoleSelector('anthropic/claude-3-7-sonnet:high')).toEqual({ model: 'anthropic/claude-3-7-sonnet', effort: 'high' });
  expect(parseRoleSelector('openai/gpt-4o-mini')).toEqual({ model: 'openai/gpt-4o-mini', effort: '' });
  expect(formatRoleSelector('anthropic/claude-3-7-sonnet', 'high')).toBe('anthropic/claude-3-7-sonnet:high');
  expect(formatRoleSelector('openai/gpt-4o-mini', '')).toBe('openai/gpt-4o-mini');
  expect(formatRoleSelector('openai/gpt-4o-mini', 'default')).toBe('openai/gpt-4o-mini');
});

test('renders visual selectors and fallback indicators for all 16 OMP model roles', async () => {
  getSettings.mockResolvedValue(stateWithRoles);
  await act(async () => { root.render(<I18nProvider><OmpSettingsPage /></I18nProvider>); });
  await settle();

  // Verify modelRoles is NOT rendered as a raw textarea
  const textarea = container.querySelector('[data-settings-item="omp.modelRoles"] textarea');
  expect(textarea).toBeNull();

  // Verify all 16 roles are rendered with their badges
  for (const role of OMP_MODEL_ROLES) {
    const roleRow = container.querySelector(`[data-settings-item="omp.modelRoles.${role.id}"]`);
    expect(roleRow).not.toBeNull();
    expect(roleRow?.textContent).toContain(role.tag);
  }

  // Verify fallback indicator for commit (which inherits from smol = openai/gpt-4o-mini)
  const commitFallback = container.querySelector('[data-testid="fallback-commit"]');
  expect(commitFallback?.textContent).toContain('@smol (openai/gpt-4o-mini)');

  // Verify thinking effort selector exists for default (which has claude-3-7-sonnet, a reasoning model)
  const defaultRow = container.querySelector('[data-settings-item="omp.modelRoles.default"]');
  const triggers = defaultRow?.querySelectorAll('button[role="combobox"]');
  expect(triggers?.length).toBe(2); // Model picker + thinking effort picker

  // Verify smol (gpt-4o-mini, non-reasoning) only has 1 picker (no thinking effort picker)
  const smolRow = container.querySelector('[data-settings-item="omp.modelRoles.smol"]');
  const smolTriggers = smolRow?.querySelectorAll('button[role="combobox"]');
  expect(smolTriggers?.length).toBe(1);

  // Verify cycleOrder renders as an input instead of a textarea
  const cycleOrderInput = container.querySelector('[data-settings-item="omp.cycleOrder"] input');
  expect(cycleOrderInput).not.toBeNull();
  expect((cycleOrderInput as HTMLInputElement)?.value).toBe('smol, default, slow');

  // Verify steeringMode renders in the Input group
  const steeringRow = container.querySelector('[data-settings-item="omp.steeringMode"]');
  expect(steeringRow).not.toBeNull();
});
