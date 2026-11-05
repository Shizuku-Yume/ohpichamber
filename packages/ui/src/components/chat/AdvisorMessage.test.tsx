import { describe, expect, test } from 'bun:test';
import { Window } from 'happy-dom';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { AdvisorMessage } from './AdvisorMessage';
import { I18nProvider } from '@/lib/i18n';
import type { AdvisorNote } from '@openchamber/agent-contract';

describe('AdvisorMessage', () => {
  test('renders null when there are no notes', () => {
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
        <I18nProvider>
          <AdvisorMessage notes={[]} />
        </I18nProvider>,
      );
    });
    expect(host.querySelector('[data-testid="advisor-message-card"]')).toBeNull();
    root.unmount();
  });

  test('renders severity badges, advisor name, and advisory note rails', () => {
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
    const notes: AdvisorNote[] = [
      {
        noteId: 'note_1',
        severity: 'blocker',
        text: 'Missing return statement in critical path',
        advisorName: 'watchdog',
        timestamp: 1000,
      },
      {
        noteId: 'note_2',
        severity: 'concern',
        text: 'Consider adding timeout to network request',
        advisorName: 'watchdog',
        timestamp: 1001,
      },
    ];

    act(() => {
      root.render(
        <I18nProvider>
          <AdvisorMessage notes={notes} />
        </I18nProvider>,
      );
    });

    const card = host.querySelector('[data-testid="advisor-message-card"]');
    expect(card).not.toBeNull();
    expect(card?.textContent).toContain('Advisor Watchdog');
    expect(card?.textContent).toContain('Blocker');
    expect(card?.textContent).toContain('Missing return statement in critical path');
    expect(card?.textContent).toContain('Concern');
    expect(card?.textContent).toContain('Consider adding timeout to network request');

    root.unmount();
  });
});
