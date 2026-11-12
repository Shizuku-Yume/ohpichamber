import { describe, expect, test } from 'bun:test';
import type { HostToolInvocation } from './host-tool.ts';
import { createHostToolExtension } from './host-tool.ts';

interface RegisteredToolStub {
  name: string;
  label: string;
  description: string;
  approval: string;
  loadMode: string;
  execute: (callId: string, params: Record<string, unknown>, signal?: AbortSignal) => Promise<{ content: Array<{ type: string; text: string }>; details: unknown }>;
}

describe('createHostToolExtension', () => {
  test('registers openchamber_image and dispatches image.generate to host action invoker', async () => {
    const registeredTools = new Map<string, RegisteredToolStub>();
    const mockApi = {
      typebox: {
        Type: {
          Object: (props: unknown) => ({ type: 'object', properties: props }),
          String: () => ({ type: 'string' }),
          Record: () => ({ type: 'object' }),
          Unknown: () => ({}),
        },
      },
      registerTool: (tool: RegisteredToolStub) => {
        registeredTools.set(tool.name, tool);
      },
    };

    let capturedInvocation: HostToolInvocation | null = null;
    const extension = createHostToolExtension({
      scope: { sessionId: 'session-123', rootSessionId: 'root-123', workspaceId: 'ws-123' },
      invoke: async (invocation) => {
        capturedInvocation = invocation;
        return { ok: true, path: '/tmp/generated.png' };
      },
    });

    extension(mockApi as never);

    // Verify all tools are registered including openchamber_image
    expect(registeredTools.has('openchamber')).toBe(true);
    expect(registeredTools.has('web')).toBe(true);
    expect(registeredTools.has('memory')).toBe(true);
    expect(registeredTools.has('openchamber_knowledge')).toBe(true);
    expect(registeredTools.has('notify')).toBe(true);
    expect(registeredTools.has('openchamber_image')).toBe(true);

    // Execute openchamber_image tool call
    const imageTool = registeredTools.get('openchamber_image');
    expect(imageTool).toBeDefined();
    const result = await imageTool!.execute('call-1', {
      action: 'image.generate',
      input: { prompt: 'a beautiful sunrise', count: 1 },
    });

    expect(result.details).toEqual({ ok: true, path: '/tmp/generated.png' });
    expect(capturedInvocation).not.toBeNull();
    expect(capturedInvocation!.request).toEqual({
      sessionId: 'session-123',
      toolName: 'openchamber_image',
      action: 'image.generate',
      input: { prompt: 'a beautiful sunrise', count: 1 },
    });
  });
});

test('openchamber_render is registered and carries its call id and answer envelope', async () => {
  const registeredTools = new Map<string, RegisteredToolStub>();
  const mockApi = {
    typebox: {
      Type: {
        Object: (props: unknown) => ({ type: 'object', properties: props }),
        String: () => ({ type: 'string' }),
        Record: () => ({ type: 'object' }),
        Unknown: () => ({}),
      },
    },
    registerTool: (tool: RegisteredToolStub) => { registeredTools.set(tool.name, tool); },
  };
  const invocations: HostToolInvocation[] = [];
  const extension = createHostToolExtension({
    scope: { sessionId: 'session-123', rootSessionId: 'root-123', workspaceId: 'ws-123' },
    invoke: async (invocation) => {
      invocations.push(invocation);
      return { title: 'Fixture page', answer: { answered: true, summary: 'Chose the first', data: { choice: 1 } } };
    },
  });
  extension(mockApi as never);
  expect(registeredTools.has('openchamber_render')).toBe(true);
  const result = await registeredTools.get('openchamber_render')!.execute('call-render', {
    action: 'render.page',
    input: { html: '<h1>Fixture</h1>', title: 'Fixture page', awaitAnswer: true },
  });
  expect(invocations[0]?.request).toEqual({
    sessionId: 'session-123', toolName: 'openchamber_render', action: 'render.page',
    input: { html: '<h1>Fixture</h1>', title: 'Fixture page', awaitAnswer: true }, toolCallId: 'call-render',
  });
  expect(result.details).toMatchObject({
    ok: true, action: 'render.page',
    openchamber: { schemaVersion: 1, ok: true, action: 'render.page', answer: { answered: true, summary: 'Chose the first' } },
  });
});
