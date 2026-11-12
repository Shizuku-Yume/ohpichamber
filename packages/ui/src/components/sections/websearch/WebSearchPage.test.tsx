import { afterEach, describe, expect, test } from 'bun:test';
import { Window } from 'happy-dom';
import type { Root } from 'react-dom/client';
import type { WebSearchSnapshot } from '@/stores/useWebSearchStore';

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
});
