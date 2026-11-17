import { describe, expect, test } from 'bun:test';
import type {
  CacheWarmingMode,
  ProblemDetails,
  SessionCacheWarmingApplyResult,
  SessionCacheWarmingState,
  SessionCacheWarmingUpdateRequest,
} from '@openchamber/agent-contract';
import { CanonicalApiError } from '@/api/canonicalClient';
import { createSessionWarmingStore, isSessionKeptWarm } from './useSessionWarmingStore';


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
  status: SessionCacheWarmingApplyResult['status'] = 'no-active-worker',
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
      worker: { rootSessionId: persisted.sessionId, workspaceId: persisted.workspaceId, workerGeneration: 'gen-1' },
      mode: persisted.effectiveMode,
      outcome: 'failed',
      error: { code: 'WORKER_UNAVAILABLE', detail: 'Worker failed', retryable: true },
    },
  };
}

function makeConflictError(): CanonicalApiError {
  const problem: ProblemDetails = {
    type: 'urn:ohpichamber:problem:CATALOG_CONFLICT',
    title: 'Revision conflict',
    status: 409,
    detail: 'Session warming revision changed',
    code: 'CATALOG_CONFLICT',
    retryable: false,
  };
  return new CanonicalApiError(problem);
}

describe('useSessionWarmingStore', () => {
  test('hydrates default state, deduplicates concurrent reads, and reuses cached entries', async () => {
    let readCount = 0;
    const deferred = Promise.withResolvers<SessionCacheWarmingState>();
    const store = createSessionWarmingStore({
      getRuntimeKey: () => 'runtime-a',
      client: {
        readSessionCacheWarming: async () => {
          readCount += 1;
          return deferred.promise;
        },
        updateSessionCacheWarming: async () => {
          throw new Error('Unexpected write');
        },
      },
    });

    const p1 = store.getState().loadSessionWarming('s1');
    const p2 = store.getState().loadSessionWarming('s1');
    expect(readCount).toBe(1);
    expect(store.getState().loadingBySession.s1).toBe(true);

    const expected = makeState('s1', { revision: '0', mode: null, workspaceMode: 'off', effectiveMode: 'off' });
    deferred.resolve(expected);
    const [r1, r2] = await Promise.all([p1, p2]);

    expect(r1).toEqual(expected);
    expect(r2).toEqual(expected);
    expect(store.getState().entries.s1?.state).toEqual(expected);
    expect(store.getState().loadingBySession.s1).toBeUndefined();
    expect(isSessionKeptWarm(store.getState().entries.s1?.state)).toBe(false);

    // Subsequent non-forced load returns cached state without another read.
    const cached = await store.getState().loadSessionWarming('s1');
    expect(cached).toEqual(expected);
    expect(readCount).toBe(1);
  });

  test('read failure preserves prior authoritative entry and records read error', async () => {
    let shouldFail = false;
    const initial = makeState('s1', { revision: '2', mode: 'idle', workspaceMode: 'off', effectiveMode: 'idle' });
    const store = createSessionWarmingStore({
      getRuntimeKey: () => 'runtime-a',
      client: {
        readSessionCacheWarming: async () => {
          if (shouldFail) throw new Error('Network down');
          return initial;
        },
        updateSessionCacheWarming: async () => {
          throw new Error('Unexpected write');
        },
      },
    });

    await store.getState().loadSessionWarming('s1');
    expect(store.getState().entries.s1?.state).toEqual(initial);

    shouldFail = true;
    const failed = await store.getState().loadSessionWarming('s1', { force: true });
    expect(failed).toBeNull();
    expect(store.getState().entries.s1?.state).toEqual(initial);
    expect(store.getState().errorBySession.s1).toBe('read');

    shouldFail = false;
    const recovered = await store.getState().loadSessionWarming('s1');
    expect(recovered).toEqual(initial);
    expect(store.getState().errorBySession.s1).toBeUndefined();
  });

  test('stale read started before a mutation cannot overwrite the committed mutation', async () => {
    const staleRead = Promise.withResolvers<SessionCacheWarmingState>();
    let readCount = 0;
    const store = createSessionWarmingStore({
      getRuntimeKey: () => 'runtime-a',
      client: {
        readSessionCacheWarming: async (sessionId) => {
          readCount += 1;
          if (readCount === 1) return staleRead.promise;
          return makeState(sessionId, { revision: '0', mode: null, workspaceMode: 'off' });
        },
        updateSessionCacheWarming: async (sessionId, input) => {
          const persisted = makeState(sessionId, {
            revision: String(BigInt(input.expectedRevision) + 1n),
            mode: input.mode,
            workspaceMode: 'off',
          });
          return makeApplyResult(persisted, 'applied');
        },
      },
    });

    const slowReadPromise = store.getState().loadSessionWarming('s1');
    const writeResult = await store.getState().setSessionWarmingMode('s1', 'idle');
    expect(writeResult.persisted.mode).toBe('idle');
    expect(writeResult.persisted.revision).toBe('1');

    staleRead.resolve(makeState('s1', { revision: '0', mode: null, workspaceMode: 'off' }));
    const slowReadResult = await slowReadPromise;

    expect(slowReadResult?.mode).toBe('idle');
    expect(store.getState().entries.s1?.state.mode).toBe('idle');
    expect(store.getState().entries.s1?.state.revision).toBe('1');
  });

  test('runtime switch aborts and discards in-flight reads and writes', async () => {
    let currentRuntime = 'runtime-a';
    const readDeferred = Promise.withResolvers<SessionCacheWarmingState>();
    const writeDeferred = Promise.withResolvers<SessionCacheWarmingApplyResult>();
    const readAborts: boolean[] = [];
    const writeAborts: boolean[] = [];

    const store = createSessionWarmingStore({
      getRuntimeKey: () => currentRuntime,
      client: {
        readSessionCacheWarming: async (sessionId, signal) => {
          signal?.addEventListener('abort', () => readAborts.push(true), { once: true });
          if (sessionId === 's-read') return readDeferred.promise;
          return makeState(sessionId, { revision: '0', mode: null, workspaceMode: 'off' });
        },
        updateSessionCacheWarming: async (_sessionId, _input, signal) => {
          signal?.addEventListener('abort', () => writeAborts.push(true), { once: true });
          return writeDeferred.promise;
        },
      },
    });

    await store.getState().loadSessionWarming('s-write');
    const inflightRead = store.getState().loadSessionWarming('s-read');
    const inflightWrite = store.getState().setSessionWarmingMode('s-write', 'idle');
    await Promise.resolve();

    currentRuntime = 'runtime-b';
    store.getState().reset();

    expect(store.getState().runtimeKey).toBe('runtime-b');
    expect(store.getState().entries).toEqual({});
    expect(readAborts).toEqual([true]);
    expect(writeAborts).toEqual([true]);

    readDeferred.resolve(makeState('s-read', { revision: '5', mode: 'streaming' }));
    writeDeferred.resolve(makeApplyResult(makeState('s-write', { revision: '1', mode: 'idle' })));

    expect(await inflightRead).toBeNull();
    await expect(inflightWrite).rejects.toThrow('Runtime endpoint changed');
    expect(store.getState().entries).toEqual({});
    expect(store.getState().errorBySession).toEqual({});
    expect(store.getState().savingBySession).toEqual({});
  });

  test('toggleSessionKeepWarm handles all 4 (workspaceMode, mode) transitions and serializes rapid clicks', async () => {
    let serverState = makeState('s1', { revision: '0', mode: null, workspaceMode: 'off' });
    const sentModes: Array<CacheWarmingMode | null> = [];
    const store = createSessionWarmingStore({
      getRuntimeKey: () => 'runtime-a',
      client: {
        readSessionCacheWarming: async () => serverState,
        updateSessionCacheWarming: async (_sessionId, input: SessionCacheWarmingUpdateRequest) => {
          sentModes.push(input.mode);
          serverState = makeState('s1', {
            revision: String(BigInt(input.expectedRevision) + 1n),
            mode: input.mode,
            workspaceMode: serverState.workspaceMode,
          });
          return makeApplyResult(serverState, 'applied');
        },
      },
    });

    // 1. workspace=off, mode=null -> toggle ON sets mode='idle'
    const r1 = await store.getState().toggleSessionKeepWarm('s1');
    expect(r1.persisted).toMatchObject({ mode: 'idle', workspaceMode: 'off', effectiveMode: 'idle', revision: '1' });
    expect(isSessionKeptWarm(r1.persisted)).toBe(true);

    // 2. workspace=off, mode='idle' -> toggle OFF clears override to null
    const r2 = await store.getState().toggleSessionKeepWarm('s1');
    expect(r2.persisted).toMatchObject({ mode: null, workspaceMode: 'off', effectiveMode: 'off', revision: '2' });
    expect(isSessionKeptWarm(r2.persisted)).toBe(false);

    // 3. workspace='idle', mode=null -> toggle OFF suppresses with mode='off'
    serverState = makeState('s1', { revision: '2', mode: null, workspaceMode: 'idle' });
    await store.getState().loadSessionWarming('s1', { force: true });
    const r3 = await store.getState().toggleSessionKeepWarm('s1');
    expect(r3.persisted).toMatchObject({ mode: 'off', workspaceMode: 'idle', effectiveMode: 'off', revision: '3' });

    // 4. workspace='idle', mode='off' -> toggle ON clears suppression to null
    const r4 = await store.getState().toggleSessionKeepWarm('s1');
    expect(r4.persisted).toMatchObject({ mode: null, workspaceMode: 'idle', effectiveMode: 'idle', revision: '4' });

    // Rapid double toggle executes sequentially in queue order
    const [q1, q2] = await Promise.all([
      store.getState().toggleSessionKeepWarm('s1'),
      store.getState().toggleSessionKeepWarm('s1'),
    ]);
    expect(q1.persisted).toMatchObject({ mode: 'off', revision: '5' });
    expect(q2.persisted).toMatchObject({ mode: null, revision: '6' });
    expect(sentModes).toEqual(['idle', null, 'off', null, 'off', null]);
  });

  test('retries once on 409 CATALOG_CONFLICT and surfaces write error on second conflict', async () => {
    let serverRevision = '1';
    let serverMode: CacheWarmingMode | null = null;
    let conflictOnEveryWrite = false;
    let writeAttempts = 0;

    const store = createSessionWarmingStore({
      getRuntimeKey: () => 'runtime-a',
      client: {
        readSessionCacheWarming: async (sessionId) => (
          makeState(sessionId, { revision: serverRevision, mode: serverMode, workspaceMode: 'off' })
        ),
        updateSessionCacheWarming: async (sessionId, input) => {
          writeAttempts += 1;
          if (conflictOnEveryWrite || input.expectedRevision !== serverRevision) {
            throw makeConflictError();
          }
          serverRevision = String(BigInt(serverRevision) + 1n);
          serverMode = input.mode;
          return makeApplyResult(
            makeState(sessionId, { revision: serverRevision, mode: input.mode, workspaceMode: 'off' }),
            'applied',
          );
        },
      },
    });

    // Hydrate at revision '0', while server has already moved to '1'.
    serverRevision = '0';
    await store.getState().loadSessionWarming('s1');
    serverRevision = '1';

    const recovered = await store.getState().setSessionWarmingMode('s1', 'streaming');
    expect(writeAttempts).toBe(2);
    expect(recovered.persisted).toMatchObject({ revision: '2', mode: 'streaming', effectiveMode: 'streaming' });
    expect(store.getState().errorBySession.s1).toBeUndefined();

    // Second conflict after retry surfaces error without erasing prior persisted state.
    conflictOnEveryWrite = true;
    await expect(store.getState().setSessionWarmingMode('s1', 'off')).rejects.toBeInstanceOf(CanonicalApiError);
    expect(writeAttempts).toBe(4);
    expect(store.getState().errorBySession.s1).toBe('write');
    expect(store.getState().entries.s1?.state.mode).toBe('streaming');
  });

  test('invalidateWorkspaceSessions updates workspaceMode while preserving explicit overrides', async () => {
    const states = new Map<string, SessionCacheWarmingState>([
      ['s-inherit', makeState('s-inherit', { workspaceId: 'ws-1', revision: '1', mode: null, workspaceMode: 'off' })],
      ['s-override', makeState('s-override', { workspaceId: 'ws-1', revision: '2', mode: 'off', workspaceMode: 'off' })],
      ['s-other', makeState('s-other', { workspaceId: 'ws-2', revision: '1', mode: null, workspaceMode: 'off' })],
    ]);
    const readCalls: string[] = [];

    const store = createSessionWarmingStore({
      getRuntimeKey: () => 'runtime-a',
      client: {
        readSessionCacheWarming: async (sessionId) => {
          readCalls.push(sessionId);
          const state = states.get(sessionId);
          if (!state) throw new Error(`Missing state for ${sessionId}`);
          return state;
        },
        updateSessionCacheWarming: async () => {
          throw new Error('Unexpected write');
        },
      },
    });

    await Promise.all([
      store.getState().loadSessionWarming('s-inherit'),
      store.getState().loadSessionWarming('s-override'),
      store.getState().loadSessionWarming('s-other'),
    ]);

    store.getState().invalidateWorkspaceSessions('ws-1', 'idle');

    expect(store.getState().entries['s-inherit']?.state).toMatchObject({
      mode: null,
      workspaceMode: 'idle',
      effectiveMode: 'idle',
    });
    expect(store.getState().entries['s-override']?.state).toMatchObject({
      mode: 'off',
      workspaceMode: 'idle',
      effectiveMode: 'off',
    });
    expect(store.getState().entries['s-other']?.state).toMatchObject({
      mode: null,
      workspaceMode: 'off',
      effectiveMode: 'off',
    });

    // Without workspaceMode argument, triggers force refresh for that workspace only.
    readCalls.length = 0;
    states.set('s-inherit', makeState('s-inherit', { workspaceId: 'ws-1', revision: '3', mode: null, workspaceMode: 'streaming' }));
    store.getState().invalidateWorkspaceSessions('ws-1');
    await Promise.resolve();
    await Promise.resolve();
    expect(readCalls.sort()).toEqual(['s-inherit', 's-override']);
    expect(store.getState().entries['s-inherit']?.state.effectiveMode).toBe('streaming');
  });

  test('removeSessions evicts entries and prevents in-flight reads from resurrecting them', async () => {
    const inflight = Promise.withResolvers<SessionCacheWarmingState>();
    let firstRead = true;
    const store = createSessionWarmingStore({
      getRuntimeKey: () => 'runtime-a',
      client: {
        readSessionCacheWarming: async (sessionId) => {
          if (firstRead) {
            firstRead = false;
            return makeState(sessionId, { revision: '1', mode: 'idle', workspaceMode: 'off' });
          }
          return inflight.promise;
        },
        updateSessionCacheWarming: async () => {
          throw new Error('Unexpected write');
        },
      },
    });

    await store.getState().loadSessionWarming('s1');
    expect(store.getState().entries.s1).toBeDefined();

    const refreshPromise = store.getState().loadSessionWarming('s1', { force: true });
    store.getState().removeSessions(['s1']);
    expect(store.getState().entries.s1).toBeUndefined();

    inflight.resolve(makeState('s1', { revision: '1', mode: 'idle', workspaceMode: 'off' }));
    expect(await refreshPromise).toBeNull();
    expect(store.getState().entries.s1).toBeUndefined();
  });
});
