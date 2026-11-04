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
const { OmpSettingsPage } = await import('./OmpSettingsPage');

const state = {
  workspaceId: 'workspace_1',
  revision: '7',
  settings: [
    { id: 'compaction.enabled' as const, type: 'boolean' as const, value: true, default: true, configured: true, label: 'Auto-Compact', group: 'Compaction', tab: 'context' },
    { id: 'compaction.thresholdPercent' as const, type: 'number' as const, value: 50, default: -1, configured: true, label: 'Compaction Threshold', group: 'Compaction', tab: 'context' },
  ],
};

let resolveWorkspace: Mock<CanonicalClient['resolveWorkspace']>;
let getSettings: Mock<CanonicalClient['getOmpSettings']>;
let updateSettings: Mock<CanonicalClient['updateOmpSettings']>;
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
