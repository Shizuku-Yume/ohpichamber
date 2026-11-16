import React, { act } from 'react';
import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';
import { Window } from 'happy-dom';
import type { Model, Provider } from '@openchamber/agent-contract';
import type { RoutingConfig } from '@/lib/routing/routingApi';
import { useRoutingStore } from '@/stores/useRoutingStore';
import { useConfigStore } from '@/stores/useConfigStore';

const domWindow = new Window();
Object.defineProperty(globalThis, 'window', { value: domWindow, configurable: true, writable: true });
Object.defineProperty(globalThis, 'document', { value: domWindow.document, configurable: true, writable: true });
Object.assign(globalThis, {
  navigator: domWindow.navigator,
  Node: domWindow.Node,
  Element: domWindow.Element,
  HTMLElement: domWindow.HTMLElement,
  HTMLInputElement: domWindow.HTMLInputElement,
  HTMLTextAreaElement: domWindow.HTMLTextAreaElement,
  HTMLButtonElement: domWindow.HTMLButtonElement,
  customElements: domWindow.customElements,
  MutationObserver: domWindow.MutationObserver,
  ResizeObserver: domWindow.ResizeObserver,
  PointerEvent: domWindow.PointerEvent,
  MouseEvent: domWindow.MouseEvent,
  KeyboardEvent: domWindow.KeyboardEvent,
  Event: domWindow.Event,
  localStorage: domWindow.localStorage,
  getComputedStyle: domWindow.getComputedStyle.bind(domWindow),
  requestAnimationFrame: domWindow.requestAnimationFrame.bind(domWindow),
  cancelAnimationFrame: domWindow.cancelAnimationFrame.bind(domWindow),
  IS_REACT_ACT_ENVIRONMENT: true,
});

// Setup DOM globals before importing React DOM client and component under test
const reactDomClient = await import('react-dom/client');
const createRoot = reactDomClient.createRoot;
type Root = import('react-dom/client').Root;

const mockConfig: RoutingConfig = {
  enabled: true,
  fallback: {
    model: { providerID: 'anthropic', modelID: 'claude-3-7-sonnet' },
    variant: 'high',
  },
  minConfidence: 0.6,
  preserveCache: true,
  safetyNet: { enabled: true, threshold: 0.6 },
  categories: [
    {
      id: 'trivial',
      builtin: true,
      enabled: true,
      name: 'Trivial',
      description: 'Quick mechanical task',
      model: null,
      variant: null,
      agent: null,
    },
    {
      id: 'hard',
      builtin: true,
      enabled: true,
      name: 'Hard',
      description: 'Hard reasoning and architecture',
      model: { providerID: 'anthropic', modelID: 'claude-3-7-sonnet' },
      variant: 'high',
      agent: null,
    },
  ],
};

mock.module('@/lib/i18n', () => ({
  useI18n: () => ({
    t: (key: string, params?: Record<string, unknown>) => {
      if (params?.name && typeof params.name === 'string') return `${key}:${params.name}`;
      return key;
    },
  }),
}));

mock.module('@/components/sections/classification/JevAccessNote', () => ({
  JevAccessNote: () => <div data-testid="jev-access-note" />,
}));

interface MockModelSelectorProps {
  providerId: string;
  modelId: string;
  onChange: (providerId: string, modelId: string) => void;
  placeholder?: string;
}

mock.module('@/components/sections/agents/ModelSelector', () => ({
  ModelSelector: ({ providerId, modelId, onChange, placeholder }: MockModelSelectorProps) => (
    <div data-testid="model-selector" data-provider={providerId} data-model={modelId}>
      <span>{modelId || placeholder}</span>
      <button type="button" onClick={() => onChange('anthropic', 'claude-3-7-sonnet')}>
        Select Model
      </button>
    </div>
  ),
}));

const saveStateCalls: string[] = [];
const saveCalls: RoutingConfig[] = [];

mock.module('@/lib/persistence', () => ({
  reportSettingsSaveState: (state: string) => { saveStateCalls.push(state); },
}));

const mockModel: Model = {
  modelId: 'claude-3-7-sonnet',
  provider: 'anthropic',
  name: 'Claude 3.7 Sonnet',
  modalities: ['text'],
  contextWindow: 200_000,
  maxOutputTokens: 64_000,
  reasoningEffortSupported: true,
  reasoningOptions: [
    { reasoningEffort: 'low', label: 'Low', budgetTokens: null },
    { reasoningEffort: 'medium', label: 'Medium', budgetTokens: null },
    { reasoningEffort: 'high', label: 'High', budgetTokens: null },
  ],
  variants: [],
  pricing: null,
};

const mockProvider: Provider & { models: Model[] } = {
  providerId: 'anthropic',
  name: 'Anthropic',
  endpoint: null,
  protocol: null,
  authMethods: ['api-key'],
  auth: { status: 'configured', method: 'api-key', source: 'stored-credential', credentialRef: 'cred_anthropic' },
  models: [mockModel],
};

const { RoutingPage } = await import('./RoutingPage');

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const DEBOUNCE_SETTLE_MS = 650;

const setInputValue = async (element: HTMLInputElement | HTMLTextAreaElement, value: string) => {
  const prototype = element instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set;
  if (!setter) throw new Error('Missing value setter');
  await act(async () => {
    setter.call(element, value);
    element.dispatchEvent(new Event('input', { bubbles: true }));
  });
};

const buttonContaining = (text: string): HTMLButtonElement => {
  const button = [...document.querySelectorAll<HTMLButtonElement>('button')].find((entry) => entry.textContent?.includes(text));
  if (!button) throw new Error(`Missing button: ${text}`);
  return button;
};

describe('RoutingPage', () => {
  let container: HTMLElement;
  let root: Root;

  beforeEach(() => {
    saveCalls.length = 0;
    saveStateCalls.length = 0;
    useRoutingStore.setState({
      available: true,
      loaded: true,
      autoReady: true,
      config: mockConfig,
      builtins: mockConfig.categories,
      load: async () => {},
      saveConfig: async (config: RoutingConfig) => { saveCalls.push(config); },
    });

    useConfigStore.setState({
      providers: [mockProvider],
    });

    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
  });

  test('does not render AgentSelector in routing category editor (W2 invariant)', async () => {
    await act(async () => {
      root.render(<RoutingPage />);
    });
    const toggleButton = [...container.querySelectorAll('button')].find((b) => b.textContent?.includes('Hard'));
    expect(toggleButton).toBeDefined();
    await act(async () => {
      toggleButton?.click();
    });
    // AgentSelector and agent field must NOT be rendered in the category editor
    expect(container.querySelector('[data-testid="agent-selector"]')).toBeNull();
    expect(container.textContent).not.toContain('settings.routing.category.agent');

    // Thinking efforts and model selector are rendered
    expect(container.textContent).toContain('settings.routing.category.thinking');
    expect(container.textContent).toContain('settings.routing.category.model');
  });

  test('adding a category without a description keeps the draft idle and saves once it is valid', async () => {
    await act(async () => {
      root.render(<RoutingPage />);
    });

    const addInput = document.querySelector<HTMLInputElement>('[aria-label="settings.routing.categories.addLabel"]');
    if (!addInput) throw new Error('Missing add input');
    await setInputValue(addInput, 'Docs');
    await act(async () => {
      buttonContaining('settings.routing.categories.add').click();
    });

    saveStateCalls.length = 0;
    saveCalls.length = 0;
    await act(async () => {
      await sleep(DEBOUNCE_SETTLE_MS);
    });

    expect(saveCalls.length).toBe(0);
    expect(saveStateCalls).not.toContain('error');
    expect(saveStateCalls).not.toContain('saving');
    expect(container.textContent).toContain('settings.routing.category.descriptionRequired');

    const description = container.querySelector<HTMLTextAreaElement>('[aria-label="settings.routing.category.description"]');
    if (!description) throw new Error('Missing description field');
    expect(document.activeElement).toBe(description);
    await setInputValue(description, 'Docs and reference writing');
    await act(async () => {
      await sleep(DEBOUNCE_SETTLE_MS);
    });

    expect(saveCalls.length).toBe(1);
    const docs = saveCalls[0].categories.find((category) => category.id === 'docs');
    expect(docs).toBeDefined();
    expect(docs?.builtin).toBe(false);
    expect(docs?.name).toBe('Docs');
    expect(docs?.description).toBe('Docs and reference writing');
    expect(saveStateCalls).toContain('saved');
  });

  test('clearing an existing category description never sends an invalid config', async () => {
    await act(async () => {
      root.render(<RoutingPage />);
    });

    await act(async () => {
      buttonContaining('Hard').click();
    });
    const description = container.querySelector<HTMLTextAreaElement>('[aria-label="settings.routing.category.description"]');
    if (!description) throw new Error('Missing description field');
    await setInputValue(description, '');

    saveStateCalls.length = 0;
    saveCalls.length = 0;
    await act(async () => {
      await sleep(DEBOUNCE_SETTLE_MS);
    });

    expect(saveCalls.length).toBe(0);
    expect(saveStateCalls).not.toContain('error');
    expect(saveStateCalls).not.toContain('saving');
    expect(container.textContent).toContain('settings.routing.category.descriptionRequired');

    const name = container.querySelector<HTMLInputElement>('[aria-label="settings.routing.category.name"]');
    if (!name) throw new Error('Missing name field');
    await setInputValue(name, '');
    await act(async () => {
      await sleep(DEBOUNCE_SETTLE_MS);
    });

    expect(saveCalls.length).toBe(0);
    expect(container.textContent).toContain('settings.routing.category.nameRequired');
  });

  test('unmounting with an invalid draft does not send it', async () => {
    await act(async () => {
      root.render(<RoutingPage />);
    });

    await act(async () => {
      buttonContaining('Hard').click();
    });
    const name = container.querySelector<HTMLInputElement>('[aria-label="settings.routing.category.name"]');
    if (!name) throw new Error('Missing name field');
    await setInputValue(name, '');

    saveCalls.length = 0;
    saveStateCalls.length = 0;
    await act(async () => {
      root.unmount();
    });
    await act(async () => {
      await sleep(DEBOUNCE_SETTLE_MS);
    });

    expect(saveCalls.length).toBe(0);
    expect(saveStateCalls).not.toContain('error');
    expect(saveStateCalls).not.toContain('saving');
  });

  test('an invalid category stays open, says why, and holds unrelated edits until it is fixed', async () => {
    await act(async () => {
      root.render(<RoutingPage />);
    });

    await act(async () => {
      buttonContaining('Hard').click();
    });
    const description = container.querySelector<HTMLTextAreaElement>('[aria-label="settings.routing.category.description"]');
    if (!description) throw new Error('Missing description field');
    await setInputValue(description, '');
    await act(async () => {
      await sleep(DEBOUNCE_SETTLE_MS);
    });

    expect(container.textContent).toContain('settings.routing.categories.invalidDraft');

    // An unrelated edit rides along in the same draft; nothing is sent while the
    // category is invalid, and the section says so.
    saveCalls.length = 0;
    saveStateCalls.length = 0;
    const preserveCacheRow = [...container.querySelectorAll<HTMLElement>('[role="button"]')]
      .find((row) => row.textContent?.includes('settings.routing.auto.preserveCache'));
    if (!preserveCacheRow) throw new Error('Missing preserve-cache row');
    await act(async () => {
      preserveCacheRow.click();
    });
    await act(async () => {
      await sleep(DEBOUNCE_SETTLE_MS);
    });

    expect(saveCalls.length).toBe(0);
    expect(saveStateCalls).not.toContain('saving');
    expect(container.textContent).toContain('settings.routing.categories.invalidDraft');

    // The invalid row cannot be collapsed, so its reason stays on screen.
    await act(async () => {
      buttonContaining('Hard').click();
    });
    expect(container.querySelector('[aria-label="settings.routing.category.description"]')).not.toBeNull();

    const reopenedDescription = container.querySelector<HTMLTextAreaElement>('[aria-label="settings.routing.category.description"]');
    if (!reopenedDescription) throw new Error('Missing description field');
    await setInputValue(reopenedDescription, 'Hard reasoning and architecture again');
    await act(async () => {
      await sleep(DEBOUNCE_SETTLE_MS);
    });

    expect(saveCalls.length).toBe(1);
    expect(saveCalls[0].preserveCache).toBe(false);
    const hard = saveCalls[0].categories.find((category) => category.id === 'hard');
    expect(hard?.description).toBe('Hard reasoning and architecture again');
    expect(container.textContent).not.toContain('settings.routing.categories.invalidDraft');
  });

  test('a new category never takes the id of a removed built-in', async () => {
    const researchBuiltin = {
      id: 'research',
      builtin: true,
      enabled: true,
      name: 'Research',
      description: 'Reading and comparing sources',
      model: null,
      variant: null,
      agent: null,
    };
    useRoutingStore.setState({ builtins: [...mockConfig.categories, researchBuiltin] });

    await act(async () => {
      root.render(<RoutingPage />);
    });

    const addInput = document.querySelector<HTMLInputElement>('[aria-label="settings.routing.categories.addLabel"]');
    if (!addInput) throw new Error('Missing add input');
    await setInputValue(addInput, 'Research');
    await act(async () => {
      buttonContaining('settings.routing.categories.add').click();
    });
    const description = container.querySelector<HTMLTextAreaElement>('[aria-label="settings.routing.category.description"]');
    if (!description) throw new Error('Missing description field');
    await setInputValue(description, 'Summarising papers');
    await act(async () => {
      await sleep(DEBOUNCE_SETTLE_MS);
    });

    expect(saveCalls.length).toBe(1);
    const added = saveCalls[0].categories.find((category) => !category.builtin && category.name === 'Research');
    expect(added).toBeDefined();
    expect(added?.id).not.toBe('research');
  });

  test('thinking select displays reasoning effort options rather than legacy model variants', async () => {
    await act(async () => {
      root.render(<RoutingPage />);
    });

    const fallbackSelect = container.querySelector('[aria-label="settings.routing.auto.fallbackThinking"]');
    expect(fallbackSelect).not.toBeNull();

    expect(container.textContent).toContain('settings.page.routing.title');
    expect(container.textContent).toContain('settings.routing.auto.fallbackModel');
  });
});
