import { describe, expect, test } from 'bun:test';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import type { ApprovalRequest, CanonicalEvent, QuestionRequest } from '@openchamber/agent-contract';
import { applyGlobalBlockingRequestEvents, resetGlobalBlockingRequests } from '@/sync/global-blocking-requests';
import { installHookTestDom } from '@/components/session/sidebar/test-utils/testDom';
import { usePendingRequests, type PendingRequests } from './usePendingRequests';

const FAMILY = ['parent', 'child'] as const;
const EPOCH = 'epoch-1';

const approval = (sessionId: string, approvalId: string): ApprovalRequest => ({
  version: '1', epoch: EPOCH, workerGeneration: 'worker-1', approvalId, sessionId,
  turnId: 'turn-1', toolCallId: 'call-1', toolName: 'bash', actionType: 'bash_command',
  commandSummary: 'rm -rf build', details: {}, status: 'pending', requestedAt: 1,
});

const question = (sessionId: string, questionId: string): QuestionRequest => ({
  version: '1', epoch: EPOCH, workerGeneration: 'worker-1', questionId, sessionId,
  turnId: 'turn-1', prompt: 'Pick one', status: 'pending', requestedAt: 1,
});

const approvalAsked = (sessionId: string, approvalId: string, sequence: string): CanonicalEvent => ({
  type: 'approval.requested', sessionId, epoch: EPOCH, sequence, timestamp: Number(sequence), approval: approval(sessionId, approvalId),
});

const approvalResolved = (sessionId: string, approvalId: string, sequence: string): CanonicalEvent => ({
  type: 'approval.resolved', sessionId, epoch: EPOCH, sequence, timestamp: Number(sequence),
  approval: { ...approval(sessionId, approvalId), version: '2', status: 'approved', resolvedAt: Number(sequence), resolution: { decision: 'approve' } },
});

const questionAsked = (sessionId: string, questionId: string, sequence: string): CanonicalEvent => ({
  type: 'question.requested', sessionId, epoch: EPOCH, sequence, timestamp: Number(sequence), question: question(sessionId, questionId),
});

const questionResolved = (sessionId: string, questionId: string, sequence: string): CanonicalEvent => ({
  type: 'question.resolved', sessionId, epoch: EPOCH, sequence, timestamp: Number(sequence),
  question: {
    ...question(sessionId, questionId), version: '2', status: 'answered',
    response: { answer: true }, answeredAt: Number(sequence), resolvedAt: Number(sequence),
  },
});

describe('usePendingRequests', () => {
  test('covers the whole family, ignores other sessions, and clears on reply', async () => {
    const dom = installHookTestDom();
    const root = createRoot(dom.container);
    type PendingCapture = { renders: number; pending: PendingRequests | null };
    const capture: PendingCapture = { renders: 0, pending: null };
    const Harness = () => {
      capture.renders += 1;
      capture.pending = usePendingRequests(FAMILY);
      return null;
    };
    try {
      await act(async () => root.render(React.createElement(Harness)));
      expect(capture.pending).toEqual({ hasPermission: false, hasForm: false });

      // A request in an unrelated session neither shows nor re-renders the row.
      const idleRenders = capture.renders;
      await act(async () => applyGlobalBlockingRequestEvents('/other', [approvalAsked('unrelated', 'p-other', '1')]));
      expect(capture.renders).toBe(idleRenders);

      // A subagent's permission and the parent's question both land on the row.
      await act(async () => applyGlobalBlockingRequestEvents('/workspace', [
        approvalAsked('child', 'p1', '2'),
        questionAsked('parent', 'q1', '3'),
      ]));
      expect(capture.pending).toEqual({ hasPermission: true, hasForm: true });

      // A second request of the same kind changes nothing the row shows.
      const pendingRenders = capture.renders;
      await act(async () => applyGlobalBlockingRequestEvents('/workspace', [
        approvalAsked('parent', 'p2', '4'),
      ]));
      expect(capture.renders).toBe(pendingRenders);

      await act(async () => applyGlobalBlockingRequestEvents('/workspace', [
        approvalResolved('child', 'p1', '5'),
        approvalResolved('parent', 'p2', '6'),
        questionResolved('parent', 'q1', '7'),
      ]));
      expect(capture.pending).toEqual({ hasPermission: false, hasForm: false });
    } finally {
      await act(async () => root.unmount());
      resetGlobalBlockingRequests();
      dom.restore();
    }
  });
});
