import { create } from 'zustand';
import type { SessionSuggestionEvent } from '@openchamber/agent-contract';

interface SessionSuggestionState {
  /** Newest prediction suggestion per session, published transiently by the worker. */
  suggestions: Record<string, SessionSuggestionEvent>;
  applySuggestion: (event: SessionSuggestionEvent) => void;
  clearSuggestion: (sessionId: string) => void;
}

/**
 * Next-prompt suggestions are transient canonical events: the worker
 * publishes each prediction once at completed turn end without journaling it
 * into durable transcript metadata. Holding them here is what lets the composer
 * chip display the suggestion immediately and clear it on send.
 */
export const useSessionSuggestionStore = create<SessionSuggestionState>((set) => ({
  suggestions: {},
  applySuggestion: (event) =>
    set((state) => ({ suggestions: { ...state.suggestions, [event.sessionId]: event } })),
  clearSuggestion: (sessionId) =>
    set((state) => {
      if (!state.suggestions[sessionId]) return state;
      const next = { ...state.suggestions };
      delete next[sessionId];
      return { suggestions: next };
    }),
}));
