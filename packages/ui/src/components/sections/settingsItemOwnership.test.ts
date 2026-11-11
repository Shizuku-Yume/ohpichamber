import { describe, expect, test } from 'bun:test';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * One settings item id, one owning page.
 *
 * Search, deep links and the Settings anchors all address a control by its
 * `data-settings-item` value, so two pages claiming the same id send a reader
 * to whichever one they happen to land on. The OMP page's duplicate-owner
 * classification relies on the same rule: a setting classified `duplicate`
 * names an id here, and that id must have exactly one owner.
 */

const SECTIONS_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

/**
 * Same-page claims: a dialog or an inline form beside the main control, both
 * under one page. They cannot send a reader to the wrong page because the page
 * is the same, and the pair is deliberately two views of one concept.
 */
const SAME_PAGE_CLAIMS: Readonly<Record<string, string>> = {
  'commands.argument-hint': 'CommandsPage shows the hint in the list row and in the editor',
  'plugins.content': 'PluginsPage lists the plugin; AddPluginDialog edits one',
  'projects.worktree': 'The project tab and its worktree list both name the worktree setting',
  'providers.auth': 'ProvidersPage authenticates the same provider in two places',
  'providers.connect': 'ProviderConnectPicker opens the form ProviderGrid resells',
  'providers.custom': 'ProviderConnectPicker offers custom setup; CustomProviderForm is it',
  'sessions.small-model': 'The opt-out toggle and the model picker are one setting, disabled together',
};

interface Claim {
  readonly id: string;
  readonly page: string;
  readonly file: string;
}

function walk(directory: string, files: string[] = []): string[] {
  for (const entry of readdirSync(directory)) {
    const full = join(directory, entry);
    if (statSync(full).isDirectory()) {
      if (entry === 'node_modules') continue;
      walk(full, files);
    } else if (/\.tsx$/.test(entry) && !/\.test\.tsx$/.test(entry)) {
      files.push(full);
    }
  }
  return files;
}

/** Every literal `settingsItem="..."` anchor in the sections tree. */
function collectClaims(): Claim[] {
  const claims: Claim[] = [];
  for (const file of walk(SECTIONS_ROOT)) {
    const source = readFileSync(file, 'utf8');
    for (const match of source.matchAll(/settingsItem="([^"{}]+)"/g)) {
      claims.push({
        id: match[1],
        page: relative(SECTIONS_ROOT, file).split('/')[0],
        file: relative(SECTIONS_ROOT, file),
      });
    }
  }
  return claims;
}

describe('settings item ownership', () => {
  test('no settings item id is claimed by two pages', () => {
    const claims = collectClaims();
    const offenders: string[] = [];
    for (const claim of claims) {
      const others = claims.filter((other) => other.id === claim.id && other.file !== claim.file);
      if (others.length === 0) continue;
      const pages = new Set([claim.page, ...others.map((other) => other.page)]);
      // Same page: allowed only when the pair is named here with its reason,
      // so a second control on one page is still a deliberate decision.
      if (pages.size === 1 && SAME_PAGE_CLAIMS[claim.id] !== undefined) continue;
      offenders.push(`${claim.id}: ${[claim.file, ...others.map((other) => other.file)].join(', ')}`);
    }
    expect([...new Set(offenders)].sort()).toEqual([]);
  });

  test('the same-page allowlist names a claim that still exists, and says why', () => {
    const ids = new Set(collectClaims().map((claim) => claim.id));
    for (const [id, reason] of Object.entries(SAME_PAGE_CLAIMS)) {
      expect(`${id} claimed: ${ids.has(id)}`).toBe(`${id} claimed: true`);
      expect(`${id} reason: ${reason.length > 0}`).toBe(`${id} reason: true`);
    }
  });
});
