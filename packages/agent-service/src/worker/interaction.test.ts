import { expect, test } from 'bun:test';
import type { PlanReviewResponse } from '@openchamber/agent-contract';
import type { WorkerInteraction as InteractionMessage } from '../protocol.ts';
import { WorkerInteraction } from './interaction.ts';

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
