import { afterEach, beforeEach, describe, expect, spyOn, test } from 'bun:test';
import { plugin } from 'bun';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { Window } from 'happy-dom';
import type { Root } from 'react-dom/client';
import type { StoreApi } from 'zustand';
import type { Session, AdvisorYieldedEvent } from '@openchamber/agent-contract';
import type { RuntimeAPIs } from '@/lib/api/types';
import type { DirectoryStore } from '@/sync/child-store';

const browser = new Window({ url: 'http://localhost/' });
Object.assign(globalThis, {
  window: browser,
  document: browser.document,
  navigator: browser.navigator,
  localStorage: browser.localStorage,
  sessionStorage: browser.sessionStorage,
  Node: browser.Node,
  Text: browser.Text,
  Element: browser.Element,
  HTMLElement: browser.HTMLElement,
  HTMLInputElement: browser.HTMLInputElement,
  HTMLTextAreaElement: browser.HTMLTextAreaElement,
  HTMLFormElement: browser.HTMLFormElement,
  Range: browser.Range,
  Selection: browser.Selection,
  DocumentFragment: browser.DocumentFragment,
  Event: browser.Event,
  KeyboardEvent: browser.KeyboardEvent,
  MouseEvent: browser.MouseEvent,
  FocusEvent: browser.FocusEvent,
  InputEvent: browser.InputEvent,
  CustomEvent: browser.CustomEvent,
  MutationObserver: browser.MutationObserver,
  ResizeObserver: browser.ResizeObserver,
  IntersectionObserver: browser.IntersectionObserver,
  matchMedia: browser.matchMedia.bind(browser),
  getComputedStyle: browser.getComputedStyle.bind(browser),
  requestAnimationFrame: browser.requestAnimationFrame.bind(browser),
  cancelAnimationFrame: browser.cancelAnimationFrame.bind(browser),
  customElements: browser.customElements,
  HTMLDivElement: browser.HTMLDivElement,
  HTMLSpanElement: browser.HTMLSpanElement,
  SVGElement: browser.SVGElement,
  ShadowRoot: browser.ShadowRoot,
  CSSStyleSheet: browser.CSSStyleSheet,
  DOMParser: browser.DOMParser,
  IS_REACT_ACT_ENVIRONMENT: true,
});

spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
  const path = new URL(input instanceof Request ? input.url : input.toString(), 'http://localhost/').pathname;
  if (path.endsWith('/location')) return Response.json({ directory: '/workspace', project: { id: 'project', directory: '/workspace', canonical: '/workspace' } });
  if (path.endsWith('/workspaces/resolve')) return Response.json({ workspaceId: 'workspace-a', projectId: 'project-a', name: 'Workspace', displayPath: 'repo' });
  if (path.endsWith('/commands')) return Response.json({ workspaceId: 'workspace-a', revision: '1', commands: [], builtinCommands: [] });
  if (path.endsWith('/session')) return Response.json({ data: [] });
  if (path.endsWith('/config')) return Response.json([]);
  return Response.json({});
});

plugin({
  name: 'chat-container-advisor-vite-modules',
  setup(build) {
    build.onResolve({ filter: /\?worker&url$/ }, ({ path }) => ({ path, namespace: 'worker-url' }));
    build.onLoad({ filter: /.*/, namespace: 'worker-url' }, () => ({ contents: 'export default "";', loader: 'js' }));
    build.onLoad({ filter: /useProviderLogo\.ts$/ }, ({ path }) => {
      const directory = resolve(dirname(path), '../assets/provider-logos');
      const logos = Object.fromEntries(readdirSync(directory).filter((name) => name.endsWith('.svg')).map((name) => [
        `../assets/provider-logos/${name}`, pathToFileURL(resolve(directory, name)).href,
      ]));
      return { contents: readFileSync(path, 'utf8').replace(/import\.meta\.glob<string>\([\s\S]*?\);/, `${JSON.stringify(logos)};`), loader: 'ts' };
    });
  },
});

// Static imports would evaluate React DOM and the chat module graph before the
// happy-dom globals above exist, so this test loads them after browser globals are installed.
const { act } = await import('react');
const { createRoot } = await import('react-dom/client');
const { I18nProvider } = await import('@/lib/i18n');
const { ThemeSystemProvider } = await import('@/contexts/ThemeSystemContext');
const { RuntimeAPIContext } = await import('@/contexts/runtimeAPIContext');
const { ChatContainer } = await import('../ChatContainer');
const { SyncProvider, useDirectoryStore } = await import('@/sync/sync-context');
const { useSessionUIStore } = await import('@/sync/session-ui-store');
const { useAdvisorStore } = await import('@/stores/useAdvisorStore');
const { useCleanseStore } = await import('@/stores/useCleanseStore');
const { nativeClient, nativeHistory, nativeMessage, nativeSnapshot } = await import('@/sync/session-message-loader-test-fixtures');

const runtimeAPIs = { runtime: { platform: 'web', isDesktop: false }, sourceControl: {} } as RuntimeAPIs;
const DIRECTORY = '/workspace';
const SESSION_ID = 'session-advisor-smoke';

const acceptedSnapshot = (sessionId: string) => {
  const msg = nativeMessage(sessionId);
  const snapshot = nativeSnapshot(sessionId, [msg]);
  snapshot.session = {
    ...snapshot.session,
    workspaceId: 'workspace-a',
    projectId: 'project-a',
    runtimeStatus: 'idle',
    activeRunId: null,
  };
  return snapshot;
};

const hostSession = (): Session => ({
  ...acceptedSnapshot(SESSION_ID).session,
  title: 'Advisor Smoke Session',
  metadata: {},
  metadataRevision: '1',
  archiveRevision: '0',
  runtimeStatus: 'idle',
  activeRunId: null,
});

const client = nativeClient({
  resolveWorkspace: async () => ({ workspaceId: 'workspace-a', projectId: 'project-a', name: 'Workspace', displayPath: 'repo' }),
  getSnapshot: async (sessionId: string) => acceptedSnapshot(sessionId),
  getHistory: async (sessionId: string) => nativeHistory([], null, acceptedSnapshot(sessionId)),
  listSessions: async () => ({ items: [hostSession()], errors: {} }),
});
client.listProjects = async () => ({ items: [], errors: {} });
client.listWorkspaces = async () => ({ items: [], errors: {} });
client.subscribeSessionEvents = () => () => { };

let container: HTMLDivElement;
let root: Root;
let seedStore: StoreApi<DirectoryStore> | null = null;

const Seed = () => {
  seedStore = useDirectoryStore(DIRECTORY, { bootstrap: false });
  return null;
};

describe('ChatContainer Advisor and Cleanse live projection smoke', () => {
  beforeEach(() => {
    useAdvisorStore.getState().reset();
    useCleanseStore.getState().reset();
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
    useSessionUIStore.setState({
      currentSessionId: SESSION_ID,
      currentSessionDirectory: DIRECTORY,
      newSessionDraft: { ...useSessionUIStore.getState().newSessionDraft, open: false, target: 'chat', directoryOverride: null },
    });
  });

  afterEach(async () => {
    await act(async () => { root.unmount(); });
    useAdvisorStore.getState().reset();
    useCleanseStore.getState().reset();
    await browser.happyDOM.close();
  });

  test('advisor_yielded event reaches mounted live timeline in ChatContainer and disappears on dismiss', async () => {
    await act(async () => {
      root.render(
        <RuntimeAPIContext.Provider value={runtimeAPIs}>
          <ThemeSystemProvider>
            <I18nProvider>
              <SyncProvider directory={DIRECTORY} client={client}>
                <Seed />
                <ChatContainer autoOpenDraft={false} />
              </SyncProvider>
            </I18nProvider>
          </ThemeSystemProvider>
        </RuntimeAPIContext.Provider>,
      );
    });

    // Wait for session bootstrap in directory store
    const snapshotApplied = Promise.withResolvers<void>();
    const unsubscribe = seedStore!.subscribe((state) => {
      if (state.session_status[SESSION_ID]) snapshotApplied.resolve();
    });
    if (seedStore!.getState().session_status[SESSION_ID]) snapshotApplied.resolve();
    await act(async () => { await snapshotApplied.promise; });
    unsubscribe();

    // Before event: no advisor card is rendered
    expect(container.querySelector('[data-testid="advisor-message-card"]')).toBeNull();

    // advisor_yielded event arrives for the active session
    const advisorEvent: AdvisorYieldedEvent = {
      type: 'advisor_yielded',
      sessionId: SESSION_ID,
      epoch: 'epoch-smoke-1',
      sequence: '1',
      timestamp: 1000,
      notes: [
        {
          noteId: 'smoke-note-1',
          severity: 'blocker',
          text: 'Potential memory leak in connection pool',
          advisorName: 'watchdog',
          timestamp: 1000,
        },
        {
          noteId: 'smoke-note-2',
          severity: 'concern',
          text: 'Consider bounding connection retry backoff',
          advisorName: 'watchdog',
          timestamp: 1001,
        },
      ],
    };

    await act(async () => {
      useAdvisorStore.getState().applyAdvisorYielded(SESSION_ID, advisorEvent);
    });

    // Advisor card must be mounted on the live timeline
    const card = container.querySelector('[data-testid="advisor-message-card"]');
    expect(card).not.toBeNull();
    expect(card?.textContent).toContain('Advisor Watchdog');
    expect(card?.textContent).toContain('Blocker');
    expect(card?.textContent).toContain('Potential memory leak in connection pool');
    expect(card?.textContent).toContain('Concern');
    expect(card?.textContent).toContain('Consider bounding connection retry backoff');

    // Dismiss the card via UI dismiss button
    const dismissButton = container.querySelector('[data-testid="advisor-message-dismiss"]') as HTMLButtonElement;
    expect(dismissButton).not.toBeNull();

    await act(async () => {
      dismissButton.click();
    });

    // Card has disappeared / been removed from the visible timeline
    expect(container.querySelector('[data-testid="advisor-message-card"]')).toBeNull();
  });

  test('CleanseStatusBoard and AdvisorTimelineCard respect independent lifecycle in ChatContainer', async () => {
    await act(async () => {
      root.render(
        <RuntimeAPIContext.Provider value={runtimeAPIs}>
          <ThemeSystemProvider>
            <I18nProvider>
              <SyncProvider directory={DIRECTORY} client={client}>
                <Seed />
                <ChatContainer autoOpenDraft={false} />
              </SyncProvider>
            </I18nProvider>
          </ThemeSystemProvider>
        </RuntimeAPIContext.Provider>,
      );
    });

    // Wait for session bootstrap in directory store
    const snapshotApplied = Promise.withResolvers<void>();
    const unsubscribe = seedStore!.subscribe((state) => {
      if (state.session_status[SESSION_ID]) snapshotApplied.resolve();
    });
    if (seedStore!.getState().session_status[SESSION_ID]) snapshotApplied.resolve();
    await act(async () => { await snapshotApplied.promise; });
    unsubscribe();

    // Trigger Cleanse progress with opaque UUID epoch
    const epochA = 'ffffffff-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
    await act(async () => {
      useCleanseStore.getState().applyCleanseProgress(SESSION_ID, {
        type: 'cleanse.progress',
        sessionId: SESSION_ID,
        epoch: epochA,
        sequence: '5',
        timestamp: 1000,
        status: 'repairing',
        activeCheckers: ['typescript'],
        completedCheckers: ['oxlint'],
        repairedFiles: ['src/main.ts'],
      });
    });

    // Cleanse board is rendered
    const cleanseBoard = container.querySelector('[data-testid="cleanse-status-board"]');
    expect(cleanseBoard).not.toBeNull();
    expect(cleanseBoard?.textContent).toContain('Cleanse Status Board');
    expect(cleanseBoard?.textContent).toContain('repairing');

    // Trigger restart with new opaque epoch B that sorts lexicographically earlier: low seq 1 accepted
    const epochB = '00000000-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
    await act(async () => {
      useCleanseStore.getState().applyCleanseProgress(SESSION_ID, {
        type: 'cleanse.progress',
        sessionId: SESSION_ID,
        epoch: epochB,
        sequence: '1',
        timestamp: 2000,
        status: 'completed',
        activeCheckers: [],
        completedCheckers: ['typescript', 'oxlint'],
        repairedFiles: ['src/main.ts'],
        summary: 'All repaired',
      });
    });

    // Status transition in new epoch reflects 'completed'
    expect(container.querySelector('[data-testid="cleanse-status-board"]')?.textContent).toContain('completed');

    // Cleanse board can be dismissed
    const cleanseDismiss = container.querySelector('[data-testid="cleanse-status-board-dismiss"]') as HTMLButtonElement;
    expect(cleanseDismiss).not.toBeNull();
    await act(async () => {
      cleanseDismiss.click();
    });

    expect(container.querySelector('[data-testid="cleanse-status-board"]')).toBeNull();
  });
});
