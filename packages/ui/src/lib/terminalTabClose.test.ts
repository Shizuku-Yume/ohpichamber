import { beforeEach, describe, expect, test } from 'bun:test';

import { useTerminalStore } from '@/stores/useTerminalStore';
import { closeTerminalTab } from './terminalTabClose';

const DIRECTORY = '/repo/terminal-close';

/** Seeds a directory with tabs and answers the ids; shared by every case below. */
const seedTabs = (tabs: Array<{ label: string; sessionId: string | null }>): string[] => {
  useTerminalStore.setState({ sessions: new Map() });
  useTerminalStore.getState().ensureDirectory(DIRECTORY);
  // A directory always keeps one tab; seed exactly the tabs each case names on top of it.
  const seeded = useTerminalStore.getState().getDirectoryState(DIRECTORY)?.tabs ?? [];
  for (const existing of seeded) useTerminalStore.getState().closeTab(DIRECTORY, existing.id);
  useTerminalStore.getState().ensureDirectory(DIRECTORY);
  const ids: string[] = [];
  for (const tab of tabs) {
    const id = useTerminalStore.getState().createTab(DIRECTORY);
    useTerminalStore.getState().setTabLabel(DIRECTORY, id, tab.label);
    useTerminalStore.getState().setTabSessionId(DIRECTORY, id, tab.sessionId);
    ids.push(id);
  }
  useTerminalStore.getState().setActiveTab(DIRECTORY, ids[0]!);
  return ids;
};

describe('closeTerminalTab', () => {
  beforeEach(() => {
    useTerminalStore.setState({ sessions: new Map() });
  });

  test('ends the backend shell before dropping the tab', async () => {
    const calls: Array<{ sessionId: string; directory: string | null }> = [];
    const [first] = seedTabs([{ label: 'one', sessionId: 'pty-one' }, { label: 'two', sessionId: 'pty-two' }]);

    await closeTerminalTab({
      terminal: { close: async (sessionId, directory) => { calls.push({ sessionId, directory: directory ?? null }); } },
      directory: DIRECTORY,
      tabId: first!,
    });

    expect(calls).toEqual([{ sessionId: 'pty-one', directory: DIRECTORY }]);
    const remaining = useTerminalStore.getState().getDirectoryState(DIRECTORY)?.tabs ?? [];
    expect(remaining.map((tab) => tab.id)).not.toContain(first);
  });

  test('a tab with no shell yet is dropped without a backend call', async () => {
    const [pending] = seedTabs([{ label: 'starting', sessionId: null }, { label: 'other', sessionId: 'pty-other' }]);
    const calls: string[] = [];

    await closeTerminalTab({
      terminal: { close: async (sessionId) => { calls.push(sessionId); } },
      directory: DIRECTORY,
      tabId: pending!,
    });

    expect(calls).toEqual([]);
    expect((useTerminalStore.getState().getDirectoryState(DIRECTORY)?.tabs ?? []).map((tab) => tab.id)).not.toContain(pending);
  });

  test('closing the last tab takes the surface down before the store writes a replacement', async () => {
    const [only] = seedTabs([{ label: 'only', sessionId: 'pty-only' }]);
    // The seeded directory keeps its own default tab, so this last-tab case
    // starts from that tab alone.
    for (const tab of useTerminalStore.getState().getDirectoryState(DIRECTORY)?.tabs ?? []) {
      if (tab.id !== only) useTerminalStore.getState().closeTab(DIRECTORY, tab.id);
    }
    const order: string[] = [];

    await closeTerminalTab({
      terminal: { close: async () => { order.push('backend'); } },
      directory: DIRECTORY,
      tabId: only!,
      beforeClose: () => order.push('stream'),
      onLastTab: () => order.push('surface'),
    });

    // The surface unmounts before the store's replacement tab could start a shell.
    expect(order).toEqual(['stream', 'backend', 'surface']);
  });

  test('a tab that is not the last one leaves the surface alone', async () => {
    const [first] = seedTabs([{ label: 'one', sessionId: 'pty-one' }, { label: 'two', sessionId: 'pty-two' }]);
    let surfaceClosed = false;

    await closeTerminalTab({
      terminal: { close: async () => undefined },
      directory: DIRECTORY,
      tabId: first!,
      onLastTab: () => { surfaceClosed = true; },
    });

    expect(surfaceClosed).toBe(false);
  });

  test('a backend close failure keeps the tab, so the shell that would not end stays visible', async () => {
    const [only] = seedTabs([{ label: 'only', sessionId: 'pty-live' }]);

    const failure = closeTerminalTab({
      terminal: { close: async () => { throw new Error('the shell is still running'); } },
      directory: DIRECTORY,
      tabId: only!,
      onLastTab: () => { throw new Error('surface must not close on failure'); },
    });

    await expect(failure).rejects.toThrow('the shell is still running');
    expect((useTerminalStore.getState().getDirectoryState(DIRECTORY)?.tabs ?? []).map((tab) => tab.id)).toContain(only);
  });

  test('a tab the directory no longer holds is a no-op', async () => {
    seedTabs([{ label: 'one', sessionId: 'pty-one' }]);
    let backendClosed = false;

    await closeTerminalTab({
      terminal: { close: async () => { backendClosed = true; } },
      directory: '/repo/other-directory',
      tabId: 'missing-tab',
    });

    expect(backendClosed).toBe(false);
  });
});
