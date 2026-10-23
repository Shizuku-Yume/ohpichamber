import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { hasLegacyOpenCodeData, openCodeDataDirectory } from './legacy-data.js';

const artifactDirectory = '/home/shizuku/Project/ohpichamber-omp-artifacts/task20-2026-10-23';

describe('legacy OpenCode presence-only probe', () => {
  it('checks only the resolved directory and exposes only a boolean', () => {
    const checked = [];
    expect(hasLegacyOpenCodeData({ platform: 'linux', env: {}, homeDirectory: '/fake-home', existsSync: value => { checked.push(value); return true; } })).toBe(true);
    expect(checked).toEqual(['/fake-home/.local/share/opencode']);
  });

  it('resolves platform data roots', () => {
    expect(openCodeDataDirectory({ platform: 'linux', env: { XDG_DATA_HOME: '/custom-data' }, homeDirectory: '/fake-home' })).toBe('/custom-data/opencode');
    expect(openCodeDataDirectory({ platform: 'darwin', env: {}, homeDirectory: '/fake-home' })).toBe('/fake-home/Library/Application Support/opencode');
    expect(openCodeDataDirectory({ platform: 'win32', env: { APPDATA: '/app-data' }, homeDirectory: '/fake-home' })).toBe('/app-data/opencode');
  });

  it('distinguishes a clean disposable HOME from one with an OpenCode directory', () => {
    fs.mkdirSync(artifactDirectory, { recursive: true });
    const homeDirectory = fs.mkdtempSync(path.join(artifactDirectory, 'presence-home-'));
    const options = { platform: 'linux', env: {}, homeDirectory };
    expect(hasLegacyOpenCodeData(options)).toBe(false);
    fs.mkdirSync(path.join(homeDirectory, '.local', 'share', 'opencode'), { recursive: true });
    expect(hasLegacyOpenCodeData(options)).toBe(true);
  });
});
