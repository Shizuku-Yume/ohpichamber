import React, { act } from 'react';
import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';
import { createRoot, type Root } from 'react-dom/client';
import { Window } from 'happy-dom';

const dom = new Window({ url: 'https://app.test' });
Object.assign(globalThis, {
  window: dom,
  document: dom.document,
  navigator: dom.navigator,
  HTMLElement: dom.HTMLElement,
  Element: dom.Element,
  Node: dom.Node,
  Event: dom.Event,
  KeyboardEvent: dom.KeyboardEvent,
  IS_REACT_ACT_ENVIRONMENT: true,
});

let lastTabClosedHandler: (() => void) | undefined;
let terminalViewMounted = false;

mock.module('@/components/views/TerminalView', () => ({
  TerminalView: ({ onLastTabClosed, visible }: { onLastTabClosed?: () => void; visible?: boolean }) => {
    lastTabClosedHandler = onLastTabClosed;
    React.useEffect(() => {
      terminalViewMounted = true;
      return () => {
        terminalViewMounted = false;
      };
    }, []);
    return <div data-testid="terminal-view" data-visible={visible}>Terminal</div>;
  },
}));

mock.module('@/lib/i18n', () => ({
  useI18n: () => ({ t: (key: string) => key }),
}));

mock.module('@/stores/useUIStore', () => ({
  useUIStore: () => [],
}));

mock.module('@/hooks/useEdgeSwipe', () => ({
  useEdgeSwipe: () => undefined,
}));

mock.module('@/components/ui/sortable-tabs-strip', () => ({
  SortableTabsStrip: () => <div data-testid="tabs-strip" />,
}));

mock.module('@/components/sections/status/MobileStatusPane', () => ({
  MobileStatusPane: () => <div />,
}));

mock.module('@/components/views/files/MobileFilesSurface', () => ({
  MobileFilesSurface: () => <div />,
}));

mock.module('@/components/context/ProjectContextPanel', () => ({
  ProjectContextPanel: () => <div />,
}));

// Static import of the component under test
import { MobileWorkspaceDrawer } from './MobileWorkspaceDrawer';

describe('MobileWorkspaceDrawer terminal lifecycle', () => {
  let container: HTMLElement;
  let root: Root;

  beforeEach(() => {
    lastTabClosedHandler = undefined;
    terminalViewMounted = false;
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  test('closing the last terminal tab unmounts the terminal pane and calls onClose', async () => {
    let closed = false;
    const onClose = () => { closed = true; };

    await act(async () => {
      root.render(
        <MobileWorkspaceDrawer
          open={true}
          tab="terminal"
          onClose={onClose}
          onTabChange={() => undefined}
          pendingChangesDiff={null}
          onOpenPlan={() => undefined}
          variant="panel"
        />,
      );
    });

    expect(terminalViewMounted).toBe(true);
    expect(lastTabClosedHandler).toBeDefined();

    // Trigger onLastTabClosed
    await act(async () => {
      lastTabClosedHandler?.();
    });

    // onClose must be called
    expect(closed).toBe(true);
    // TerminalView pane must be unmounted via stopVisitingTab('terminal')
    expect(terminalViewMounted).toBe(false);
  });
});
