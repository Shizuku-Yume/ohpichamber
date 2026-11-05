import { describe, expect, test, beforeEach } from 'bun:test';
import { Window } from 'happy-dom';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { CleanseStatusBoard, CleanseTimelineBoard } from './CleanseStatusBoard';
import { useCleanseStore } from '@/stores/useCleanseStore';
import { I18nProvider } from '@/lib/i18n';
import type { CleanseProgressEvent } from '@openchamber/agent-contract';

describe('CleanseStatusBoard and CleanseTimelineBoard', () => {
  let host: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    useCleanseStore.getState().reset();
    const windowInstance = new Window();
    Object.assign(globalThis, {
      window: windowInstance,
      document: windowInstance.document,
      HTMLElement: windowInstance.HTMLElement,
      Element: windowInstance.Element,
      Node: windowInstance.Node,
      IS_REACT_ACT_ENVIRONMENT: true,
    });
    host = document.createElement('div');
    root = createRoot(host);
  });

  const renderComponent = (ui: React.ReactNode) => {
    act(() => {
      root.render(<I18nProvider>{ui}</I18nProvider>);
    });
  };

  test('renders discovering status with active checkers and no repaired files', () => {
    renderComponent(
      <CleanseStatusBoard
        status="discovering"
        activeCheckers={['oxlint', 'typescript']}
        completedCheckers={[]}
        repairedFiles={[]}
      />,
    );

    const board = host.querySelector('[data-testid="cleanse-status-board"]');
    expect(board).not.toBeNull();
    expect(board?.textContent).toContain('Cleanse Status Board');
    expect(board?.textContent).toContain('discovering');
    expect(board?.textContent).toContain('oxlint');
    expect(board?.textContent).toContain('typescript');
    expect(board?.textContent).toContain('None');

    // Dismiss button should not be present while running
    expect(host.querySelector('[data-testid="cleanse-status-board-dismiss"]')).toBeNull();
  });

  test('renders repairing status with active and completed checkers plus repaired files', () => {
    renderComponent(
      <CleanseStatusBoard
        status="repairing"
        activeCheckers={['typescript']}
        completedCheckers={['oxlint']}
        repairedFiles={['src/app.ts', 'src/util.ts']}
        summary="Fixing syntax errors"
      />,
    );

    const board = host.querySelector('[data-testid="cleanse-status-board"]');
    expect(board?.textContent).toContain('repairing');
    expect(board?.textContent).toContain('Fixing syntax errors');
    expect(board?.textContent).toContain('src/app.ts');
    expect(board?.textContent).toContain('src/util.ts');
  });

  test('renders completed status with dismiss button and calls onDismiss', () => {
    let dismissed = false;
    renderComponent(
      <CleanseStatusBoard
        status="completed"
        activeCheckers={[]}
        completedCheckers={['oxlint', 'typescript']}
        repairedFiles={['src/app.ts']}
        summary="All diagnostics repaired successfully"
        onDismiss={() => {
          dismissed = true;
        }}
      />,
    );

    const board = host.querySelector('[data-testid="cleanse-status-board"]');
    expect(board?.textContent).toContain('completed');
    expect(board?.textContent).toContain('All diagnostics repaired successfully');

    const dismissBtn = host.querySelector('[data-testid="cleanse-status-board-dismiss"]') as HTMLButtonElement;
    expect(dismissBtn).not.toBeNull();

    act(() => {
      dismissBtn.click();
    });
    expect(dismissed).toBe(true);
  });

  test('renders failed and cancelled statuses properly', () => {
    renderComponent(
      <CleanseStatusBoard
        status="failed"
        activeCheckers={[]}
        completedCheckers={['oxlint']}
        repairedFiles={[]}
        summary="Repair failed"
      />,
    );

    let board = host.querySelector('[data-testid="cleanse-status-board"]');
    expect(board?.textContent).toContain('failed');
    expect(board?.textContent).toContain('Repair failed');

    renderComponent(
      <CleanseStatusBoard
        status="cancelled"
        activeCheckers={[]}
        completedCheckers={[]}
        repairedFiles={[]}
      />,
    );

    board = host.querySelector('[data-testid="cleanse-status-board"]');
    expect(board?.textContent).toContain('cancelled');
  });

  test('CleanseTimelineBoard renders null when no state exists for session', () => {
    renderComponent(<CleanseTimelineBoard sessionId="session-1" />);
    expect(host.innerHTML).toBe('');
  });

  test('CleanseTimelineBoard reacts to live store updates and state transitions', () => {
    renderComponent(<CleanseTimelineBoard sessionId="session-live" />);
    expect(host.innerHTML).toBe('');

    const event = (overrides: Partial<CleanseProgressEvent>): CleanseProgressEvent => ({
      type: 'cleanse.progress',
      sessionId: 'session-live',
      epoch: '1',
      sequence: '1',
      timestamp: 1000,
      status: 'discovering',
      activeCheckers: ['oxlint'],
      completedCheckers: [],
      repairedFiles: [],
      ...overrides,
    });

    // 1. Start: discovering
    act(() => {
      useCleanseStore.getState().applyCleanseProgress('session-live', event({ sequence: '1', status: 'discovering' }));
    });
    expect(host.querySelector('[data-testid="cleanse-timeline-container"]')).not.toBeNull();
    expect(host.textContent).toContain('discovering');

    // 2. Transition: repairing
    act(() => {
      useCleanseStore.getState().applyCleanseProgress('session-live', event({
        sequence: '2',
        status: 'repairing',
        activeCheckers: [],
        completedCheckers: ['oxlint'],
        repairedFiles: ['packages/ui/src/repaired.ts'],
      }));
    });
    expect(host.textContent).toContain('repairing');
    expect(host.textContent).toContain('packages/ui/src/repaired.ts');

    // 3. Transition: completed
    act(() => {
      useCleanseStore.getState().applyCleanseProgress('session-live', event({
        sequence: '3',
        status: 'completed',
        activeCheckers: [],
        completedCheckers: ['oxlint'],
        repairedFiles: ['packages/ui/src/repaired.ts'],
        summary: 'Cleanse complete: 1 file repaired',
      }));
    });
    expect(host.textContent).toContain('completed');
    expect(host.textContent).toContain('Cleanse complete: 1 file repaired');

    // 4. Dismiss from timeline board clears store and unmounts
    const dismissBtn = host.querySelector('[data-testid="cleanse-status-board-dismiss"]') as HTMLButtonElement;
    expect(dismissBtn).not.toBeNull();
    act(() => {
      dismissBtn.click();
    });
    expect(host.innerHTML).toBe('');
    expect(useCleanseStore.getState().bySession['session-live']).toBeUndefined();
  });

  test('CleanseTimelineBoard enforces session scoping when sessionId prop changes', () => {
    useCleanseStore.getState().applyCleanseProgress('session-a', {
      type: 'cleanse.progress',
      sessionId: 'session-a',
      epoch: '1',
      sequence: '1',
      timestamp: 1000,
      status: 'completed',
      activeCheckers: [],
      completedCheckers: ['oxlint'],
      repairedFiles: ['file-a.ts'],
    });

    useCleanseStore.getState().applyCleanseProgress('session-b', {
      type: 'cleanse.progress',
      sessionId: 'session-b',
      epoch: '1',
      sequence: '1',
      timestamp: 1000,
      status: 'repairing',
      activeCheckers: ['typescript'],
      completedCheckers: [],
      repairedFiles: ['file-b.ts'],
    });

    // Viewing session-a
    renderComponent(<CleanseTimelineBoard sessionId="session-a" />);
    expect(host.textContent).toContain('file-a.ts');
    expect(host.textContent).not.toContain('file-b.ts');
    expect(host.textContent).toContain('completed');

    // Switch to session-b
    renderComponent(<CleanseTimelineBoard sessionId="session-b" />);
    expect(host.textContent).toContain('file-b.ts');
    expect(host.textContent).not.toContain('file-a.ts');
    expect(host.textContent).toContain('repairing');

    // Switch to session-c (no cleanse state)
    renderComponent(<CleanseTimelineBoard sessionId="session-c" />);
    expect(host.innerHTML).toBe('');
  });
});
