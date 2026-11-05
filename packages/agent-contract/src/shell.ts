import { z } from 'zod';
import { CounterSchema, EntityIdSchema, EpochSchema, TimestampSchema } from './primitives.ts';

export const ShellScopeSchema = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('session'), sessionId: EntityIdSchema }),
  z.strictObject({ kind: z.literal('workspace'), workspaceId: EntityIdSchema }),
  z.strictObject({ kind: z.literal('project'), projectId: EntityIdSchema }),
  z.strictObject({ kind: z.literal('global') }),
]);
export type ShellScope = z.infer<typeof ShellScopeSchema>;

const ShellJobIdentityFields = {
  jobId: EntityIdSchema,
  sessionId: EntityIdSchema,
  epoch: EpochSchema,
  workerGeneration: EntityIdSchema,
};
export const ShellJobIdentitySchema = z.strictObject(ShellJobIdentityFields);
export type ShellJobIdentity = z.infer<typeof ShellJobIdentitySchema>;

export const ShellTerminationSchema = z.discriminatedUnion('reason', [
  z.strictObject({ reason: z.literal('exit'), exitCode: z.number().int() }),
  z.strictObject({ reason: z.literal('stopped'), exitCode: z.number().int().nullable() }),
  z.strictObject({ reason: z.literal('timeout'), exitCode: z.number().int().nullable() }),
  z.strictObject({ reason: z.literal('signal'), exitCode: z.number().int().nullable() }),
  z.strictObject({ reason: z.literal('worker-lost'), exitCode: z.null() }),
]);
export type ShellTermination = z.infer<typeof ShellTerminationSchema>;

export const PipeStreamSummarySchema = z.strictObject({
  id: z.number().int().positive(),
  producer: z.string(),
  consumer: z.string(),
  total: z.number().int().nonnegative(),
  open: z.boolean(),
});
export type PipeStreamSummary = z.infer<typeof PipeStreamSummarySchema>;

export const JobWidgetToneSchema = z.enum(['success', 'error', 'warning', 'info', 'muted', 'accent']);
export type JobWidgetTone = z.infer<typeof JobWidgetToneSchema>;

export const JobWidgetTrendSchema = z.strictObject({
  text: z.string(),
  tone: z.enum(['success', 'error', 'muted']),
});
export type JobWidgetTrend = z.infer<typeof JobWidgetTrendSchema>;

export const JobWidgetHeadlineSchema = z.strictObject({
  text: z.string(),
  label: z.string().optional(),
  trend: JobWidgetTrendSchema.optional(),
});
export type JobWidgetHeadline = z.infer<typeof JobWidgetHeadlineSchema>;

export const JobWidgetSparkBlockSchema = z.strictObject({
  kind: z.literal('spark'),
  label: z.string(),
  values: z.array(z.number()),
  min: z.number(),
  max: z.number(),
  marks: z.array(z.strictObject({
    value: z.number(),
    label: z.string(),
    tone: JobWidgetToneSchema.optional(),
  })).optional(),
  last: z.string(),
  tips: z.array(z.string()).optional(),
  tone: JobWidgetToneSchema.optional(),
});
export type JobWidgetSparkBlock = z.infer<typeof JobWidgetSparkBlockSchema>;

export const JobWidgetBarsBlockSchema = z.strictObject({
  kind: z.literal('bars'),
  label: z.string(),
  items: z.array(z.strictObject({
    label: z.string(),
    value: z.number(),
    text: z.string(),
    tone: JobWidgetToneSchema.optional(),
  })),
  max: z.number(),
});
export type JobWidgetBarsBlock = z.infer<typeof JobWidgetBarsBlockSchema>;

export const JobWidgetMeterBlockSchema = z.strictObject({
  kind: z.literal('meter'),
  label: z.string(),
  value: z.number(),
  text: z.string(),
  tone: JobWidgetToneSchema.optional(),
});
export type JobWidgetMeterBlock = z.infer<typeof JobWidgetMeterBlockSchema>;

export const JobWidgetStatBlockSchema = z.strictObject({
  kind: z.literal('stat'),
  items: z.array(z.strictObject({
    label: z.string(),
    text: z.string(),
    tone: JobWidgetToneSchema.optional(),
    trend: JobWidgetTrendSchema.optional(),
  })),
});
export type JobWidgetStatBlock = z.infer<typeof JobWidgetStatBlockSchema>;

export const JobWidgetGridBlockSchema = z.strictObject({
  kind: z.literal('grid'),
  label: z.string(),
  items: z.array(z.strictObject({
    label: z.string(),
    text: z.string(),
    tone: JobWidgetToneSchema,
  })),
});
export type JobWidgetGridBlock = z.infer<typeof JobWidgetGridBlockSchema>;

export const JobWidgetTextBlockSchema = z.strictObject({
  kind: z.literal('text'),
  text: z.string(),
});
export type JobWidgetTextBlock = z.infer<typeof JobWidgetTextBlockSchema>;

export const JobWidgetBlockSchema = z.discriminatedUnion('kind', [
  JobWidgetSparkBlockSchema,
  JobWidgetBarsBlockSchema,
  JobWidgetMeterBlockSchema,
  JobWidgetStatBlockSchema,
  JobWidgetGridBlockSchema,
  JobWidgetTextBlockSchema,
]);
export type JobWidgetBlock = z.infer<typeof JobWidgetBlockSchema>;

export const JobWidgetViewSchema = z.strictObject({
  title: z.string(),
  headline: JobWidgetHeadlineSchema.optional(),
  stage: z.string().optional(),
  blocks: z.array(JobWidgetBlockSchema),
  state: z.enum(['authoring', 'live', 'fallback']),
  updatedAt: TimestampSchema,
});
export type JobWidgetView = z.infer<typeof JobWidgetViewSchema>;

const ShellObservationFields = {
  ...ShellJobIdentityFields,
  workspaceId: EntityIdSchema,
  projectId: EntityIdSchema,
  command: z.string().min(1),
  background: z.boolean(),
  startedAt: TimestampSchema,
  outputCursor: CounterSchema,
  intent: z.string().optional(),
  caption: z.string().optional(),
  pids: z.array(z.number().int()).optional(),
  streams: z.array(PipeStreamSummarySchema).optional(),
  widget: JobWidgetViewSchema.optional(),
  serviceName: z.string().optional(),
  serviceMode: z.enum(['persist', 'session', 'detached']).optional(),
  canReceiveStdin: z.boolean().optional(),
};
export const RunningShellSchema = z.strictObject({ ...ShellObservationFields, status: z.literal('running') });
export type RunningShell = z.infer<typeof RunningShellSchema>;
const EndedShellSchema = z.strictObject({
  ...ShellObservationFields,
  status: z.literal('ended'),
  endedAt: TimestampSchema,
  termination: ShellTerminationSchema,
}).refine((job) => job.endedAt >= job.startedAt, 'Shell termination follows its start');
export type EndedShell = z.infer<typeof EndedShellSchema>;

export const ShellJobSchema = z.discriminatedUnion('status', [RunningShellSchema, EndedShellSchema]);
export type ShellJob = z.infer<typeof ShellJobSchema>;

export const ShellSnapshotSchema = z.strictObject({
  scope: ShellScopeSchema,
  epoch: EpochSchema,
  revision: CounterSchema,
  running: z.array(RunningShellSchema),
  ended: z.array(EndedShellSchema).max(200),
  recovery: z.strictObject({ priorEpochs: z.literal('invalidated') }),
}).superRefine((snapshot, context) => {
  const jobs = [...snapshot.running, ...snapshot.ended];
  if (new Set(jobs.map((job) => JSON.stringify([job.sessionId, job.workerGeneration, job.jobId]))).size !== jobs.length) {
    context.addIssue({ code: 'custom', message: 'Scoped Shell observations contain each job once' });
  }
  if (jobs.some((job) => job.epoch !== snapshot.epoch
    || (snapshot.scope.kind === 'workspace' && job.workspaceId !== snapshot.scope.workspaceId)
    || (snapshot.scope.kind === 'project' && job.projectId !== snapshot.scope.projectId))) {
    context.addIssue({ code: 'custom', message: 'Jobs belong to the authorized scope and current observation epoch' });
  }
  if (snapshot.ended.some((job, index) => index > 0 && job.endedAt < snapshot.ended[index - 1].endedAt)) {
    context.addIssue({ code: 'custom', path: ['ended'], message: 'Newest-200 ended history is ordered oldest end first' });
  }
});
export type ShellSnapshot = z.infer<typeof ShellSnapshotSchema>;

export const ShellStartRequestSchema = z.strictObject({
  command: z.string().min(1),
  background: z.boolean(),
  timeoutMs: z.number().int().positive().optional(),
});
export type ShellStartRequest = z.infer<typeof ShellStartRequestSchema>;

export const ShellOutputRequestSchema = z.strictObject({
  job: ShellJobIdentitySchema,
  cursor: CounterSchema,
  tailBytes: z.number().int().positive().max(65536),
});
export type ShellOutputRequest = z.infer<typeof ShellOutputRequestSchema>;

export const ShellOutputSchema = z.strictObject({
  job: ShellJobIdentitySchema,
  requestedCursor: CounterSchema,
  startCursor: CounterSchema,
  cursor: CounterSchema,
  skippedBytes: CounterSchema,
  output: z.string().refine((output) => new TextEncoder().encode(output).byteLength <= 65536, 'Shell output is at most 64 KiB of UTF-8'),
  ended: z.boolean(),
}).refine((output) => {
  // Zod string constraints can report issues without stopping object refinements.
  try {
    const requested = BigInt(output.requestedCursor);
    const start = BigInt(output.startCursor);
    const end = BigInt(output.cursor);
    return start === requested + BigInt(output.skippedBytes)
      && end === start + BigInt(new TextEncoder().encode(output.output).byteLength);
  } catch {
    return false;
  }
}, 'Output byte range and skipped-byte count match the emitted UTF-8 stream');
export type ShellOutput = z.infer<typeof ShellOutputSchema>;

export const ShellStopRequestSchema = z.strictObject({ job: ShellJobIdentitySchema });
export type ShellStopRequest = z.infer<typeof ShellStopRequestSchema>;

export const ShellStopResultSchema = z.strictObject({ job: EndedShellSchema }).refine(
  (result) => result.job.termination.reason === 'stopped', 'A successful stop acknowledges actual terminal cancellation',
);
export type ShellStopResult = z.infer<typeof ShellStopResultSchema>;

export const ShellStreamRequestSchema = z.strictObject({
  job: ShellJobIdentitySchema,
  streamId: z.number().int().positive(),
  from: z.number().int().nonnegative().optional(),
});
export type ShellStreamRequest = z.infer<typeof ShellStreamRequestSchema>;

export const ShellStreamResponseSchema = z.strictObject({
  job: ShellJobIdentitySchema,
  streamId: z.number().int().positive(),
  start: z.number().int().nonnegative(),
  end: z.number().int().nonnegative(),
  chunk: z.string(),
  open: z.boolean(),
});
export type ShellStreamResponse = z.infer<typeof ShellStreamResponseSchema>;

export const ShellStdinRequestSchema = z.strictObject({
  job: ShellJobIdentitySchema,
  input: z.string(),
});
export type ShellStdinRequest = z.infer<typeof ShellStdinRequestSchema>;

export const ShellStdinResultSchema = z.strictObject({
  job: ShellJobIdentitySchema,
  writtenBytes: z.number().int().nonnegative(),
});
export type ShellStdinResult = z.infer<typeof ShellStdinResultSchema>;
