import type { ProviderResult } from '@/types';

interface UsagePanelState {
  /** The selected provider's usage sample, or null when it has none. */
  usage: ProviderResult['usage'];
  /** A real failure message; null for an unconfigured provider. */
  error: string | null;
  /** No result arrived at all, so the page can only say no data is available. */
  empty: boolean;
  /** The provider answered but holds no credential, so the page offers the fix. */
  unconfigured: boolean;
}

/**
 * Which outcome the selected provider's panel shows.
 *
 * A provider without a stored credential is actionable, not a refresh failure:
 * the page shows the callout that leads to the sign-in or the Providers tab.
 * A failure from a configured provider keeps its error, and when a usage sample
 * survived the failure the message says the data is stale. Only the absence of
 * any result is the plain empty state.
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
  return {
    usage,
    error,
    empty: result === null,
    unconfigured: result !== null && !result.configured,
  };
};

/** Quota reads require both an initialized catalog and its resolved workspace. */
export const usageQuotaReady = (isInitialized: boolean, workspaceId: string): boolean =>
  isInitialized && workspaceId.length > 0;
