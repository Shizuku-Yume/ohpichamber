#!/usr/bin/env node
/**
 * scripts/upstream-gaps.mjs
 *
 * Guardrail comparing upstream bc50ba56a with the working tree on:
 * - route registrations and runtime deps
 * - uncalled route functions
 * - UI/Electron/mobile /api calls versus string, parameter and regex routes
 * - settings items, registry keys, sanitizer keys, store fields with setters, and search entries
 *
 * Usage:
 *   node scripts/upstream-gaps.mjs [--check] [--upstream-ref bc50ba56a]
 */

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const REPO_ROOT = process.cwd();
const args = process.argv.slice(2);
const CHECK_MODE = args.includes('--check');

function getFlag(name, fallback) {
  const idx = args.indexOf(name);
  if (idx !== -1 && args[idx + 1]) return args[idx + 1];
  return fallback;
}

const UPSTREAM_REF = getFlag('--upstream-ref', 'bc50ba56a');
const ALLOWLIST_PATH = path.join(REPO_ROOT, 'scripts/upstream-gaps.allowlist.tsv');

// 1. Load allowlist
if (!fs.existsSync(ALLOWLIST_PATH)) {
  console.error(`Allowlist not found: ${ALLOWLIST_PATH}`);
  process.exit(1);
}

const allowlistLines = fs.readFileSync(ALLOWLIST_PATH, 'utf8').trim().split('\n');
const allowlist = new Map();
const invalidCitations = [];

for (let i = 1; i < allowlistLines.length; i++) {
  const line = allowlistLines[i].trim();
  if (!line) continue;
  const parts = line.split('\t');
  const cls = parts[0];
  const item = parts[1];
  const citation = parts[2] || '';
  const key = `${cls}:${item}`;

  // Verify citation cites decisions.md heading, OMP owner, or pending <task>
  const isValidCitation =
    /^##\s+2026-\d{2}-\d{2}/.test(citation) ||
    /^(2026-\d{2}-\d{2}|OMP|omp|pending\s+\d{2})/.test(citation) ||
    citation.includes('decisions.md') ||
    citation.includes('upstream-debt') ||
    citation.includes('investigation-needed');

  if (!isValidCitation && citation) {
    invalidCitations.push({ key, citation });
  }

  allowlist.set(key, { citation, line: i + 1 });
}

console.log(`[upstream-gaps] Loaded ${allowlist.size} allowlisted gap entries from ${path.relative(REPO_ROOT, ALLOWLIST_PATH)}`);

// 2. Run server wiring audit
console.log('[upstream-gaps] Auditing server wiring and uncalled route functions...');
const serverAuditScript = path.join(REPO_ROOT, 'scripts/lib/upstream-gaps/audit-server-wiring.mjs');
const serverOutRaw = execFileSync('node', [serverAuditScript, '--upstream-ref', UPSTREAM_REF, '--json'], {
  cwd: REPO_ROOT,
  encoding: 'utf8',
  maxBuffer: 64 * 1024 * 1024,
});
const serverOut = JSON.parse(serverOutRaw);

// 3. Run UI API calls audit
console.log('[upstream-gaps] Auditing UI / Electron / Mobile /api calls against server routes...');
const uiAuditScript = path.join(REPO_ROOT, 'scripts/lib/upstream-gaps/audit-ui-api.mjs');
const uiOutRaw = execFileSync('node', [uiAuditScript, '--json'], {
  cwd: REPO_ROOT,
  encoding: 'utf8',
  maxBuffer: 64 * 1024 * 1024,
});
const uiOut = JSON.parse(uiOutRaw);

// 4. Run Settings inventory audit
console.log('[upstream-gaps] Auditing settings items, registry keys, sanitizers, stores, and search entries...');
const settingsAuditScript = path.join(REPO_ROOT, 'scripts/lib/upstream-gaps/audit-settings.mjs');
const settingsOutRaw = execFileSync('node', [settingsAuditScript, '--upstream-ref', UPSTREAM_REF, '--json'], {
  cwd: REPO_ROOT,
  encoding: 'utf8',
  maxBuffer: 64 * 1024 * 1024,
});
const settingsOut = JSON.parse(settingsOutRaw);

// 5. Collect all detected gaps
const detectedGaps = [];

// Route registrations missing on fork
for (const item of serverOut.registerCalls.onlyUpstream) {
  detectedGaps.push({ class: 'route-registration', item: item.name, detail: item.upstream.join(', ') });
}

// Route dependencies missing on fork (from register* and create* calls)
for (const item of serverOut.registerCalls.depDiffs) {
  for (const dep of item.missingInFork) {
    detectedGaps.push({ class: 'route-deps', item: `${item.name}.${dep}`, detail: `missing from ${item.fork.join(', ')}` });
  }
}
for (const item of serverOut.createCalls.depDiffs) {
  for (const dep of item.missingInFork) {
    detectedGaps.push({ class: 'route-deps', item: `${item.name}.${dep}`, detail: `missing from ${item.fork.join(', ')}` });
  }
}

// Uncalled route functions
for (const item of serverOut.unusedExports) {
  detectedGaps.push({ class: 'unused-route-fn', item: item.name, detail: `${item.file}:${item.line}` });
}

// UI / Electron / mobile API calls with no matching server route
const seenUiGaps = new Set();
for (const item of uiOut.unmatched) {
  const norm = item.normalized;
  if (seenUiGaps.has(norm)) continue;
  seenUiGaps.add(norm);
  detectedGaps.push({ class: 'ui-call-no-route', item: norm, detail: `${item.file}:${item.line}` });
}

// Settings classes
for (const item of settingsOut) {
  if (item.status === 'missing' || item.status === 'half-present') {
    detectedGaps.push({ class: item.class, item: item.item, detail: `${item.status}: ${item.notes}` });
  }
}

// 6. Check detected gaps against allowlist
const unallowlistedGaps = [];
for (const gap of detectedGaps) {
  const key = `${gap.class}:${gap.item}`;
  if (!allowlist.has(key)) {
    unallowlistedGaps.push(gap);
  }
}

console.log(`[upstream-gaps] Total detected gaps: ${detectedGaps.length}`);
console.log(`[upstream-gaps] Allowlisted gaps: ${detectedGaps.length - unallowlistedGaps.length}`);
console.log(`[upstream-gaps] Unallowlisted gaps: ${unallowlistedGaps.length}`);

if (invalidCitations.length > 0) {
  console.warn(`[upstream-gaps] Warning: ${invalidCitations.length} allowlist rows have non-standard citations`);
}

if (unallowlistedGaps.length > 0) {
  console.error('\n[upstream-gaps] FAILED: Found unallowlisted merge gaps:');
  for (const g of unallowlistedGaps) {
    console.error(`  - [${g.class}] ${g.item} (${g.detail || ''})`);
  }
  if (CHECK_MODE) {
    process.exit(1);
  }
} else {
  console.log('\n[upstream-gaps] PASSED: All detected gaps are accounted for in the allowlist or working tree.');
  process.exit(0);
}
