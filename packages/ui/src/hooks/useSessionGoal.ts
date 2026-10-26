import type { SessionMode } from '@openchamber/agent-contract';
import { useSession } from '@/sync/sync-context';
import { useUIStore } from '@/stores/useUIStore';

export interface SessionGoalState {
  mode: Extract<SessionMode, { kind: 'goal' }> | null;
  enabled: boolean;
  running: boolean;
}

export function useSessionGoal(sessionId: string, directory?: string): SessionGoalState {
  const session = useSession(sessionId, directory);
  const enabled = useUIStore((state) => state.sessionGoalEnabled);
  return {
    mode: session?.mode.kind === 'goal' ? session.mode : null,
    enabled,
    running: session?.activeRunId != null || session?.continuationPending === true,
  };
}


