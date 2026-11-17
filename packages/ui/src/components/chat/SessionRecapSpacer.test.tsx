import { afterAll, afterEach, beforeEach, describe, expect, test } from 'bun:test';
import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { Window } from 'happy-dom';
import type { StoreApi } from 'zustand';
import { CompactionDivider, LiveCompactionDivider } from './SessionRecapSpacer';
import { I18nProvider } from '@/lib/i18n';
import { registerWorkspaceDirectory, resetWorkspaceDirectories } from '@/stores/globalSessions';
import { SyncProvider, useDirectoryStore } from '@/sync/sync-context';
import type { DirectoryStore } from '@/sync/child-store';
import { applyDirectoryEvent, installSessionSnapshot } from '@/sync/event-reducer';
import { nativeClient, nativeSnapshot } from '@/sync/session-message-loader-test-fixtures';

const renderDivider = (props: React.ComponentProps<typeof CompactionDivider>) => renderToStaticMarkup(
  <I18nProvider>
    <CompactionDivider {...props} />
  </I18nProvider>
);

describe('CompactionDivider', () => {
  test('renders compaction divider with reduction badge when tokensAfter is present', () => {
    const html = renderDivider({
      method: 'soft',
      tokensBefore: 256000,
      tokensAfter: 20000,
      summary: 'Summary of earlier work',
    });
    expect(html).toContain('data-compaction-divider');
    expect(html).toContain('data-compaction-state="settled"');
    expect(html).toContain('data-compaction-method="soft-compacted"');
    expect(html).toContain('Soft-compacted');
    expect(html).toContain('256K → 20K tokens');
  });

  test('renders compaction divider without reduction badge when tokensAfter is absent', () => {
    const html = renderDivider({
      method: 'shaken',
      tokensBefore: 150000,
    });
    expect(html).toContain('data-compaction-method="shaken"');
    expect(html).toContain('Shaken');
    expect(html).toContain('150K tokens');
    expect(html).not.toContain('→');
  });

  test('normalizes legacy method names', () => {
    const remote = renderDivider({ method: 'remote', tokensBefore: 1000 });
    expect(remote).toContain('data-compaction-method="remote-compacted"');

    const snap = renderDivider({ method: 'snapcompact', tokensBefore: 1000 });
    expect(snap).toContain('data-compaction-method="snap-compacted"');

    const handoff = renderDivider({ method: 'handoff', tokensBefore: 1000 });
    expect(handoff).toContain('data-compaction-method="handed-off"');
  });

  test('renders warning indicator if present', () => {
    const html = renderDivider({
      method: 'soft-compacted',
      tokensBefore: 10000,
      warning: 'Dead-end loop detected',
    });
    expect(html).toContain('text-status-warning');
  });

  test('renders live compacting state with spinner and running copy', () => {
    const html = renderDivider({
      compacting: true,
      method: 'soft-compacted',
    });
    expect(html).toContain('data-compaction-divider');
    expect(html).toContain('data-compaction-state="running"');
    expect(html).toContain('data-compaction-method="soft-compacted"');
    expect(html).toContain('role="status"');
    expect(html).toContain('animate-spin');
    expect(html).toContain('Compacting the conversation');
    expect(html).not.toContain('tokens');
  });
});

describe('LiveCompactionDivider integration', () => {
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

  const DIR = '/workspace/compaction-ui';
  const WORKSPACE_ID = 'workspace-compaction-ui';
  const SESSION_ID = 'session-compaction-ui';

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
    browser.close();
  });

  test('mounts running CompactionDivider on session.updated and clears on null or snapshot recovery', async () => {
    await act(async () => {
      root!.render(
        <I18nProvider>
          <SyncProvider client={nativeClient()} directory={DIR}>
            <StoreProbe />
            <LiveCompactionDivider sessionId={SESSION_ID} directory={DIR} />
          </SyncProvider>
        </I18nProvider>,
      );
    });

    const initial = nativeSnapshot(SESSION_ID, []);
    await act(async () => {
      directoryStore!.setState((prev) => installSessionSnapshot(prev, initial));
    });
    expect(host.querySelector('[data-compaction-divider]')).toBeNull();

    await act(async () => {
      directoryStore!.setState((prev) => {
        const applied = applyDirectoryEvent(prev, {
          sessionId: SESSION_ID,
          epoch: initial.session.epoch,
          sequence: '5',
          timestamp: 100,
          type: 'session.updated',
          compacting: { method: 'soft-compacted', reason: 'threshold', startedAt: 100 },
        });
        return applied.state;
      });
    });
    const divider = host.querySelector('[data-compaction-divider]');
    expect(divider).not.toBeNull();
    expect(divider?.getAttribute('data-compaction-state')).toBe('running');
    expect(divider?.getAttribute('data-compaction-method')).toBe('soft-compacted');
    expect(divider?.textContent).toContain('Compacting the conversation');

    await act(async () => {
      directoryStore!.setState((prev) => {
        const cleared = applyDirectoryEvent(prev, {
          sessionId: SESSION_ID,
          epoch: initial.session.epoch,
          sequence: '6',
          timestamp: 120,
          type: 'session.updated',
          compacting: null,
        });
        return cleared.state;
      });
    });
    expect(host.querySelector('[data-compaction-divider]')).toBeNull();
  });
});
