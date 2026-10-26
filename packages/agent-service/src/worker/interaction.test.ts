import { expect, test } from 'bun:test';
import type { ToolApprovalRequestedEvent, ToolCallEvent } from '@oh-my-pi/pi-coding-agent/sdk';
import type { PlanReviewResponse } from '@openchamber/agent-contract';
import type { WorkerInteraction as InteractionMessage } from '../protocol.ts';
import { WorkerInteraction } from './interaction.ts';
import { APPROVAL_SUMMARY_MAX_CHARS } from '../interaction/approval-summary.ts';

const review = { type: 'plan-review' as const, title: 'Review', planReference: 'local://review-plan.md', planText: '# Review' };

test('native plan handles validate responses and resolve exactly once', () => {
  const requests: InteractionMessage[] = [];
  const responses: (PlanReviewResponse | undefined)[] = [];
  const interaction = new WorkerInteraction({ request: request => requests.push(request), currentTurn: () => 'turn' });
  try {
    interaction.requestPlanReview(review, response => responses.push(response));
    const request = requests[0];
    if (request?.kind !== 'question') throw new Error('Expected canonical plan question');
    expect(request.schema).toEqual(review);
    expect(interaction.resolveQuestion(request.questionId, 'answer', { action: 'feedback', feedback: ' ' })).toBe(false);
    expect(interaction.resolveQuestion(request.questionId, 'answer', { results: [] })).toBe(false);
    expect(responses).toEqual([]);
    expect(interaction.resolveQuestion(request.questionId, 'answer', { action: 'feedback', feedback: ' Revise it ' })).toBe(true);
    expect(responses).toEqual([{ action: 'feedback', feedback: 'Revise it' }]);
    expect(interaction.resolveQuestion(request.questionId, 'answer', { action: 'approve' })).toBe(false);
  } finally { interaction.close(); }
});

test('expiry cancellation and worker shutdown never approve a plan', () => {
  const requests: InteractionMessage[] = [];
  const responses: (PlanReviewResponse | undefined)[] = [];
  const interaction = new WorkerInteraction({ request: request => requests.push(request), currentTurn: () => 'turn' });
  interaction.requestPlanReview(review, response => responses.push(response));
  const request = requests[0];
  if (request?.kind !== 'question') throw new Error('Expected canonical plan question');
  expect(interaction.resolveQuestion(request.questionId, 'cancel')).toBe(true);
  interaction.requestPlanReview(review, response => responses.push(response));
  interaction.close();
  expect(responses).toEqual([undefined, undefined]);
  expect(() => interaction.requestPlanReview(review, () => {})).toThrow();
});

test('native approval names the tool and projects a redacted one-line input summary', async () => {
  const requests: InteractionMessage[] = [];
  const interaction = new WorkerInteraction({ request: request => requests.push(request), currentTurn: () => 'turn' });
  const command = `GITHUB_TOKEN=ghp_private_bash bun test --token cli-private-token ${'echo '.repeat(60)}`;
  const toolCall: ToolCallEvent = { type: 'tool_call', toolName: 'bash', toolCallId: 'call-bash', input: { command } };
  const approvalEvent: ToolApprovalRequestedEvent = {
    type: 'tool_approval_requested', sessionId: 'session', toolName: 'bash', toolCallId: 'call-bash',
    reason: 'Prompt required by bash pattern: test', approvalMode: 'always-ask',
  };
  try {
    interaction.observeToolCall(toolCall);
    interaction.observeApproval(approvalEvent);
    const selection = interaction.ui.select('Allow tool: bash', ['Approve', 'Deny']);
    expect(requests).toHaveLength(1);
    const request = requests[0];
    if (request?.kind !== 'approval') throw new Error('Expected canonical approval request');
    expect(request.toolName).toBe('bash');
    expect(request.actionType).toBe('bash_command');
    expect(request.commandSummary).toContain('GITHUB_TOKEN=[REDACTED] bun test --token [REDACTED]');
    expect(request.commandSummary.length).toBeLessThanOrEqual(APPROVAL_SUMMARY_MAX_CHARS);
    expect(request.commandSummary.endsWith('…')).toBe(true);
    expect(request.commandSummary.includes('ghp_private_bash')).toBe(false);
    expect(request.commandSummary.includes('cli-private-token')).toBe(false);
    expect(request.details).toEqual({ reason: 'Prompt required by bash pattern: test', options: ['Approve', 'Deny'] });
    expect(request.policyTarget).toEqual({ toolName: 'bash', pattern: JSON.stringify({ command }) });
    expect(request.sessionRuleKey).toBeUndefined();
    expect(interaction.resolveApproval(request.approvalId, 'approve')).toBe(true);
    await expect(selection).resolves.toBe('Approve');
  } finally { interaction.close(); }
});

test('native permission prompts project safe details and resolve allow_always', async () => {
  const requests: InteractionMessage[] = [];
  const interaction = new WorkerInteraction({ request: request => requests.push(request), currentTurn: () => 'turn' });
  const command = 'GITHUB_TOKEN=ghp_private_native printf native';
  const toolCall = { toolCallId: 'call-native', toolName: 'bash', title: 'bash', rawInput: { command } };
  const options = [
    { optionId: 'once', name: 'Allow once', kind: 'allow_once' as const },
    { optionId: 'always', name: 'Always allow', kind: 'allow_always' as const },
    { optionId: 'reject', name: 'Reject', kind: 'reject_once' as const },
    { optionId: 'never', name: 'Never allow', kind: 'reject_always' as const },
  ];
  try {
    const selection = interaction.requestPermission(toolCall, options, 'bash', undefined);
    expect(requests).toHaveLength(1);
    const request = requests[0];
    if (request?.kind !== 'approval') throw new Error('Expected canonical approval request');
    expect(request.toolName).toBe('bash');
    expect(request.commandSummary).toBe('GITHUB_TOKEN=[REDACTED] printf native');
    expect(request.details).toEqual({ options: ['Allow once', 'Always allow', 'Reject', 'Never allow'] });
    expect(request.policyTarget).toEqual({ toolName: 'bash', pattern: JSON.stringify({ command }) });
    expect(request.sessionRuleKey).toBe('bash');
    expect(interaction.resolveApproval(request.approvalId, 'approve-always')).toBe(true);
    await expect(selection).resolves.toBe('always');
  } finally { interaction.close(); }
});

test('a non-bash ACP prompt is a one-shot card without a session allowance', async () => {
  const requests: InteractionMessage[] = [];
  const interaction = new WorkerInteraction({ request: request => requests.push(request), currentTurn: () => 'turn' });
  const options = [
    { optionId: 'once', name: 'Allow once', kind: 'allow_once' as const },
    { optionId: 'always', name: 'Always allow', kind: 'allow_always' as const },
    { optionId: 'reject', name: 'Reject', kind: 'reject_once' as const },
  ];
  const toolCall = { toolCallId: 'call-edit', toolName: 'edit', title: 'Delete a.ts', rawInput: { path: 'a.ts', edits: [] } };
  try {
    const selection = interaction.requestPermission(toolCall, options, undefined, undefined);
    const request = requests[0];
    if (request?.kind !== 'approval') throw new Error('Expected canonical approval request');
    expect(request.toolName).toBe('edit');
    expect(request.actionType).toBe('file_write');
    expect(request.commandSummary).toBe('a.ts');
    expect(request.sessionRuleKey).toBeUndefined();
    expect(request.details).toEqual({ options: ['Allow once', 'Always allow', 'Reject'] });
    expect(interaction.resolveApproval(request.approvalId, 'approve')).toBe(true);
    await expect(selection).resolves.toBe('once');
  } finally { interaction.close(); }
});

test('native grant re-authorizes an exact command without a session allowance', async () => {
  const requests: InteractionMessage[] = [];
  const interaction = new WorkerInteraction({ request: request => requests.push(request), currentTurn: () => 'turn' });
  const input = { command: 'printf grant' };
  try {
    const selection = interaction.requestNativeGrant('call-grant', input, undefined);
    const request = requests[0];
    if (request?.kind !== 'approval') throw new Error('Expected canonical approval request');
    expect(request.nativeGrant).toBe(true);
    expect(request.sessionRuleKey).toBeUndefined();
    expect(request.policyTarget).toEqual({ toolName: 'bash', pattern: JSON.stringify(input) });
    expect(interaction.resolveApproval(request.approvalId, 'approve')).toBe(true);
    await expect(selection).resolves.toBe(true);
    expect(interaction.takeApprovalReceipt('call-grant')).toBe(request.approvalId);
  } finally { interaction.close(); }
});

test('an already-aborted native prompt publishes no approval card', async () => {
  const requests: InteractionMessage[] = [];
  const interaction = new WorkerInteraction({ request: request => requests.push(request), currentTurn: () => 'turn' });
  const controller = new AbortController();
  controller.abort();
  const options = [
    { optionId: 'once', name: 'Allow once', kind: 'allow_once' as const },
    { optionId: 'always', name: 'Always allow', kind: 'allow_always' as const },
    { optionId: 'reject', name: 'Reject', kind: 'reject_once' as const },
  ];
  const toolCall = { toolCallId: 'call-aborted', toolName: 'bash', title: 'bash', rawInput: { command: 'printf aborted' } };
  try {
    await expect(interaction.requestPermission(toolCall, options, 'bash', controller.signal)).resolves.toBeUndefined();
    await expect(interaction.requestNativeGrant('call-aborted', { command: 'printf aborted' }, controller.signal)).resolves.toBe(false);
    expect(requests).toEqual([]);
  } finally { interaction.close(); }
});

test('provider safety prompts never offer a session allowance', async () => {
  const requests: InteractionMessage[] = [];
  const interaction = new WorkerInteraction({ request: request => requests.push(request), currentTurn: () => 'turn' });
  const toolCall: ToolCallEvent = { type: 'tool_call', toolName: 'bash', toolCallId: 'call-safety', input: { command: 'printf safe' } };
  const approvalEvent: ToolApprovalRequestedEvent = {
    type: 'tool_approval_requested', sessionId: 'session', toolName: 'bash', toolCallId: 'call-safety', approvalMode: 'always-ask',
  };
  try {
    interaction.observeToolCall(toolCall);
    interaction.observeApproval(approvalEvent);
    const selection = interaction.ui.select('Allow tool: bash\nProvider safety checks:\nDestructive command', ['Approve', 'Deny']);
    const request = requests[0];
    if (request?.kind !== 'approval') throw new Error('Expected canonical approval request');
    expect(request.sessionRuleKey).toBeUndefined();
    expect(interaction.resolveApproval(request.approvalId, 'approve')).toBe(true);
    await expect(selection).resolves.toBe('Approve');
  } finally { interaction.close(); }
});
