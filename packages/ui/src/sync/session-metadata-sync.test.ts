import { describe, expect, test, beforeEach, afterEach, mock } from 'bun:test';
import { subscribeSessionMetadataSync } from './session-metadata-sync';
import { applyCanonicalMetadataEvent, setActionRefs } from './session-actions';
import { getRuntimeKey, switchRuntimeEndpoint } from '@/lib/runtime-switch';
import { useGlobalSessionsStore } from '@/stores/useGlobalSessionsStore';
import { ChildStoreManager } from './child-store';
import { setSyncRefs } from './sync-refs';
import { registerWorkspaceDirectory, resetWorkspaceDirectories } from '@/stores/globalSessions';
import type { Session, SessionMetadataState } from '@openchamber/agent-contract';

describe('session-metadata-sync and applyCanonicalMetadataEvent', () => {
  let manager: ChildStoreManager;
  const directory = '/repo/assist-test';
  const sessionId = 'ses_meta_test_1';
  let runtimeKey: string;

  const initialSession: Session = {
    sessionId,
    rootSessionId: sessionId,
    projectId: 'proj_1',
    workspaceId: 'ws_1',
    displayPath: '.',
    createdAt: 1000,
    updatedAt: 2000,
    epoch: 'epoch_1',
    headSequence: '1',
    runtimeStatus: 'idle',
    activeRunId: null,
    mode: { kind: 'main' },
    metadata: null,
    metadataRevision: '0',
    archiveRevision: '0',
  };

  beforeEach(() => {
    switchRuntimeEndpoint({ apiBaseUrl: 'https://metadata-sync.test', runtimeKey: 'metadata-sync' });
    runtimeKey = getRuntimeKey();
    resetWorkspaceDirectories();
    registerWorkspaceDirectory('ws_1', directory);
    manager = new ChildStoreManager();
    setActionRefs(manager, () => directory);
    setSyncRefs(manager, directory);

    const store = manager.ensureChild(directory, { bootstrap: false });
    store.setState({ session: [initialSession] });
    useGlobalSessionsStore.getState().upsertSession(initialSession);
  });

  afterEach(() => {
    manager.disposeAll();
    mock.restore();
  });

  test('applyCanonicalMetadataEvent updates child store and global sessions store reactively', () => {
    const store = manager.getChild(directory);
    expect(store).toBeDefined();

    let observedSession: Session | undefined;
    const unsubscribe = store!.subscribe((state) => {
      observedSession = state.session.find((s) => s.sessionId === sessionId);
    });

    const metadataState: SessionMetadataState = {
      sessionId,
      revision: '1',
      metadata: {
        openchamber: {
          assist: {
            recap: 'Finished implementing auth and session assist.',
            suggestion: 'Would you like to run the integration tests?',
            forMessageID: 'msg_assistant_1',
            generatedAt: 3000,
          },
        },
      },
    };

    applyCanonicalMetadataEvent(metadataState);

    expect(observedSession).toBeDefined();
    expect(observedSession?.metadataRevision).toBe('1');
    expect(observedSession?.metadata?.openchamber?.assist).toEqual({
      recap: 'Finished implementing auth and session assist.',
      suggestion: 'Would you like to run the integration tests?',
      forMessageID: 'msg_assistant_1',
      generatedAt: 3000,
    });

    // Check global store was also updated
    const globalSession = useGlobalSessionsStore.getState().entityById.get(sessionId);
    expect(globalSession?.metadataRevision).toBe('1');
    expect(globalSession?.metadata?.openchamber?.assist?.recap).toBe(
      'Finished implementing auth and session assist.'
    );

    unsubscribe();
  });

  test('enforces monotonic revision progression and rejects older revisions', () => {
    const store = manager.getChild(directory)!;
    store.setState({
      session: [{ ...initialSession, metadataRevision: '5', metadata: { notes: 'newer' } }],
    });

    const olderMetadataState: SessionMetadataState = {
      sessionId,
      revision: '3',
      metadata: {
        notes: 'older',
      },
    };

    applyCanonicalMetadataEvent(olderMetadataState);

    const currentSession = store.getState().session.find((s) => s.sessionId === sessionId);
    expect(currentSession?.metadataRevision).toBe('5');
    expect(currentSession?.metadata?.notes).toBe('newer');
  });

  test('subscribeSessionMetadataSync lifecycle subscribes and unsubscribes cleanly', () => {
    const unsubscribeSync = subscribeSessionMetadataSync(runtimeKey);
    expect(typeof unsubscribeSync).toBe('function');
    unsubscribeSync();
  });
});
