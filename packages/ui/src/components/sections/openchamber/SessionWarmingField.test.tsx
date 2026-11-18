import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import type { Root } from 'react-dom/client';
import { Window } from 'happy-dom';
import type {
  CacheWarmingMode,
  SessionCacheWarmingApplyResult,
  SessionCacheWarmingState,
  SessionCacheWarmingUpdateRequest,
} from '@openchamber/agent-contract';

const browser = new Window({ url: 'http://localhost/' });
Object.assign(globalThis, {
  window: browser,
  document: browser.document,
  navigator: browser.navigator,
  localStorage: browser.localStorage,
  sessionStorage: browser.sessionStorage,
  Node: browser.Node,
  Element: browser.Element,
  HTMLElement: browser.HTMLElement,
  HTMLInputElement: browser.HTMLInputElement,
  Event: browser.Event,
  FocusEvent: browser.FocusEvent,
  CustomEvent: browser.CustomEvent,
  KeyboardEvent: browser.KeyboardEvent,
  MouseEvent: browser.MouseEvent,
  PointerEvent: browser.PointerEvent,
  DOMRect: browser.DOMRect,
  MutationObserver: browser.MutationObserver,
  ResizeObserver: browser.ResizeObserver,
  getComputedStyle: browser.getComputedStyle.bind(browser),
  requestAnimationFrame: browser.requestAnimationFrame.bind(browser),
  cancelAnimationFrame: browser.cancelAnimationFrame.bind(browser),
  IS_REACT_ACT_ENVIRONMENT: true,
});

// Test loading boundary: DOM globals must be installed on globalThis before React/Base UI evaluate.
const { act } = await import('react');
const { createRoot } = await import('react-dom/client');
const { I18nProvider } = await import('@/lib/i18n');
const { createSessionWarmingStore } = await import('@/stores/useSessionWarmingStore');
const { SessionWarmingField } = await import('./SessionWarmingField');

function makeState(
  sessionId: string,
  overrides: Partial<SessionCacheWarmingState> = {},
): SessionCacheWarmingState {
  const mode = overrides.mode ?? null;
  const workspaceMode = overrides.workspaceMode ?? 'off';
  return {
    sessionId,
    workspaceId: overrides.workspaceId ?? 'ws-1',
    revision: overrides.revision ?? '0',
    mode,
    workspaceMode,
    effectiveMode: overrides.effectiveMode ?? (mode ?? workspaceMode),
  };
}

function makeApplyResult(
  persisted: SessionCacheWarmingState,
  status: SessionCacheWarmingApplyResult['status'],
): SessionCacheWarmingApplyResult {
  if (status === 'no-active-worker') {
    return { persisted, status, worker: null };
  }
  if (status === 'applied') {
    return {
      persisted,
      status,
      worker: {
        worker: { rootSessionId: persisted.sessionId, workspaceId: persisted.workspaceId, workerGeneration: 'gen-1' },
        outcome: 'applied',
        mode: persisted.effectiveMode,
      },
    };
  }
  return {
    persisted,
    status,
    worker: {
      mode: persisted.effectiveMode,
      worker: { rootSessionId: persisted.sessionId, workspaceId: persisted.workspaceId, workerGeneration: 'gen-1' },
      outcome: 'failed',
      error: { code: 'WORKER_UNAVAILABLE', detail: 'Worker failed', retryable: true },
    },
  };
}

const settle = async () => {
  await act(async () => {
    const { promise, resolve } = Promise.withResolvers<void>();
    setTimeout(resolve, 10);
    await promise;
  });
};

describe('SessionWarmingField', () => {
  let host: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    document.body.innerHTML = '';
    host = document.createElement('div');
    document.body.appendChild(host);
    root = createRoot(host);
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    host.remove();
  });

  test('renders disabled with empty-session description when no session is open', async () => {
    let readCount = 0;
    const store = createSessionWarmingStore({
      getRuntimeKey: () => 'rt-1',
      client: {
        readSessionCacheWarming: async () => {
          readCount += 1;
          return makeState('s1');
        },
        updateSessionCacheWarming: async () => {
          throw new Error('Unexpected write');
        },
      },
    });

    await act(async () => {
      root.render(
        <I18nProvider>
          <SessionWarmingField sessionId={null} store={store} />
        </I18nProvider>,
      );
    });
    await settle();

    expect(readCount).toBe(0);
    expect(host.textContent).toContain('Open a session to set a per-session override.');
    const trigger = host.querySelector<HTMLButtonElement>('[data-slot="select-trigger"]');
    expect(trigger).not.toBeNull();
    expect(trigger?.hasAttribute('disabled')).toBe(true);
  });

  test('hydrates Workspace default (Off) and updates mode through idle, streaming, off, and inherit', async () => {
    let currentState = makeState('s1', { revision: '0', mode: null, workspaceMode: 'off', effectiveMode: 'off' });
    const updatePayloads: SessionCacheWarmingUpdateRequest[] = [];
    const reportedStates: Array<'saving' | 'saved' | 'error'> = [];

    const store = createSessionWarmingStore({
      getRuntimeKey: () => 'rt-1',
      client: {
        readSessionCacheWarming: async () => currentState,
        updateSessionCacheWarming: async (_sessionId, payload) => {
          updatePayloads.push(payload);
          const nextRevision = String(Number(currentState.revision) + 1);
          currentState = makeState('s1', {
            revision: nextRevision,
            mode: payload.mode,
            workspaceMode: currentState.workspaceMode,
            effectiveMode: payload.mode ?? currentState.workspaceMode,
          });
          return makeApplyResult(currentState, 'applied');
        },
      },
    });

    await act(async () => {
      root.render(
        <I18nProvider>
          <SessionWarmingField
            sessionId="s1"
            store={store}
            onReportSaveState={(state) => {
              reportedStates.push(state);
            }}
          />
        </I18nProvider>,
      );
    });
    await settle();

    const trigger = host.querySelector<HTMLButtonElement>('[data-slot="select-trigger"]');
    expect(trigger).not.toBeNull();
    expect(trigger?.hasAttribute('disabled')).toBe(false);
    expect(trigger?.textContent).toContain('Workspace default (Off)');

    const selectOptionByText = async (label: string) => {
      const currentTrigger = host.querySelector<HTMLButtonElement>('[data-slot="select-trigger"]');
      expect(currentTrigger).not.toBeNull();
      await act(async () => {
        currentTrigger?.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, button: 0 }));
      });
      await settle();
      const options = Array.from(document.body.querySelectorAll<HTMLElement>('[role="option"]'));
      const option = options.find((item) => item.textContent?.trim() === label);
      expect(option).toBeDefined();
      await act(async () => {
        option?.click();
      });
      await settle();
    };

    const transitions: Array<{ label: string; expectedMode: CacheWarmingMode | null }> = [
      { label: 'Keep warm when idle', expectedMode: 'idle' },
      { label: 'During replies only', expectedMode: 'streaming' },
      { label: 'Off', expectedMode: 'off' },
      { label: 'Workspace default (Off)', expectedMode: null },
    ];

    for (const step of transitions) {
      await selectOptionByText(step.label);
      expect(host.querySelector('[data-slot="select-trigger"]')?.textContent).toContain(step.label);
    }

    expect(updatePayloads).toEqual([
      { expectedRevision: '0', mode: 'idle' },
      { expectedRevision: '1', mode: 'streaming' },
      { expectedRevision: '2', mode: 'off' },
      { expectedRevision: '3', mode: null },
    ]);
    expect(reportedStates).toEqual([
      'saving', 'saved',
      'saving', 'saved',
      'saving', 'saved',
      'saving', 'saved',
    ]);
    expect(host.querySelector('[role="status"]')?.textContent).toBe('Applied to the active session worker.');
  });

  test('displays apply status variants and write error feedback', async () => {
    let nextStatus: SessionCacheWarmingApplyResult['status'] = 'no-active-worker';
    let shouldFailWrite = false;
    let currentState = makeState('s1', { revision: '0', mode: null, workspaceMode: 'off', effectiveMode: 'off' });
    const reportedStates: Array<'saving' | 'saved' | 'error'> = [];

    const store = createSessionWarmingStore({
      getRuntimeKey: () => 'rt-1',
      client: {
        readSessionCacheWarming: async () => currentState,
        updateSessionCacheWarming: async (_sessionId, payload) => {
          if (shouldFailWrite) {
            throw new Error('Network unavailable');
          }
          currentState = makeState('s1', {
            revision: String(Number(currentState.revision) + 1),
            mode: payload.mode,
            workspaceMode: 'off',
            effectiveMode: payload.mode ?? 'off',
          });
          return makeApplyResult(currentState, nextStatus);
        },
      },
    });

    await act(async () => {
      root.render(
        <I18nProvider>
          <SessionWarmingField
            sessionId="s1"
            store={store}
            onReportSaveState={(state) => {
              reportedStates.push(state);
            }}
          />
        </I18nProvider>,
      );
    });
    await settle();

    const selectOptionByText = async (label: string) => {
      const trigger = host.querySelector<HTMLButtonElement>('[data-slot="select-trigger"]');
      await act(async () => {
        trigger?.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, button: 0 }));
      });
      await settle();
      const options = Array.from(document.body.querySelectorAll<HTMLElement>('[role="option"]'));
      const option = options.find((item) => item.textContent?.trim() === label);
      expect(option).toBeDefined();
      await act(async () => {
        option?.click();
      });
      await settle();
    };

    nextStatus = 'no-active-worker';
    await selectOptionByText('Keep warm when idle');
    expect(host.querySelector('[role="status"]')?.textContent).toBe(
      'Saved for this session; takes effect the next time its worker runs.',
    );

    nextStatus = 'failed';
    await selectOptionByText('During replies only');
    expect(host.querySelector('[role="status"]')?.textContent).toBe(
      'Saved for this session, but the active worker did not confirm the change.',
    );

    shouldFailWrite = true;
    await selectOptionByText('Off');
    expect(host.querySelector('[role="status"]')?.textContent).toBe(
      'Could not update session cache warming. Try again.',
    );
    expect(reportedStates).toEqual([
      'saving', 'saved',
      'saving', 'error',
      'saving', 'error',
    ]);
  });
});
