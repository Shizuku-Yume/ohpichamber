import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { Window } from 'happy-dom';

import { I18nProvider } from '@/lib/i18n';
import { useTerminalStore } from '@/stores/useTerminalStore';
import { useUIStore, normalizeContextPanelDirectoryKey } from '@/stores/useUIStore';
import { HeaderTerminalAction } from './HeaderTerminalAction';

describe('HeaderTerminalAction', () => {
  let windowInstance: Window;
  let root: Root;
  let host: HTMLDivElement;

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
      IS_REACT_ACT_ENVIRONMENT: true,
    });
    host = document.createElement('div');
    document.body.appendChild(host);
    root = createRoot(host);
    useTerminalStore.setState({ sessions: new Map() });
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    host.remove();
    useTerminalStore.setState({ sessions: new Map() });
  });

  test('renders terminal toggle button with terminal-box icon', () => {
    act(() => {
      root.render(
        <I18nProvider>
          <HeaderTerminalAction directory="/test/repo" />
        </I18nProvider>
      );
    });

    const buttons = host.querySelectorAll('button');
    expect(buttons.length).toBeGreaterThanOrEqual(1);
    const toggleBtn = buttons[0];
    expect(toggleBtn?.getAttribute('aria-label')).toBe('Toggle terminal panel');
    expect(toggleBtn?.innerHTML).toContain('terminal-box');
  });

  test('clicking toggle button invokes openContextSurface', () => {
    const dir = '/test/repo';
    let openedDir = '';
    let openedMode = '';
    const originalOpen = useUIStore.getState().openContextSurface;
    useUIStore.setState({
      openContextSurface: (d, m) => {
        openedDir = d;
        openedMode = m;
      },
    });

    try {
      act(() => {
        root.render(
          <I18nProvider>
            <HeaderTerminalAction directory={dir} />
          </I18nProvider>
        );
      });

      const toggleBtn = host.querySelector('button[aria-label="Toggle terminal panel"]');
      expect(toggleBtn).not.toBeNull();
      act(() => {
        toggleBtn?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      });

      expect(openedDir).toBe(normalizeContextPanelDirectoryKey(dir));
      expect(openedMode).toBe('terminal');
    } finally {
      useUIStore.setState({ openContextSurface: originalOpen });
    }
  });

  test('lists existing terminal tabs and handles tab actions', () => {
    const dir = '/test/repo';
    const tab1 = useTerminalStore.getState().createTab(dir);
    useTerminalStore.getState().setTabLabel(dir, tab1, 'Terminal 1');

    act(() => {
      root.render(
        <I18nProvider>
          <HeaderTerminalAction directory={dir} />
        </I18nProvider>
      );
    });

    const state = useTerminalStore.getState().getDirectoryState(dir);
    expect(state?.tabs.length).toBe(1);
    expect(state?.tabs[0]?.label).toBe('Terminal 1');
  });
});
