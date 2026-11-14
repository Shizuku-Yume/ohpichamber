#!/usr/bin/env node
// `node --test scripts/upstream-gaps.test.mjs`, as the repository's isolated runner does.
// Each case builds a small git repository: the committed files are the upstream
// reference, the working tree is the fork, and the guardrail runs inside it
// exactly as `scripts/check.mjs` runs it in the real repository.

import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { execFileSync, spawnSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const roots = [];

after(() => {
  for (const root of roots) rmSync(root, { recursive: true, force: true });
});

const write = (root, file, content) => {
  const absolute = path.join(root, file);
  mkdirSync(path.dirname(absolute), { recursive: true });
  writeFileSync(absolute, content);
};

const INDEX = `import express from 'express';
import { registerTrackerRoutes } from './lib/trackers/routes.js';
import { createAutoReviewRuntime } from './lib/auto-review/runtime.js';

const app = express();
registerTrackerRoutes(app);
const autoReview = createAutoReviewRuntime({ enabled: true });
export { app, autoReview };
`;

const TRACKER_ROUTES = `export function registerTrackerRoutes(app) {
  app.get('/api/tracker/things', (_req, res) => {
    res.json({ things: [] });
  });
  app.use('/api/tracker', (_req, res) => {
    res.status(404).json({ error: 'Not found', code: 'NOT_FOUND' });
  });
}
`;

const AUTO_REVIEW = `export function createAutoReviewRuntime(options) {
  return { enabled: options.enabled };
}
`;

const TRACKER_CLIENT = `export const loadThings = () => fetch('/api/tracker/things').then((r) => r.json());
`;

const UI_STORE = `export interface UIStore {
  terminalCloseOnExit: boolean;
  setTerminalCloseOnExit: (value: boolean) => void;
}

export const useUIStore = create<UIStore>()((set) => ({
  terminalCloseOnExit: true,
  setTerminalCloseOnExit: (value) => {
    set({ terminalCloseOnExit: value });
  },
}));
`;

const DECISIONS = '# Decisions\n\n## 2026-01-01 - Keep the tracker surface\n\nWhy.\n\n## 2026-11-10 - Merge upstream OpenChamber with a real git merge\n\nProcess.\n';
const ALLOWLIST_HEADER = 'class\titem\tcitation\teffect\n';

// Builds the fixture: `files` are committed as upstream and mirrored in the working tree.
function makeFixture(files, allowlistRows = []) {
  const root = mkdtempSync(path.join(tmpdir(), 'upstream-gaps-'));
  roots.push(root);
  execFileSync('git', ['init', '-q', '-b', 'main'], { cwd: root });
  cpSync(path.join(REPO_ROOT, 'scripts/upstream-gaps.mjs'), path.join(root, 'scripts/upstream-gaps.mjs'));
  cpSync(path.join(REPO_ROOT, 'scripts/lib/upstream-gaps'), path.join(root, 'scripts/lib/upstream-gaps'), { recursive: true });
  write(root, '.workflow/decisions.md', DECISIONS);
  write(root, 'scripts/upstream-gaps.allowlist.tsv', ALLOWLIST_HEADER + allowlistRows.join('\n') + (allowlistRows.length ? '\n' : ''));
  for (const [file, content] of Object.entries(files)) write(root, file, content);
  execFileSync('git', ['add', '-A'], { cwd: root });
  execFileSync('git', ['-c', 'user.email=t@t', '-c', 'user.name=t', 'commit', '-q', '-m', 'upstream'], { cwd: root });
  const upstreamRef = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
  return { root, upstreamRef, fork: (file, content) => write(root, file, content), remove: (file) => rmSync(path.join(root, file)) };
}

const baseFiles = () => ({
  'packages/web/server/index.js': INDEX,
  'packages/web/server/lib/trackers/routes.js': TRACKER_ROUTES,
  'packages/web/server/lib/auto-review/runtime.js': AUTO_REVIEW,
  'packages/ui/src/api/tracker.ts': TRACKER_CLIENT,
  'packages/ui/src/stores/useUIStore.ts': UI_STORE,
});

function runGuardrail(fixture) {
  const result = spawnSync('node', ['scripts/upstream-gaps.mjs', '--check', '--upstream-ref', fixture.upstreamRef], {
    cwd: fixture.root,
    encoding: 'utf8',
  });
  return { status: result.status, output: `${result.stdout}${result.stderr}` };
}

test('an unchanged fork passes the guardrail', () => {
  const result = runGuardrail(makeFixture(baseFiles()));
  assert.equal(result.status, 0, result.output);
  assert.match(result.output, /PASSED/);
});

test('deleting a tracker route handler leaves its caller uncovered, even with a 404 fallback mounted', () => {
  const fixture = makeFixture(baseFiles());
  fixture.fork('packages/web/server/lib/trackers/routes.js', TRACKER_ROUTES.replace(/  app\.get\('\/api\/tracker\/things'[\s\S]*?\}\);\n/, ''));
  const result = runGuardrail(fixture);
  assert.equal(result.status, 1, result.output);
  assert.match(result.output, /\[ui-call-no-route\] \/api\/tracker\/things/);
});

test('a route covered only by an explicit allowlist decision passes', () => {
  const fixture = makeFixture(baseFiles(), ['ui-call-no-route\t/api/tracker/things\t## 2026-01-01 - Keep the tracker surface\tTracker surface retired for this fixture.']);
  fixture.fork('packages/web/server/lib/trackers/routes.js', TRACKER_ROUTES.replace(/  app\.get\('\/api\/tracker\/things'[\s\S]*?\}\);\n/, ''));
  const result = runGuardrail(fixture);
  assert.equal(result.status, 0, result.output);
});

test('an HTTP method the route does not serve is not coverage', () => {
  const fixture = makeFixture(baseFiles());
  fixture.fork('packages/ui/src/api/tracker.ts', "export const saveThing = () => fetch('/api/tracker/things', { method: 'POST' });\n");
  const result = runGuardrail(fixture);
  assert.equal(result.status, 1, result.output);
  assert.match(result.output, /\[ui-call-no-route\] \/api\/tracker\/things/);
});

test('deleting the setTerminalCloseOnExit implementation while keeping its type fails', () => {
  const fixture = makeFixture(baseFiles());
  fixture.fork('packages/ui/src/stores/useUIStore.ts', UI_STORE.replace(/  setTerminalCloseOnExit: \(value\) => \{[\s\S]*?\n  \},\n/, ''));
  const result = runGuardrail(fixture);
  assert.equal(result.status, 1, result.output);
  assert.match(result.output, /\[settings-store\] useUIStore\.setTerminalCloseOnExit/);
});

test('deleting a create*Runtime call fails even while its import remains', () => {
  const fixture = makeFixture(baseFiles());
  fixture.fork('packages/web/server/index.js', INDEX.replace(/const autoReview = createAutoReviewRuntime\(\{ enabled: true \}\);\n/, ''));
  const result = runGuardrail(fixture);
  assert.equal(result.status, 1, result.output);
  assert.match(result.output, /\[runtime-constructor\] createAutoReviewRuntime/);
});

test('an imported but never-called route function is not coverage', () => {
  const fixture = makeFixture(baseFiles());
  fixture.fork('packages/web/server/index.js', INDEX.replace("import { createAutoReviewRuntime }", "import { createAutoReviewRuntime, registerNoteRoutes }"));
  fixture.fork('packages/web/server/lib/notes/routes.js', "export function registerNoteRoutes(app) {\n  app.get('/api/notes', (_req, res) => res.json([]));\n}\n");
  const result = runGuardrail(fixture);
  assert.equal(result.status, 1, result.output);
  assert.match(result.output, /\[unused-route-fn\] registerNoteRoutes/);
});

test('routes of an imported module that never mounts them are not coverage', () => {
  const fixture = makeFixture(baseFiles());
  fixture.fork('packages/web/server/index.js', INDEX.replace("import { createAutoReviewRuntime }", "import { registerNoteRoutes } from './lib/notes/routes.js';\nimport { createAutoReviewRuntime }"));
  fixture.fork('packages/web/server/lib/notes/routes.js', "export function registerNoteRoutes(app) {\n  app.get('/api/notes', (_req, res) => res.json([]));\n}\n");
  fixture.fork('packages/ui/src/api/notes.ts', "export const loadNotes = () => fetch('/api/notes');\n");
  const result = runGuardrail(fixture);
  assert.equal(result.status, 1, result.output);
  assert.match(result.output, /\[ui-call-no-route\] \/api\/notes/);
});

test('the generic merge heading is a catch-all, not a citation', () => {
  const fixture = makeFixture(baseFiles(), ['ui-call-no-route\t/api/tracker/things\t## 2026-11-10 - Merge upstream OpenChamber with a real git merge\tBlanket excuse.']);
  const result = runGuardrail(fixture);
  assert.equal(result.status, 1, result.output);
  assert.match(result.output, /lack a decisions\.md heading/);
});

test('an allowlist row must cite a decisions.md heading or an existing OMP module', () => {
  const fixture = makeFixture(baseFiles(), ['ui-call-no-route\t/api/unused\t## 2026-99-99 - Not a decision\tBlanket excuse.']);
  const result = runGuardrail(fixture);
  assert.equal(result.status, 1, result.output);
  assert.match(result.output, /lack a decisions\.md heading/);
});
