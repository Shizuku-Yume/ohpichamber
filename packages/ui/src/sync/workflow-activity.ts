import { create } from 'zustand';
import { useWorkflowRunsStore } from '@/lib/workflows/store';

/**
 * Sessions with a workflow run running, as the OpenChamber server's runs say
 * (`lib/workflows/store.ts`, fed by its events). The sync provider keeps this
 * current, so session activity can read it without importing the workflow
 * store and everything behind it.
 */
type WorkflowActivityState = { runningSessionIds: ReadonlySet<string> };

const NONE: ReadonlySet<string> = new Set();

export const useWorkflowActivityStore = create<WorkflowActivityState>(() => ({ runningSessionIds: NONE }));

/** Replaces the set, keeping the same object when membership did not change. */
export const setWorkflowRunningSessions = (sessionIds: Iterable<string>): void => {
  const next = new Set(sessionIds);
  const current = useWorkflowActivityStore.getState().runningSessionIds;
  if (next.size === current.size && [...next].every((id) => current.has(id))) return;
  useWorkflowActivityStore.setState({ runningSessionIds: next.size === 0 ? NONE : next });
};

const updateFromWorkflowRunsStore = (): void => {
  const bySession = useWorkflowRunsStore.getState().bySession;
  const running = new Set<string>();
  for (const [sessionId, sessionRuns] of Object.entries(bySession)) {
    if (sessionRuns.runs.some((run) => run.state === 'running')) {
      running.add(sessionId);
    }
  }
  setWorkflowRunningSessions(running);
};

useWorkflowRunsStore.subscribe(updateFromWorkflowRunsStore);
