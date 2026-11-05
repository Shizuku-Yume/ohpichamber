import { z } from 'zod';
import {
  RunningShellSchema, ShellOutputRequestSchema, ShellOutputSchema, ShellSnapshotSchema,
  ShellStartRequestSchema, ShellStopRequestSchema, ShellStopResultSchema,
  ShellStreamRequestSchema, ShellStreamResponseSchema, ShellStdinRequestSchema, ShellStdinResultSchema,
} from '@openchamber/agent-contract';
export const ShellOperationSchema = z.discriminatedUnion('type', [
  z.strictObject({ type: z.literal('start'), request: ShellStartRequestSchema }),
  z.strictObject({ type: z.literal('output'), request: ShellOutputRequestSchema }),
  z.strictObject({ type: z.literal('snapshot') }),
  z.strictObject({ type: z.literal('stop'), request: ShellStopRequestSchema }),
  z.strictObject({ type: z.literal('stream'), request: ShellStreamRequestSchema }),
  z.strictObject({ type: z.literal('stdin'), request: ShellStdinRequestSchema }),
]);
export type ShellOperation = z.infer<typeof ShellOperationSchema>;
export const ShellResultSchema = z.discriminatedUnion('type', [
  z.strictObject({ type: z.literal('start'), job: RunningShellSchema }),
  z.strictObject({ type: z.literal('output'), output: ShellOutputSchema }),
  z.strictObject({ type: z.literal('snapshot'), snapshot: ShellSnapshotSchema }),
  z.strictObject({ type: z.literal('stop'), result: ShellStopResultSchema }),
  z.strictObject({ type: z.literal('stream'), stream: ShellStreamResponseSchema }),
  z.strictObject({ type: z.literal('stdin'), result: ShellStdinResultSchema }),
]);
export type ShellResult=z.infer<typeof ShellResultSchema>;
