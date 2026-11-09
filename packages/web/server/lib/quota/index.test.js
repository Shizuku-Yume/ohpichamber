import { describe, expect, it } from 'vitest';

// The routes mount `./index.js`, not `./providers/index.js`. A re-export that
// providers/index.js does not expose fails at module instantiation, which
// makes every /api/quota route answer 503 without any route-level test seeing
// it. Importing the production module here keeps that contract honest.
describe('quota production module', () => {
  it('imports and exposes the helpers the routes mount', async () => {
    const quota = await import('./index.js');
    expect(typeof quota.listConfiguredQuotaProviders).toBe('function');
    expect(typeof quota.buildUnconfiguredQuotaResult).toBe('function');
    expect(typeof quota.fetchQuotaForProvider).toBe('function');
  });

  it('builds an unconfigured result for a registry provider without a selection', async () => {
    const quota = await import('./index.js');
    const result = quota.buildUnconfiguredQuotaResult('claude');
    expect(result).not.toBeNull();
    expect(result.configured).toBe(false);
  });
});
