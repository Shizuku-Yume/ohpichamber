import { create } from 'zustand';
import type { Subagent } from '@openchamber/agent-contract';

type SubagentsStore = {
  byParent: Record<string, Subagent[]>;
  applySubagentUpdate: (parentSessionId: string, subagent: Subagent) => void;
  setSubagents: (parentSessionId: string, subagents: Subagent[]) => void;
  removeSubagent: (parentSessionId: string, subagentId: string) => void;
  clearSession: (parentSessionId: string) => void;
};

export const useSubagentsStore = create<SubagentsStore>()((set) => ({
  byParent: {},
  applySubagentUpdate: (parentSessionId, subagent) =>
    set((state) => {
      const current = state.byParent[parentSessionId] ?? [];
      const index = current.findIndex((item) => item.subagentId === subagent.subagentId);
      const updated = index >= 0
        ? current.map((item, idx) => (idx === index ? { ...item, ...subagent } : item))
        : [...current, subagent];
      return {
        byParent: {
          ...state.byParent,
          [parentSessionId]: updated,
        },
      };
    }),
  setSubagents: (parentSessionId, subagents) =>
    set((state) => ({
      byParent: {
        ...state.byParent,
        [parentSessionId]: subagents,
      },
    })),
  removeSubagent: (parentSessionId, subagentId) =>
    set((state) => {
      const current = state.byParent[parentSessionId];
      if (!current) return state;
      return {
        byParent: {
          ...state.byParent,
          [parentSessionId]: current.filter((item) => item.subagentId !== subagentId),
        },
      };
    }),
  clearSession: (parentSessionId) =>
    set((state) => {
      if (!(parentSessionId in state.byParent)) return state;
      const byParent = { ...state.byParent };
      delete byParent[parentSessionId];
      return { byParent };
    }),
}));
