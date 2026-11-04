import { afterAll, afterEach, beforeEach, describe, expect, test } from 'bun:test';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { Window } from 'happy-dom';
import type { JsonValue, Message, ToolResultPart } from '@openchamber/agent-contract';
import type { StoreApi } from 'zustand';
import { registerWorkspaceDirectory, resetWorkspaceDirectories } from '@/stores/globalSessions';
import { SyncProvider, useDirectoryStore } from '@/sync/sync-context';
import type { DirectoryStore } from '@/sync/child-store';
import { nativeClient, nativeSnapshot } from '@/sync/session-message-loader-test-fixtures';
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

  const renderTray = async (sessionId: string | null = SESSION_ID, directory: string | null = DIR, show = true) => {
    await act(async () => {
      root!.render(
        <SyncProvider client={nativeClient()} directory={DIR}>
          <StoreProbe />
          {show ? <TodoTray sessionId={sessionId} directory={directory} /> : null}
        </SyncProvider>,
      );
    });
  };

  test('renders two-phase todo checklist from current session history', async () => {
    await renderTray();
    expect(directoryStore).not.toBeNull();

    const initialSnapshot = nativeSnapshot(SESSION_ID, []);
    initialSnapshot.branch = { branchId: 'branch-main', branchVersion: '1', leafMessageId: 'msg-1' };
    const msg = assistantTodoMessage('msg-1', twoPhaseTodos);

    await act(async () => {
      directoryStore!.setState({
        snapshot: { [SESSION_ID]: initialSnapshot },
        message: { [SESSION_ID]: [msg] },
      });
    });

    const tray = host.querySelector('[data-testid="todo-tray"]');
    expect(tray).not.toBeNull();
    const text = tray?.textContent ?? '';
    expect(text).toContain('Discovery');
    expect(text).toContain('Search codebase');
    expect(text).toContain('Inspect findings');
    expect(text).toContain('Execution');
    expect(text).toContain('Apply modifications');

    const inProgressItem = host.querySelector('li[data-status="in_progress"]');
    expect(inProgressItem).not.toBeNull();
    expect(inProgressItem?.textContent).toContain('Inspect findings');
  });

  test('remount preserves two-phase history without loss', async () => {
    await renderTray();
    const initialSnapshot = nativeSnapshot(SESSION_ID, []);
    initialSnapshot.branch = { branchId: 'branch-main', branchVersion: '1', leafMessageId: 'msg-1' };
    const msg = assistantTodoMessage('msg-1', twoPhaseTodos);

    await act(async () => {
      directoryStore!.setState({
        snapshot: { [SESSION_ID]: initialSnapshot },
        message: { [SESSION_ID]: [msg] },
      });
    });

    expect(host.querySelector('[data-testid="todo-tray"]')).not.toBeNull();

    // Unmount TodoTray while keeping SyncProvider mounted
    await renderTray(SESSION_ID, DIR, false);
    expect(host.querySelector('[data-testid="todo-tray"]')).toBeNull();

    // Remount TodoTray
    await renderTray(SESSION_ID, DIR, true);

    const remountedTray = host.querySelector('[data-testid="todo-tray"]');
    expect(remountedTray).not.toBeNull();
    const text = remountedTray?.textContent ?? '';
    expect(text).toContain('Discovery');
    expect(text).toContain('Execution');
  });

  test('reacts to branch update with updated phases', async () => {
    await renderTray();

    const branch1Snapshot = nativeSnapshot(SESSION_ID, []);
    branch1Snapshot.branch = { branchId: 'branch-1', branchVersion: '1', leafMessageId: 'msg-1' };
    const msg1 = assistantTodoMessage('msg-1', twoPhaseTodos);

    await act(async () => {
      directoryStore!.setState({
        snapshot: { [SESSION_ID]: branch1Snapshot },
        message: { [SESSION_ID]: [msg1] },
      });
    });

    const pendingItemBefore = host.querySelector('li[data-status="pending"]');
    expect(pendingItemBefore?.textContent).toContain('Apply modifications');

    // Update branch with second turn completing all tasks
    const branch2Snapshot = nativeSnapshot(SESSION_ID, []);
    branch2Snapshot.branch = { branchId: 'branch-1', branchVersion: '2', leafMessageId: 'msg-2' };
    const msg2 = assistantTodoMessage('msg-2', updatedPhases);

    await act(async () => {
      directoryStore!.setState({
        snapshot: { [SESSION_ID]: branch2Snapshot },
        message: { [SESSION_ID]: [msg1, msg2] },
      });
    });

    const completedItems = host.querySelectorAll('li[data-status="completed"]');
    expect(completedItems.length).toBe(3); // Search codebase, Inspect findings, Apply modifications
    const pendingItemsAfter = host.querySelectorAll('li[data-status="pending"]');
    expect(pendingItemsAfter.length).toBe(0);
  });

  test('renders null when history has no todo phases or session is null', async () => {
    await renderTray();

    await act(async () => {
      directoryStore!.setState({
        snapshot: { [SESSION_ID]: nativeSnapshot(SESSION_ID, []) },
        message: { [SESSION_ID]: [] },
      });
    });

    await renderTray(null);
    expect(host.querySelector('[data-testid="todo-tray"]')).toBeNull();

    await renderTray(SESSION_ID);
    expect(host.querySelector('[data-testid="todo-tray"]')).toBeNull();
  });
});
