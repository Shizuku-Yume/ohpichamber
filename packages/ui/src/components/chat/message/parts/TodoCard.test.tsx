import { describe, expect, test } from 'bun:test';
import type { JsonValue, Message, ToolResultPart } from '@openchamber/agent-contract';
import { TodoCard } from './TodoCard';
import { extractTodoPhases } from '../../todoData';
import { latestTodoPhases } from '../../todoHistory';
import { renderToStaticMarkup } from 'react-dom/server';

const result = (callId: string, phases: JsonValue, isError = false): ToolResultPart => ({
  type: 'tool_result', partId: `${callId}-result`, toolCallId: callId, toolName: 'todo',
  output: { content: [], details: { phases } }, isError,
});
const assistantMessage = (messageId: string, parts: ToolResultPart[]): Message => ({
  messageId, role: 'assistant', sessionId: 'session', turnId: messageId, createdAt: 1, parts,
});
const phases: JsonValue = [
  { name: 'Plan', tasks: [{ content: 'Inspect', status: 'completed' }, { content: 'Implement', status: 'in_progress', blocker: 'waiting' }] },
  { name: 'Verify', tasks: [{ content: 'Run checks', status: 'pending' }] },
];

describe('OMP todo rendering', () => {
  test('parses native phases and displays each phase, item and status', () => {
    const parsed = extractTodoPhases({ phases });
    expect(parsed).toEqual(phases);
    const html = renderToStaticMarkup(<TodoCard phases={parsed ?? []} />);
    expect(html).toContain('Plan');
    expect(html).toContain('Inspect');
    expect(html).toContain('Implement');
    expect(html).toContain('Verify');
    expect(html).toContain('Run checks');
  });

  test('rejects malformed phase snapshots instead of inventing an empty list', () => {
    expect(extractTodoPhases({ phases: [{ name: 'bad', tasks: [{ content: 'x', status: 'todo' }] }] })).toBeNull();
    expect(extractTodoPhases({})).toBeNull();
  });

  test('selects latest successful todo result from history for remounts and branch-scoped history', () => {
    const earlier = [{ name: 'Old', tasks: [{ content: 'Stale', status: 'pending' }] }];
    const messages = [
      assistantMessage('old-turn', [result('old-call', earlier)]),
      assistantMessage('latest-turn', [result('failed-call', phases, true), result('latest-call', phases)]),
    ];
    expect(latestTodoPhases(messages)).toEqual(phases);
    expect(latestTodoPhases(messages)).toEqual(phases);
    expect(latestTodoPhases([assistantMessage('other-branch', [result('branch-call', earlier)])])).toEqual(earlier);
  });
  test('does not restore an older checklist when the latest successful result clears or has no phases', () => {
    const old = assistantMessage('old', [result('old', phases)]);
    const cleared = assistantMessage('cleared', [result('clear', [])]);
    expect(latestTodoPhases([old, cleared])).toEqual([]);
    expect(latestTodoPhases([old, assistantMessage('malformed', [result('bad', { nope: true })])])).toBeNull();
  });
});
