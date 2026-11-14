import type { ProviderResult } from '@/types';
import { resolveQuotaProviderId } from '@/components/chat/work-status/usageHeadline';

/**
 * OMP names providers by native ids (`anthropic`, `openai-codex`), while quota
 * plans use logical ids (`claude`, `codex`). The Host's `nativeToLogical` map
 * joins the two, so one provider is one sidebar row and one quota card.
 */

export interface UsageProviderRow {
  /** The quota id the row is keyed and merged by; also the id its sample is read under. */
  quotaProviderId: string;
  /** The id the Usage statistics filter by: OMP's native id when one is known. */
  statsProviderId: string;
  name: string;
}

/**
 * One row per provider. Configured providers come first, then providers the
 * statistics report, then quota results; a provider already present under its
 * quota id is merged into that row rather than repeated.
 */
export const buildUsageProviderRows = ({ configProviders, statsProviders, results, nativeToLogical }: {
  configProviders: readonly { providerId: string; name: string }[];
  statsProviders: readonly { providerId: string }[];
  results: readonly ProviderResult[];
  nativeToLogical: Record<string, string>;
}): UsageProviderRow[] => {
  const rows = new Map<string, UsageProviderRow>();
  const add = (providerId: string, name: string) => {
    const quotaProviderId = resolveQuotaProviderId(providerId, nativeToLogical);
    if (!quotaProviderId || rows.has(quotaProviderId)) return;
    rows.set(quotaProviderId, { quotaProviderId, statsProviderId: providerId, name });
  };
  for (const provider of configProviders) add(provider.providerId, provider.name || provider.providerId);
  for (const provider of statsProviders) add(provider.providerId, provider.providerId);
  for (const result of results) {
    if (result.configured) add(result.providerId, result.providerName || result.providerId);
  }
  return [...rows.values()].sort((a, b) => a.name.localeCompare(b.name));
};
