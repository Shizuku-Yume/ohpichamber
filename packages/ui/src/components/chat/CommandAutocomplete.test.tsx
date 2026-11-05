import { afterEach, beforeEach, expect, mock, test } from 'bun:test';
import type { Root } from 'react-dom/client';
import { Window } from 'happy-dom';

const browser = new Window({ url: 'http://localhost/' });
Object.assign(globalThis, {
  window: browser,
  document: browser.document,
  navigator: browser.navigator,
  Node: browser.Node,
  Element: browser.Element,
  HTMLElement: browser.HTMLElement,
  Event: browser.Event,
  CustomEvent: browser.CustomEvent,
  KeyboardEvent: browser.KeyboardEvent,
  PointerEvent: browser.PointerEvent,
  MutationObserver: browser.MutationObserver,
  ResizeObserver: browser.ResizeObserver,
  getComputedStyle: browser.getComputedStyle.bind(browser),
  requestAnimationFrame: browser.requestAnimationFrame.bind(browser),
  cancelAnimationFrame: browser.cancelAnimationFrame.bind(browser),
  localStorage: browser.localStorage,
  IS_REACT_ACT_ENVIRONMENT: true,
});

mock.module('@/hooks/useEffectiveDirectory', () => ({ useEffectiveDirectory: () => '/repo' }));
mock.module('./chatColumnSession', () => ({ useChatSessionSelection: () => ({ sessionId: 'session_1' }) }));

const { act } = await import('react');
const { createRoot } = await import('react-dom/client');
const { I18nProvider } = await import('@/lib/i18n');
const { useCommandsStore } = await import('@/stores/useCommandsStore');
const { CommandAutocomplete } = await import('./CommandAutocomplete');

let container: HTMLDivElement;
let root: Root;

const settle = async () => {
  const { promise, resolve } = Promise.withResolvers<void>();
  setTimeout(resolve, 0);
  await act(async () => { await promise; });
};

beforeEach(() => {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  useCommandsStore.setState({
    catalogsByDirectory: {
      '/repo': {
        workspaceId: 'workspace_1',
        revision: '1',
        commands: [],
        builtinCommands: [
          'compact', 'shake', 'todo', 'jobs', 'usage', 'context', 'tools',
          'handoff', 'retry', 'rename', 'effort', 'model', 'switch', 'fast', 'slow',
          'prewalk', 'force', 'pin', 'fresh', 'clear', 'dirs', 'session', 'memory',
        ],
      },
    },
  });
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
});

test('CommandAutocomplete renders headless builtin commands with descriptions', async () => {
  await act(async () => {
    root.render(
      <I18nProvider>
        <CommandAutocomplete
          searchQuery=""
          onCommandSelect={() => {}}
          onClose={() => {}}
        />
      </I18nProvider>
    );
  });
  await settle();

  // Headless commands appear in palette
  for (const cmd of ['clear', 'dirs', 'handoff', 'retry', 'effort', 'model', 'switch', 'fast', 'slow']) {
    expect(container.textContent).toContain(`/${cmd}`);
  }

  // Description for /clear and /dirs is rendered
  expect(container.textContent).toContain('Clear conversation context in place');
  expect(container.textContent).toContain('List accessible workspace directories');
});

test('CommandAutocomplete filters commands matching query', async () => {
  await act(async () => {
    root.render(
      <I18nProvider>
        <CommandAutocomplete
          searchQuery="dir"
          onCommandSelect={() => {}}
          onClose={() => {}}
        />
      </I18nProvider>
    );
  });
  await settle();

  expect(container.textContent).toContain('/dirs');
});
