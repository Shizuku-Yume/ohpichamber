import { z } from 'zod';
import { CatalogOperationErrorSchema, CatalogWorkerIdentitySchema } from './catalogs.ts';
import { CounterSchema, EntityIdSchema } from './primitives.ts';

export const CacheWarmingModeSchema = z.enum(['off', 'streaming', 'idle']);
export type CacheWarmingMode = z.infer<typeof CacheWarmingModeSchema>;

export const CacheWarmingStateSchema = z.strictObject({
  workspaceId: EntityIdSchema,
  revision: CounterSchema,
  mode: CacheWarmingModeSchema,
});
export type CacheWarmingState = z.infer<typeof CacheWarmingStateSchema>;

export const CacheWarmingUpdateRequestSchema = z.strictObject({
  expectedRevision: CounterSchema,
  mode: CacheWarmingModeSchema,
});
export type CacheWarmingUpdateRequest = z.infer<typeof CacheWarmingUpdateRequestSchema>;

export const CacheWarmingPartialWriteDetailsSchema = z.strictObject({
  workspaceId: EntityIdSchema,
  configuredMode: CacheWarmingModeSchema,
  currentRevision: CounterSchema,
  nativeConfigurationCommitted: z.literal(true),
  liveApplication: z.literal('not-started'),
});
export type CacheWarmingPartialWriteDetails = z.infer<typeof CacheWarmingPartialWriteDetailsSchema>;

export const CacheWarmingWorkerApplyOutcomeSchema = z.discriminatedUnion('outcome', [
  z.strictObject({
    worker: CatalogWorkerIdentitySchema,
    outcome: z.literal('applied'),
    mode: CacheWarmingModeSchema,
  }),
  z.strictObject({
    worker: CatalogWorkerIdentitySchema,
    outcome: z.literal('failed'),
    mode: CacheWarmingModeSchema,
    error: CatalogOperationErrorSchema,
  }),
]);
export type CacheWarmingWorkerApplyOutcome = z.infer<typeof CacheWarmingWorkerApplyOutcomeSchema>;

export const CacheWarmingApplyResultSchema = z.strictObject({
  persisted: CacheWarmingStateSchema,
  status: z.enum(['applied', 'partial', 'failed', 'no-active-workers']),
  workers: z.array(CacheWarmingWorkerApplyOutcomeSchema),
}).superRefine((result, context) => {
  const applied = result.workers.filter(worker => worker.outcome === 'applied').length;
  const failed = result.workers.length - applied;
  const status = applied > 0 ? (failed > 0 ? 'partial' : 'applied') : (failed > 0 ? 'failed' : 'no-active-workers');
  if (result.status !== status) {
    context.addIssue({ code: 'custom', path: ['status'], message: 'Status reflects every captured worker outcome' });
  }
  const identities = new Set<string>();
  result.workers.forEach((outcome, index) => {
    const identity = JSON.stringify([outcome.worker.rootSessionId, outcome.worker.workerGeneration]);
    if (identities.has(identity)) {
      context.addIssue({ code: 'custom', path: ['workers', index, 'worker'], message: 'Worker identities are unique' });
    }
    identities.add(identity);
    if (outcome.worker.workspaceId !== result.persisted.workspaceId) {
      context.addIssue({ code: 'custom', path: ['workers', index, 'worker', 'workspaceId'], message: 'Worker belongs to the persisted workspace' });
    }
    if (outcome.outcome === 'applied' && outcome.mode !== result.persisted.mode) {
      context.addIssue({ code: 'custom', path: ['workers', index, 'mode'], message: 'Applied mode matches the persisted mode' });
    }
  });
});
export type CacheWarmingApplyResult = z.infer<typeof CacheWarmingApplyResultSchema>;

export const SessionCacheWarmingStateSchema = z.strictObject({
  sessionId: EntityIdSchema,
  workspaceId: EntityIdSchema,
  revision: CounterSchema,
  mode: CacheWarmingModeSchema.nullable(),
  workspaceMode: CacheWarmingModeSchema,
  effectiveMode: CacheWarmingModeSchema,
}).superRefine((state, context) => {
  const expectedEffective = state.mode ?? state.workspaceMode;
  if (state.effectiveMode !== expectedEffective) {
    context.addIssue({
      code: 'custom',
      path: ['effectiveMode'],
      message: 'Effective mode equals the session override when set, otherwise the workspace mode',
    });
  }
  if (state.revision === '0' && state.mode !== null) {
    context.addIssue({
      code: 'custom',
      path: ['mode'],
      message: 'Revision 0 represents an unconfigured session inheriting workspace mode',
    });
  }
});
export type SessionCacheWarmingState = z.infer<typeof SessionCacheWarmingStateSchema>;

export const SessionCacheWarmingUpdateRequestSchema = z.strictObject({
  expectedRevision: CounterSchema,
  mode: CacheWarmingModeSchema.nullable(),
});
export type SessionCacheWarmingUpdateRequest = z.infer<typeof SessionCacheWarmingUpdateRequestSchema>;

export const SessionCacheWarmingApplyResultSchema = z.strictObject({
  persisted: SessionCacheWarmingStateSchema,
  status: z.enum(['applied', 'failed', 'no-active-worker']),
  worker: CacheWarmingWorkerApplyOutcomeSchema.nullable(),
}).superRefine((result, context) => {
  if (result.status === 'no-active-worker') {
    if (result.worker !== null) {
      context.addIssue({
        code: 'custom',
        path: ['worker'],
        message: 'No-active-worker status forbids a worker outcome',
      });
    }
    return;
  }
  if (result.worker === null) {
    context.addIssue({
      code: 'custom',
      path: ['worker'],
      message: 'Active worker status requires a worker outcome',
    });
    return;
  }
  if (result.worker.outcome !== result.status) {
    context.addIssue({
      code: 'custom',
      path: ['status'],
      message: 'Status matches the single session worker outcome',
    });
  }
  if (result.worker.worker.rootSessionId !== result.persisted.sessionId) {
    context.addIssue({
      code: 'custom',
      path: ['worker', 'worker', 'rootSessionId'],
      message: 'Worker rootSessionId matches the persisted sessionId',
    });
  }
  if (result.worker.worker.workspaceId !== result.persisted.workspaceId) {
    context.addIssue({
      code: 'custom',
      path: ['worker', 'worker', 'workspaceId'],
      message: 'Worker belongs to the persisted workspace',
    });
  }
  if (result.worker.outcome === 'applied' && result.worker.mode !== result.persisted.effectiveMode) {
    context.addIssue({
      code: 'custom',
      path: ['worker', 'mode'],
      message: 'Applied worker mode matches the persisted effectiveMode',
    });
  }
});
export type SessionCacheWarmingApplyResult = z.infer<typeof SessionCacheWarmingApplyResultSchema>;
