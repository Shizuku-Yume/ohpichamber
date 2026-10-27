import { describe, expect, test } from 'bun:test';
import type { Session, SessionMetadata } from '@openchamber/agent-contract';
import { getRecordedTurnDurationMs } from './sessionTurnMetadata';

type TestSession = Session & { time?: { idle?: number } };

const session = (idle: number | undefined, metadata?: SessionMetadata): Session => {
  const record: TestSession = {
    sessionId: 'a',
    projectId: 'project',
    workspaceId: 'workspace',
    displayPath: 'a',
    rootSessionId: 'a',
    createdAt: 1,
    updatedAt: idle ?? 1,
    epoch: '1',
    headSequence: '1',
    runtimeStatus: 'idle',
    activeRunId: null,
    metadataRevision: metadata ? '1' : '0',
    archiveRevision: '0',
    time: idle !== undefined ? { idle } : undefined,
    metadata: metadata ?? null,
  };
  return record;
};

describe('getRecordedTurnDurationMs', () => {
  test('reads the length recorded for the turn that ended at time.idle', () => {
    const recorded = { openchamber: { turn: { endedAt: 50_000, durationMs: 2_417_000 } } } as unknown as SessionMetadata;
    expect(getRecordedTurnDurationMs(session(50_000, recorded))).toBe(2_417_000);
    // Monotone idle drift tolerance
    expect(getRecordedTurnDurationMs(session(50_001, recorded))).toBe(2_417_000);
  });

  test("ignores a record left by an older turn", () => {
    const recorded = { openchamber: { turn: { endedAt: 50_000, durationMs: 2_417_000 } } } as unknown as SessionMetadata;
    expect(getRecordedTurnDurationMs(session(90_000, recorded))).toBeUndefined();
    expect(getRecordedTurnDurationMs(session(undefined, recorded))).toBeUndefined();
  });

  test('ignores missing or malformed records', () => {
    expect(getRecordedTurnDurationMs(session(50_000))).toBeUndefined();
    expect(getRecordedTurnDurationMs(session(50_000, { openchamber: { turn: { endedAt: 50_000 } } } as unknown as SessionMetadata))).toBeUndefined();
    expect(getRecordedTurnDurationMs(session(50_000, { openchamber: { turn: { endedAt: 50_000, durationMs: -1 } } } as unknown as SessionMetadata))).toBeUndefined();
  });
});
