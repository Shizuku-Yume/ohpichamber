import { describe, expect, it } from 'vitest';

import { resolveScheduledTaskOptions, resolveSessionDefaults } from './session-defaults.js';

describe('resolveSessionDefaults', () => {
  it('ignores legacy scheduled root-agent values when capturing a pinned task', () => {
    expect(resolveScheduledTaskOptions({ providerID: 'provider', modelID: 'model', agent: 'legacy-agent', variant: 'high' }))
      .toEqual({ providerId: 'provider', modelId: 'model', agentId: null, variant: 'high', reasoningEffort: null });
    expect(resolveScheduledTaskOptions({ useDefaults: true, providerID: 'provider', modelID: 'model', agent: 'legacy-agent', variant: 'high' }))
      .toEqual({ providerId: null, modelId: null, agentId: null, variant: null, reasoningEffort: null });
  });
  it('resolves model and variant defaults without a root agent', () => {
    const settings = { defaultModel: 'anthropic/claude-sonnet-5', defaultVariant: 'high', defaultAgent: 'build' };
    expect(resolveSessionDefaults({ settings, project: { defaultModel: 'openai/gpt-6', defaultAgent: 'plan' } }))
      .toEqual({ providerId: 'openai', modelId: 'gpt-6', variant: null, agentId: null, reasoningEffort: null });
    expect(resolveSessionDefaults({ settings, project: {} }))
      .toEqual({ providerId: 'anthropic', modelId: 'claude-sonnet-5', variant: 'high', agentId: null, reasoningEffort: null });
  });


});
