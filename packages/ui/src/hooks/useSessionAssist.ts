import { useSession, useSessionStatus } from '@/sync/sync-context';
import { getCurrentSessionAssist, type SessionAssistPayload } from '@/lib/sessionAssistMetadata';
import { useUIStore } from '@/stores/useUIStore';

export interface SessionAssistState {
  /** Valid (fresh) assist payload, or null. */
  assist: SessionAssistPayload | null;
  /** Recap text, shown as soon as OMP publishes one for an idle session. */
  visibleRecap: string | null;
  /** Suggestion text — fresh payload, session idle; caller still gates on input emptiness. */
  suggestion: string | null;
  /** False until the session record is in memory; the recap cannot be decided before that. */
  sessionKnown: boolean;
}

export function useSessionAssistState(sessionId: string, directory?: string): SessionAssistState {
  const session = useSession(sessionId, directory);
  const status = useSessionStatus(sessionId, directory);
  const sessionRecapEnabled = useUIStore((state) => state.sessionRecapEnabled);
  const sessionSuggestionEnabled = useUIStore((state) => state.sessionSuggestionEnabled);

  const isIdle = !status || status === 'idle';
  // Same freshness rule as the sidebar row's recap tooltip: the canonical
  // session update is authoritative, not the last loaded assistant answer.
  const assist = isIdle ? getCurrentSessionAssist(session) : null;

  // No client-side quiet window: OMP's `IdleMaintenance` already waits
  // `recap.idleSeconds` before it publishes a recap, so a second delay here
  // would only postpone a note the reader is already owed.
  return {
    assist,
    visibleRecap: sessionRecapEnabled && assist && assist.recap ? assist.recap : null,
    suggestion: sessionSuggestionEnabled && assist && assist.suggestion ? assist.suggestion : null,
    sessionKnown: session !== undefined && session !== null,
  };
}
