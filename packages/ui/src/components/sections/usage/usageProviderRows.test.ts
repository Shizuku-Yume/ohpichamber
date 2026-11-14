import { describe, expect, test } from 'bun:test';
import type { ProviderResult } from '@/types';
import { buildUsageProviderRows } from './usageProviderRows';

const quotaResult = (providerId: ProviderResult['providerId'], providerName: string): ProviderResult => ({
  providerId,
  providerName,
  ok: true,
  configured: true,
  usage: null,
  fetchedAt: 1,
});

const nativeToLogical = { anthropic: 'claude', 'openai-codex': 'codex' };

describe('buildUsageProviderRows', () => {
  test('a native provider id and its logical quota id merge into one row', () => {
    const rows = buildUsageProviderRows({
      configProviders: [{ providerId: 'anthropic', name: 'Anthropic' }],
      statsProviders: [{ providerId: 'anthropic' }],
      results: [quotaResult('claude', 'Claude')],
      nativeToLogical,
    });
    expect(rows).toEqual([{ quotaProviderId: 'claude', statsProviderId: 'anthropic', name: 'Anthropic' }]);
  });

  test('a logical quota result for a provider the config lists is not a second row', () => {
    const rows = buildUsageProviderRows({
      configProviders: [{ providerId: 'openai-codex', name: 'OpenAI Codex' }],
      statsProviders: [],
      results: [quotaResult('codex', 'Codex')],
      nativeToLogical,
    });
    expect(rows.map((row) => row.quotaProviderId)).toEqual(['codex']);
    expect(rows[0].statsProviderId).toBe('openai-codex');
  });

  test('a quota result with no native counterpart keeps its own row', () => {
    const rows = buildUsageProviderRows({
      configProviders: [],
      statsProviders: [],
      results: [quotaResult('antigravity', 'Antigravity')],
      nativeToLogical,
    });
    expect(rows).toEqual([{ quotaProviderId: 'antigravity', statsProviderId: 'antigravity', name: 'Antigravity' }]);
  });

  test('an unconfigured quota result adds no row', () => {
    const rows = buildUsageProviderRows({
      configProviders: [],
      statsProviders: [],
      results: [{ ...quotaResult('claude', 'Claude'), configured: false }],
      nativeToLogical,
    });
    expect(rows).toEqual([]);
  });

  test('a provider only the statistics report keeps its native id for filtering', () => {
    const rows = buildUsageProviderRows({
      configProviders: [],
      statsProviders: [{ providerId: 'CLIProxyAPI' }],
      results: [],
      nativeToLogical,
    });
    expect(rows).toHaveLength(1);
    expect(rows[0].statsProviderId).toBe('CLIProxyAPI');
    expect(rows[0].name).toBe('CLIProxyAPI');
  });
});
