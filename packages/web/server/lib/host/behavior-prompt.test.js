import { describe, expect, it } from 'vitest';
import { PromptRequestSchema } from '@openchamber/agent-contract';
import { createHostPromptDeliveryRuntime } from './prompt-delivery-runtime.js';
import { createBehaviorPromptSource, resolveBehaviorPromptContext } from './behavior-prompt.js';

const emptyQuery = () => ({ kind: 'context', text: '', metadata: {} });

describe('resolveBehaviorPromptContext', () => {
  it('contributes nothing when the profile sets no behavior text', () => {
    expect(resolveBehaviorPromptContext(null)).toEqual([]);
    expect(resolveBehaviorPromptContext({})).toEqual([]);
  });

  it('contributes nothing for an empty or whitespace-only instruction', () => {
    expect(resolveBehaviorPromptContext({ responseStyleEnabled: true, responseStyleInstruction: '' })).toEqual([]);
    expect(resolveBehaviorPromptContext({ responseStyleEnabled: true, responseStyleInstruction: '   \n ' })).toEqual([]);
    expect(resolveBehaviorPromptContext({ responseStyleEnabled: true, responseStyleInstruction: '\t' })).toEqual([]);
  });

  it('never re-sends AGENTS.md rules that OMP already loads as context files', () => {
    expect(resolveBehaviorPromptContext({
      globalBehaviorPrompt: 'Follow the repository rules.',
      responseStyleEnabled: true,
      responseStyleInstruction: 'Keep replies short.',
    })).toEqual([{ kind: 'instruction', text: 'Keep replies short.' }]);
    expect(resolveBehaviorPromptContext({ globalBehaviorPrompt: 'Follow the repository rules.' })).toEqual([]);
  });

  it('contributes nothing for a blank custom preset, which stores an empty instruction', () => {
    expect(resolveBehaviorPromptContext({ responseStyleEnabled: true, responseStylePreset: 'custom', responseStyleInstruction: '' })).toEqual([]);
  });

  it('never sends the style text while the response-style switch is off', () => {
    expect(resolveBehaviorPromptContext({ responseStyleInstruction: 'Keep replies short.' })).toEqual([]);
    expect(resolveBehaviorPromptContext({ responseStyleEnabled: false, responseStyleInstruction: 'Keep replies short.' })).toEqual([]);
    expect(resolveBehaviorPromptContext({ responseStyleEnabled: true, responseStyleInstruction: 'Keep replies short.' }))
      .toEqual([{ kind: 'instruction', text: 'Keep replies short.' }]);
  });

  it('sends the non-default style as one instruction context', () => {
    expect(resolveBehaviorPromptContext({ responseStyleEnabled: true, responseStyleInstruction: 'Keep replies short.' }))
      .toEqual([{ kind: 'instruction', text: 'Keep replies short.' }]);
  });
});

describe('createBehaviorPromptSource', () => {
  it('reads the merged settings document and returns the resolved contexts', () => {
    const source = createBehaviorPromptSource({
      readMergedSettings: () => ({ responseStyleEnabled: true, responseStyleInstruction: 'Concise' }),
    });
    expect(source()).toEqual([{ kind: 'instruction', text: 'Concise' }]);
  });
});

describe('prompt delivery with behavior text', () => {
  const scope = { sessionId: 'ses_1', rootSessionId: 'ses_1', projectId: 'proj_1', workspaceId: 'ws_1', cwd: '/repo' };

  const setup = (behaviorPromptSource) => {
    const runtime = createHostPromptDeliveryRuntime({
      resolveSessionScope: async () => scope,
      routingRuntime: { resolveAutoSelection: async () => null },
      sessionKnowledgeRuntime: { resolvePendingForSession: async () => ({ text: '', signature: '' }) },
      sessionRuntime: { markUserMessageSent: () => {} },
      behaviorPromptSource,
    });
    return runtime;
  };

  const request = () => PromptRequestSchema.parse({
    input: { text: 'hi', attachments: [], context: [] },
    options: { providerId: 'openai', modelId: 'gpt-4o', agentId: null, variant: null, reasoningEffort: null },
  });

  it('adds exactly zero prompt bytes when nothing is configured', async () => {
    for (const source of [undefined, async () => [], async () => null]) {
      const captured = await setup(source).capturePrompt(scope, request());
      expect(captured.input.context).toEqual([]);
      expect(captured.input.text).toBe('hi');
      expect(JSON.stringify(captured)).not.toContain('instruction');
    }
  });

  it('delivers a non-default style as an instruction without changing the user text', async () => {
    const captured = await setup(async () => [{ kind: 'instruction', text: 'Keep replies short.' }])
      .capturePrompt(scope, request());
    expect(captured.input.text).toBe('hi');
    expect(captured.input.context).toEqual([{ kind: 'instruction', text: 'Keep replies short.' }]);
    expect(JSON.stringify(captured)).not.toContain('system-reminder');
  });

  it('keeps captured project context and adds behavior after it', async () => {
    const withContext = PromptRequestSchema.parse({
      input: { text: 'hi', attachments: [], context: [emptyQuery()] },
      options: { providerId: 'openai', modelId: 'gpt-4o', agentId: null, variant: null, reasoningEffort: null },
    });
    const captured = await setup(async () => [{ kind: 'instruction', text: 'Warm peer.' }])
      .capturePrompt(scope, withContext);
    expect(captured.input.context).toEqual([emptyQuery(), { kind: 'instruction', text: 'Warm peer.' }]);
  });
});
