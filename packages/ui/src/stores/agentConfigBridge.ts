/**
 * Storage-neutral hook boundary between the agents and config stores.
 *
 * The two stores have a real mutual dependency: publishing an agent catalog can
 * apply the active selection defaults, and the agents store reacts to config
 * readiness. Importing either store from the other made module evaluation order
 * decide whether a binding existed.
 *
 * Both sides register with and read from this module instead. It imports
 * nothing, so its exports are always initialized before either store evaluates;
 * registrations are called only from store actions or subscriptions.
 */

interface AgentSelectionState {
  activeDirectoryKey: string;
  selectionSource: 'auto' | 'manual';
  agentSelectionSource: 'auto' | 'manual';
  currentVariantSelection: { override?: string | null };
  applyDefaultModelAgentSelection: () => void;
}

export interface AgentReadinessState {
  isInitialized: boolean;
  connectionPhase: 'connecting' | 'connected' | 'reconnecting';
}

let selectionReader: (() => AgentSelectionState) | null = null;
let readinessListener: ((state: AgentReadinessState) => void) | null = null;

/** The config store owns the state this reads. */
export const registerAgentSelectionReader = (reader: () => AgentSelectionState): void => {
  selectionReader = reader;
};

/** Null until the config store has registered; catalog publication is still valid then. */
export const readAgentSelection = (): AgentSelectionState | null => {
  if (!selectionReader) return null;
  return selectionReader();
};

/** The agents store owns the recovery this drives. */
export const registerAgentReadinessListener = (listener: (state: AgentReadinessState) => void): void => {
  readinessListener = listener;
};

export const notifyAgentReadiness = (state: AgentReadinessState): void => {
  if (!readinessListener) return;
  readinessListener(state);
};
