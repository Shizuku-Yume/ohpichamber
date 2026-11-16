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
  HTMLButtonElement: browser.HTMLButtonElement,
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

  const fallbackSnapshot = (fallbackProviderIds: string[]): WebSearchSnapshot => ({
    workspaceId: 'workspace-1',
    scope: getWebSearchScopeKey(),
    revision: '1',
    enabled: true,
    selectedProviderId: 'tavily',
    fallbackProviderIds,
    timeoutSeconds: 30,
    providers: [
      entry('tavily', 'Tavily'),
      entry('brave', 'Brave Search', { credentialConfigured: false }),
      entry('exa', 'Exa'),
      entry('searxng', 'SearXNG', { requiresCredential: false, credentialConfigured: false }),
      entry('serper', 'Serper', { configured: false, requiresCredential: false, credentialConfigured: false }),
    ],
  });

  const renderWithSnapshot = async (initial: WebSearchSnapshot) => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    const saved: string[][] = [];
    let snapshot = initial;
    useWebSearchStore.setState({
      state: { kind: 'ready', snapshot },
      error: null,
      outcome: null,
      busy: false,
      load: async () => { },
      update: async (changes) => {
        if (changes.fallbackProviderIds) saved.push(changes.fallbackProviderIds);
        snapshot = { ...snapshot, ...changes, fallbackProviderIds: changes.fallbackProviderIds ?? snapshot.fallbackProviderIds };
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
    return { section, saved, handles, rowNames };
  };

  // An empty chain says so in one line and offers only the add action; there is
  // no row chrome and no always-"configured" pill to suggest otherwise.
  test('an empty fallback chain shows one helper line and the add action', async () => {
    const { section, rowNames } = await renderWithSnapshot(fallbackSnapshot([]));

    expect(rowNames()).toEqual([]);
    expect(section.textContent).toContain('No fallbacks. The primary provider answers alone.');
    const add = [...section.querySelectorAll<HTMLButtonElement>('button')]
      .find((button) => button.textContent?.includes('Add fallback provider'));
    expect(add).toBeInstanceOf(HTMLButtonElement);
    expect(add?.disabled).toBe(false);
  });

  test('nothing addable disables the add action and explains why', async () => {
    const snapshot = fallbackSnapshot([]);
    snapshot.providers = [entry('tavily', 'Tavily'), entry('serper', 'Serper', { configured: false, credentialConfigured: false })];
    const { section } = await renderWithSnapshot(snapshot);

    const add = [...section.querySelectorAll<HTMLButtonElement>('button')]
      .find((button) => button.textContent?.includes('Add fallback provider'));
    expect(add?.disabled).toBe(true);
    expect(section.textContent).toContain('Every configured provider is already a fallback, or none is configured.');
  });

  // The primary provider and an unconfigured provider are never offered; a
  // picked provider is appended to the chain in one write.
  test('the add menu lists only addable providers and appends the pick', async () => {
    const { section, saved, rowNames } = await renderWithSnapshot(fallbackSnapshot(['brave', 'searxng']));

    const trigger = [...section.querySelectorAll<HTMLButtonElement>('button')]
      .find((button) => button.textContent?.includes('Add fallback provider'));
    if (!trigger) throw new Error('The add-fallback trigger did not render');
    await act(async () => { trigger.click(); });
    const items = () => [...document.querySelectorAll<HTMLElement>('[role="menuitem"]')];
    // Serper is unconfigured and Tavily is the primary, so only Exa is offered.
    expect(items().map((item) => item.textContent?.trim())).toEqual(['Exa']);

    await act(async () => { items()[0]?.click(); });
    expect(saved).toEqual([['brave', 'searxng', 'exa']]);
    expect(rowNames()).toEqual(['Brave Search', 'SearXNG', 'Exa']);
  });

  // A fallback carries a pill only when its key or setup is missing; removal is
  // an icon-only ghost button addressed by its localised label.
  test('a row shows a warning only when setup is missing and removes by icon label', async () => {
    const { section, saved, handles, rowNames } = await renderWithSnapshot(fallbackSnapshot(['brave', 'serper']));

    expect(rowNames()).toEqual(['Brave Search', 'Serper']);
    const rows = handles().map((handle) => handle.parentElement);
    expect(rows[0]?.textContent).toContain('Needs a key');
    expect(rows[1]?.textContent).toContain('Needs setup');

    const remove = section.querySelector<HTMLButtonElement>('button[aria-label="Remove Brave Search from fallbacks"]');
    expect(remove).toBeInstanceOf(HTMLButtonElement);
    expect(remove?.textContent?.trim()).toBe('');
    await act(async () => { remove?.click(); });
    expect(saved[saved.length - 1]).toEqual(['serper']);
    expect(rowNames()).toEqual(['Serper']);
  });

  // A fully configured fallback says nothing: the list already implies that a
  // row was addable, so only a missing key or setup is worth a pill.
  test('a fully configured fallback carries no status pill', async () => {
    const { section } = await renderWithSnapshot(fallbackSnapshot(['exa']));

    expect(section.textContent).toContain('Exa');
    expect(section.textContent).not.toContain('Configured');
  });

  // The chain is saved whole and in order, so a keyboard drag writes the same
  // complete list a mouse drag does.
  test('a fallback reorders with the keyboard handle and saves the new order', async () => {
    const { saved, handles, rowNames } = await renderWithSnapshot(fallbackSnapshot(['brave', 'searxng']));

    expect(rowNames()).toEqual(['Brave Search', 'SearXNG']);
    handles().forEach((handle, index) => {
      if (handle.parentElement) handle.parentElement.getBoundingClientRect = () => new DOMRect(0, index * 40, 400, 36);
    });
    const press = (target: EventTarget, code: string) => {
      target.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, cancelable: true, code, key: code === 'Space' ? ' ' : code }));
    };
    const searxngHandle = handles()[1];
    if (!searxngHandle) throw new Error('The SearXNG handle did not render');
    await act(async () => { press(searxngHandle, 'Space'); });
    await act(async () => { press(document, 'ArrowUp'); });
    await act(async () => { press(document, 'Space'); });

    expect(saved).toEqual([['searxng', 'brave']]);
    expect(rowNames()).toEqual(['SearXNG', 'Brave Search']);
  });
});
