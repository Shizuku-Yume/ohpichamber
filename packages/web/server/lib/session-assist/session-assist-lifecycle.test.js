import { describe, expect, it } from 'vitest';
import { createSessionAssistRuntime } from './runtime.js';
import { createGlobalMessageStreamHub } from '../event-stream/global-hub.js';
import { deferred, encodeEvent, event, scope, streamBoundary } from '../event-stream/canonical-test-fixtures.js';

describe('session-assist production lifecycle integration', () => {
  const rootSession = {
    sessionId: 'session',
    projectId: 'project',
    workspaceId: 'workspace',
    displayPath: '.',
    rootSessionId: 'session',
    createdAt: 1,
    updatedAt: 2,
    epoch: 'epoch',
    headSequence: '0',
    runtimeStatus: 'idle',
    activeRunId: null,
    mode: { kind: 'main' },
  };

  const turn = {
    turnId: 'turn_1',
    sessionId: 'session',
    runId: 'run_1',
    status: 'completed',
    userMessageId: 'user-1',
    assistantMessageIds: ['assistant-1'],
    startedAt: 1,
    finishedAt: 3,
  };

  const messages = [
    {
      messageId: 'user-1',
      sessionId: 'session',
      turnId: 'turn_1',
      role: 'user',
      createdAt: 1,
      parts: [{ type: 'text', partId: 'p-1', content: 'Deploy feature' }],
    },
    {
      messageId: 'assistant-1',
      sessionId: 'session',
      turnId: 'turn_1',
      role: 'assistant',
      createdAt: 2,
      providerId: 'provider-1',
      modelId: 'model-1',
      parts: [{ type: 'text', partId: 'p-2', content: 'Deployed successfully' }],
    },
  ];

  it('runs prompt acceptance -> idle event -> assist generation -> metadata broadcast -> lifecycle teardown', async () => {
    const boundary = streamBoundary();
    const hub = createGlobalMessageStreamHub({
      service: boundary.service,
      resolveSessionScope: async () => scope,
    });

    const persisted = [];
    const broadcastEvents = [];
    const settled = deferred();

    const sessionService = {
      open: async () => ({ session: rootSession }),
      history: async () => ({
        sessionId: 'session',
        branch: { branchId: 'b-1', branchVersion: '1', leafMessageId: 'assistant-1' },
        turns: [turn],
        messages,
        nextCursor: null,
      }),
    };

    const assistRuntime = createSessionAssistRuntime({
      sessionService,
      resolveSessionScope: async () => scope,
      getSmallModelService: async () => ({
        describeSmallModel: async () => ({ inputCharBudget: 20_000, providerID: 'provider-1', modelID: 'model-1' }),
        generateSmallModelText: async () => ({
          text: JSON.stringify({
            recap: 'Deployed feature to production.',
            suggestion: 'Check the error logs next?',
          }),
        }),
      }),
      getTargets: () => ({ recap: true, suggestion: true }),
      persistSessionAssist: async (sessionId, directory, assist) => {
        persisted.push({ sessionId, directory, assist });
        broadcastEvents.push({
          type: 'openchamber:session-metadata',
          properties: {
            sessionId,
            sessionID: sessionId,
            metadata: { openchamber: { assist } },
            revision: '1',
          },
        });
      },
      quietMs: 10, // Fast quiet window for test
      onTurnSettled: async (sessionId) => {
        await hub.releaseSession(sessionId, 'run');
        settled.resolve();
      },
    });

    // Wire hub to sessionAssistRuntime
    hub.subscribeEvent((evt, scp) => {
      assistRuntime.processCanonicalEvent(evt, scp);
    });

    // 1. Prompt acceptance retains session on global hub
    await hub.retainSession('session', 'run');
    expect(hub.isSessionConnected('session')).toBe(true);
    expect(hub.hasLeases('session')).toBe(true);

    // 2. Agent service emits idle event
    const idleEvent = event(1, { type: 'session.status', runtimeStatus: 'idle', activeRunId: null });
    boundary.push(encodeEvent(idleEvent));
    // 3. Wait for assist generation, metadata persist, and turn settlement
    await settled.promise;

    // 4. Assert assist was persisted with correct payload
    expect(persisted).toHaveLength(1);
    expect(persisted[0].sessionId).toBe('session');
    expect(persisted[0].assist).toMatchObject({
      recap: 'Deployed feature to production.',
      suggestion: 'Check the error logs next?',
      forMessageID: 'assistant-1',
    });

    // 5. Assert metadata event was broadcast
    expect(broadcastEvents).toHaveLength(1);
    expect(broadcastEvents[0]).toMatchObject({
      type: 'openchamber:session-metadata',
      properties: {
        sessionId: 'session',
        sessionID: 'session',
        revision: '1',
      },
    });

    // 6. Assert lifecycle teardown: run lease released and session unsubscribed!
    expect(hub.hasLeases('session')).toBe(false);
    expect(hub.isSessionConnected('session')).toBe(false);

    assistRuntime.stop();
    await hub.stop();
  });

  it('observes initial session snapshot on session-created lease and releases without stream leak', async () => {
    const boundary = streamBoundary();
    const hub = createGlobalMessageStreamHub({
      service: boundary.service,
      resolveSessionScope: async () => scope,
    });
    const snapshots = [];
    hub.subscribeSnapshot((snapshot) => snapshots.push(snapshot));

    // Session creation retains initial observation lease
    const lease = await hub.retainSession('session', 'session-created');
    expect(hub.isSessionConnected('session')).toBe(true);
    expect(hub.hasLeases('session')).toBe(true);
    expect(snapshots).toHaveLength(1);
    expect(snapshots[0].session.sessionId).toBe('session');

    // Observation completed: release initial observation lease
    await lease.release();

    // Stream tears down completely when no active run or client lease exists
    expect(hub.hasLeases('session')).toBe(false);
    expect(hub.isSessionConnected('session')).toBe(false);
    expect(boundary.cancelled()).toBe(true);

    await hub.stop();
  });

  it('retains stream across session-created release when a concurrent prompt run is active', async () => {
    const boundary = streamBoundary();
    const hub = createGlobalMessageStreamHub({
      service: boundary.service,
      resolveSessionScope: async () => scope,
    });

    // 1. Session created retains initial observation lease
    const initialLease = await hub.retainSession('session', 'session-created');
    expect(hub.isSessionConnected('session')).toBe(true);

    // 2. Prompt accepted concurrently acquires run lease
    const runLease = await hub.retainSession('session', 'run');
    expect(hub.getSessionLeases('session')).toEqual(['session-created', 'run']);

    // 3. Initial observation lease releases
    await initialLease.release();
    // Stream stays active because run lease is still held!
    expect(hub.isSessionConnected('session')).toBe(true);
    expect(hub.hasLeases('session')).toBe(true);
    expect(hub.getSessionLeases('session')).toEqual(['run']);
    expect(boundary.cancelled()).toBe(false);

    // 4. Run lease releases upon turn settlement
    await runLease.release();
    expect(hub.isSessionConnected('session')).toBe(false);
    expect(hub.hasLeases('session')).toBe(false);
    expect(boundary.cancelled()).toBe(true);

    await hub.stop();
  });

  it('settles and releases run lease cleanly on cancellation or unavailable runtime status', async () => {
    const boundary = streamBoundary();
    const hub = createGlobalMessageStreamHub({
      service: boundary.service,
      resolveSessionScope: async () => scope,
    });
    const settled = deferred();

    const assistRuntime = createSessionAssistRuntime({
      sessionService: {
        open: async () => ({ session: rootSession }),
        history: async () => ({ sessionId: 'session', branch: { branchId: 'b-1', branchVersion: '1', leafMessageId: 'assistant-1' }, turns: [], messages: [], nextCursor: null }),
      },
      resolveSessionScope: async () => scope,
      getSmallModelService: async () => ({
        describeSmallModel: async () => ({ inputCharBudget: 20_000, providerID: 'provider-1', modelID: 'model-1' }),
        generateSmallModelText: async () => ({ text: '{}' }),
      }),
      getTargets: () => ({ recap: true, suggestion: true }),
      persistSessionAssist: async () => { },
      quietMs: 10,
      onTurnSettled: async (sessionId) => {
        await hub.releaseSession(sessionId, 'run');
        settled.resolve();
      },
    });

    hub.subscribeEvent((evt, scp) => {
      assistRuntime.processCanonicalEvent(evt, scp);
    });

    // Prompt accepted: retains run lease
    await hub.retainSession('session', 'run');
    expect(hub.isSessionConnected('session')).toBe(true);

    // Agent service emits unavailable status (cancellation/abort/worker stop)
    const unavailableEvent = event(1, { type: 'session.status', runtimeStatus: 'unavailable', activeRunId: null });
    boundary.push(encodeEvent(unavailableEvent));

    await settled.promise;

    // Run lease is released cleanly and session stream is torn down
    expect(hub.hasLeases('session')).toBe(false);
    expect(hub.isSessionConnected('session')).toBe(false);

    assistRuntime.stop();
    await hub.stop();
  });
});
