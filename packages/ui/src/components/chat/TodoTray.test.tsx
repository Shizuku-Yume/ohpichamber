import { afterAll, afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { Window } from 'happy-dom';
import type { HistoryPage, JsonValue, Message, ToolResultPart } from '@openchamber/agent-contract';
import type { StoreApi } from 'zustand';
import { registerWorkspaceDirectory, resetWorkspaceDirectories } from '@/stores/globalSessions';
import { SyncProvider, useDirectoryStore } from '@/sync/sync-context';
import type { DirectoryStore } from '@/sync/child-store';
import { deferred, nativeClient, nativeHistory, nativeMessage, nativeSnapshot } from '@/sync/session-message-loader-test-fixtures';
import { I18nProvider } from '@/lib/i18n';
import { TodoTray } from './TodoTray';

const browser = new Window({ url: 'http://runtime.test' });
const descriptors = new Map<string, PropertyDescriptor | undefined>();
for (const [name, value] of Object.entries({
  window: browser,
  document: browser.document,
  navigator: browser.navigator,
  HTMLElement: browser.HTMLElement,
  Element: browser.Element,
  Node: browser.Node,
  IS_REACT_ACT_ENVIRONMENT: true,
})) {
  descriptors.set(name, Object.getOwnPropertyDescriptor(globalThis, name));
  Object.defineProperty(globalThis, name, { value, configurable: true, writable: true });
}

const DIR = '/workspace/project';
const WORKSPACE_ID = 'workspace-todo';
const SESSION_ID = 'session-todo-1';

const todoResult = (callId: string, phases: JsonValue, isError = false): ToolResultPart => ({
  type: 'tool_result',
  partId: `${callId}-result`,
  toolCallId: callId,
  toolName: 'todo',
  output: { content: [], details: { phases } },
  isError,
});

const assistantTodoMessage = (messageId: string, phases: JsonValue, isError = false): Message => ({
  messageId,
  role: 'assistant',
  sessionId: SESSION_ID,
  turnId: `turn-${messageId}`,
  createdAt: Date.now(),
  parts: [todoResult(`call-${messageId}`, phases, isError)],
});

const twoPhaseTodos: JsonValue = [
  {
    name: 'Discovery',
    tasks: [
      { content: 'Search codebase', status: 'completed' },
      { content: 'Inspect findings', status: 'in_progress', blocker: 'waiting on review' },
    ],
  },
  {
    name: 'Execution',
    tasks: [
      { content: 'Apply modifications', status: 'pending' },
    ],
  },
];

const updatedPhases: JsonValue = [
  {
    name: 'Discovery',
    tasks: [
      { content: 'Search codebase', status: 'completed' },
      { content: 'Inspect findings', status: 'completed' },
    ],
  },
  {
    name: 'Execution',
    tasks: [
      { content: 'Apply modifications', status: 'completed' },
    ],
  },
];

describe('TodoTray integration', () => {
  let host: HTMLElement;
  let root: Root | null = null;
  let directoryStore: StoreApi<DirectoryStore> | null = null;

  const StoreProbe = () => {
    directoryStore = useDirectoryStore(DIR, { bootstrap: false });
    return null;
  };

  beforeEach(() => {
    registerWorkspaceDirectory(WORKSPACE_ID, DIR);
    host = document.createElement('div');
    document.body.append(host);
    root = createRoot(host);
    directoryStore = null;
  });

  afterEach(async () => {
    if (root) {
      await act(async () => root!.unmount());
      root = null;
    }
    host.remove();
    resetWorkspaceDirectories();
  });

  afterAll(() => {
    for (const [name, descriptor] of descriptors) {
      if (descriptor) Object.defineProperty(globalThis, name, descriptor);
      else Reflect.deleteProperty(globalThis, name);
    }
  });

  const renderTray = async (sessionId: string | null = SESSION_ID, directory: string | null = DIR, show = true, client = nativeClient()) => {
    await act(async () => {
      root!.render(
        <I18nProvider>
          <SyncProvider client={client} directory={DIR}>
            <StoreProbe />
            {show ? <TodoTray sessionId={sessionId} directory={directory} /> : null}
          </SyncProvider>
        </I18nProvider>,
      );
    });
  };

  const tray = () => host.querySelector('[data-testid="todo-tray"]');

  const flush = async () => {
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)); });
  };

  const setMessages = async (messages: Message[], branchVersion = '1') => {
    const snapshot = nativeSnapshot(SESSION_ID, []);
    snapshot.branch = { branchId: 'branch-main', branchVersion, leafMessageId: messages.at(-1)?.messageId ?? 'msg-1' };
    await act(async () => {
      directoryStore!.setState({ snapshot: { [SESSION_ID]: snapshot }, message: { [SESSION_ID]: messages } });
    });
  };

  test('folds to the active item and its progress, and expands to every phase', async () => {
    await renderTray();
    expect(directoryStore).not.toBeNull();
    await setMessages([assistantTodoMessage('msg-1', twoPhaseTodos)]);

    const tray = host.querySelector('[data-testid="todo-tray"]');
    expect(tray).not.toBeNull();
    // Folded: the item being worked on and closed/total, nothing else.
    expect(tray?.textContent).toContain('Inspect findings');
    expect(tray?.textContent).toContain('1/3');
    expect(tray?.textContent).not.toContain('Apply modifications');
    expect(tray?.textContent).not.toContain('Discovery');
    expect(tray?.querySelector('button')?.getAttribute('aria-expanded')).toBe('false');

    await act(async () => {
      tray?.querySelector('button')?.dispatchEvent(new browser.MouseEvent('click', { bubbles: true }) as unknown as Event);
    });

    const expanded = host.querySelector('[data-testid="todo-tray"]');
    expect(expanded?.textContent).toContain('Discovery');
    expect(expanded?.textContent).toContain('Search codebase');
    expect(expanded?.textContent).toContain('Execution');
    expect(expanded?.textContent).toContain('Apply modifications');
    expect(expanded?.querySelector('button')?.getAttribute('aria-expanded')).toBe('true');

    const inProgressItem = host.querySelector('li[data-status="in_progress"]');
    expect(inProgressItem?.textContent).toContain('Inspect findings');
  });

  test('remount preserves two-phase history without loss', async () => {
    await renderTray();
    await setMessages([assistantTodoMessage('msg-1', twoPhaseTodos)]);
    expect(host.querySelector('[data-testid="todo-tray"]')).not.toBeNull();

    // Unmount TodoTray while keeping SyncProvider mounted
    await renderTray(SESSION_ID, DIR, false);
    expect(host.querySelector('[data-testid="todo-tray"]')).toBeNull();

    // Remount TodoTray
    await renderTray(SESSION_ID, DIR, true);
    const remountedTray = host.querySelector('[data-testid="todo-tray"]');
    expect(remountedTray).not.toBeNull();
    expect(remountedTray?.textContent).toContain('Inspect findings');
    expect(remountedTray?.textContent).toContain('1/3');
  });

  test('reacts to branch update with updated phases', async () => {
    await renderTray();
    const msg1 = assistantTodoMessage('msg-1', twoPhaseTodos);
    await setMessages([msg1], '1');
    expect(tray()?.textContent).toContain('1/3');

    const msg2 = assistantTodoMessage('msg-2', updatedPhases);
    await setMessages([msg1, msg2], '2');
    // Every task closed: the plan is finished, so the strip leaves the composer.
    expect(tray()).toBeNull();
  });

  test('renders null when history has no todo phases or session is null', async () => {
    await renderTray();
    await setMessages([]);

    await renderTray(null);
    expect(tray()).toBeNull();

    await renderTray(SESSION_ID);
    expect(tray()).toBeNull();
  });

  test('hides the tray for an empty snapshot and for a phase whose tasks were emptied', async () => {
    await renderTray();

    await setMessages([assistantTodoMessage('empty', [])], '1');
    expect(tray()).toBeNull();

    await setMessages([assistantTodoMessage('emptied', [{ name: '间距修正', tasks: [] }])], '2');
    expect(tray()).toBeNull();

    await setMessages([assistantTodoMessage('all-empty', [{ name: 'A', tasks: [] }, { name: 'B', tasks: [] }])], '3');
    expect(tray()).toBeNull();
  });

  test('counts only the real tasks of a mixed empty and populated snapshot', async () => {
    await renderTray();
    await setMessages([assistantTodoMessage('mixed', [
      { name: 'Emptied phase', tasks: [] },
      {
        name: 'Real work',
        tasks: [
          { content: 'Done already', status: 'completed' },
          { content: 'Still running', status: 'in_progress' },
        ],
      },
    ])]);

    const strip = tray();
    expect(strip).not.toBeNull();
    expect(strip?.textContent).toContain('Still running');
    expect(strip?.textContent).toContain('1/2');
    expect(strip?.textContent).not.toContain('0/0');
    expect(strip?.textContent).not.toContain('Emptied phase');
  });

  test('hides the tray when completed and abandoned tasks are all that is left', async () => {
    await renderTray();
    await setMessages([assistantTodoMessage('closed', [
      { name: 'Plan', tasks: [{ content: 'Shipped', status: 'completed' }, { content: 'Dropped', status: 'abandoned' }] },
      { name: 'Aftermath', tasks: [] },
    ])]);

    expect(tray()).toBeNull();
  });

  test('keeps the tray while one task is still in progress after its siblings closed', async () => {
    await renderTray();
    await setMessages([assistantTodoMessage('one-open', [
      { name: 'Plan', tasks: [{ content: 'Shipped', status: 'completed' }, { content: 'Dropped', status: 'abandoned' }] },
      { name: 'Now', tasks: [{ content: 'Keep working', status: 'in_progress' }] },
    ])]);

    const strip = tray();
    expect(strip).not.toBeNull();
    expect(strip?.textContent).toContain('Keep working');
    expect(strip?.textContent).toContain('2/3');
  });

  test('names a blocked task in the folded row while the tray stays visible', async () => {
    await renderTray();
    await setMessages([assistantTodoMessage('blocked', [
      { name: 'Plan', tasks: [{ content: 'Wait on upstream fix', status: 'blocked' }] },
    ])]);

    const strip = tray();
    expect(strip).not.toBeNull();
    // A blocked task is still open work, so the folded row must name it
    // rather than render the empty header and 0/0 of a finished plan.
    expect(strip?.textContent).toContain('Wait on upstream fix');
    expect(strip?.textContent).toContain('0/1');
  });

  test('follows a branch switch away from a plan without a todo result and back again', async () => {
    await renderTray();
    await setMessages([assistantTodoMessage('plan-a', twoPhaseTodos)], '1');
    expect(tray()?.textContent).toContain('Inspect findings');

    await setMessages([], '2');
    expect(tray()).toBeNull();

    await setMessages([assistantTodoMessage('plan-a', twoPhaseTodos)], '3');
    expect(tray()?.textContent).toContain('Inspect findings');
    expect(tray()?.textContent).toContain('1/3');
  });

  test('cold read shows no card while loading and hides the tray when the full history ends cleared', async () => {
    const tail = Array.from({ length: 10 }, (_, index) => nativeMessage(SESSION_ID, `tail-${index}`, index + 10, 'user'));
    const snapshot = nativeSnapshot(SESSION_ID, tail);
    snapshot.window.hasEarlier = true;
    snapshot.branch = { branchId: 'branch-main', branchVersion: '1', leafMessageId: tail.at(-1)!.messageId };
    const olderPage = deferred<HistoryPage>();
    const client = nativeClient({
      getSnapshot: async () => snapshot,
      getHistory: async (_sessionId, options) => options?.cursor ? olderPage.promise : nativeHistory(tail, 'older', snapshot),
    });

    await renderTray(SESSION_ID, DIR, true, client);
    await setMessages(tail);
    await flush();

    // The loaded tail carries no todo result; nothing may render while the
    // older page is still in flight.
    expect(host.querySelector('[data-testid="todo-card"]')).toBeNull();
    expect(tray()).toBeNull();

    olderPage.resolve(nativeHistory([assistantTodoMessage('cleared', [])], null, snapshot));
    await flush();

    expect(host.querySelector('[data-testid="todo-card"]')).toBeNull();
    expect(tray()).toBeNull();
    expect((directoryStore!.getState().message[SESSION_ID] ?? []).some((message) => message.messageId === 'cleared')).toBe(true);
  });

  test('cold read surfaces the plan once the full history delivers an open task', async () => {
    const tail = Array.from({ length: 10 }, (_, index) => nativeMessage(SESSION_ID, `tail-${index}`, index + 10, 'user'));
    const snapshot = nativeSnapshot(SESSION_ID, tail);
    snapshot.window.hasEarlier = true;
    snapshot.branch = { branchId: 'branch-main', branchVersion: '1', leafMessageId: tail.at(-1)!.messageId };
    const olderPage = deferred<HistoryPage>();
    const client = nativeClient({
      getSnapshot: async () => snapshot,
      getHistory: async (_sessionId, options) => options?.cursor ? olderPage.promise : nativeHistory(tail, 'older', snapshot),
    });

    await renderTray(SESSION_ID, DIR, true, client);
    await setMessages(tail);
    await flush();
    expect(tray()).toBeNull();

    olderPage.resolve(nativeHistory([assistantTodoMessage('plan', twoPhaseTodos)], null, snapshot));
    await flush();

    expect((directoryStore!.getState().message[SESSION_ID] ?? []).some((message) => message.messageId === 'plan')).toBe(true);
    expect(tray()?.textContent).toContain('Inspect findings');
    expect(tray()?.textContent).toContain('1/3');
  });
});
