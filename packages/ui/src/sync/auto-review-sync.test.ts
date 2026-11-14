import { afterEach, beforeEach, describe, expect, mock, test } from 'bun:test';
import { getRuntimeKey } from '@/lib/runtime-switch';
import { selectAutoReviewRun, useAutoReviewStore, type AutoReviewRun } from '@/stores/useAutoReviewStore';

let emit: (event: unknown) => void = () => { };
mock.module('@/lib/openchamberEvents', () => ({
  subscribeOpenchamberEvents: (listener: (event: unknown) => void) => {
    emit = listener;
    return () => { emit = () => { }; };
  },
}));

import { subscribeAutoReviewSync } from './auto-review-sync';

const run = (sessionID: string, extra: Partial<AutoReviewRun> = {}): AutoReviewRun => ({
  originalSessionID: sessionID,
  reviewSessionID: `${sessionID}-review`,
  directory: '/repo',
  status: 'running',
  step: 'review',
  round: 0,
  maxRounds: 15,
  startedAt: 1,
  updatedAt: 1,
  ...extra,
});

describe('subscribeAutoReviewSync', () => {
  let unsubscribe: () => void = () => { };
  const runtimeKey = getRuntimeKey();

  beforeEach(() => {
    useAutoReviewStore.getState().resetForRuntimeSwitch();
  });

  afterEach(() => {
    unsubscribe();
    useAutoReviewStore.getState().resetForRuntimeSwitch();
  });

  test('applies openchamber:auto-review.updated event to useAutoReviewStore', () => {
    unsubscribe = subscribeAutoReviewSync(runtimeKey);

    const testRun = run('ses_test', { status: 'running', step: 'review' });
    emit({
      type: 'openchamber:auto-review.updated',
      properties: {
        revision: 1,
        originalSessionID: 'ses_test',
        directory: '/repo',
        run: testRun,
      },
    });

    const stored = selectAutoReviewRun('ses_test', '/repo')(useAutoReviewStore.getState());
    expect(stored).toMatchObject({
      originalSessionID: 'ses_test',
      status: 'running',
      step: 'review',
    });

    emit({
      type: 'openchamber:auto-review.updated',
      properties: {
        revision: 2,
        originalSessionID: 'ses_test',
        directory: '/repo',
        run: null,
      },
    });
    expect(selectAutoReviewRun('ses_test', '/repo')(useAutoReviewStore.getState())).toBeNull();
  });

  test('ignores updates meant for a different runtime key', () => {
    unsubscribe = subscribeAutoReviewSync('different-runtime-key');

    const testRun = run('ses_diff');
    emit({
      type: 'openchamber:auto-review.updated',
      properties: {
        revision: 1,
        originalSessionID: 'ses_diff',
        directory: '/repo',
        run: testRun,
      },
    });

    expect(selectAutoReviewRun('ses_diff', '/repo')(useAutoReviewStore.getState())).toBeNull();
  });

  test('unsubscribing stops listening to events', () => {
    unsubscribe = subscribeAutoReviewSync(runtimeKey);
    unsubscribe();

    const testRun = run('ses_unsub');
    emit({
      type: 'openchamber:auto-review.updated',
      properties: {
        revision: 1,
        originalSessionID: 'ses_unsub',
        directory: '/repo',
        run: testRun,
      },
    });

    expect(selectAutoReviewRun('ses_unsub', '/repo')(useAutoReviewStore.getState())).toBeNull();
  });
});
