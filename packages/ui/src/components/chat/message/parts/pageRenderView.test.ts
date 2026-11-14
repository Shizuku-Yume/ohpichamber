import { describe, expect, test } from 'vitest';
import { proposedWorkflowRunId, isShownInPlace } from './pageRenderView';
import type { CanonicalToolView } from './toolView';
import { ProposedWorkflowResultSchema } from '@openchamber/agent-contract';

describe('workflow chat card envelope and parser', () => {
  test('parser extracts runId from workflow tool envelope', () => {
    const envelope = {
      ok: true,
      action: 'workflow.run',
      data: { runId: 'run-alpha-42', state: 'awaiting-approval', name: 'deploy-check' },
    };

    // Shared definition accepts it
    expect(ProposedWorkflowResultSchema.safeParse(envelope).success).toBe(true);

    const view: CanonicalToolView = {
      call: { type: 'tool_call', partId: 'part-1', toolCallId: 'call-1', toolName: 'openchamber_workflow', input: { action: 'workflow.run' }, status: 'completed' },
      result: { type: 'tool_result', partId: 'part-2', toolCallId: 'call-1', toolName: 'openchamber_workflow', output: JSON.stringify(envelope), isError: false },
      callID: 'call-1',
      tool: 'openchamber_workflow',
      state: {
        status: 'completed',
        input: { action: 'workflow.run' },
        output: JSON.stringify(envelope),
        metadata: {},
        time: { start: 0, end: 1 },
      },
      sessionID: 'sess-1',
      messageID: 'msg-1',
    };

    expect(proposedWorkflowRunId(view)).toBe('run-alpha-42');
    expect(isShownInPlace(view)).toBe(true);
  });

  test('parser returns null for non-run actions or failed status', () => {
    const view: CanonicalToolView = {
      call: { type: 'tool_call', partId: 'part-3', toolCallId: 'call-2', toolName: 'openchamber_workflow', input: { action: 'workflow.status' }, status: 'completed' },
      result: { type: 'tool_result', partId: 'part-4', toolCallId: 'call-2', toolName: 'openchamber_workflow', output: JSON.stringify({ ok: true, action: 'workflow.status', data: { runId: 'run-1' } }), isError: false },
      callID: 'call-2',
      tool: 'openchamber_workflow',
      state: {
        status: 'completed',
        input: { action: 'workflow.status' },
        output: JSON.stringify({ ok: true, action: 'workflow.status', data: { runId: 'run-1' } }),
        metadata: {},
        time: { start: 0, end: 1 },
      },
      sessionID: 'sess-1',
      messageID: 'msg-1',
    };

    expect(proposedWorkflowRunId(view)).toBeNull();
  });
});
