import { describe, expect, test } from 'bun:test';
import type { Model, Provider } from '@openchamber/agent-contract';
import { DEFAULT_CONTEXT_LIMIT, EMPTY_TOKEN_BREAKDOWN, readTokenBreakdown, resolveContextModel } from './contextSidebarModel';

const model = (providerId: string, modelId: string, contextWindow: number, maxOutputTokens = 100): Model => ({
  modelId, provider: providerId, name: modelId, modalities: ['text' as const],
  contextWindow, maxOutputTokens, reasoningEffortSupported: false, reasoningOptions: [], variants: [],
  toolsSupported: true, enabled: true, status: 'active' as const, pricing: null,
});
type ContextProvider = Provider & { models: Model[] };
const provider = (providerId: string, models: Model[]): ContextProvider => ({
  providerId, name: `${providerId} display`, endpoint: null, protocol: null,
  authMethods: [], auth: { status: 'missing' as const }, models,
});

describe('context sidebar model resolution', () => {
  test('names the answering model when one exists, before any configured pair', () => {
    const providers = [provider('openai', [model('openai', 'gpt-5', 400_000)])];
    expect(resolveContextModel({
      providers,
      answering: { providerId: 'openai', modelId: 'gpt-5' },
      sessionSelection: { providerId: 'zai', modelId: 'glm' },
      configured: { providerId: 'zai', modelId: 'glm' },
    })).toEqual({ providerName: 'openai display', modelName: 'gpt-5', contextLimit: 400_000 });
  });

  test('a session with no answer shows its own selected model, not the composer pair of another directory', () => {
    // Active directory B's composer pair names zai/glm; the session lives in
    // directory A and carries its own selection of openai/gpt-5.
    const providers = [provider('openai', [model('openai', 'gpt-5', 400_000)]), provider('zai', [model('zai', 'glm', 1_000_000)])];
    const resolved = resolveContextModel({
      providers,
      answering: null,
      sessionSelection: { providerId: 'openai', modelId: 'gpt-5' },
      configured: null,
    });
    expect(resolved).toEqual({ providerName: 'openai display', modelName: 'gpt-5', contextLimit: 400_000 });
    expect(resolved.providerName).not.toContain('zai');
  });

  test('a half pair is never completed from another source', () => {
    const providers = [provider('openai', [model('openai', 'gpt-5', 400_000)])];
    // The session names provider only; the configured pair names model only.
    // Neither describes a model, so the readout stays at its default instead
    // of inventing openai/gpt-5.
    expect(resolveContextModel({
      providers,
      sessionSelection: { providerId: 'openai', modelId: '' },
      configured: { providerId: '', modelId: 'gpt-5' },
    })).toEqual({ providerName: '-', modelName: '-', contextLimit: DEFAULT_CONTEXT_LIMIT });
  });

  test('an absent or zero catalog window reports the default instead of - / - and 0.0%', () => {
    const providers = [
      provider('openai', [model('openai', 'gpt-5', 0)]),
      provider('local', [model('local', 'tiny', 0)]),
    ];
    for (const pair of [{ providerId: 'openai', modelId: 'gpt-5' }, { providerId: 'local', modelId: 'tiny' }, { providerId: 'missing', modelId: 'gone' }]) {
      expect(resolveContextModel({ providers, answering: pair }).contextLimit).toBe(DEFAULT_CONTEXT_LIMIT);
    }
  });
});

describe('context sidebar token breakdown', () => {
  test('reports provider reasoning without touching the provider total', () => {
    const breakdown = readTokenBreakdown({
      input: 2_300, output: 466, cacheRead: 8_086, cacheWrite: 0, totalTokens: 10_852,
      reasoning: 3,
      cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
    });
    expect(breakdown.reasoning).toBe(3);
    // The provider's total already counts every token it billed; reasoning is
    // informational and must not be added on top of it.
    expect(breakdown.total).toBe(10_852);
  });

  test('a usage record without reasoning reports zero', () => {
    expect(readTokenBreakdown({
      input: 1, output: 1, cacheRead: 0, cacheWrite: 0, totalTokens: 2,
      cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
    }).reasoning).toBe(0);
    expect(readTokenBreakdown(undefined)).toEqual(EMPTY_TOKEN_BREAKDOWN);
  });
});
