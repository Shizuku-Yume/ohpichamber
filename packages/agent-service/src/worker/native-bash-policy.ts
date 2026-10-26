import type { ExtensionFactory } from '@oh-my-pi/pi-coding-agent/sdk';
import { JsonObjectSchema, type JsonObject } from '@openchamber/agent-contract';
import { ProjectionError } from '../projection/journal.ts';
import { NativeApprovalRequired } from './policy.ts';
import type { WorkerInteraction } from './interaction.ts';
import type { BashTool } from '@oh-my-pi/pi-coding-agent/tools/bash';

/** Delegate to the original SDK Bash only after Host consent is checked at execution. */
export function createNativeBashPolicyExtension({ interaction, authorize, approval, nativeAuthorized }: {
  interaction: WorkerInteraction;
  authorize: (toolCallId: string, input: JsonObject, approvalId?: string) => Promise<void>;
  approval: BashTool['approval'];
  nativeAuthorized: (toolCallId: string, input: JsonObject) => boolean;
}): ExtensionFactory {
  return api => {
    api.on('session_start', () => {
      const native = api.getAllTools().find(tool => tool.name === 'bash');
      if (!native) return;
      api.registerTool({
        // ToolInfo carries identity and schema, not the built-in's display
        // label; keep the BashTool label so the prompt inventory matches OMP.
        name: native.name, label: 'Bash', description: native.description,
        parameters: native.parameters, approval,
        async execute(toolCallId, params, signal, onUpdate, ctx) {
          signal?.throwIfAborted();
          const input = JsonObjectSchema.parse(params);
          const receipt = interaction.takeApprovalReceipt(toolCallId);
          try { await authorize(toolCallId, input, receipt); }
          catch (error) {
            if (!(error instanceof NativeApprovalRequired) || receipt !== undefined) throw error;
            // The native ACP permission gate may have authorized this exact call
            // without leaving a Host grant. Re-authorize that intent per execution.
            const nativeApproved = nativeAuthorized(toolCallId, input)
              ? await interaction.requestNativeGrant(toolCallId, input, signal)
              : await interaction.approveBash(toolCallId, input, signal);
            // A native yolo gate may skip its dialog; it cannot skip explicit Host consent.
            if (!nativeApproved) throw new ProjectionError(403, 'UNAUTHORIZED', 'Native command approval was rejected');
            const approvalId = interaction.takeApprovalReceipt(toolCallId);
            if (!approvalId) throw new ProjectionError(403, 'UNAUTHORIZED', 'Native command approval is unavailable');
            await authorize(toolCallId, input, approvalId);
          }
          signal?.throwIfAborted();
          if (!ctx.invokeTool) throw new ProjectionError(503, 'SERVICE_UNAVAILABLE', 'Original native Bash execution is unavailable');
          return ctx.invokeTool(input, { signal, onUpdate });
        },
      });
    });
  };
}
