import { describe, expect, it, vi } from 'vitest';
import net from 'node:net';
import { mkdtempSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

import { applyConnectAttemptTimeout, CONNECT_ATTEMPT_TIMEOUT_MS } from './network-defaults.js';

describe('applyConnectAttemptTimeout', () => {
  it('initializes the server entrypoint in a fresh Node process', () => {
    const serverUrl = new URL('../index.js', import.meta.url).href;
    // A developer's real data directory may hold a newer schema; the spawned
    // server must not read or migrate it.
    const dataDir = mkdtempSync(path.join(os.tmpdir(), 'openchamber-network-defaults-'));
    try {
      const result = spawnSync('node', ['--input-type=module', '--eval', `
      import net from 'node:net';
      import assert from 'node:assert/strict';
      const family = net.getDefaultAutoSelectFamily();
      net.setDefaultAutoSelectFamilyAttemptTimeout(250);
      await import(${JSON.stringify(serverUrl)});
      assert.equal(net.getDefaultAutoSelectFamilyAttemptTimeout(), 5000);
      assert.equal(net.getDefaultAutoSelectFamily(), family);
      process.exit(0);
    `], { encoding: 'utf8', timeout: 15_000, windowsHide: true, env: { ...process.env, OPENCHAMBER_DATA_DIR: dataDir } });
      expect(result.status, result.stderr).toBe(0);
    } finally {
      rmSync(dataDir, { recursive: true, force: true });
    }
  });

  it('raises the per-attempt connect timeout on runtimes that expose the setter', () => {
    const previous = net.getDefaultAutoSelectFamilyAttemptTimeout();
    try {
      expect(applyConnectAttemptTimeout()).toBe(true);
      expect(net.getDefaultAutoSelectFamilyAttemptTimeout()).toBe(CONNECT_ATTEMPT_TIMEOUT_MS);
    } finally {
      net.setDefaultAutoSelectFamilyAttemptTimeout(previous);
    }
  });

  it('is a no-op on runtimes without the setter', () => {
    expect(applyConnectAttemptTimeout({})).toBe(false);
  });

  it('survives a throwing setter', () => {
    const setDefaultAutoSelectFamilyAttemptTimeout = vi.fn(() => {
      throw new Error('not supported');
    });
    expect(applyConnectAttemptTimeout({ setDefaultAutoSelectFamilyAttemptTimeout })).toBe(false);
  });

  it('leaves family autoselection itself untouched', () => {
    const setDefaultAutoSelectFamily = vi.fn();
    const setDefaultAutoSelectFamilyAttemptTimeout = vi.fn();
    applyConnectAttemptTimeout({ setDefaultAutoSelectFamily, setDefaultAutoSelectFamilyAttemptTimeout });
    expect(setDefaultAutoSelectFamilyAttemptTimeout).toHaveBeenCalledTimes(1);
    expect(setDefaultAutoSelectFamilyAttemptTimeout).toHaveBeenCalledWith(CONNECT_ATTEMPT_TIMEOUT_MS);
    expect(setDefaultAutoSelectFamily).not.toHaveBeenCalled();
  });
});
