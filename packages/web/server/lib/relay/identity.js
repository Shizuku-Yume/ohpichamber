// Host relay identity: the EXISTING ECDSA P-256 signing keypair (shared with
// the push relay via signing-key.js — same storage, same serverId) plus a NEW
// long-lived ECDH P-256 encryption keypair for the E2EE channel (WebCrypto
// keys are single-purpose, so signing and encryption keys must differ).
// Both keypairs are stored by key-store.js.

import {
  canonicalPublicJwkString,
  deriveServerId,
  getOrCreateRelaySigningKeypair,
  signRelayMessage,
} from './signing-key.js';
import { exportPublicKeyJwk, generateEcdhKeyPair, importEcdhPrivateKey } from './e2ee.js';

/**
 * @param {{
 *   crypto: typeof import('node:crypto'),
 *   relayKeyStore: ReturnType<typeof import('./key-store.js').createRelayKeyStore>,
 * }} deps
 */
export const createRelayIdentityRuntime = (deps) => {
  const { crypto, relayKeyStore } = deps;

  let cachedIdentity = null;
  let cachedGeneration = -1;

  const getOrCreateEncryptionKeypair = () => relayKeyStore.getOrCreate('encryption', async () => {
    // Loud on purpose: a new encryption key invalidates the E2EE trust anchor of
    // every paired device. Expected exactly once, on first relay use.
    console.warn('[relay-identity] Generating NEW relay encryption keypair (E2EE trust anchor changes; previously paired devices must re-pair)');
    const keyPair = await generateEcdhKeyPair();
    const privateJwk = await globalThis.crypto.subtle.exportKey('jwk', keyPair.privateKey);
    const publicJwk = await exportPublicKeyJwk(keyPair.publicKey);
    return { privateJwk, publicJwk };
  });

  /**
   * @returns {Promise<{
   *   serverId: string,
   *   hostEncPubJwk: JsonWebKey,
   *   hostEncPrivateKey: CryptoKey,
   *   signRelayAuth: (role: string, connectionId?: string | null) => { ts: number, sig: string, pk: string },
   * }>}
   */
  const buildIdentity = async () => {
    const signing = await getOrCreateRelaySigningKeypair({ crypto, relayKeyStore });
    const serverId = deriveServerId({ crypto }, signing.publicJwk);
    const encryption = await getOrCreateEncryptionKeypair();
    const hostEncPrivateKey = await importEcdhPrivateKey(encryption.privateJwk);
    const pk = Buffer.from(canonicalPublicJwkString(signing.publicJwk), 'utf8').toString('base64url');

    // Relay-layer auth for host-control / host-data upgrades. Signature payload
    // string is `${ts}.${serverId}.${role}.${connectionId ?? ""}` (spec Layer 1).
    const signRelayAuth = (role, connectionId) => {
      const ts = Date.now();
      const sig = signRelayMessage({ crypto }, signing.privateKey, `${ts}.${serverId}.${role}.${connectionId ?? ''}`);
      return { ts, sig, pk };
    };

    return {
      serverId,
      hostEncPubJwk: encryption.publicJwk,
      hostEncPrivateKey,
      signRelayAuth,
    };
  };

  // A reset changes the key store generation after it rewrites the file, so a
  // build that started before the reset can hold a mix of old and new keys.
  // Compare the generation after building: a change means rebuild, never cache.
  const getRelayIdentity = async () => {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const generation = relayKeyStore.generation();
      if (cachedIdentity && cachedGeneration === generation) return cachedIdentity;
      const identity = await buildIdentity();
      if (relayKeyStore.generation() !== generation) continue;
      cachedIdentity = identity;
      cachedGeneration = generation;
      return identity;
    }
    throw new Error('relay identity changed repeatedly while it was being read');
  };

  return { getRelayIdentity };
};
