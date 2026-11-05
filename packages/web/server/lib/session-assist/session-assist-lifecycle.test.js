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
});
