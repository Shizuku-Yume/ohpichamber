import { describe, expect, test } from 'bun:test';
import { Window } from 'happy-dom';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { AdvisorMessage, AdvisorTimelineCard } from './AdvisorMessage';
import { useAdvisorStore } from '@/stores/useAdvisorStore';
import { I18nProvider } from '@/lib/i18n';
import type { AdvisorNote, AdvisorYieldedEvent } from '@openchamber/agent-contract';
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
    act(() => {
      root.unmount();
    });
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

    act(() => {
      root.unmount();
    });
  });

  test('renders dismiss button when onDismiss is provided and triggers callback on click', () => {
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
    let dismissed = false;
    const notes: AdvisorNote[] = [
      {
        noteId: 'note_1',
        severity: 'blocker',
        text: 'Critical error',
        advisorName: 'watchdog',
        timestamp: 1000,
      },
    ];

    act(() => {
      root.render(
        <I18nProvider>
          <AdvisorMessage notes={notes} onDismiss={() => { dismissed = true; }} />
        </I18nProvider>,
      );
    });

    const dismissBtn = host.querySelector('[data-testid="advisor-message-dismiss"]') as HTMLButtonElement;
    expect(dismissBtn).not.toBeNull();
    act(() => {
      dismissBtn.click();
    });
    expect(dismissed).toBe(true);
    act(() => {
      root.unmount();
    });
  });

  test('AdvisorTimelineCard renders null when no state exists for session', () => {
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
    useAdvisorStore.getState().reset();

    act(() => {
      root.render(
        <I18nProvider>
          <AdvisorTimelineCard sessionId="session-1" />
        </I18nProvider>,
      );
    });

    expect(host.innerHTML).toBe('');
    act(() => {
      root.unmount();
    });
  });

  test('AdvisorTimelineCard reaches live timeline on advisor_yielded and disappears on dismiss', () => {
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
    useAdvisorStore.getState().reset();

    act(() => {
      root.render(
        <I18nProvider>
          <AdvisorTimelineCard sessionId="session-live" />
        </I18nProvider>,
      );
    });

    // Initially empty
    expect(host.innerHTML).toBe('');

    // advisor_yielded event arrives for this session
    const event: AdvisorYieldedEvent = {
      type: 'advisor_yielded',
      sessionId: 'session-live',
      epoch: 'epoch-1',
      sequence: '1',
      timestamp: 1000,
      notes: [
        {
          noteId: 'note-live-1',
          severity: 'blocker',
          text: 'Unchecked array bounds access',
          advisorName: 'watchdog',
          timestamp: 1000,
        },
      ],
    };

    act(() => {
      useAdvisorStore.getState().applyAdvisorYielded('session-live', event);
    });

    // Renders live on timeline
    const card = host.querySelector('[data-testid="advisor-message-card"]');
    expect(card).not.toBeNull();
    expect(card?.textContent).toContain('Advisor Watchdog');
    expect(card?.textContent).toContain('Blocker');
    expect(card?.textContent).toContain('Unchecked array bounds access');

    // Click dismiss button -> card disappears/removes from timeline
    const dismissBtn = host.querySelector('[data-testid="advisor-message-dismiss"]') as HTMLButtonElement;
    expect(dismissBtn).not.toBeNull();

    act(() => {
      dismissBtn.click();
    });

    expect(host.querySelector('[data-testid="advisor-message-card"]')).toBeNull();
    expect(host.innerHTML).toBe('');
    act(() => {
      root.unmount();
    });
  });

  test('AdvisorTimelineCard enforces session scoping across session switches', () => {
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
    useAdvisorStore.getState().reset();

    useAdvisorStore.getState().applyAdvisorYielded('session-a', {
      type: 'advisor_yielded',
      sessionId: 'session-a',
      epoch: '1',
      sequence: '1',
      timestamp: 1000,
      notes: [
        {
          noteId: 'note-a',
          severity: 'blocker',
          text: 'Note for Session A',
          advisorName: 'watchdog',
          timestamp: 1000,
        },
      ],
    });

    useAdvisorStore.getState().applyAdvisorYielded('session-b', {
      type: 'advisor_yielded',
      sessionId: 'session-b',
      epoch: '1',
      sequence: '1',
      timestamp: 1000,
      notes: [
        {
          noteId: 'note-b',
          severity: 'concern',
          text: 'Note for Session B',
          advisorName: 'watchdog',
          timestamp: 1000,
        },
      ],
    });

    // Viewing session-a
    act(() => {
      root.render(
        <I18nProvider>
          <AdvisorTimelineCard sessionId="session-a" />
        </I18nProvider>,
      );
    });
    expect(host.textContent).toContain('Note for Session A');
    expect(host.textContent).not.toContain('Note for Session B');

    // Switch to session-b
    act(() => {
      root.render(
        <I18nProvider>
          <AdvisorTimelineCard sessionId="session-b" />
        </I18nProvider>,
      );
    });
    expect(host.textContent).toContain('Note for Session B');
    expect(host.textContent).not.toContain('Note for Session A');

    // Switch to session-c (no notes)
    act(() => {
      root.render(
        <I18nProvider>
          <AdvisorTimelineCard sessionId="session-c" />
        </I18nProvider>,
      );
    });
    expect(host.innerHTML).toBe('');
    act(() => {
      root.unmount();
    });
  });
});
