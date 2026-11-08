import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { Window } from 'happy-dom';

import { I18nProvider } from '@/lib/i18n';
import { useTerminalStore } from '@/stores/useTerminalStore';
import { normalizeContextPanelDirectoryKey, useUIStore } from '@/stores/useUIStore';
import { shownContextModes } from '@/lib/workspace/zones';

// The menu is portaled through Base UI, which happy-dom cannot open; render its
// content inline like the other layout tests do, so the buttons stay reachable.
mock.module('@/components/ui/dropdown-menu', () => ({
  DropdownMenu: ({ children }: { children: React.ReactNode }) => React.createElement(React.Fragment, null, children),
  DropdownMenuContent: ({ children }: { children: React.ReactNode }) => React.createElement('div', null, children),
  // A real menu item is not a button; the tab row contains its own close button.
  DropdownMenuItem: ({ children, onClick, className }: { children: React.ReactNode; onClick?: () => void; className?: string }) => React.createElement('div', { onClick, className }, children),
  DropdownMenuSeparator: () => React.createElement('hr'),
  DropdownMenuTrigger: ({ children }: { children: React.ReactNode }) => React.createElement(React.Fragment, null, children),
}));
mock.module('@/components/ui/tooltip', () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => React.createElement(React.Fragment, null, children),
  TooltipContent: ({ children }: { children: React.ReactNode }) => React.createElement('div', null, children),
  TooltipTrigger: ({ children }: { children: React.ReactNode }) => React.createElement(React.Fragment, null, children),
}));

const toastErrors: string[] = [];
mock.module('@/components/ui', () => ({
  toast: {
    error: (message: string) => { toastErrors.push(message); },
    success: () => undefined,
    info: () => undefined,
  },
}));

const closedSessions: Array<{ sessionId: string; directory: string | null }> = [];
let closeImpl: (sessionId: string, directory?: string | null) => Promise<void> = async (sessionId, directory) => {
  closedSessions.push({ sessionId, directory: directory ?? null });
};
const terminalApi = {
  createSession: async () => { throw new Error('not used'); },
  connect: () => ({ close: () => undefined }),
  sendInput: async () => undefined,
  resize: async () => undefined,
  close: (sessionId: string, directory?: string | null) => closeImpl(sessionId, directory),
  listShells: async () => [],
};
mock.module('@/hooks/useRuntimeAPIs', () => ({
  useRuntimeAPIs: () => ({ terminal: terminalApi, runtime: { platform: 'web', isDesktop: false, isVSCode: false } }),
}));

// Imported after the mocks above: mock.module only affects modules loaded
// afterwards, and the component reads its dropdown, toast and runtime APIs.
const { HeaderTerminalAction } = await import('./HeaderTerminalAction');

describe('HeaderTerminalAction behavior with real stores', () => {
  let windowInstance: Window;
  let root: Root;
  let host: HTMLDivElement;
  const dir = '/workspace/project-alpha';
  const dirKey = normalizeContextPanelDirectoryKey(dir);

  beforeEach(() => {
    windowInstance = new Window({ url: 'http://localhost/' });
    Object.assign(globalThis, {
      window: windowInstance,
      document: windowInstance.document,
      navigator: windowInstance.navigator,
      Node: windowInstance.Node,
      Element: windowInstance.Element,
      HTMLElement: windowInstance.HTMLElement,
      Event: windowInstance.Event,
      MouseEvent: windowInstance.MouseEvent,
      PointerEvent: windowInstance.MouseEvent,
      IS_REACT_ACT_ENVIRONMENT: true,
    });
    host = document.createElement('div');
    document.body.appendChild(host);
    root = createRoot(host);
    closedSessions.length = 0;
    toastErrors.length = 0;
    closeImpl = async (sessionId, directory) => {
      closedSessions.push({ sessionId, directory: directory ?? null });
    };

    useTerminalStore.setState({ sessions: new Map() });
    useUIStore.setState({
      contextPanelByDirectory: {},
      contextSurfaceZones: {},
    });
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    host.remove();
    useTerminalStore.setState({ sessions: new Map() });
    useUIStore.setState({ contextPanelByDirectory: {} });
  });

  const render = async (directory: string | null = dir) => {
    await act(async () => {
      root.render(
        <I18nProvider>
          <HeaderTerminalAction directory={directory} />
        </I18nProvider>,
      );
    });
  };

  // The store always keeps one tab; seed the surface with exactly the tabs
  // under test by creating them first and closing the defaults afterwards.
  const openSurfaceWithTabs = async (sessions: Array<{ label: string; sessionId: string }>) => {
    await act(async () => {
      const store = useTerminalStore.getState();
      store.ensureDirectory(dir);
      const defaults = (useTerminalStore.getState().getDirectoryState(dir)?.tabs ?? []).map((tab) => tab.id);
      for (const entry of sessions) {
        const tabId = useTerminalStore.getState().createTab(dir);
        useTerminalStore.getState().setTabLabel(dir, tabId, entry.label);
        useTerminalStore.getState().setTabSessionId(dir, tabId, entry.sessionId);
      }
      for (const tabId of defaults) {
        useTerminalStore.getState().closeTab(dir, tabId);
      }
      useUIStore.getState().openContextSurface(dirKey, 'terminal');
    });
  };

  const closeButton = () => Array.from(host.querySelectorAll('button'))
    .find((button) => button.getAttribute('aria-label') === 'Close tab');

  test('toggle button opens then closes terminal surface in real UI store', async () => {
    await render();

    const toggleBtn = host.querySelectorAll('button')[0];
    expect(toggleBtn).toBeDefined();

    let panelState = useUIStore.getState().contextPanelByDirectory[dirKey];
    let isShown = shownContextModes(panelState, useUIStore.getState().contextSurfaceZones).has('terminal');
    expect(isShown).toBe(false);

    await act(async () => { toggleBtn?.click(); });
    panelState = useUIStore.getState().contextPanelByDirectory[dirKey];
    isShown = shownContextModes(panelState, useUIStore.getState().contextSurfaceZones).has('terminal');
    expect(panelState?.isOpen).toBe(true);
    expect(isShown).toBe(true);

    await act(async () => { toggleBtn?.click(); });
    panelState = useUIStore.getState().contextPanelByDirectory[dirKey];
    const isShownAfter = shownContextModes(panelState, useUIStore.getState().contextSurfaceZones).has('terminal');
    expect(isShownAfter).toBe(false);
  });

  test('controls are disabled without a resolved directory', async () => {
    await render(null);
    const buttons = host.querySelectorAll('button');
    expect(buttons[0]?.disabled).toBe(true);
    expect(buttons[1]?.disabled).toBe(true);
    expect(useTerminalStore.getState().sessions.size).toBe(0);
  });

  test('reflects active terminal surface state via button aria-pressed and styling', async () => {
    await render();

    const toggleBtn = host.querySelectorAll('button')[0];
    expect(toggleBtn?.getAttribute('aria-pressed')).toBe('false');

    await act(async () => {
      useUIStore.getState().openContextSurface(dirKey, 'terminal');
    });
    expect(toggleBtn?.getAttribute('aria-pressed')).toBe('true');

    await act(async () => {
      useUIStore.getState().closeContextZone(dirKey, 'right');
    });
    expect(toggleBtn?.getAttribute('aria-pressed')).toBe('false');
  });

  test('closing a tab ends its backend shell and keeps the surface while tabs remain', async () => {
    await openSurfaceWithTabs([
      { label: 'first', sessionId: 'pty-a' },
      { label: 'second', sessionId: 'pty-b' },
    ]);
    await render();
    const firstTabId = useTerminalStore.getState().getDirectoryState(dir)?.tabs[0]?.id;
    const surfaceTabId = useUIStore.getState().contextPanelByDirectory[dirKey]?.tabs
      .find((tab) => tab.mode === 'terminal')?.id;

    const button = closeButton();
    expect(button).toBeDefined();
    await act(async () => { button?.click(); });
    await act(async () => { await Promise.resolve(); });

    expect(closedSessions).toEqual([{ sessionId: 'pty-a', directory: dir }]);
    const remaining = useTerminalStore.getState().getDirectoryState(dir)?.tabs ?? [];
    expect(remaining.some((tab) => tab.id === firstTabId)).toBe(false);
    expect(remaining).toHaveLength(1);
    const surfaceStillOpen = useUIStore.getState().contextPanelByDirectory[dirKey]?.tabs
      .some((tab) => tab.id === surfaceTabId);
    expect(surfaceStillOpen).toBe(true);
  });

  test('closing the last tab takes the terminal surface down with it', async () => {
    await openSurfaceWithTabs([{ label: 'only', sessionId: 'pty-only' }]);
    await render();
    const onlyTabId = useTerminalStore.getState().getDirectoryState(dir)?.tabs[0]?.id;
    const surfaceTabId = useUIStore.getState().contextPanelByDirectory[dirKey]?.tabs
      .find((tab) => tab.mode === 'terminal')?.id;

    await act(async () => { closeButton()?.click(); });
    await act(async () => { await Promise.resolve(); });

    expect(closedSessions).toEqual([{ sessionId: 'pty-only', directory: dir }]);
    const surfaceGone = useUIStore.getState().contextPanelByDirectory[dirKey]?.tabs
      .some((tab) => tab.id === surfaceTabId);
    expect(surfaceGone).toBe(false);
    const tabsLeft = useTerminalStore.getState().getDirectoryState(dir)?.tabs ?? [];
    expect(tabsLeft.some((tab) => tab.id === onlyTabId)).toBe(false);
  });

  test('a backend close failure keeps the tab visible and reports the error', async () => {
    await openSurfaceWithTabs([{ label: 'live', sessionId: 'pty-live' }]);
    const before = useTerminalStore.getState().getDirectoryState(dir)?.tabs[0];
    closeImpl = async () => { throw new Error('the shell is still running'); };
    await render();

    await act(async () => { closeButton()?.click(); });
    await act(async () => {
      const { promise, resolve } = Promise.withResolvers<void>();
      setTimeout(resolve, 0);
      await promise;
    });

    expect(toastErrors).toEqual(['the shell is still running']);
    const tabsLeft = useTerminalStore.getState().getDirectoryState(dir)?.tabs ?? [];
    expect(tabsLeft.some((tab) => tab.id === before?.id)).toBe(true);
    expect(useUIStore.getState().contextPanelByDirectory[dirKey]?.tabs
      .some((tab) => tab.mode === 'terminal')).toBe(true);
  });
});
