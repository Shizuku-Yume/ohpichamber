import { describe, expect, test } from 'bun:test';
import { ProposedWorkflowResultSchema } from './runtime.ts';

describe('ProposedWorkflowResultSchema', () => {
  test('accepts valid workflow.run proposal envelope', () => {
    const envelope = {
      ok: true,
      action: 'workflow.run',
      data: { runId: 'run-123', state: 'awaiting-approval' },
    };
    const parsed = ProposedWorkflowResultSchema.safeParse(envelope);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.data.runId).toBe('run-123');
    }
  });

  test('rejects missing or empty runId', () => {
    expect(ProposedWorkflowResultSchema.safeParse({ ok: true, action: 'workflow.run', data: {} }).success).toBe(false);
    expect(ProposedWorkflowResultSchema.safeParse({ ok: true, action: 'workflow.run', data: { runId: '' } }).success).toBe(false);
  });

  test('rejects wrong action or ok false', () => {
    expect(ProposedWorkflowResultSchema.safeParse({ ok: false, action: 'workflow.run', data: { runId: 'run-123' } }).success).toBe(false);
    expect(ProposedWorkflowResultSchema.safeParse({ ok: true, action: 'workflow.status', data: { runId: 'run-123' } }).success).toBe(false);
  });
});
