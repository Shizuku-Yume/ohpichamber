import { expect, test } from 'bun:test';
import {
  CacheWarmingApplyResultSchema, CacheWarmingModeSchema, CacheWarmingStateSchema,
  CacheWarmingUpdateRequestSchema, CacheWarmingWorkerApplyOutcomeSchema,
  CacheWarmingPartialWriteDetailsSchema, SessionCacheWarmingApplyResultSchema,
  SessionCacheWarmingStateSchema, SessionCacheWarmingUpdateRequestSchema,
} from './warming.ts';

const persisted = { workspaceId: 'workspace_1', revision: '18446744073709551615', mode: 'streaming' as const };
const worker = { rootSessionId: 'root_1', workspaceId: 'workspace_1', workerGeneration: 'generation_1' };
const applied = { worker, outcome: 'applied' as const, mode: 'streaming' as const };
const failed = {
  worker: { ...worker, rootSessionId: 'root_2' }, outcome: 'failed' as const, mode: 'off' as const,
  error: { code: 'SERVICE_UNAVAILABLE', detail: 'Native session could not apply the mode', retryable: true },
};

test('warming modes, strict state and request preserve uint64 decimal revisions', () => {
  for (const mode of ['off', 'streaming', 'idle']) {
    expect(CacheWarmingModeSchema.parse(mode)).toBe(mode);
    expect(CacheWarmingStateSchema.parse({ ...persisted, mode })).toEqual({ ...persisted, mode });
    expect(CacheWarmingUpdateRequestSchema.parse({ expectedRevision: '0', mode })).toEqual({ expectedRevision: '0', mode });
  }
  for (const revision of ['18446744073709551616', '-1', '01', '1.0', '', 1]) {
    expect(CacheWarmingStateSchema.safeParse({ ...persisted, revision }).success).toBe(false);
    expect(CacheWarmingUpdateRequestSchema.safeParse({ expectedRevision: revision, mode: 'idle' }).success).toBe(false);
  }
  expect(CacheWarmingModeSchema.safeParse('on').success).toBe(false);
  expect(CacheWarmingStateSchema.safeParse({ ...persisted, extra: true }).success).toBe(false);
  expect(CacheWarmingStateSchema.safeParse({ ...persisted, workspaceId: '' }).success).toBe(false);
  expect(CacheWarmingUpdateRequestSchema.safeParse({ expectedRevision: '0', mode: 'idle', extra: true }).success).toBe(false);
});

test('worker warming failure requires an error and success forbids one', () => {
  expect(CacheWarmingWorkerApplyOutcomeSchema.parse(applied)).toEqual(applied);
  expect(CacheWarmingWorkerApplyOutcomeSchema.parse(failed)).toEqual(failed);
  const { error: omittedError, ...withoutError } = failed;
  expect(omittedError).toBe(failed.error);
  expect(CacheWarmingWorkerApplyOutcomeSchema.safeParse(withoutError).success).toBe(false);
  expect(CacheWarmingWorkerApplyOutcomeSchema.safeParse({ ...applied, error: failed.error }).success).toBe(false);
  expect(CacheWarmingWorkerApplyOutcomeSchema.safeParse({ ...failed, error: { ...failed.error, retryable: undefined } }).success).toBe(false);
  expect(CacheWarmingWorkerApplyOutcomeSchema.safeParse({ ...applied, worker: { ...worker, extra: true } }).success).toBe(false);
});

test('aggregate warming status exactly reflects unique captured worker outcomes', () => {
  const cases = [
    { status: 'no-active-workers', workers: [] },
    { status: 'applied', workers: [applied] },
    { status: 'failed', workers: [failed] },
    { status: 'partial', workers: [applied, failed] },
  ] as const;
  for (const candidate of cases) {
    expect(CacheWarmingApplyResultSchema.parse({ persisted, ...candidate })).toEqual({ persisted, ...candidate });
    for (const status of ['applied', 'partial', 'failed', 'no-active-workers']) {
      if (status === candidate.status) continue;
      expect(CacheWarmingApplyResultSchema.safeParse({ persisted, ...candidate, status }).success).toBe(false);
    }
  }
  expect(CacheWarmingApplyResultSchema.safeParse({ persisted, status: 'applied', workers: [applied, applied] }).success).toBe(false);
  expect(CacheWarmingApplyResultSchema.safeParse({ persisted, status: 'partial', workers: [applied, { ...failed, worker }] }).success).toBe(false);
  expect(CacheWarmingApplyResultSchema.safeParse({ persisted, status: 'applied', workers: [{ ...applied, worker: { ...worker, workspaceId: 'other' } }] }).success).toBe(false);
  expect(CacheWarmingApplyResultSchema.safeParse({ persisted, status: 'applied', workers: [{ ...applied, mode: 'idle' }] }).success).toBe(false);
  expect(CacheWarmingApplyResultSchema.safeParse({ persisted, status: 'applied', workers: [applied], extra: true }).success).toBe(false);
});

test('partial native-write details cannot claim revision durability or active application', () => {
  const details = {
    workspaceId: 'workspace_1', configuredMode: 'streaming', currentRevision: '0',
    nativeConfigurationCommitted: true, liveApplication: 'not-started',
  };
  expect(CacheWarmingPartialWriteDetailsSchema.safeParse(details).success).toBe(true);
  for (const invalid of [
    { ...details, nativeConfigurationCommitted: false },
    { ...details, liveApplication: 'applied' },
    { ...details, currentRevision: '18446744073709551616' },
    { ...details, configuredMode: 'on' },
    { ...details, workspaceId: '' },
    { ...details, revision: '1' },
  ]) expect(CacheWarmingPartialWriteDetailsSchema.safeParse(invalid).success).toBe(false);
});

test('session cache warming state enforces inheritance, revision 0, and strict fields', () => {
  const baseState = {
    sessionId: 'root_1',
    workspaceId: 'workspace_1',
    revision: '0',
    mode: null,
    workspaceMode: 'streaming',
    effectiveMode: 'streaming',
  };
  expect(SessionCacheWarmingStateSchema.parse(baseState)).toEqual(baseState);
  expect(SessionCacheWarmingStateSchema.parse({ ...baseState, revision: '3' })).toEqual({ ...baseState, revision: '3' });

  for (const mode of ['off', 'streaming', 'idle']) {
    const overridden = {
      ...baseState,
      revision: '1',
      mode,
      workspaceMode: mode === 'off' ? 'streaming' : 'off',
      effectiveMode: mode,
    };
    expect(SessionCacheWarmingStateSchema.parse(overridden)).toEqual(overridden);
  }

  expect(SessionCacheWarmingStateSchema.safeParse({
    ...baseState,
    revision: '0',
    mode: 'idle',
    effectiveMode: 'idle',
  }).success).toBe(false);

  expect(SessionCacheWarmingStateSchema.safeParse({
    ...baseState,
    effectiveMode: 'off',
  }).success).toBe(false);

  expect(SessionCacheWarmingStateSchema.safeParse({
    ...baseState,
    revision: '2',
    mode: 'idle',
    workspaceMode: 'streaming',
    effectiveMode: 'streaming',
  }).success).toBe(false);

  for (const revision of ['18446744073709551616', '-1', '01', '1.0', '', 1]) {
    expect(SessionCacheWarmingStateSchema.safeParse({ ...baseState, revision }).success).toBe(false);
  }
  expect(SessionCacheWarmingStateSchema.safeParse({ ...baseState, sessionId: '' }).success).toBe(false);
  expect(SessionCacheWarmingStateSchema.safeParse({ ...baseState, workspaceId: '' }).success).toBe(false);
  expect(SessionCacheWarmingStateSchema.safeParse({ ...baseState, extra: true }).success).toBe(false);
});

test('session cache warming update request accepts nullable mode and uint64 revision', () => {
  for (const mode of [null, 'off', 'streaming', 'idle']) {
    expect(SessionCacheWarmingUpdateRequestSchema.parse({ expectedRevision: '0', mode })).toEqual({ expectedRevision: '0', mode });
    expect(SessionCacheWarmingUpdateRequestSchema.parse({
      expectedRevision: '18446744073709551615',
      mode,
    })).toEqual({
      expectedRevision: '18446744073709551615',
      mode,
    });
  }
  for (const revision of ['18446744073709551616', '-1', '01', '1.0', '', 1]) {
    expect(SessionCacheWarmingUpdateRequestSchema.safeParse({ expectedRevision: revision, mode: null }).success).toBe(false);
  }
  expect(SessionCacheWarmingUpdateRequestSchema.safeParse({ expectedRevision: '0', mode: 'on' }).success).toBe(false);
  expect(SessionCacheWarmingUpdateRequestSchema.safeParse({ expectedRevision: '0', mode: null, extra: true }).success).toBe(false);
});

test('session cache warming apply result enforces single-worker consistency and effectiveMode', () => {
  const inheritedState = {
    sessionId: 'root_1',
    workspaceId: 'workspace_1',
    revision: '2',
    mode: null,
    workspaceMode: 'idle',
    effectiveMode: 'idle',
  };
  const overriddenState = {
    sessionId: 'root_1',
    workspaceId: 'workspace_1',
    revision: '3',
    mode: 'idle',
    workspaceMode: 'off',
    effectiveMode: 'idle',
  };
  const sessionApplied = { worker, outcome: 'applied', mode: 'idle' };
  const sessionFailed = {
    worker,
    outcome: 'failed',
    mode: 'idle',
    error: { code: 'SERVICE_UNAVAILABLE', detail: 'Native session could not apply the mode', retryable: true },
  };

  expect(SessionCacheWarmingApplyResultSchema.parse({
    persisted: inheritedState,
    status: 'no-active-worker',
    worker: null,
  })).toEqual({
    persisted: inheritedState,
    status: 'no-active-worker',
    worker: null,
  });
  expect(SessionCacheWarmingApplyResultSchema.parse({
    persisted: inheritedState,
    status: 'applied',
    worker: sessionApplied,
  })).toEqual({
    persisted: inheritedState,
    status: 'applied',
    worker: sessionApplied,
  });
  expect(SessionCacheWarmingApplyResultSchema.parse({
    persisted: overriddenState,
    status: 'applied',
    worker: sessionApplied,
  })).toEqual({
    persisted: overriddenState,
    status: 'applied',
    worker: sessionApplied,
  });
  expect(SessionCacheWarmingApplyResultSchema.parse({
    persisted: overriddenState,
    status: 'failed',
    worker: sessionFailed,
  })).toEqual({
    persisted: overriddenState,
    status: 'failed',
    worker: sessionFailed,
  });

  expect(SessionCacheWarmingApplyResultSchema.safeParse({
    persisted: inheritedState,
    status: 'no-active-worker',
    worker: sessionApplied,
  }).success).toBe(false);
  expect(SessionCacheWarmingApplyResultSchema.safeParse({
    persisted: inheritedState,
    status: 'applied',
    worker: null,
  }).success).toBe(false);
  expect(SessionCacheWarmingApplyResultSchema.safeParse({
    persisted: inheritedState,
    status: 'failed',
    worker: null,
  }).success).toBe(false);
  expect(SessionCacheWarmingApplyResultSchema.safeParse({
    persisted: inheritedState,
    status: 'applied',
    worker: sessionFailed,
  }).success).toBe(false);
  expect(SessionCacheWarmingApplyResultSchema.safeParse({
    persisted: inheritedState,
    status: 'failed',
    worker: sessionApplied,
  }).success).toBe(false);
  expect(SessionCacheWarmingApplyResultSchema.safeParse({
    persisted: inheritedState,
    status: 'applied',
    worker: { ...sessionApplied, worker: { ...worker, rootSessionId: 'root_other' } },
  }).success).toBe(false);
  expect(SessionCacheWarmingApplyResultSchema.safeParse({
    persisted: inheritedState,
    status: 'applied',
    worker: { ...sessionApplied, worker: { ...worker, workspaceId: 'workspace_other' } },
  }).success).toBe(false);
  expect(SessionCacheWarmingApplyResultSchema.safeParse({
    persisted: overriddenState,
    status: 'applied',
    worker: { ...sessionApplied, mode: 'off' },
  }).success).toBe(false);
  expect(SessionCacheWarmingApplyResultSchema.safeParse({
    persisted: inheritedState,
    status: 'no-active-worker',
    worker: null,
    extra: true,
  }).success).toBe(false);
});
