import { describe, expect, test, beforeEach } from 'bun:test';
import { useAdvisorStore } from './useAdvisorStore';
import type { AdvisorYieldedEvent } from '@openchamber/agent-contract';

describe('useAdvisorStore', () => {
  beforeEach(() => {
    useAdvisorStore.getState().reset();
  });

  const makeEvent = (
    overrides: Partial<AdvisorYieldedEvent> = {},
  ): AdvisorYieldedEvent => ({
    type: 'advisor_yielded',
    sessionId: 'session-alpha',
    epoch: '1',
    sequence: '10',
    timestamp: 1000,
    notes: [
      {
        noteId: 'note-1',
        severity: 'blocker',
        text: 'Missing return statement',
        advisorName: 'watchdog',
        timestamp: 1000,
      },
    ],
    ...overrides,
  });

  test('records initial advisor notes', () => {
    const event = makeEvent();
    useAdvisorStore.getState().applyAdvisorYielded('session-alpha', event);

    const state = useAdvisorStore.getState().bySession['session-alpha'];
    expect(state).toBeDefined();
    expect(state?.notes).toHaveLength(1);
    expect(state?.notes[0]?.noteId).toBe('note-1');
    expect(state?.notes[0]?.severity).toBe('blocker');
    expect(state?.notes[0]?.text).toBe('Missing return statement');
  });

  test('rejects earlier sequence in same epoch A and accepts low sequence in new epoch B with opaque UUID', () => {
    const epochA = 'ffffffff-1111-4111-8111-111111111111';
    const epochB = '00000000-2222-4222-8222-222222222222'; // Lexicographically earlier than epochA!

    // Initial event at sequence 10 in epoch A
    useAdvisorStore.getState().applyAdvisorYielded(
      'session-alpha',
      makeEvent({
        epoch: epochA,
        sequence: '10',
        timestamp: 1000,
        notes: [
          { noteId: 'note-a1', severity: 'blocker', text: 'Note A1', timestamp: 1000 },
        ],
      }),
    );

    // Stale sequence 5 in epoch A is rejected
    useAdvisorStore.getState().applyAdvisorYielded(
      'session-alpha',
      makeEvent({
        epoch: epochA,
        sequence: '5',
        timestamp: 1050,
        notes: [
          { noteId: 'note-stale', severity: 'nit', text: 'Stale Note', timestamp: 1050 },
        ],
      }),
    );

    let state = useAdvisorStore.getState().bySession['session-alpha'];
    expect(state?.epoch).toBe(epochA);
    expect(state?.sequence).toBe('10');
    expect(state?.notes).toHaveLength(1);
    expect(state?.notes[0]?.noteId).toBe('note-a1');

    // New epoch B (opaque UUID sorting earlier): low sequence "1" is accepted
    useAdvisorStore.getState().applyAdvisorYielded(
      'session-alpha',
      makeEvent({
        epoch: epochB,
        sequence: '1',
        timestamp: 2000,
        notes: [
          { noteId: 'note-b1', severity: 'concern', text: 'Note B1', timestamp: 2000 },
        ],
      }),
    );

    state = useAdvisorStore.getState().bySession['session-alpha'];
    expect(state?.epoch).toBe(epochB);
    expect(state?.sequence).toBe('1');
    expect(state?.notes).toHaveLength(1);
    expect(state?.notes[0]?.noteId).toBe('note-b1');

    // Historical stale event from older epoch A arriving late (timestamp 1100 < 2000) is rejected
    useAdvisorStore.getState().applyAdvisorYielded(
      'session-alpha',
      makeEvent({
        epoch: epochA,
        sequence: '99',
        timestamp: 1100,
        notes: [
          { noteId: 'note-old', severity: 'nit', text: 'Old Note', timestamp: 1100 },
        ],
      }),
    );

    state = useAdvisorStore.getState().bySession['session-alpha'];
    expect(state?.epoch).toBe(epochB);
    expect(state?.sequence).toBe('1');
    expect(state?.notes[0]?.noteId).toBe('note-b1');
  });

  test('merges notes in same epoch without duplicates, ordered by timestamp', () => {
    useAdvisorStore.getState().applyAdvisorYielded(
      'session-alpha',
      makeEvent({
        sequence: '10',
        timestamp: 1000,
        notes: [
          { noteId: 'note-2', severity: 'concern', text: 'Note 2', timestamp: 1200 },
          { noteId: 'note-1', severity: 'blocker', text: 'Note 1', timestamp: 1100 },
        ],
      }),
    );

    useAdvisorStore.getState().applyAdvisorYielded(
      'session-alpha',
      makeEvent({
        sequence: '11',
        timestamp: 1300,
        notes: [
          { noteId: 'note-1', severity: 'blocker', text: 'Note 1 updated', timestamp: 1100 },
          { noteId: 'note-3', severity: 'nit', text: 'Note 3', timestamp: 1050 },
        ],
      }),
    );

    const state = useAdvisorStore.getState().bySession['session-alpha'];
    expect(state?.notes).toHaveLength(3);
    // Ordered by timestamp: note-3 (1050), note-1 (1100), note-2 (1200)
    expect(state?.notes[0]?.noteId).toBe('note-3');
    expect(state?.notes[1]?.noteId).toBe('note-1');
    expect(state?.notes[1]?.text).toBe('Note 1 updated');
    expect(state?.notes[2]?.noteId).toBe('note-2');
  });

  test('enforces session scoping between independent sessions', () => {
    useAdvisorStore.getState().applyAdvisorYielded(
      'session-1',
      makeEvent({
        sessionId: 'session-1',
        notes: [{ noteId: 'n1', severity: 'blocker', text: 'Note 1', timestamp: 1000 }],
      }),
    );

    useAdvisorStore.getState().applyAdvisorYielded(
      'session-2',
      makeEvent({
        sessionId: 'session-2',
        notes: [{ noteId: 'n2', severity: 'concern', text: 'Note 2', timestamp: 1000 }],
      }),
    );

    const s1 = useAdvisorStore.getState().bySession['session-1'];
    const s2 = useAdvisorStore.getState().bySession['session-2'];

    expect(s1?.notes).toHaveLength(1);
    expect(s1?.notes[0]?.noteId).toBe('n1');

    expect(s2?.notes).toHaveLength(1);
    expect(s2?.notes[0]?.noteId).toBe('n2');
  });

  test('clearSessionAdvisor removes only the targeted session', () => {
    useAdvisorStore.getState().applyAdvisorYielded(
      'session-1',
      makeEvent({ sessionId: 'session-1' }),
    );
    useAdvisorStore.getState().applyAdvisorYielded(
      'session-2',
      makeEvent({ sessionId: 'session-2' }),
    );

    useAdvisorStore.getState().clearSessionAdvisor('session-1');

    expect(useAdvisorStore.getState().bySession['session-1']).toBeUndefined();
    expect(useAdvisorStore.getState().bySession['session-2']).toBeDefined();
  });
});
