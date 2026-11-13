import { beforeEach, describe, expect, test } from 'bun:test';

import { useSessionSuggestionStore } from './useSessionSuggestionStore';

const suggestionEvent = (sessionId: string, text: string) => ({
  type: 'session.suggestion' as const,
  sessionId,
  epoch: 'epoch_1',
  sequence: '1',
  timestamp: Date.now(),
  suggestion: text,
  createdAt: Date.now(),
});

describe('useSessionSuggestionStore', () => {
  beforeEach(() => {
    useSessionSuggestionStore.setState({ suggestions: {} });
  });

  test('keeps only the newest suggestion for one session', () => {
    const store = useSessionSuggestionStore.getState();
    store.applySuggestion(suggestionEvent('ses_1', 'first suggestion'));
    store.applySuggestion(suggestionEvent('ses_1', 'second suggestion'));

    expect(useSessionSuggestionStore.getState().suggestions.ses_1?.suggestion).toBe('second suggestion');
  });

  test('scopes suggestions per session', () => {
    const store = useSessionSuggestionStore.getState();
    store.applySuggestion(suggestionEvent('ses_1', 'one'));
    store.applySuggestion(suggestionEvent('ses_2', 'two'));

    expect(useSessionSuggestionStore.getState().suggestions.ses_1?.suggestion).toBe('one');
    expect(useSessionSuggestionStore.getState().suggestions.ses_2?.suggestion).toBe('two');
  });

  test('clearing a session drops its suggestion and leaves others untouched', () => {
    const store = useSessionSuggestionStore.getState();
    store.applySuggestion(suggestionEvent('ses_1', 'one'));
    store.applySuggestion(suggestionEvent('ses_2', 'two'));
    store.clearSuggestion('ses_1');

    expect(useSessionSuggestionStore.getState().suggestions.ses_1).toBeUndefined();
    expect(useSessionSuggestionStore.getState().suggestions.ses_2?.suggestion).toBe('two');
  });
});
