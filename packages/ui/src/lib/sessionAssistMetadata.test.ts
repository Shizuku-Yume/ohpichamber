import { describe, expect, test } from 'bun:test';
import type { Session, SessionMetadata } from '@openchamber/agent-contract';
import { getCurrentSessionAssist } from './sessionAssistMetadata';

const session = (endedAt: number, assist: { forMessageID: string; recap: string; suggestion: string; generatedAt: number }): Session => ({
  sessionId: 'ses_1', projectId: 'prj', workspaceId: 'ws', displayPath: 'repo', rootSessionId: 'ses_1',
  createdAt: 1, updatedAt: 1, epoch: 'e', headSequence: '0', runtimeStatus: 'idle', activeRunId: null, mode: { kind: 'main' },
  metadata: { openchamber: { assist, workbench: { lastIdleAt: endedAt } } } satisfies SessionMetadata, metadataRevision: '1', archiveRevision: '0',
});

describe('getCurrentSessionAssist', () => {
  test('returns the assist generated after the last turn ended', () => {
    expect(getCurrentSessionAssist(session(160, { forMessageID: 'msg_1', recap: 'r', suggestion: 'Run the tests', generatedAt: 200 }))?.suggestion)
      .toBe('Run the tests');
  });

  test('a later turn retires it', () => {
    expect(getCurrentSessionAssist(session(300, { forMessageID: 'msg_1', recap: 'r', suggestion: 'Run the tests', generatedAt: 160 })))
      .toBeNull();
  });

  test('touching the session file does not retire it: freshness is the Host clock, not the native mtime', () => {
    const touched = { ...session(200, { forMessageID: 'msg_1', recap: 'r', suggestion: 'Run the tests', generatedAt: 250 }), updatedAt: 9_000 };
    expect(getCurrentSessionAssist(touched)?.suggestion).toBe('Run the tests');
  });

  test('with no Host turn end recorded the payload is kept, since absence is not staleness', () => {
    const noStamp = { ...session(200, { forMessageID: 'msg_1', recap: 'r', suggestion: 'Run the tests', generatedAt: 100 }), metadata: { openchamber: { assist: { forMessageID: 'msg_1', recap: 'r', suggestion: 'Run the tests', generatedAt: 100 } } } as SessionMetadata };
    expect(getCurrentSessionAssist(noStamp)?.suggestion).toBe('Run the tests');
  });

  test('a recap alone is still an assist', () => {
    expect(getCurrentSessionAssist(session(160, { forMessageID: 'msg_1', recap: 'r', suggestion: '', generatedAt: 200 }))?.recap)
      .toBe('r');
  });

  test('an assist generated at the session update timestamp remains current', () => {
    expect(getCurrentSessionAssist(session(200, { forMessageID: 'msg_1', recap: 'r', suggestion: 'Run the tests', generatedAt: 200 }))?.suggestion).toBe('Run the tests');
  });
});
