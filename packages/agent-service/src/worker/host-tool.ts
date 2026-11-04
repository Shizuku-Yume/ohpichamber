import type { ExtensionFactory } from '@oh-my-pi/pi-coding-agent/sdk';
import { z } from 'zod';
import { JsonObjectSchema, type JsonValue } from '@openchamber/agent-contract';
import { HostActionRequestSchema, type HostActionRequest } from '../native-policy-protocol.ts';

export interface HostToolScope { sessionId: string; rootSessionId: string; workspaceId: string }
export interface HostToolInvocation extends HostToolScope { request: HostActionRequest; signal: AbortSignal }
export function createHostToolExtension({ scope, invoke }: { scope: HostToolScope; invoke: (request: HostToolInvocation) => Promise<JsonValue> }): ExtensionFactory {
  const captured = Object.freeze({ ...scope });
  return api => {
    const descriptions = {
      openchamber: 'Invoke retained OpenChamber project/model, session, schedule or file.open actions in the captured workspace.',
      openchamber_knowledge: "The project's Notes, Todos and Plans, shown in OpenChamber's Project knowledge panel and shared by its sessions. One action per call. "
        + 'knowledge.list returns everything unless planId or ready narrows it; read it before answering a question the project notes may hold. '
        + 'knowledge.save requires kind and body; with id it replaces, and an update may send only completed, planId or dependsOn. '
        + 'Notes are short facts the user wants at hand; your own learnings go to memory. Todos are the user\'s backlog: add one when asked or when you stop with work left, never for the steps of your current task. '
        + 'Plans are markdown files: list gives their paths, and read or edit one with your file tools; save creates or replaces one whole. '
        + 'knowledge.show opens a plan for the user. knowledge.delete requires kind and id.', 
      web: 'Invoke retained browser navigation, snapshot, interaction, inspection, capture and resize actions. Browser credentials remain with the Host.',
      memory: 'Invoke memory.read, memory.list, memory.save or memory.delete in the captured session.',
      notify: 'Invoke notify.send for an authorized OpenChamber notification.',
    } satisfies Record<HostActionRequest['toolName'], string>;
    for (const toolName of ['openchamber', 'web', 'memory', 'openchamber_knowledge', 'notify'] as const) {
      const parameters = api.typebox.Type.Object({
        action: api.typebox.Type.String(),
        input: api.typebox.Type.Record(api.typebox.Type.String(), api.typebox.Type.Unknown()),
      });
      api.registerTool<typeof parameters>({
        name: toolName, label: toolName, description: descriptions[toolName], parameters, approval: 'exec',
        async execute(_toolCallId, params, signal) {
          const cancellation = signal ?? new AbortController().signal;
          cancellation.throwIfAborted();
          const input = JsonObjectSchema.parse(params);
          const action = z.string().safeParse(input.action);
          const toolInput = JsonObjectSchema.parse(input.input);
          const parsed = HostActionRequestSchema.parse({ sessionId: captured.sessionId, toolName, action: action.success ? action.data : '', input: toolInput });
          const value = await invoke({ ...captured, request: parsed, signal: cancellation });
          cancellation.throwIfAborted();
          return { content: [{ type: 'text', text: JSON.stringify(value) }], details: value };
        },
      });
    }
  };
}
