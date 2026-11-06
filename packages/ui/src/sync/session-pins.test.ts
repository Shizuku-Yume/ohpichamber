import { afterEach, beforeEach, describe, expect, mock, spyOn, test } from 'bun:test';
import type { Session, SessionMetadata } from '@openchamber/agent-contract';
import { canonicalClient } from '@/api/canonicalClient';
import { getRuntimeKey, switchRuntimeEndpoint } from '@/lib/runtime-switch';
import { getPinnedSessionKey, isSessionPinned, isSessionPinnedInMetadata } from '@/lib/sessionPins';
import { registerWorkspaceDirectory } from '@/stores/globalSessions';
import { useGlobalSessionsStore } from '@/stores/useGlobalSessionsStore';
import { getLegacyPins, useSessionPinnedStore } from '@/stores/useSessionPinnedStore';
import { getDeferredSafeStorage } from '@/stores/utils/safeStorage';
import { migrateLegacyPins, toggleSessionPin } from './session-pins';

const session = (id: string, metadata: SessionMetadata | null = null): Session => ({
  sessionId: id,
  projectId: 'project',
  workspaceId: 'workspace',
  displayPath: id,
  rootSessionId: id,
  createdAt: 1,
  updatedAt: 1,
  epoch: '1',
  headSequence: '1',
  runtimeStatus: 'idle',
  activeRunId: null,
  mode: { kind: 'main' as const },
  metadataRevision: metadata ? '1' : '0',
  archiveRevision: '0',
  metadata,
});

const pinned = (sessionId: string) => isSessionPinned(useSessionPinnedStore.getState().ids, '/repo', sessionId);

describe('toggleSessionPin', () => {
  beforeEach(() => {
    switchRuntimeEndpoint({ apiBaseUrl: 'https://session-pins.test', runtimeKey: 'session-pins-test' });
    useGlobalSessionsStore.getState().resetForRuntimeSwitch();
    registerWorkspaceDirectory('workspace', '/repo');
    useGlobalSessionsStore.getState().applySnapshot([session('a')], [], 'ready');
    spyOn(canonicalClient, 'getSessionMetadata').mockResolvedValue({
      sessionId: 'a',
      revision: '1',
      metadata: null,
    });
  });

  afterEach(() => {
    mock.restore();
    useGlobalSessionsStore.getState().resetForRuntimeSwitch();
  });

  test('stores the pin in the session metadata, and unpins the same way', async () => {
    let currentMetadata: SessionMetadata | null = null;
    spyOn(canonicalClient, 'patchSessionMetadata').mockImplementation(async (id, patch) => {
      if (patch.changes.isPinned) {
        currentMetadata = {
          isPinned: true,
          openchamber: { pinned: { at: Date.now() } },
        } as unknown as SessionMetadata;
      } else {
        currentMetadata = null;
      }
      return {
        sessionId: id,
        revision: '2',
        metadata: currentMetadata,
      };
    });

    const pinning = toggleSessionPin({ directory: '/repo', sessionId: 'a' });
    expect(pinned('a')).toBe(true);
    await pinning;
    expect(isSessionPinnedInMetadata(useGlobalSessionsStore.getState().entityById.get('a'))).toBe(true);
    expect(pinned('a')).toBe(true);

    await toggleSessionPin({ directory: '/repo', sessionId: 'a' });
    expect(isSessionPinnedInMetadata(useGlobalSessionsStore.getState().entityById.get('a'))).toBe(false);
    expect(pinned('a')).toBe(false);
  });

  test('flips the row back when the server cannot store the pin', async () => {
    spyOn(canonicalClient, 'patchSessionMetadata').mockRejectedValue(new Error('offline'));

    const pinning = toggleSessionPin({ directory: '/repo', sessionId: 'a' });
    expect(pinned('a')).toBe(true);
    await expect(pinning).rejects.toThrow();
    expect(pinned('a')).toBe(false);
  });

  test('migrates legacy device pins into session metadata on ready load', async () => {
    const storage = getDeferredSafeStorage();
    const runtimeKey = getRuntimeKey();
    const legacyKey = getPinnedSessionKey(runtimeKey, '/repo', 'a');
    if (!legacyKey) throw new Error('Missing legacy key');

    storage.setItem('oc.sessions.pinned.v2', JSON.stringify({
      version: 2,
      sessions: { [legacyKey]: 12345 },
    }));

    spyOn(canonicalClient, 'patchSessionMetadata').mockResolvedValue({
      sessionId: 'a',
      revision: '2',
      metadata: { isPinned: true, openchamber: { pinned: { at: Date.now() } } } as unknown as SessionMetadata,
    });

    await migrateLegacyPins();

    expect(getLegacyPins(runtimeKey)).toHaveLength(0);
    expect(isSessionPinnedInMetadata(useGlobalSessionsStore.getState().entityById.get('a'))).toBe(true);
  });
});
