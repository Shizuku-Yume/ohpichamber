import { describe, expect, test } from 'bun:test';
import type { ProviderResult, UsageWindow } from '@/types';
import { resolveUsagePanelState } from './usagePageState';

const window: UsageWindow = {
  usedPercent: 42,
  remainingPercent: 58,
  windowSeconds: 18000,
  resetAfterSeconds: 100,
  resetAt: 1000,
  resetAtFormatted: null,
  resetAfterFormatted: null,
};

const result = (overrides: Partial<ProviderResult> = {}): ProviderResult => ({
  providerId: 'claude',
  providerName: 'Claude',
  ok: true,
  configured: true,
  usage: { windows: { session: window } },
  fetchedAt: 1,
  ...overrides,
});

const staleError = (error: string) => `stale: ${error}`;

describe('UsagePage panel state', () => {
  test('an unconfigured provider is an empty state with no error', () => {
    const state = resolveUsagePanelState(
      result({ ok: false, configured: false, usage: null }),
      undefined,
      staleError,
    );

    expect(state).toEqual({ usage: null, error: null, empty: true });
  });

  test('a configured provider failure keeps its error', () => {
    const state = resolveUsagePanelState(
      result({ ok: false, error: 'Selected credential unavailable', usage: null }),
      undefined,
      staleError,
    );

    expect(state).toEqual({ usage: null, error: 'Selected credential unavailable', empty: false });
  });

  test('a configured provider with retained usage reports the refresh failure as stale', () => {
    const state = resolveUsagePanelState(result(), 'Provider API unavailable', staleError);

    expect(state.empty).toBe(false);
    expect(state.usage?.windows.session).toEqual(window);
    expect(state.error).toBe('stale: Provider API unavailable');
  });

  test('a configured provider with usage has no error', () => {
    const state = resolveUsagePanelState(result(), undefined, staleError);

    expect(state.empty).toBe(false);
    expect(state.error).toBeNull();
  });
});
