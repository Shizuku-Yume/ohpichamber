import { expect, test } from 'bun:test';
import { catalogModelInfo } from './catalog-model-info.ts';

test('a bundled provider row resolves from that provider list', () => {
  expect(catalogModelInfo('gpt-5.6', 'openai')).toMatchObject({
    source: 'omp-catalog', input: ['text', 'image'], contextWindow: 1050000, maxTokens: 128000,
    cost: { input: 4, output: 20, cacheRead: 0.4, cacheWrite: 5 }, reasoning: true, family: 'gpt',
  });
});

test('a reseller-affixed id falls back to proxy reference matching', () => {
  const info = catalogModelInfo('[Kiro] claude-opus-4-6');
  expect(info).toMatchObject({ source: 'omp-catalog', family: 'opus', reasoning: true });
  expect(info?.contextWindow).toBeGreaterThan(0);
  expect(info?.maxTokens).toBeGreaterThan(0);
});

test('an unknown id resolves to nothing rather than an invented row', () => {
  expect(catalogModelInfo('not-a-catalogued-model')).toBeUndefined();
  expect(catalogModelInfo('not-a-catalogued-model', 'openai')).toBeUndefined();
});
