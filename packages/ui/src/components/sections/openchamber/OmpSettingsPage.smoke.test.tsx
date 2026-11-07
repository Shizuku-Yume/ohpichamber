import { afterEach, beforeEach, expect, spyOn, test } from 'bun:test';
import type { Mock } from 'bun:test';
import type { Root } from 'react-dom/client';
import type { CanonicalClient } from '@/api/canonicalClient';
import { Window } from 'happy-dom';
import { writeFileSync } from 'node:fs';

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
import { mock } from 'bun:test';
mock.module('@/hooks/useSettingsDirectory', () => ({ useSettingsDirectory: () => '/repo' }));

const { act } = await import('react');
const { createRoot } = await import('react-dom/client');
const { I18nProvider, useI18nStore } = await import('@/lib/i18n');
const { canonicalClient } = await import('@/api/canonicalClient');
const { OmpSettingsPage } = await import('./OmpSettingsPage');
const { PreviewToggleButton } = await import('@/components/views/PreviewToggleButton');
import type { ModelCatalog, OmpSettingsState } from '@openchamber/agent-contract';

let resolveWorkspace: Mock<CanonicalClient['resolveWorkspace']>;
let getSettings: Mock<CanonicalClient['getOmpSettings']>;
let getModels: Mock<CanonicalClient['getModels']>;
let container: HTMLDivElement;
let root: Root;

const settle = async () => {
  await act(async () => { await new Promise<void>(resolve => setTimeout(resolve, 60)); });
};

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  resolveWorkspace = spyOn(canonicalClient, 'resolveWorkspace').mockResolvedValue({ workspaceId: 'ws_smoke', projectId: 'p_smoke', name: 'repo' });
});

afterEach(async () => {
  await act(async () => root.unmount());
  resolveWorkspace.mockRestore();
  getSettings?.mockRestore();
  getModels?.mockRestore();
  container.remove();
  browser.close();
});

test('runtime smoke: exercises PreviewToggleButton and OmpSettingsPage, writing readable artifact', async () => {
  const evidence: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    environment: 'happy-dom unified runtime',
    smokeResults: {},
  };

  // 1. PreviewToggleButton Smoke
  let currentMode = 'preview';
  const onToggle = () => { currentMode = currentMode === 'preview' ? 'edit' : 'preview'; };

  await act(async () => {
    root.render(
      <I18nProvider>
        <PreviewToggleButton currentMode="preview" onToggle={onToggle} />
      </I18nProvider>
    );
  });
  await settle();

  const previewBtn = container.querySelector('button');
  const previewAriaLabel = previewBtn?.getAttribute('aria-label');
  const previewHasSelectionClass = previewBtn?.className.includes('var(--interactive-selection)');

  // 2. OmpSettingsPage Smoke
  const smokeState = {
    workspaceId: 'ws_smoke',
    revision: '1',
    settings: [
      { id: 'modelRoles' as const, type: 'record' as const, value: { default: 'openai/gpt-4o', plan: 'anthropic/claude-3-7-sonnet' }, default: {}, configured: true },
      { id: 'cycleOrder' as const, type: 'array' as const, value: ['default', 'smol'], default: [], configured: true },
      { id: 'enabledModels' as const, type: 'array' as const, value: ['openai/*', 'anthropic/claude-3-5-sonnet'], default: [], configured: true, label: 'Enabled models' },
      { id: 'modelPresets' as const, type: 'record' as const, value: { coding: { modelRoles: { default: 'openai/gpt-4o-mini', smol: 'openai/gpt-4o-mini' }, defaultThinkingLevel: 'low' } }, default: {}, configured: true, label: 'Model Presets' },
      { id: 'retry.fallbackChains' as const, type: 'record' as const, value: { default: ['openai/gpt-4o-mini', 'openai/o3-mini'] }, default: {}, configured: true, label: 'Retry Fallback Chains', group: 'Retry & Fallback' },
      { id: 'retry.fallbackOn' as const, type: 'enum' as const, value: 'usage-limit', default: 'any', configured: true, label: 'Fallback Trigger', group: 'Retry & Fallback' },
      { id: 'compaction.methodOrder' as const, type: 'array' as const, value: ['remote', 'snapcompact', 'handoff', 'shake', 'soft'], default: [], configured: true, label: 'Compaction Method Order', group: 'Compaction' },
      { id: 'compaction.modelThresholds' as const, type: 'record' as const, value: { 'openai/gpt-4o': 90000, 'deepseek/*': '80%', 'anthropic/*': 'f100000' }, default: {}, configured: true, label: 'Model Thresholds', group: 'Compaction' },
      { id: 'tui.renderSvg' as const, type: 'boolean' as const, value: true, default: false, configured: true, label: 'Render SVG', group: 'Display' },
      { id: 'compaction.thresholdPercent' as const, type: 'number' as const, value: -1, default: -1, configured: true, label: 'Compaction Threshold', group: 'Compaction', tab: 'context', options: [{ value: 'default', label: 'Default' }, { value: '50', label: '50%' }] },
      { id: 'steeringMode' as const, type: 'enum' as const, value: 'one-at-a-time', default: 'one-at-a-time', configured: true, label: 'Steering Mode', group: 'Input', tab: 'interaction', enumValues: ['all', 'one-at-a-time'] },
      { id: 'ask.timeout' as const, type: 'number' as const, value: 30, default: 0, configured: true, label: 'Ask Timeout', group: 'Input', tab: 'interaction', options: [{ value: '0', label: 'Disabled' }, { value: '30', label: '30 seconds' }] },
    ],
  };

  const smokeModels = {
    workspaceId: 'ws_smoke',
    revision: '1',
    planRoleAvailable: true,
    defaults: { model: { providerId: 'openai', modelId: 'gpt-4o' }, thinkingLevel: 'auto' },
    models: [
      { modelId: 'gpt-4o', provider: 'openai', name: 'GPT-4o', modalities: ['text'] as const, contextWindow: 128000, maxOutputTokens: 4096, reasoningEffortSupported: false, reasoningOptions: [], variants: [], pricing: null },
      { modelId: 'gpt-4o-mini', provider: 'openai', name: 'GPT-4o mini', modalities: ['text'] as const, contextWindow: 128000, maxOutputTokens: 4096, reasoningEffortSupported: false, reasoningOptions: [], variants: [], pricing: null },
      { modelId: 'claude-3-7-sonnet', provider: 'anthropic', name: 'Claude 3.7 Sonnet', modalities: ['text'] as const, contextWindow: 200000, maxOutputTokens: 64000, reasoningEffortSupported: true, reasoningOptions: [{ reasoningEffort: 'low', label: 'Low', budgetTokens: 2048 }], variants: [], pricing: null },
    ],
  };

  getSettings = spyOn(canonicalClient, 'getOmpSettings').mockResolvedValue(smokeState as unknown as OmpSettingsState);
  getModels = spyOn(canonicalClient, 'getModels').mockResolvedValue(smokeModels as unknown as ModelCatalog);

  await act(async () => {
    root.render(
      <I18nProvider>
        <OmpSettingsPage />
      </I18nProvider>
    );
  });
  await settle();

  // Verify zero textareas
  const textareas = container.querySelectorAll('textarea');
  expect(textareas.length).toBe(0);

  // Extract rendered tabs
  const tabButtons = Array.from(container.querySelectorAll('.h-8.mb-6 button')).map((b) => b.textContent?.trim());

  // Extract structured controls
  const enabledModelsRow = container.querySelector('[data-settings-item="omp.enabledModels"]');
  const presetsRow = container.querySelector('[data-settings-item="omp.modelPresets"]');
  const chainsRow = container.querySelector('[data-settings-item="omp.retry.fallbackChains"]');
  const fallbackOnRow = container.querySelector('[data-settings-item="omp.retry.fallbackOn"]');
  const methodOrderRow = container.querySelector('[data-settings-item="omp.compaction.methodOrder"]');
  const thresholdsRow = container.querySelector('[data-settings-item="omp.compaction.modelThresholds"]');
  const thresholdPercentRow = container.querySelector('[data-settings-item="omp.compaction.thresholdPercent"]');
  expect(thresholdPercentRow?.textContent).toContain('Default');

  const steeringRow = container.querySelector('[data-settings-item="omp.steeringMode"]');
  expect(steeringRow).not.toBeNull();

  // Exercise Reactive Chinese Localization
  await act(async () => {
    useI18nStore.getState().setLocale('zh-CN');
    while (useI18nStore.getState().loadingLocale !== null) {
      await new Promise((r) => setTimeout(r, 10));
    }
  });
  await act(async () => {
    root.render(
      <I18nProvider>
        <OmpSettingsPage />
      </I18nProvider>
    );
  });
  await settle();

  const zhThresholdPercentRow = container.querySelector('[data-settings-item="omp.compaction.thresholdPercent"]');
  const zhAskTimeoutRow = container.querySelector('[data-settings-item="omp.ask.timeout"]');
  const zhSteeringRow = container.querySelector('[data-settings-item="omp.steeringMode"]');

  const zhThresholdPercentText = zhThresholdPercentRow?.textContent;
  const zhAskTimeoutText = zhAskTimeoutRow?.textContent;
  const zhSteeringText = zhSteeringRow?.textContent;
  const zhTabButtons = Array.from(container.querySelectorAll('.h-8.mb-6 button')).map((b) => b.textContent?.trim());
  const containsZhSettings = container.textContent?.includes('启用的模型') && container.textContent?.includes('模型预设');

  await act(async () => { useI18nStore.getState().setLocale('en'); });

  evidence.smokeResults = {
    previewToggleButton: {
      previewAriaLabel,
      previewHasSelectionClass,
    },
    textareaCount: textareas.length,
    renderedTabs: tabButtons,
    structuredControls: {
      enabledModels: {
        rendered: !!enabledModelsRow,
        chips: Array.from(enabledModelsRow?.querySelectorAll('.font-mono span') ?? []).map((s) => s.textContent),
      },
      modelPresets: {
        rendered: !!presetsRow,
        presetName: presetsRow?.querySelector('.font-mono')?.textContent,
      },
      retryFallbackChains: {
        rendered: !!chainsRow,
        chainKey: chainsRow?.querySelector('.font-semibold')?.textContent,
      },
      retryFallbackOn: {
        rendered: !!fallbackOnRow,
        selectedOption: fallbackOnRow?.querySelector('[aria-pressed="true"]')?.textContent,
      },
      compactionMethodOrder: {
        rendered: !!methodOrderRow,
        methods: Array.from(methodOrderRow?.querySelectorAll('.bg-card') ?? []).map((el) => el.textContent?.trim()),
      },
      compactionModelThresholds: {
        rendered: !!thresholdsRow,
        patterns: Array.from(thresholdsRow?.querySelectorAll('.font-semibold') ?? []).map((s) => s.textContent),
        values: Array.from(thresholdsRow?.querySelectorAll('input') ?? []).map((i) => i.value),
      },
    },
    zhEnumOptions: {
      thresholdPercentValue: zhThresholdPercentText,
      askTimeoutValue: zhAskTimeoutText,
      steeringModeValue: zhSteeringText,
    },
    zhLocalization: {
      zhTabs: zhTabButtons,
      containsZhSettings,
    },
  };

  const artifactPath = '/home/shizuku/Project/ohpichamber-omp-artifacts/ux-dispatch-2026-11-07/smoke-ux-06.json';
  writeFileSync(artifactPath, JSON.stringify(evidence, null, 2), 'utf-8');
  expect(containsZhSettings).toBe(true);
});
