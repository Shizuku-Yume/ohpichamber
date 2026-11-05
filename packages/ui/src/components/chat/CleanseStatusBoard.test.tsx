import { describe, expect, test } from 'bun:test';
import { Window } from 'happy-dom';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { CleanseStatusBoard } from './CleanseStatusBoard';

describe('CleanseStatusBoard', () => {
  test('renders status board, checkers, and repaired files', () => {
    const windowInstance = new Window();
    Object.assign(globalThis, {
      window: windowInstance,
      document: windowInstance.document,
      HTMLElement: windowInstance.HTMLElement,
      Element: windowInstance.Element,
      Node: windowInstance.Node,
      IS_REACT_ACT_ENVIRONMENT: true,
    });
    const host = document.createElement('div');
    const root = createRoot(host);

    act(() => {
      root.render(
        <CleanseStatusBoard
          status="repairing"
          activeCheckers={['typescript']}
          completedCheckers={['oxlint']}
          repairedFiles={['src/app.ts', 'src/util.ts']}
          summary="Diagnosing and fixing syntax errors"
        />,
      );
    });

    const board = host.querySelector('[data-testid="cleanse-status-board"]');
    expect(board).not.toBeNull();
    expect(board?.textContent).toContain('Cleanse Status Board');
    expect(board?.textContent).toContain('repairing');
    expect(board?.textContent).toContain('oxlint');
    expect(board?.textContent).toContain('typescript');
    expect(board?.textContent).toContain('src/app.ts');
    expect(board?.textContent).toContain('src/util.ts');

    root.unmount();
  });
});
