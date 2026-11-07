import { describe, expect, test } from 'bun:test';
import type { ProviderResult, UsageWindow } from '@/types';
import { resolveUsagePanelState, usageQuotaReady } from './usagePageState';

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
  test('an unconfigured provider offers the actionable callout, not an empty state', () => {
    const state = resolveUsagePanelState(
      result({ ok: false, configured: false, usage: null }),
      undefined,
      staleError,
    );

    expect(state).toEqual({ usage: null, error: null, empty: false, unconfigured: true });
  });

  test('no result at all is the plain empty state', () => {
    const state = resolveUsagePanelState(null, undefined, staleError);

    expect(state).toEqual({ usage: null, error: null, empty: true, unconfigured: false });
  });

  test('a configured provider failure keeps its error and is not unconfigured', () => {
    const state = resolveUsagePanelState(
      result({ ok: false, error: 'Selected credential unavailable', usage: null }),
      undefined,
      staleError,
    );

    expect(state).toEqual({
      usage: null,
      error: 'Selected credential unavailable',
      empty: false,
      unconfigured: false,
    });
  });

  test('a configured provider with retained usage reports the refresh failure as stale', () => {
    const state = resolveUsagePanelState(result(), 'Provider API unavailable', staleError);

    expect(state.empty).toBe(false);
    expect(state.unconfigured).toBe(false);
    expect(state.usage?.windows.session).toEqual(window);
    expect(state.error).toBe('stale: Provider API unavailable');
  });

  test('a configured provider with usage has no error', () => {
    const state = resolveUsagePanelState(result(), undefined, staleError);

    expect(state.empty).toBe(false);
    expect(state.unconfigured).toBe(false);
    expect(state.error).toBeNull();
  });
});

describe('usage quota readiness', () => {
  test('requires both an initialized catalog and a workspace', () => {
    expect(usageQuotaReady(false, '')).toBe(false);
    expect(usageQuotaReady(true, '')).toBe(false);
    expect(usageQuotaReady(false, 'ws_1')).toBe(false);
    expect(usageQuotaReady(true, 'ws_1')).toBe(true);
  });
});
