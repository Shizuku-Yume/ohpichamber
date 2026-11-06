import { create } from 'zustand';
import type { SessionRecapEvent } from '@openchamber/agent-contract';

interface SessionRecapState {
 /** Newest native recap per session, as published by the worker. */
 recap: Record<string, SessionRecapEvent>;
 applyRecap: (recap: SessionRecapEvent) => void;
 clearRecap: (sessionId: string) => void;
}

/**
 * Native recaps are transient canonical events: OMP's `IdleMaintenance`
 * publishes each one exactly once and never journals it into the transcript.
 * Holding them here is what lets the chat surface show the note the moment the
 * turn settles instead of waiting for a later poll.
 */
export const useSessionRecapStore = create<SessionRecapState>((set) => ({
 recap: {},
 applyRecap: (recap) => set((state) => ({ recap: { ...state.recap, [recap.sessionId]: recap } })),
 clearRecap: (sessionId) =>
  set((state) => {
   if (!state.recap[sessionId]) return state;
   const next = { ...state.recap };
   delete next[sessionId];
   return { recap: next };
  }),
}));
