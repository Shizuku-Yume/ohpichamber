import { describe, expect, test } from 'bun:test';
import type { Message } from '@openchamber/agent-contract';
import { formatSessionAsMarkdown } from './exportSession';

const message = (messageId: string, role: Message['role'], content: string, createdAt = 1): Message => ({
  messageId,
  sessionId: 'session',
  turnId: 'turn',
  role,
  createdAt,
  parts: [{ partId: `${messageId}-text`, type: 'text', content }],
});

const user = (): Message => ({
  messageId: 'u1',
  sessionId: 'session',
  turnId: 'turn',
  role: 'user',
  createdAt: 1,
  parts: [{ partId: 'u1-text', type: 'text', content: 'Fix the build' }],
});

type ExportTestMessage = Message & { variant?: string };

const answer = (variant?: string): ExportTestMessage => ({
  messageId: 'a1',
  sessionId: 'session',
  turnId: 'turn',
  role: 'assistant',
  createdAt: 2,
  providerId: 'anthropic',
  modelId: 'claude-opus-4-1',
  variant,
  parts: [{ partId: 'a1-text', type: 'text', content: 'Fixed it' }],
});
const assistantDetails = (markdown: string): string[] =>
  [...markdown.matchAll(/\*\*Assistant\*\*\n\n\*[^*]*\(([^)]*)\)\*/g)].map((match) => match[1]);

describe('session export', () => {
  test('exports canonical context content and drops system prompt plumbing', () => {
    const markdown = formatSessionAsMarkdown([
      message('plumbing', 'system', 'The user is returning after a break.'),
      message('attached', 'user', 'Earlier answer\n\nFix this detail'),
      message('user', 'user', 'Fix the build'),
      message('answer', 'assistant', 'Fixed it', 2),
    ], 'Session');

    expect(markdown).toContain('Fix this detail');
    expect(markdown).not.toContain('returning after a break');
    expect(markdown).toContain('Fixed it');
  });

  test('names the thinking level next to the model for the main agent and sub-agents', () => {
    const child = { title: 'Explore', agent: 'explore', records: [answer('max')], children: [] };

    const markdown = formatSessionAsMarkdown([user(), answer('high')], 'Session', [child]);

    expect(assistantDetails(markdown)).toEqual([
      'anthropic/claude-opus-4-1, thinking: high',
      'anthropic/claude-opus-4-1, thinking: max',
    ]);
  });

  test('keeps the model alone when no thinking level was picked', () => {
    const markdown = [undefined, 'default', 'none']
      .map((variant) => formatSessionAsMarkdown([answer(variant)], 'Session'))
      .join('\n');

    expect(assistantDetails(markdown)).toEqual([
      'anthropic/claude-opus-4-1',
      'anthropic/claude-opus-4-1',
      'anthropic/claude-opus-4-1',
    ]);
  });
});
