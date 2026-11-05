import { create } from 'zustand';
import type { AdvisorNote, AdvisorYieldedEvent } from '@openchamber/agent-contract';
import { compareCounters, mergeAdvisorNotes } from '@/sync/event-reducer';

interface AdvisorState {
  sessionId: string;
  epoch: string;
  sequence: string;
  notes: AdvisorNote[];
  updatedAt: number;
}

type AdvisorStore = {
  bySession: Record<string, AdvisorState>;
  applyAdvisorYielded: (sessionId: string, event: AdvisorYieldedEvent) => void;
  clearSessionAdvisor: (sessionId: string) => void;
  reset: () => void;
};

export const useAdvisorStore = create<AdvisorStore>()((set) => ({
  bySession: {},
  applyAdvisorYielded: (sessionId, event) =>
    set((state) => {
      const existing = state.bySession[sessionId];
      const eventEpoch = event.epoch ?? '0';
      if (existing) {
        const existingEpoch = existing.epoch ?? '0';
        if (eventEpoch === existingEpoch) {
          if (event.sequence && existing.sequence && compareCounters(event.sequence, existing.sequence) < 0) {
            return state;
          }
        } else {
          // Different opaque UUID epoch: sequence resets.
          // Guard against historical stale events from older epochs arriving late.
          const eventTime = event.timestamp ?? 0;
          if (eventTime && existing.updatedAt && eventTime < existing.updatedAt) {
            return state;
          }
        }
      }
      const priorNotes = existing && existing.epoch === eventEpoch ? existing.notes : [];
      const notes = mergeAdvisorNotes(priorNotes, event.notes);
      const updated: AdvisorState = {
        sessionId,
        epoch: eventEpoch,
        sequence: event.sequence ?? '0',
        notes,
        updatedAt: event.timestamp ?? Date.now(),
      };
      return {
        bySession: {
          ...state.bySession,
          [sessionId]: updated,
        },
      };
    }),
  clearSessionAdvisor: (sessionId) =>
    set((state) => {
      if (!(sessionId in state.bySession)) return state;
      const bySession = { ...state.bySession };
      delete bySession[sessionId];
      return { bySession };
    }),
  reset: () => set({ bySession: {} }),
}));
