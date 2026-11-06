import { beforeEach, describe, expect, test } from 'bun:test';

import { useSessionRecapStore } from './useSessionRecapStore';

const recap = (sessionId: string, text: string) => ({
  type: 'session.recap' as const,
  sessionId,
  epoch: '1',
  sequence: '1',
  timestamp: 1,
  recap: text,
  createdAt: 1,
});

describe('session recap store', () => {
  beforeEach(() => {
    useSessionRecapStore.setState({ recap: {} });
  });

  test('keeps only the newest recap for one session', () => {
    const store = useSessionRecapStore.getState();
    store.applyRecap(recap('ses_1', 'first'));
    store.applyRecap(recap('ses_1', 'second'));

    expect(useSessionRecapStore.getState().recap.ses_1?.recap).toBe('second');
  });

  test('scopes recaps per session instead of overwriting the shared slot', () => {
    const store = useSessionRecapStore.getState();
    store.applyRecap(recap('ses_1', 'one'));
    store.applyRecap(recap('ses_2', 'two'));

    expect(useSessionRecapStore.getState().recap.ses_1?.recap).toBe('one');
    expect(useSessionRecapStore.getState().recap.ses_2?.recap).toBe('two');
  });

  test('clearing a session drops its recap and leaves the rest untouched', () => {
    const store = useSessionRecapStore.getState();
    store.applyRecap(recap('ses_1', 'one'));
    store.applyRecap(recap('ses_2', 'two'));
    store.clearRecap('ses_1');

    expect(useSessionRecapStore.getState().recap.ses_1).toBeUndefined();
    expect(useSessionRecapStore.getState().recap.ses_2?.recap).toBe('two');
  });
});
