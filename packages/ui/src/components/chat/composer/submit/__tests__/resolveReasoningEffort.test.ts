import { expect, test } from 'bun:test';
import type { Model } from '@openchamber/agent-contract';
import { resolveReasoningEffortToSend } from '../resolveReasoningEffort';

const model = (efforts: string[]): Model => ({
  modelId: 'model', provider: 'provider', name: 'Model', modalities: ['text'],
  contextWindow: 1000, maxOutputTokens: 100, reasoningEffortSupported: true,
  reasoningOptions: efforts.map((reasoningEffort) => ({ reasoningEffort, label: reasoningEffort, budgetTokens: null })),
  variants: [], pricing: null,
});
const reasoning = model(['low', 'medium', 'high']);

test('a captured queue effort is delivered as captured, including unset and auto', () => {
  expect(resolveReasoningEffortToSend({ model: reasoning, captured: { reasoningEffort: undefined }, ompDefault: 'high' })).toBeUndefined();
  expect(resolveReasoningEffortToSend({ model: reasoning, captured: { reasoningEffort: 'auto' }, draft: 'low', ompDefault: 'high' })).toBeUndefined();
  expect(resolveReasoningEffortToSend({ model: reasoning, captured: { reasoningEffort: 'high' }, draft: 'low', ompDefault: 'medium' })).toBe('high');
  expect(resolveReasoningEffortToSend({ model: reasoning, captured: { reasoningEffort: 'off' }, ompDefault: 'high' })).toBe('off');
});

test('a live composer reads session, native, draft, then OMP default', () => {
  expect(resolveReasoningEffortToSend({ model: reasoning, session: 'low', native: 'high', draft: 'medium', ompDefault: 'high' })).toBe('low');
  expect(resolveReasoningEffortToSend({ model: reasoning, native: 'high', draft: 'low', ompDefault: 'medium' })).toBe('high');
  expect(resolveReasoningEffortToSend({ model: reasoning, draft: 'low', ompDefault: 'high' })).toBe('low');
  expect(resolveReasoningEffortToSend({ model: reasoning, ompDefault: 'high' })).toBe('high');
  expect(resolveReasoningEffortToSend({ model: reasoning, ompDefault: 'auto', draft: undefined })).toBeUndefined();
});

test('an effort the model cannot run and a non-reasoning model send nothing', () => {
  expect(resolveReasoningEffortToSend({ model: reasoning, session: 'xhigh' })).toBeUndefined();
  expect(resolveReasoningEffortToSend({ model: model([]), session: 'high' })).toBeUndefined();
});
