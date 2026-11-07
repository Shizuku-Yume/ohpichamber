import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { Window } from 'happy-dom';

import { I18nProvider } from '@/lib/i18n';
import { useTerminalStore } from '@/stores/useTerminalStore';
import { normalizeContextPanelDirectoryKey, useUIStore } from '@/stores/useUIStore';
import { shownContextModes } from '@/lib/workspace/zones';
import { HeaderTerminalAction } from './HeaderTerminalAction';

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

  test('toggle button opens then closes terminal surface in real UI store', async () => {
    await act(async () => {
      root.render(
        <I18nProvider>
          <HeaderTerminalAction directory={dir} />
        </I18nProvider>,
      );
    });

    const toggleBtn = host.querySelectorAll('button')[0];
    expect(toggleBtn).toBeDefined();

    // Initially closed
    let panelState = useUIStore.getState().contextPanelByDirectory[dirKey];
    let isShown = shownContextModes(panelState, useUIStore.getState().contextSurfaceZones).has('terminal');
    expect(isShown).toBe(false);

    // Click 1: toggle OPEN
    await act(async () => {
      toggleBtn?.click();
    });
    panelState = useUIStore.getState().contextPanelByDirectory[dirKey];
    isShown = shownContextModes(panelState, useUIStore.getState().contextSurfaceZones).has('terminal');
    expect(panelState?.isOpen).toBe(true);
    expect(isShown).toBe(true);

    // Click 2: toggle CLOSED
    await act(async () => {
      toggleBtn?.click();
    });
    panelState = useUIStore.getState().contextPanelByDirectory[dirKey];
    const isShownAfter = shownContextModes(panelState, useUIStore.getState().contextSurfaceZones).has('terminal');
    expect(isShownAfter).toBe(false);
  });

  test('reflects active terminal surface state via button aria-pressed and styling', async () => {
    await act(async () => {
      root.render(
        <I18nProvider>
          <HeaderTerminalAction directory={dir} />
        </I18nProvider>,
      );
    });

    const toggleBtn = host.querySelectorAll('button')[0];
    expect(toggleBtn?.getAttribute('aria-pressed')).toBe('false');

    // Open terminal via store
    await act(async () => {
      useUIStore.getState().openContextSurface(dirKey, 'terminal');
    });

    expect(toggleBtn?.getAttribute('aria-pressed')).toBe('true');

    // Close terminal via store
    await act(async () => {
      useUIStore.getState().closeContextZone(dirKey, 'right');
    });

    expect(toggleBtn?.getAttribute('aria-pressed')).toBe('false');
  });
});
