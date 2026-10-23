import { afterEach, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { hasLegacyOpenCodeData, openCodeDataDirectory } from './legacy-data.js';

const homes = [];
afterEach(() => {
  for (const home of homes.splice(0)) fs.rmSync(home, { recursive: true, force: true });
});

describe('legacy OpenCode presence-only probe', () => {
  it('resolves the XDG data directory under the home directory', () => {
    expect(openCodeDataDirectory({ env: {}, homeDirectory: '/fake-home' })).toBe('/fake-home/.local/share/opencode');
  });

  it('uses XDG_DATA_HOME exactly as given', () => {
    expect(openCodeDataDirectory({ env: { XDG_DATA_HOME: '/custom data' }, homeDirectory: '/fake-home' })).toBe('/custom data/opencode');
    expect(openCodeDataDirectory({ env: { XDG_DATA_HOME: ' /custom-data ' }, homeDirectory: '/fake-home' })).toBe(' /custom-data /opencode');
    expect(openCodeDataDirectory({ env: { XDG_DATA_HOME: '' }, homeDirectory: '/fake-home' })).toBe('/fake-home/.local/share/opencode');
  });

  it('resolves nothing only when neither XDG_DATA_HOME nor a home directory is available', () => {
    expect(openCodeDataDirectory({ env: {}, homeDirectory: '' })).toBeNull();
    expect(openCodeDataDirectory({ env: { XDG_DATA_HOME: '/custom-data' }, homeDirectory: '' })).toBe('/custom-data/opencode');
  });

  it('checks only the resolved directory and exposes only a boolean', () => {
    const checked = [];
    expect(hasLegacyOpenCodeData({ env: {}, homeDirectory: '/fake-home', existsSync: value => { checked.push(value); return true; } })).toBe(true);
    expect(checked).toEqual(['/fake-home/.local/share/opencode']);
  });

  it('distinguishes clean HOME from an existing OpenCode directory without reading entries', () => {
    const homeDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'legacy-presence-'));
    homes.push(homeDirectory);
    const options = { env: {}, homeDirectory };
    expect(hasLegacyOpenCodeData(options)).toBe(false);
    const legacyDirectory = path.join(homeDirectory, '.local', 'share', 'opencode');
    fs.mkdirSync(legacyDirectory, { recursive: true });
    fs.writeFileSync(path.join(legacyDirectory, 'sentinel.json'), '{"unread":true}');
    expect(hasLegacyOpenCodeData(options)).toBe(true);
  });
});
