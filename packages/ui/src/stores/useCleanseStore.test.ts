import { describe, expect, test, beforeEach } from 'bun:test';
import { useCleanseStore } from './useCleanseStore';
import type { CleanseProgressEvent } from '@openchamber/agent-contract';

describe('useCleanseStore', () => {
  beforeEach(() => {
    useCleanseStore.getState().reset();
  });

  const makeEvent = (
    overrides: Partial<CleanseProgressEvent> = {},
  ): CleanseProgressEvent => ({
    type: 'cleanse.progress',
    sessionId: 'session-alpha',
    epoch: '1',
    sequence: '10',
    timestamp: 1000,
    status: 'discovering',
    activeCheckers: ['typescript'],
    completedCheckers: [],
    repairedFiles: [],
    ...overrides,
  });

  test('records initial start transition (discovering)', () => {
    const event = makeEvent({
      status: 'discovering',
      activeCheckers: ['typescript', 'oxlint'],
      completedCheckers: [],
      repairedFiles: [],
    });
    useCleanseStore.getState().applyCleanseProgress('session-alpha', event);

    const state = useCleanseStore.getState().bySession['session-alpha'];
    expect(state).toBeDefined();
    expect(state?.status).toBe('discovering');
    expect(state?.activeCheckers).toEqual(['typescript', 'oxlint']);
    expect(state?.completedCheckers).toEqual([]);
    expect(state?.repairedFiles).toEqual([]);
  });

  test('records progress transition as checkers complete', () => {
    useCleanseStore.getState().applyCleanseProgress(
      'session-alpha',
      makeEvent({
        sequence: '10',
        status: 'discovering',
        activeCheckers: ['typescript', 'oxlint'],
        completedCheckers: [],
      }),
    );

    useCleanseStore.getState().applyCleanseProgress(
      'session-alpha',
      makeEvent({
        sequence: '11',
        status: 'discovering',
        activeCheckers: ['typescript'],
        completedCheckers: ['oxlint'],
        diagnosticsCount: 3,
      }),
    );

    const state = useCleanseStore.getState().bySession['session-alpha'];
    expect(state?.status).toBe('discovering');
    expect(state?.activeCheckers).toEqual(['typescript']);
    expect(state?.completedCheckers).toEqual(['oxlint']);
    expect(state?.diagnosticsCount).toBe(3);
  });

  test('records repair transition with repaired files', () => {
    useCleanseStore.getState().applyCleanseProgress(
      'session-alpha',
      makeEvent({
        sequence: '12',
        status: 'repairing',
        activeCheckers: [],
        completedCheckers: ['oxlint', 'typescript'],
        repairedFiles: ['packages/ui/src/app.ts', 'packages/ui/src/util.ts'],
      }),
    );

    const state = useCleanseStore.getState().bySession['session-alpha'];
    expect(state?.status).toBe('repairing');
    expect(state?.completedCheckers).toEqual(['oxlint', 'typescript']);
    expect(state?.repairedFiles).toEqual(['packages/ui/src/app.ts', 'packages/ui/src/util.ts']);
  });

  test('records verifying and completed transitions', () => {
    useCleanseStore.getState().applyCleanseProgress(
      'session-alpha',
      makeEvent({
        sequence: '13',
        status: 'verifying',
        activeCheckers: ['oxlint', 'typescript'],
        completedCheckers: [],
        repairedFiles: ['packages/ui/src/app.ts'],
      }),
    );

    expect(useCleanseStore.getState().bySession['session-alpha']?.status).toBe('verifying');

    useCleanseStore.getState().applyCleanseProgress(
      'session-alpha',
      makeEvent({
        sequence: '14',
        status: 'completed',
        activeCheckers: [],
        completedCheckers: ['oxlint', 'typescript'],
        repairedFiles: ['packages/ui/src/app.ts'],
        summary: '2 checks passed, 1 file repaired',
      }),
    );

    const state = useCleanseStore.getState().bySession['session-alpha'];
    expect(state?.status).toBe('completed');
    expect(state?.summary).toBe('2 checks passed, 1 file repaired');
  });

  test('records failure transition on diagnostic repair error', () => {
    useCleanseStore.getState().applyCleanseProgress(
      'session-alpha',
      makeEvent({
        sequence: '20',
        status: 'failed',
        activeCheckers: [],
        completedCheckers: ['oxlint'],
        repairedFiles: [],
        summary: 'Cleanse execution failed',
      }),
    );

    const state = useCleanseStore.getState().bySession['session-alpha'];
    expect(state?.status).toBe('failed');
    expect(state?.summary).toBe('Cleanse execution failed');
  });

  test('records cancellation transition', () => {
    useCleanseStore.getState().applyCleanseProgress(
      'session-alpha',
      makeEvent({
        sequence: '25',
        status: 'cancelled',
        activeCheckers: [],
        completedCheckers: ['oxlint'],
        repairedFiles: [],
      }),
    );

    const state = useCleanseStore.getState().bySession['session-alpha'];
    expect(state?.status).toBe('cancelled');
  });

  test('enforces session scoping between independent sessions', () => {
    useCleanseStore.getState().applyCleanseProgress(
      'session-1',
      makeEvent({
        sessionId: 'session-1',
        status: 'repairing',
        repairedFiles: ['file-1.ts'],
      }),
    );

    useCleanseStore.getState().applyCleanseProgress(
      'session-2',
      makeEvent({
        sessionId: 'session-2',
        status: 'completed',
        repairedFiles: ['file-2.ts'],
      }),
    );

    const session1 = useCleanseStore.getState().bySession['session-1'];
    const session2 = useCleanseStore.getState().bySession['session-2'];

    expect(session1?.status).toBe('repairing');
    expect(session1?.repairedFiles).toEqual(['file-1.ts']);

    expect(session2?.status).toBe('completed');
    expect(session2?.repairedFiles).toEqual(['file-2.ts']);
  });

  test('rejects stale events with older sequence within same epoch', () => {
    useCleanseStore.getState().applyCleanseProgress(
      'session-alpha',
      makeEvent({
        epoch: '1',
        sequence: '100',
        status: 'verifying',
      }),
    );

    // Stale event arriving out-of-order with sequence 90
    useCleanseStore.getState().applyCleanseProgress(
      'session-alpha',
      makeEvent({
        epoch: '1',
        sequence: '90',
        status: 'discovering',
      }),
    );

    const state = useCleanseStore.getState().bySession['session-alpha'];
    expect(state?.status).toBe('verifying');
    expect(state?.sequence).toBe('100');
  });

  test('rejects stale epoch events and accepts newer epochs', () => {
    useCleanseStore.getState().applyCleanseProgress(
      'session-alpha',
      makeEvent({
        epoch: '2',
        sequence: '5',
        status: 'discovering',
      }),
    );

    // Stale event from epoch 1
    useCleanseStore.getState().applyCleanseProgress(
      'session-alpha',
      makeEvent({
        epoch: '1',
        sequence: '500',
        status: 'completed',
      }),
    );

    expect(useCleanseStore.getState().bySession['session-alpha']?.epoch).toBe('2');
    expect(useCleanseStore.getState().bySession['session-alpha']?.status).toBe('discovering');

    // Newer epoch 3
    useCleanseStore.getState().applyCleanseProgress(
      'session-alpha',
      makeEvent({
        epoch: '3',
        sequence: '1',
        status: 'repairing',
      }),
    );

    expect(useCleanseStore.getState().bySession['session-alpha']?.epoch).toBe('3');
    expect(useCleanseStore.getState().bySession['session-alpha']?.status).toBe('repairing');
  });

  test('clearSessionCleanse removes only the targeted session', () => {
    useCleanseStore.getState().applyCleanseProgress(
      'session-1',
      makeEvent({ sessionId: 'session-1', status: 'completed' }),
    );
    useCleanseStore.getState().applyCleanseProgress(
      'session-2',
      makeEvent({ sessionId: 'session-2', status: 'repairing' }),
    );

    useCleanseStore.getState().clearSessionCleanse('session-1');

    expect(useCleanseStore.getState().bySession['session-1']).toBeUndefined();
    expect(useCleanseStore.getState().bySession['session-2']).toBeDefined();
    expect(useCleanseStore.getState().bySession['session-2']?.status).toBe('repairing');
  });
});
