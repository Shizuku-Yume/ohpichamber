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
  it('checks only the resolved directory and exposes only a boolean', () => {
    const checked = [];
    expect(hasLegacyOpenCodeData({ platform: 'linux', env: {}, homeDirectory: '/fake-home', existsSync: value => { checked.push(value); return true; } })).toBe(true);
    expect(checked).toEqual(['/fake-home/.local/share/opencode']);
  });

  it('resolves trusted data roots', () => {
    expect(openCodeDataDirectory({ platform: 'linux', env: { XDG_DATA_HOME: '/custom-data' }, homeDirectory: '/fake-home' })).toBe('/custom-data/opencode');
    expect(openCodeDataDirectory({ platform: 'darwin', env: {}, homeDirectory: '/fake-home' })).toBe('/fake-home/Library/Application Support/opencode');
    expect(openCodeDataDirectory({ platform: 'win32', env: { APPDATA: '/app-data' }, homeDirectory: '/fake-home' })).toBe('/app-data/opencode');
  });

  it('distinguishes clean HOME from an existing OpenCode directory without reading entries', () => {
    const homeDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'legacy-presence-'));
    homes.push(homeDirectory);
    const options = { platform: 'linux', env: {}, homeDirectory };
    expect(hasLegacyOpenCodeData(options)).toBe(false);
    fs.mkdirSync(path.join(homeDirectory, '.local', 'share', 'opencode'), { recursive: true });
    expect(hasLegacyOpenCodeData(options)).toBe(true);
  });
});
