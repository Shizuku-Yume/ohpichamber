import { describe, expect, it, vi } from 'vitest';

import { extensionQuotaGuest, isExtensionQuotaGuest, listExtensionQuotaProviders } from './extension-registry.js';
import { readExtensionQuotaProvider } from './extension-service.js';

const guest = (overrides = {}) => ({
  id: 'teapot', name: 'Teapot Usage', icon: 'cup', enabled: true,
  capabilityGrants: ['service'], service: { provides: ['quota'] }, quota: { providers: ['teapot'] },
  ...overrides,
});

describe('extension usage providers', () => {
  it('lists only enabled, granted extensions that declare a usage contribution', () => {
    const guests = [
      guest(),
      guest({ id: 'paused', enabled: false }),
      guest({ id: 'ungranted', capabilityGrants: [] }),
      guest({ id: 'noquota', quota: undefined }),
      guest({ id: 'tracker', service: { provides: ['tracker'] }, quota: undefined }),
      // An id beyond the provider alphabet cannot name a provider.
      guest({ id: 'a'.repeat(40) }),
    ];
    expect(listExtensionQuotaProviders(guests)).toEqual([
      { id: 'ext-teapot', name: 'Teapot Usage', icon: 'cup', guestId: 'teapot' },
    ]);
    expect(isExtensionQuotaGuest(guests[0])).toBe(true);
  });

  it('resolves a provider id to its catalog row and refuses a built-in id', () => {
    const guests = [guest()];
    expect(extensionQuotaGuest(guests, 'ext-teapot')?.id).toBe('teapot');
    expect(extensionQuotaGuest(guests, 'openrouter')).toBeNull();
    expect(extensionQuotaGuest(guests, 'ext-missing')).toBeNull();
  });

  it('posts usage.read with exactly the approved credentials and maps the windows', async () => {
    const request = vi.fn(async () => ({
      status: 200,
      body: JSON.stringify({
        ok: true,
        data: {
          ok: true, configured: true, planLabel: 'Pro',
          usage: { windows: { fiveHour: { usedPercent: 24, resetAt: 1_800_000_000_000 } } },
        },
      }),
    }));
    const readCredential = vi.fn(async (providerId) => ({ type: 'api_key', key: `key-${providerId}` }));
    const result = await readExtensionQuotaProvider({ guest: guest(), request, readCredential });
    const sent = JSON.parse(request.mock.calls[0][0].body);
    expect(sent).toMatchObject({ v: 1, method: 'usage.read', provider: 'ext-teapot', input: { credentials: { teapot: { type: 'api_key', key: 'key-teapot' } } } });
    expect(request.mock.calls[0][0]).toMatchObject({ path: '/quota', method: 'POST' });
    expect(result).toMatchObject({ providerId: 'ext-teapot', ok: true, configured: true, planLabel: 'Pro' });
    expect(result.usage.windows.fiveHour).toMatchObject({ usedPercent: 24, remainingPercent: 76 });
  });

  it('reports a service that refuses, does not answer, or answers a malformed payload', async () => {
    const cases = [
      { request: async () => ({ status: 400, body: '' }), error: 'does not speak' },
      { request: async () => ({ status: 200, body: 'not json' }), error: 'malformed JSON' },
      { request: async () => ({ status: 200, body: JSON.stringify({ ok: true, data: { ok: 'yes' } }) }), error: 'invalid usage payload' },
      { request: async () => ({ status: 200, body: JSON.stringify({ ok: false, error: { code: 'SERVICE_FAILED', message: 'down' } }) }), error: 'down' },
      { request: async () => { throw new Error('no answer'); }, error: 'no answer' },
    ];
    for (const { request, error } of cases) {
      const result = await readExtensionQuotaProvider({ guest: guest(), request, readCredential: async () => null });
      expect(result.ok).toBe(false);
      expect(result.configured).toBe(true);
      expect(result.error).toContain(error);
    }
  });

  it('reads the credential only for the providers the manifest approves', async () => {
    const readCredential = vi.fn(async () => null);
    await readExtensionQuotaProvider({
      guest: guest({ quota: { providers: ['teapot'] } }),
      request: async () => ({ status: 200, body: JSON.stringify({ ok: true, data: { ok: true, configured: false, usage: null } }) }),
      readCredential,
    });
    expect(readCredential.mock.calls).toEqual([['teapot']]);
  });
});
