import { afterEach, describe, expect, test } from 'bun:test';
import { Window } from 'happy-dom';
import type { Root } from 'react-dom/client';
import type { WebSearchSnapshot } from '@/stores/useWebSearchStore';
import type { WebSearchProviderEntry } from '@openchamber/agent-contract';

const browser = new Window({ url: 'http://localhost/' });
Object.assign(globalThis, {
  window: browser,
  document: browser.document,
  navigator: browser.navigator,
  localStorage: browser.localStorage,
  Node: browser.Node,
  Element: browser.Element,
  HTMLElement: browser.HTMLElement,
  HTMLInputElement: browser.HTMLInputElement,
  Event: browser.Event,
  MouseEvent: browser.MouseEvent,
  DOMRect: browser.DOMRect,
  KeyboardEvent: browser.KeyboardEvent,
  FocusEvent: browser.FocusEvent,
  CustomEvent: browser.CustomEvent,
  MutationObserver: browser.MutationObserver,
  ResizeObserver: browser.ResizeObserver,
  getComputedStyle: browser.getComputedStyle.bind(browser),
  requestAnimationFrame: browser.requestAnimationFrame.bind(browser),
  cancelAnimationFrame: browser.cancelAnimationFrame.bind(browser),
  IS_REACT_ACT_ENVIRONMENT: true,
});

// These loading boundaries must run after the browser globals and the Bun asset-loader plugin are installed.
const { act } = await import('react');
const { createRoot } = await import('react-dom/client');
const { I18nProvider } = await import('@/lib/i18n');
const { getWebSearchScopeKey, useWebSearchStore } = await import('@/stores/useWebSearchStore');
const { WebSearchPage } = await import('./WebSearchPage');

describe('WebSearchPage', () => {
  let container: HTMLDivElement;
  let root: Root | null = null;

  afterEach(async () => {
    if (root) {
      await act(async () => {
        root?.unmount();
      });
    }
    container?.remove();
  });

  test('renders provider selection, timeout, and collapsible provider credential cards', async () => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    const scope = getWebSearchScopeKey();
    const mockSnapshot: WebSearchSnapshot = {
      workspaceId: 'workspace-1',
      scope,
      revision: '1',
      enabled: true,
      selectedProviderId: 'tavily',
      fallbackProviderIds: ['brave'],
      timeoutSeconds: 30,
      providers: [
        {
          providerId: 'tavily',
          name: 'Tavily',
          configured: true,
          requiresCredential: true,
          isSelfHosted: false,
          credentialConfigured: true,
          credentialWritable: true,
        },
        {
          providerId: 'brave',
          name: 'Brave Search',
          configured: true,
          requiresCredential: true,
          isSelfHosted: false,
          credentialConfigured: false,
          credentialWritable: true,
        },
      ],
    };

    useWebSearchStore.setState({
      state: { kind: 'ready', snapshot: mockSnapshot },
      error: null,
      outcome: null,
      busy: false,
      load: async () => { },
    });

    await act(async () => {
      root?.render(
        <I18nProvider>
          <WebSearchPage />
        </I18nProvider>,
      );
    });

    expect(container.textContent).toContain('Tavily');
    expect(container.textContent).toContain('Brave Search');

    const timeoutInput = container.querySelector('input[inputmode="numeric"]');
    expect(timeoutInput).not.toBeNull();
    if (timeoutInput instanceof HTMLInputElement) {
      expect(timeoutInput.value).toBe('30');
    }
  });

  // The page's load effect must fire once for an unanswered scope. It used to
  // depend on the whole state object, and `load()` publishes a fresh
  // `{ kind: 'loading' }` on every call, so the effect re-ran for its own write
  // and the page resolved the workspace thousands of times without ever
  // reading the snapshot.
  test('an unanswered scope triggers one load, not a loop', async () => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    let loads = 0;
    const pending = new Promise<void>(() => { });
    useWebSearchStore.setState({
      state: { kind: 'idle' },
      error: null,
      outcome: null,
      busy: false,
      load: async () => {
        loads += 1;
        // Publish the same shape the real store does, then stay in flight.
        useWebSearchStore.setState({ state: { kind: 'loading', scope: getWebSearchScopeKey() } });
        await pending;
      },
    });

    await act(async () => {
      root?.render(
        <I18nProvider>
          <WebSearchPage />
        </I18nProvider>,
      );
    });
    await act(async () => { await Promise.resolve(); });

    expect(loads).toBe(1);
  });

  // A read in flight belongs to the scope that started it. A scope change
  // abandons that request, so the page must start the new one instead of
  // waiting for a reply the store will discard.
  test('a scope change during a read starts a load for the new scope', async () => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    let loads = 0;
    useWebSearchStore.setState({
      state: { kind: 'loading', scope: 'a-different-scope' },
      error: null,
      outcome: null,
      busy: false,
      load: async () => { loads += 1; },
    });

    await act(async () => {
      root?.render(
        <I18nProvider>
          <WebSearchPage />
        </I18nProvider>,
      );
    });
    await act(async () => { await Promise.resolve(); });

    expect(loads).toBe(1);
  });

  // The fallback chain is an ordered list saved whole: a drag, an add and a
  // remove each write the complete chain, and the primary provider or an
  // unconfigured provider is never offered in the add menu.
  test('fallback providers reorder, add and remove through the saved chain', async () => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    const scope = getWebSearchScopeKey();
    const entry = (providerId: string, name: string, overrides: Partial<WebSearchProviderEntry> = {}): WebSearchProviderEntry => ({
      providerId,
      name,
      configured: true,
      requiresCredential: true,
      isSelfHosted: false,
      credentialConfigured: true,
      credentialWritable: true,
      ...overrides,
    });
    let snapshot: WebSearchSnapshot = {
      workspaceId: 'workspace-1',
      scope,
      revision: '1',
      enabled: true,
      selectedProviderId: 'tavily',
      fallbackProviderIds: ['brave', 'searxng'],
      timeoutSeconds: 30,
      providers: [
        entry('tavily', 'Tavily'),
        entry('brave', 'Brave Search'),
        entry('exa', 'Exa'),
        entry('searxng', 'SearXNG', { requiresCredential: false, credentialConfigured: false }),
        entry('serper', 'Serper', { configured: false, credentialConfigured: false }),
      ],
    };
    const saved: string[][] = [];
    useWebSearchStore.setState({
      state: { kind: 'ready', snapshot },
      error: null,
      outcome: null,
      busy: false,
      load: async () => { },
      update: async (changes) => {
        if (changes.fallbackProviderIds) saved.push(changes.fallbackProviderIds);
        snapshot = { ...snapshot, fallbackProviderIds: changes.fallbackProviderIds ?? snapshot.fallbackProviderIds };
        useWebSearchStore.setState({ state: { kind: 'ready', snapshot } });
        return true;
      },
    });

    await act(async () => {
      root?.render(
        <I18nProvider>
          <WebSearchPage />
        </I18nProvider>,
      );
    });

    const section = container.querySelector('[data-settings-item="web-search.fallbacks"]');
    if (!(section instanceof HTMLElement)) throw new Error('The fallback section did not render');
    const handles = () => Array.from(section.querySelectorAll<HTMLButtonElement>('button[aria-label^="Drag "]'));
    const rowNames = () => handles().map((handle) => handle.parentElement?.querySelector('.typography-ui-label.text-foreground')?.textContent);
    const press = (target: EventTarget, code: string) => {
      target.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, cancelable: true, code, key: code === 'Space' ? ' ' : code }));
    };

    expect(rowNames()).toEqual(['Brave Search', 'SearXNG']);

    // Drag SearXNG above Brave Search with the handle. Rows get fixed rectangles so the drop target is known.
    handles().forEach((handle, index) => {
      if (handle.parentElement) handle.parentElement.getBoundingClientRect = () => new DOMRect(0, index * 40, 400, 36);
    });
    const searxngHandle = handles()[1];
    if (!searxngHandle) throw new Error('The SearXNG handle did not render');
    await act(async () => { press(searxngHandle, 'Space'); });
    await act(async () => { press(document, 'ArrowUp'); });
    await act(async () => { press(document, 'Space'); });
    expect(saved).toEqual([['searxng', 'brave']]);
    expect(rowNames()).toEqual(['SearXNG', 'Brave Search']);

    // The add menu offers only the configured provider that is not primary and not already in the chain.
    const trigger = section.querySelector<HTMLElement>('[role="combobox"]');
    if (!trigger) throw new Error('The add-fallback select did not render');
    await act(async () => {
      trigger.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, button: 0 }));
    });
    expect(Array.from(document.querySelectorAll('[role="option"]')).map((option) => option.textContent)).toEqual(['Exa']);
    await act(async () => {
      const exa = document.querySelector<HTMLElement>('[role="option"]');
      exa?.click();
    });
    expect(saved[saved.length - 1]).toEqual(['searxng', 'brave', 'exa']);
    // The add menu resets to its placeholder after a pick.
    expect(trigger.textContent).toContain('Add fallback provider');
    expect(trigger.textContent).not.toContain('Exa');

    // Removing a fallback saves the chain without it.
    await act(async () => {
      container.querySelector<HTMLButtonElement>('button[aria-label="Remove Brave Search from fallbacks"]')?.click();
    });
    expect(saved[saved.length - 1]).toEqual(['searxng', 'exa']);
    expect(rowNames()).toEqual(['SearXNG', 'Exa']);
  });
});
