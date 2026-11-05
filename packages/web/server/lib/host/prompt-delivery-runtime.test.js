import { describe, expect, it, vi } from 'vitest';
import { PromptRequestSchema } from '@openchamber/agent-contract';
import { assertRootPromptAdmission } from '../message-queue/prompt-admission.js';
import { createHostPromptDeliveryRuntime } from './prompt-delivery-runtime.js';

describe('createHostPromptDeliveryRuntime', () => {
  const scope = {
    sessionId: 'ses_1',
    rootSessionId: 'ses_1',
    projectId: 'proj_1',
    workspaceId: 'ws_1',
    cwd: '/repo',
  };

  const setup = (overrides = {}) => {
    const resolveSessionScope = vi.fn(async (sessionId) => (sessionId === 'ses_1' ? scope : null));
    const resolveAutoSelection = vi.fn(async ({ model }) => {
      if (model?.providerId !== 'openchamber' || model?.modelId !== 'auto') return null;
      return {
        model: { providerId: 'anthropic', modelId: 'claude-3-7-sonnet', reasoningEffort: 'high' },
        agent: null,
        decision: { category: 'hard' },
      };
    });
    const resolvePendingForSession = vi.fn(async () => ({ text: '', signature: '' }));
    const markUserMessageSent = vi.fn();
    const scheduledTasksRuntime = {
      recordExecutionStarted: vi.fn(),
      recordExecutionCompleted: vi.fn(),
    };

    const runtime = createHostPromptDeliveryRuntime({
      resolveSessionScope,
      routingRuntime: { resolveAutoSelection },
      sessionKnowledgeRuntime: { resolvePendingForSession },
      sessionRuntime: { markUserMessageSent },
      scheduledTasksRuntime,
      ...overrides,
    });

    return {
      runtime,
      resolveSessionScope,
      resolveAutoSelection,
      resolvePendingForSession,
      markUserMessageSent,
    };
  };

  it('captures an openchamber/auto prompt by rewriting providerId, modelId, and reasoningEffort with null agentId', async () => {
    const { runtime, resolveAutoSelection } = setup();

    const request = PromptRequestSchema.parse({
      input: { text: 'implement complex feature', attachments: [], context: [] },
      options: {
        providerId: 'openchamber',
        modelId: 'auto',
        agentId: null,
        variant: null,
        reasoningEffort: null,
      },
    });

    const captured = await runtime.capturePrompt(scope, request);

    expect(resolveAutoSelection).toHaveBeenCalledWith({
      sessionId: 'ses_1',
      directory: '/repo',
      workspaceId: 'ws_1',
      model: { providerId: 'openchamber', modelId: 'auto' },
      agent: null,
      requestText: 'implement complex feature',
    });

    expect(captured.options).toMatchObject({
      providerId: 'anthropic',
      modelId: 'claude-3-7-sonnet',
      agentId: null,
      reasoningEffort: 'high',
      variant: null,
    });

    // Enforces Host prompt admission cleanly
    expect(() => assertRootPromptAdmission(captured)).not.toThrow();
  });

  it('leaves non-auto prompt options intact while enforcing null agentId admission', async () => {
    const { runtime, resolveAutoSelection } = setup();

    const request = PromptRequestSchema.parse({
      input: { text: 'simple question', attachments: [], context: [] },
      options: {
        providerId: 'openai',
        modelId: 'gpt-4o',
        agentId: null,
        variant: null,
        reasoningEffort: null,
      },
    });

    const captured = await runtime.capturePrompt(scope, request);

    expect(resolveAutoSelection).toHaveBeenCalled();
    expect(captured.options).toMatchObject({
      providerId: 'openai',
      modelId: 'gpt-4o',
      agentId: null,
      reasoningEffort: null,
      variant: null,
    });
    expect(() => assertRootPromptAdmission(captured)).not.toThrow();
  });
});
