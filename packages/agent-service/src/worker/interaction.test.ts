import { describe, expect, test } from 'bun:test';
import type {
  ExtensionApprovalPrompt,
  ToolApprovalRequestedEvent,
  ToolCallEvent,
} from '@oh-my-pi/pi-coding-agent/sdk';
import type { JsonObject } from '@openchamber/agent-contract';
import { WorkerInteraction } from './interaction.ts';
import type { WorkerInteraction as WorkerInteractionMessage } from '../protocol.ts';

function createToolCall(toolName: string, toolCallId: string, input: JsonObject): ToolCallEvent {
  return {
    type: 'tool_call',
    toolName,
    toolCallId,
    input,
  };
}

function createApprovalRequested(toolName: string, toolCallId: string, reason?: string, sessionId = 'session-1'): ToolApprovalRequestedEvent {
  return {
    type: 'tool_approval_requested',
    sessionId,
    toolCallId,
    toolName,
    reason,
    approvalMode: 'always-ask',
  };
}

describe('WorkerInteraction OMP 18.16 ui.approve bridge', () => {
  test('authorized Host approve resolves SDK answer to "once" and records execution receipt', async () => {
    const requests: WorkerInteractionMessage[] = [];
    const interaction = new WorkerInteraction({
      request: item => requests.push(item),
      currentTurn: () => 'turn-1',
    });

    const toolCallId = 'call-1';
    interaction.observeToolCall(createToolCall('bash', toolCallId, { command: 'echo authorized' }));
    interaction.observeApproval(createApprovalRequested('bash', toolCallId, 'Host consent required'));

    const prompt: ExtensionApprovalPrompt = {
      full: 'Execute bash command: echo authorized',
      compact: 'echo authorized',
      session: 'Approve bash for this session',
    };

    const approvePromise = interaction.ui.approve!(prompt);
    expect(requests).toHaveLength(1);
    const request = requests[0];
    expect(request).toMatchObject({
      kind: 'approval',
      toolCallId,
      toolName: 'bash',
      actionType: 'bash_command',
      turnId: 'turn-1',
      details: {
        reason: 'Host consent required',
        options: ['Approve', 'Reject'],
        input: { command: 'echo authorized' },
      },
    });

    const resolved = interaction.resolveApproval(request.approvalId, 'approve');
    expect(resolved).toBe(true);

    const answer = await approvePromise;
    // Worker strictly returns 'once' for immediate execution; session policy is managed by Host CAS
    expect(answer).toBe('once');
    expect(interaction.takeApprovalReceipt(toolCallId)).toBe(request.approvalId);
  });

  test('Host reject resolves SDK answer to "deny" and provides no execution receipt', async () => {
    const requests: WorkerInteractionMessage[] = [];
    const interaction = new WorkerInteraction({
      request: item => requests.push(item),
      currentTurn: () => 'turn-1',
    });

    const toolCallId = 'call-2';
    interaction.observeToolCall(createToolCall('bash', toolCallId, { command: 'rm -rf /' }));
    interaction.observeApproval(createApprovalRequested('bash', toolCallId, 'Dangerous command'));

    const prompt: ExtensionApprovalPrompt = {
      full: 'Execute bash command: rm -rf /',
      compact: 'rm -rf /',
      session: 'Approve bash for this session',
    };

    const approvePromise = interaction.ui.approve!(prompt);
    expect(requests).toHaveLength(1);
    const request = requests[0];

    const resolved = interaction.resolveApproval(request.approvalId, 'reject');
    expect(resolved).toBe(true);

    const answer = await approvePromise;
    expect(answer).toBe('deny');
    expect(interaction.takeApprovalReceipt(toolCallId)).toBeUndefined();
  });

  test('aborted signal during pending approval resolves SDK answer to "deny"', async () => {
    const requests: WorkerInteractionMessage[] = [];
    const interaction = new WorkerInteraction({
      request: item => requests.push(item),
      currentTurn: () => 'turn-1',
    });

    const toolCallId = 'call-3';
    interaction.observeToolCall(createToolCall('write', toolCallId, { path: '/tmp/test.txt' }));
    interaction.observeApproval(createApprovalRequested('write', toolCallId));

    const controller = new AbortController();
    const prompt: ExtensionApprovalPrompt = {
      full: 'Write file: /tmp/test.txt',
      compact: '/tmp/test.txt',
    };

    const approvePromise = interaction.ui.approve!(prompt, { signal: controller.signal });
    expect(requests).toHaveLength(1);

    controller.abort();
    const answer = await approvePromise;
    expect(answer).toBe('deny');
    expect(interaction.takeApprovalReceipt(toolCallId)).toBeUndefined();
  });

  test('select fallback accepts 3-choice OMP 18.16 prompts without throwing invalid choices error', async () => {
    const requests: WorkerInteractionMessage[] = [];
    const interaction = new WorkerInteraction({
      request: item => requests.push(item),
      currentTurn: () => 'turn-1',
    });

    const toolCallId = 'call-4';
    interaction.observeToolCall(createToolCall('bash', toolCallId, { command: 'git status' }));
    interaction.observeApproval(createApprovalRequested('bash', toolCallId));

    // OMP 18.16 select fallback supplies at least 3 choices: ['Approve Once', 'Approve bash for this session', 'Deny']
    const selectPromise = interaction.ui.select(
      'Execute bash command',
      ['Approve Once', 'Approve bash for this session', 'Deny'],
    );

    expect(requests).toHaveLength(1);
    const request = requests[0];

    interaction.resolveApproval(request.approvalId, 'approve');
    const selected = await selectPromise;
    expect(selected).toBe('Approve Once');
  });

  test('throws if native approval has no captured execution input', async () => {
    const interaction = new WorkerInteraction({
      request: () => {},
      currentTurn: () => 'turn-1',
    });

    interaction.observeApproval(createApprovalRequested('bash', 'missing-input-call'));

    const prompt: ExtensionApprovalPrompt = {
      full: 'Execute command',
      compact: 'command',
    };

    await expect(interaction.ui.approve!(prompt)).rejects.toThrow('Native approval has no captured execution input');
  });
});
