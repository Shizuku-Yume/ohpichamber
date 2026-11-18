import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { fetchReleaseNotes, fetchUpdateNotes, renderUpdateNotes } from './update-notes.js';
import { compareVersions } from '../version-order.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..', '..');
const bundledIndex = path.join(repoRoot, 'changelog', 'index.json');
const newestRelease = JSON.parse(fs.readFileSync(bundledIndex, 'utf8'))[0];

const index = [
  {
    version: '1.2.4',
    date: '2026-03-04',
    title: null,
    intro: null,
    app: { new: ['Later release'], fixes: [] },
  },
  {
    version: '1.2.3',
    date: '2026-03-03',
    title: 'Comments everywhere',
    intro: 'Intro line.',
    app: {
      new: ['Inline comments'],
      improvements: ['Faster diff'],
      fixes: ['**Startup:** no crash'],
      sdk: ['host.onAction'],
      misc: ['Docs'],
    },
  },
  { version: 'not-a-version', date: '2026-03-02', app: {} },
];

describe('renderUpdateNotes', () => {
  it('renders the releases between two versions, newest first', () => {
    const markdown = renderUpdateNotes(index, '1.2.2', '1.2.3', compareVersions);
    expect(markdown).toMatch(/^## \[1\.2\.3\] - 2026-03-03\n\n\*\*Comments everywhere\*\*/);
    expect(markdown).toContain('### New\n\n- Inline comments');
    expect(markdown).toContain('### Misc\n\n- Docs');
    expect(markdown).not.toContain('1.2.4');
  });

  it('drops entries with an invalid version and yields null when nothing matches', () => {
    expect(renderUpdateNotes(index, '1.2.3', '1.2.3', compareVersions)).toBe(null);
    expect(renderUpdateNotes(null, '1.0.0', '2.0.0', compareVersions)).toBe(null);
  });
});

describe('bundled changelog', () => {
  it('renders an offered update from the packaged changelog', async () => {
    const previous = JSON.parse(fs.readFileSync(bundledIndex, 'utf8'))[1];
    const markdown = await fetchUpdateNotes(previous.version, newestRelease.version, compareVersions);
    expect(markdown).toContain(`## [${newestRelease.version}]`);
  });

  it('returns the installed version notes as data', async () => {
    const releases = await fetchReleaseNotes(newestRelease.version, undefined, compareVersions);
    expect(releases).not.toBe(null);
    expect(releases[0].version).toBe(newestRelease.version);
    expect(Array.isArray(releases[0].groups)).toBe(true);
  });

  it('returns a release range for `since`', async () => {
    const previous = JSON.parse(fs.readFileSync(bundledIndex, 'utf8'))[1];
    const releases = await fetchReleaseNotes(newestRelease.version, previous.version, compareVersions);
    expect(releases.map((release) => release.version)).toContain(newestRelease.version);
  });

  it('returns an empty list for a version the bundle does not have', async () => {
    expect(await fetchReleaseNotes('0.0.1', undefined, compareVersions)).toEqual([]);
  });
});
