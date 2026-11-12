/**
 * Every canonical variant, applied to a directory that holds nothing: an
 * empty state and a state whose session list has not been read. A title is
 * announced for a session created moments ago, so a reducer that drops events
 * for unheld sessions left the sidebar stale until a reload; one that throws
 * broke the whole batch.
 */
import { describe, expect, test } from 'bun:test';
import type { CanonicalEvent, SessionMetadataState, RuntimeSession } from '@openchamber/agent-contract';
import { CanonicalEventSchema, SessionSchema } from '@openchamber/agent-contract';
import { applyDirectoryEvent, installHostSession, installSessionMetadata } from './event-reducer';
import { INITIAL_STATE, type State } from './types';

const EMPTY: State = { ...INITIAL_STATE, session: [], sessionTotal: 0 };

const snapshotRecord = (): State['snapshot'][string] => ({
  session: runtime(), messages: [], turns: [], approvals: [], questions: [],
  cursor: 'epoch-1:0', branch: { branchId: 'main', branchVersion: '1', leafMessageId: null },
  activeRun: null, requestRecovery: { pendingSet: 'replace', priorEpochs: 'expired' },
  window: { firstTurnId: null, lastTurnId: null, firstMessageId: null, lastMessageId: null, hasEarlier: false },
});

const sessionRecord = (overrides: Partial<import('@openchamber/agent-contract').Session> = {}): import('@openchamber/agent-contract').Session => SessionSchema.parse({
  ...runtime(), metadata: null, metadataRevision: '0', archiveRevision: '0', ...overrides,
});

const runtime = (overrides: Partial<RuntimeSession> = {}): RuntimeSession => ({
  sessionId: 'session-1', projectId: 'project-1', workspaceId: 'workspace-1', displayPath: '.', rootSessionId: 'session-1',
  createdAt: 1, updatedAt: 1, epoch: 'epoch-1', headSequence: '0', runtimeStatus: 'idle', activeRunId: null, mode: { kind: 'main' }, ...overrides,
});

/** One valid payload per variant, generated from the schema so a new variant is covered. */
const samplePayloads: Record<string, Record<string, unknown>> = {
  'session.updated': { session: runtime() },
  'session.deleted': { deletedSessionIds: ['session-1'] },
  'session.status': { runtimeStatus: 'running', activeRunId: 'run-1' },
  'run.started': { runId: 'run-1', createdAt: 2 },
  'run.completed': { runId: 'run-1', finishedAt: 3 },
  'run.failed': { runId: 'run-1', finishedAt: 3, error: 'boom' },
  'run.cancelled': { runId: 'run-1', finishedAt: 3 },
  'turn.started': { turnId: 'turn-1', runId: 'run-1', userMessageId: 'msg-1' },
  'turn.completed': { turnId: 'turn-1', runId: 'run-1' },
  'message.created': { messageId: 'msg-1', turnId: 'turn-1', role: 'user' },
  'message.updated': { messageId: 'msg-1' },
  'part.started': { messageId: 'msg-1', part: { type: 'text', partId: 'part-1', content: '' } },
  'part.updated': { part: { type: 'text', partId: 'part-1', content: 'x' } },
  'part.completed': { part: { type: 'text', partId: 'part-1', content: 'x' } },
  'part.delta': { partId: 'part-1', delta: 'x' },
  'tool.started': { toolCallId: 'call-1', toolName: 'bash', input: {} },
  'tool.completed': { toolCallId: 'call-1', status: 'completed', isError: false },
  'approval.requested': { approval: { approvalId: 'appr-1', sessionId: 'session-1', turnId: 'turn-1', toolCallId: 'call-1', toolName: 'bash', actionType: 'bash_command', commandSummary: '', details: {}, status: 'pending', requestedAt: 1, version: '1', epoch: 'epoch-1', workerGeneration: 'worker-1' } },
  'approval.resolved': { approval: { approvalId: 'appr-1', sessionId: 'session-1', turnId: 'turn-1', toolCallId: 'call-1', toolName: 'bash', actionType: 'bash_command', commandSummary: '', details: {}, status: 'approved', requestedAt: 1, resolvedAt: 2, version: '2', epoch: 'epoch-1', workerGeneration: 'worker-1', resolution: { decision: 'approve' } } },
  'question.requested': { question: { questionId: 'q-1', sessionId: 'session-1', turnId: 'turn-1', prompt: 'x', status: 'pending', requestedAt: 1, version: '1', epoch: 'epoch-1', workerGeneration: 'worker-1' } },
  'question.resolved': { question: { questionId: 'q-1', sessionId: 'session-1', turnId: 'turn-1', prompt: 'x', status: 'cancelled', requestedAt: 1, resolvedAt: 2, version: '2', epoch: 'epoch-1', workerGeneration: 'worker-1' } },
  'queue.updated': { queue: { sessionId: 'session-1', revision: '1', items: [] } },

  'shell.updated': { job: { jobId: 'job-1', sessionId: 'session-1', epoch: 'epoch-1', workspaceId: 'workspace-1', workerGeneration: '1', status: 'ended', outputCursor: '1' } },
  'btw.delta': { recordId: 'record-1', delta: 'x' },
  'btw.completed': { recordId: 'record-1', status: 'completed', text: 'x' },
  'session.compacted': { compactionId: 'cmp-1', tokensBefore: 10, completedAt: 4 },
  'subagent.updated': { subagent: { subagentId: 'sub-1', parentSessionId: 'session-1', childSessionId: 'session-2', role: 'coder', status: 'running' } },
  'session.recap': { recap: 'x', createdAt: 5 },
  'advisor_yielded': { notes: [{ noteId: 'note-1', severity: 'nit', text: 'x', timestamp: 6 }] },
  'cleanse.progress': { activeCheckers: [], completedCheckers: [], repairedFiles: [], status: 'discovering' },
};

describe('canonical events for sessions no store holds yet', () => {
  // Worker-catalog and shell payloads embed a live worker identity that has no
  // meaningful "empty" form; both take the same snapshot gate every other
  // payload does, which is the branch covered here.
  const withoutWorkerPayload: ReadonlySet<string> = new Set(['catalog.updated', 'shell.updated']);

  test('every event variant returns a result against an empty state without throwing', () => {
    const parsedTypes = new Set([...CanonicalEventSchema.options.map((option) => option.shape.type.value)]
      .filter((type) => !withoutWorkerPayload.has(type)));
    expect(parsedTypes.size).toBeGreaterThan(0);
    for (const type of parsedTypes) {
      const payload = samplePayloads[type as string];
      if (payload === undefined) throw new Error(`no sample payload for ${type}`);
      const parsed = CanonicalEventSchema.safeParse({
        sessionId: 'session-1', epoch: 'epoch-1', sequence: '1', timestamp: 1, type, ...payload,
      });
      // A sample that stopped matching the schema is a stale test, not a pass.
      if (!parsed.success) throw new Error(`invalid sample for ${type}: ${parsed.error.message}`);
      const result = applyDirectoryEvent(EMPTY, parsed.data as CanonicalEvent);
      expect(['applied', 'duplicate', 'resnapshot']).toContain(result.kind);
      expect(result.state).toBeDefined();
    }
  });

  test('a Host session record for an unheld session is installed, title included', () => {
    const parsed = CanonicalEventSchema.safeParse({
      sessionId: 'session-1', epoch: 'epoch-1', sequence: '1', timestamp: 1, type: 'session.updated',
      session: runtime({ title: 'Generated title', headSequence: '1' }),
    });
    if (!parsed.success) throw new Error(parsed.error.message);
    const result = applyDirectoryEvent(EMPTY, parsed.data as CanonicalEvent);
    expect(result.kind).toBe('applied');
    expect(result.state.session[0]?.title).toBe('Generated title');
  });

  test('a deletion for an unheld session is accepted instead of forcing a resnapshot', () => {
    const parsed = CanonicalEventSchema.safeParse({
      sessionId: 'session-1', epoch: 'epoch-1', sequence: '1', timestamp: 1, type: 'session.deleted',
      deletedSessionIds: ['session-1'],
    });
    if (!parsed.success) throw new Error(parsed.error.message);
    expect(applyDirectoryEvent({ ...EMPTY, session: [sessionRecord()] }, parsed.data as CanonicalEvent).kind).toBe('applied');
  });

  test('metadata for an unheld session is held until its record arrives, then released', () => {
    const metadata: SessionMetadataState = { sessionId: 'session-1', revision: '3', metadata: { notes: 'Held' } };
    const buffered = installSessionMetadata(EMPTY, metadata, { bufferUnknown: true });
    expect(buffered.pendingMetadata?.['session-1']).toEqual(metadata);

    const installed = installHostSession(buffered, sessionRecord());
    expect(installed.session[0]?.metadata).toEqual({ notes: 'Held' });
    expect(installed.session[0]?.metadataRevision).toBe('3');
    expect(installed.pendingMetadata?.['session-1']).toBeUndefined();
  });

  test('a deletion releases a buffered record instead of leaking it', () => {
    // The session was announced, then deleted before its row was ever read.
    // Keeping the buffer would apply it to a later session with the same id.
    const buffered = installSessionMetadata(EMPTY, { sessionId: 'session-1', revision: '3', metadata: { notes: 'Held' } }, { bufferUnknown: true });
    // Both shapes matter: a store that already projects the session (snapshot
    // present) and one that does not.
    const withSnapshot = { ...buffered, session: [sessionRecord()], snapshot: { 'session-1': snapshotRecord() } };
    const parsed = CanonicalEventSchema.safeParse({
      sessionId: 'session-1', epoch: 'epoch-1', sequence: '1', timestamp: 1, type: 'session.deleted',
      deletedSessionIds: ['session-1'],
    });
    if (!parsed.success) throw new Error(parsed.error.message);
    for (const state of [buffered, withSnapshot]) {
      const result = applyDirectoryEvent(state, parsed.data as CanonicalEvent);
      expect(result.kind).toBe('applied');
      expect(result.state.pendingMetadata?.['session-1']).toBeUndefined();
    }
  });

  test('a buffered record never overrides newer metadata', () => {
    const buffered = installSessionMetadata(EMPTY, { sessionId: 'session-1', revision: '5', metadata: { notes: 'Newest' } }, { bufferUnknown: true });
    const installed = installHostSession(buffered, sessionRecord({ metadata: { notes: 'Stale' }, metadataRevision: '2' }));
    expect(installed.session[0]?.metadata).toEqual({ notes: 'Newest' });
    expect(installed.session[0]?.metadataRevision).toBe('5');
  });
});
