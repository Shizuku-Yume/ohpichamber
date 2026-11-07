import { describe, expect, test } from 'bun:test';
import type { Message, Turn } from '@openchamber/agent-contract';

import { findCompletedReplyIds, findLatestCompletedReply } from './latestReply';

const userMessage = (messageId: string): Message => ({
  messageId,
  sessionId: 'ses_1',
  turnId: 'turn_0',
  role: 'user',
  createdAt: 1,
  parts: [{ type: 'text', partId: `${messageId}_part`, content: 'user prompt' }],
});

const assistantMessage = (messageId: string, text: string): Message => ({
  messageId,
  sessionId: 'ses_1',
  turnId: 'turn_1',
  role: 'assistant',
  createdAt: 2,
  parts: text ? [{ type: 'text', partId: `${messageId}_part`, content: text }] : [],
});

const turn = (turnId: string, status: Turn['status'], assistantMessageIds: string[]): Turn => ({
  turnId,
  sessionId: 'ses_1',
  runId: 'run_1',
  status,
  userMessageId: 'user_1',
  assistantMessageIds,
  startedAt: 1,
  finishedAt: status === 'completed' ? 2 : undefined,
});

describe('findLatestCompletedReply', () => {
  test('returns the last answer of the latest completed turn', () => {
    const messages = [
      userMessage('user_1'),
      assistantMessage('assistant_1', 'First answer'),
      userMessage('user_2'),
      assistantMessage('assistant_2', 'Progress note'),
      assistantMessage('assistant_3', 'Second answer'),
    ];
    const turns = [
      turn('turn_1', 'completed', ['assistant_1']),
      turn('turn_2', 'completed', ['assistant_2', 'assistant_3']),
    ];

    const reply = findLatestCompletedReply(turns, messages);
    expect(reply).toEqual({ messageId: 'assistant_3', text: 'Second answer' });
  });

  test('ignores turns still running or awaiting approval', () => {
    const messages = [
      userMessage('user_1'),
      assistantMessage('assistant_1', 'Completed answer'),
      userMessage('user_2'),
      assistantMessage('assistant_2', 'Streaming answer'),
    ];
    const turns = [
      turn('turn_1', 'completed', ['assistant_1']),
      turn('turn_2', 'running', ['assistant_2']),
    ];

    // Ignores turn_2 because status is 'running', falls back to turn_1
    const reply = findLatestCompletedReply(turns, messages);
    expect(reply).toEqual({ messageId: 'assistant_1', text: 'Completed answer' });
  });

  test('ignores failed or cancelled turns', () => {
    const messages = [
      userMessage('user_1'),
      assistantMessage('assistant_1', 'Partial text'),
    ];
    const turns = [turn('turn_1', 'failed', ['assistant_1'])];

    expect(findLatestCompletedReply(turns, messages)).toBeNull();
  });

  test('skips empty assistant messages within a completed turn', () => {
    const messages = [
      assistantMessage('assistant_1', 'Real answer'),
      assistantMessage('assistant_2', ''),
    ];
    const turns = [turn('turn_1', 'completed', ['assistant_1', 'assistant_2'])];

    expect(findLatestCompletedReply(turns, messages)).toEqual({ messageId: 'assistant_1', text: 'Real answer' });
  });
});

describe('findCompletedReplyIds', () => {
  test('returns every finished answer across all completed turns', () => {
    const messages = [
      assistantMessage('assistant_1', 'First answer'),
      assistantMessage('assistant_2', 'Second answer'),
      assistantMessage('assistant_3', 'Third answer'),
      assistantMessage('assistant_4', ''),
    ];
    const turns = [
      turn('turn_1', 'completed', ['assistant_1']),
      turn('turn_2', 'completed', ['assistant_2']),
      turn('turn_3', 'running', ['assistant_3']),
      turn('turn_4', 'completed', ['assistant_4']),
    ];

    const ids = findCompletedReplyIds(turns, messages);
    expect(ids).toEqual(['assistant_1', 'assistant_2']);
  });
});
