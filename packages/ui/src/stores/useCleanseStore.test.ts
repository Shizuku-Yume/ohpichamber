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

  test('rejects earlier sequence in same epoch A and accepts first/low sequence in new epoch B with opaque UUID', () => {
    const epochA = 'ffffffff-1111-4111-8111-111111111111';
    const epochB = '00000000-2222-4222-8222-222222222222'; // Lexicographically earlier than epochA!

    // Initial state at sequence 10 in epoch A
    useCleanseStore.getState().applyCleanseProgress(
      'session-alpha',
      makeEvent({
        epoch: epochA,
        sequence: '10',
        timestamp: 1000,
        status: 'repairing',
      }),
    );

    // Stale sequence 5 in epoch A is rejected
    useCleanseStore.getState().applyCleanseProgress(
      'session-alpha',
      makeEvent({
        epoch: epochA,
        sequence: '5',
        timestamp: 1050,
        status: 'discovering',
      }),
    );

    let state = useCleanseStore.getState().bySession['session-alpha'];
    expect(state?.epoch).toBe(epochA);
    expect(state?.sequence).toBe('10');
    expect(state?.status).toBe('repairing');

    // Restart with opaque UUID epoch B (lexicographically earlier): first sequence "1" must be accepted!
    useCleanseStore.getState().applyCleanseProgress(
      'session-alpha',
      makeEvent({
        epoch: epochB,
        sequence: '1',
        timestamp: 2000,
        status: 'discovering',
      }),
    );

    state = useCleanseStore.getState().bySession['session-alpha'];
    expect(state?.epoch).toBe(epochB);
    expect(state?.sequence).toBe('1');
    expect(state?.status).toBe('discovering');

    // Historical stale event from older epoch A arriving late (timestamp 1100 < 2000) is rejected
    useCleanseStore.getState().applyCleanseProgress(
      'session-alpha',
      makeEvent({
        epoch: epochA,
        sequence: '99',
        timestamp: 1100,
        status: 'completed',
      }),
    );

    state = useCleanseStore.getState().bySession['session-alpha'];
    expect(state?.epoch).toBe(epochB);
    expect(state?.sequence).toBe('1');
    expect(state?.status).toBe('discovering');
  });

  test('rejects event with invalid lifecycle status', () => {
    useCleanseStore.getState().applyCleanseProgress(
      'session-alpha',
      makeEvent({
        status: 'invalid-status' as unknown as CleanseProgressEvent['status'],
      }),
    );

    expect(useCleanseStore.getState().bySession['session-alpha']).toBeUndefined();
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
