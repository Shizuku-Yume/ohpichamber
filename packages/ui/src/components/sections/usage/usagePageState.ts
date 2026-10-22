import type { ProviderResult } from '@/types';

interface UsagePanelState {
  /** The selected provider's usage sample, or null when it has none. */
  usage: ProviderResult['usage'];
  /** A real failure message; null for an unconfigured provider. */
  error: string | null;
  /** No credential means the page shows its normal empty state. */
  empty: boolean;
}

/**
 * Which outcome the selected provider's panel shows.
 *
 * An unconfigured provider is an empty state, not a refresh failure. A failure
 * from a configured provider keeps its error, and when a usage sample survived
 * the failure the message says the data is stale.
 */
export const resolveUsagePanelState = (
  result: ProviderResult | null,
  refreshError: string | undefined,
  staleError: (error: string) => string,
): UsagePanelState => {
  const usage = result?.usage ?? null;
  const error = refreshError
    ? usage
      ? staleError(refreshError)
      : refreshError
    : result?.configured && !result.ok
      ? result.error ?? null
      : null;
  return { usage, error, empty: !result || !result.configured };
};

/** Quota reads require both an initialized catalog and its resolved workspace. */
export const usageQuotaReady = (isInitialized: boolean, workspaceId: string): boolean =>
  isInitialized && workspaceId.length > 0;
