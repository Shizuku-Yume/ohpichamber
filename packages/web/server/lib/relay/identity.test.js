import { describe, expect, it } from 'bun:test';
import crypto from 'node:crypto';

import { createRelayIdentityRuntime } from './identity.js';
import { canonicalPublicJwkString } from './signing-key.js';

// In-memory key store standing in for the on-disk relay identity file.
const makeKeyStore = (initial = {}) => {
  const slots = { ...initial };
  return {
    getOrCreate: async (slot, generate) => (slots[slot] ??= await generate()),
    generation: () => 0,
    peek: () => slots,
  };
};

describe('relay identity', () => {
  it('derives a stable serverId from the signing key and persists both keypairs', async () => {
    const relayKeyStore = makeKeyStore();
    const runtime = createRelayIdentityRuntime({ crypto, relayKeyStore });
    const identity = await runtime.getRelayIdentity();

    const stored = relayKeyStore.peek();
    expect(stored.signing).toBeDefined();
    expect(stored.encryption).toBeDefined();

    const expectedServerId = crypto
      .createHash('sha256')
      .update(canonicalPublicJwkString(stored.signing.publicJwk))
      .digest('base64url');
    expect(identity.serverId).toBe(expectedServerId);
    expect(identity.hostEncPubJwk.crv).toBe('P-256');
  });

  it('reuses an existing signing key (serverId stays stable across installs)', async () => {
    const pair = crypto.generateKeyPairSync('ec', { namedCurve: 'P-256' });
    const relayKeyStore = makeKeyStore({
      signing: {
        privateJwk: pair.privateKey.export({ format: 'jwk' }),
        publicJwk: pair.publicKey.export({ format: 'jwk' }),
      },
    });

    const runtime = createRelayIdentityRuntime({ crypto, relayKeyStore });
    const identity = await runtime.getRelayIdentity();
    const expected = crypto
      .createHash('sha256')
      .update(canonicalPublicJwkString(pair.publicKey.export({ format: 'jwk' })))
      .digest('base64url');
    expect(identity.serverId).toBe(expected);
  });

  it('rebuilds instead of caching an identity when a reset lands mid-build', async () => {
    const slots = {};
    let generation = 0;
    let resetOnce = false;
    const relayKeyStore = {
      getOrCreate: async (slot, generate) => {
        const value = (slots[slot] ??= await generate());
        if (slot === 'encryption' && !resetOnce) {
          // A reset finished after the signing key was read: rotate and bump.
          resetOnce = true;
          for (const key of Object.keys(slots)) delete slots[key];
          generation += 1;
        }
        return value;
      },
      generation: () => generation,
    };
    const runtime = createRelayIdentityRuntime({ crypto, relayKeyStore });
    const identity = await runtime.getRelayIdentity();
    const finalServerId = crypto
      .createHash('sha256')
      .update(canonicalPublicJwkString(slots.signing.publicJwk))
      .digest('base64url');
    expect(identity.serverId).toBe(finalServerId);
    expect(await runtime.getRelayIdentity()).toBe(identity);
  });

  it('produces a verifiable relay auth signature', async () => {
    const runtime = createRelayIdentityRuntime({ crypto, relayKeyStore: makeKeyStore() });
    const identity = await runtime.getRelayIdentity();
    const { ts, sig, pk } = identity.signRelayAuth('host-control', null);

    const canonical = Buffer.from(pk, 'base64url').toString('utf8');
    const publicJwk = JSON.parse(canonical);
    const key = crypto.createPublicKey({ key: publicJwk, format: 'jwk' });
    const ok = crypto.verify(
      'SHA256',
      Buffer.from(`${ts}.${identity.serverId}.host-control.`),
      { key, dsaEncoding: 'ieee-p1363' },
      Buffer.from(sig, 'base64url'),
    );
    expect(ok).toBe(true);
  });
});
