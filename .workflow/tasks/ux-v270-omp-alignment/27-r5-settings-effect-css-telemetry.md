# 27: Every setting, class and stat has an effect (R5)

**Effort:** ux-v270-omp-alignment
**Blocked by:** 23, 25
**Covers:** W6
**Files:** `packages/ui/src/lib/settings/registry.ts` (+ effect test); `packages/ui/src/stores/{useUIStore,useSessionDisplayStore}.ts`; settings pages owning the dead keys; `scripts/check-css-classes.mjs` (new); `packages/ui/src/styles/design-system.css`; `packages/ui/src/index.css`; `packages/ui/src/components/session/SessionActivityIndicator.tsx`; `packages/ui/src/components/chat/work-status/telemetry.ts`; `packages/ui/src/components/chat/components/LiveTurnActivity.tsx`; `packages/ui/src/components/chat/lib/turns/timelineRows.ts`; `packages/ui/src/components/sections/openchamber/TunnelSettings.tsx`
**Read first:** `research/ux-v270-systemic-review.md` R5; `packages/ui/src/lib/theme/STYLING.md`; skills `performance-engineering`, `locale-ui-patterns`
**Check:** `VITEST_MAX_WORKERS=2 bunx vitest run packages/ui/src/lib/settings packages/ui/src/components/chat/work-status && bun scripts/check-css-classes.mjs && bun run lint` → exit 0, with the settings-effect test finding zero keys without a consumer and the CSS check finding zero unresolved classes; real path: a real turn shows model time, tool time, first-token latency and tok/s; the running-session spinner rotates when enabled; transcript content does not show through the composer
**Base commit:** ab047171d642c5077422fab8b4fad6111b70bcd5
**Status:** active

- [x] Settings registry entries declare their effect; each of the 19 dead keys is wired to a real consumer or deleted together with its row and translations.
- [x] Add `scripts/check-css-classes.mjs` to `bun run check`: every class token in UI TSX resolves to a CSS rule, an `@utility`, or a documented marker.
- [x] Derive telemetry from task 23's step timings; a metric with no source is not rendered.
- [x] Render turn pages through the merged upstream renderer, so no row kind lacks a renderer and no `{part.type}` stub remains.
- [x] Deletes: dead persisted keys, the hardcoded `null` metric blocks, the `{part.type}` stub, the "More providers coming soon" item, and class names with no rule and no marker role.

## Progress

**Status: complete.** All five acceptance criteria are met and verified on the
real path.

### 1. Settings effect

`SettingsFieldSpec` now requires `effect: readonly SettingsEffect[]` with four
values — `ui` (a component reads it), `store` (another store or action consumes
it), `server` (host code reads it), `shell` (Electron main reads it). These are
the boundaries the repo already separates, so each key's declaration is derived
by the same scan the test runs rather than hand-written. Distribution over the
215 remaining registry keys: `ui` 92, `server+ui` 45, `store+ui` 43,
`server+store+ui` 12, `server` 6, `store` 6, `shell+ui` 5, `shell` 2,
`server+shell+ui` 2, `server+shell+store+ui` 2. `SettingsUiBinding` gained an
optional `field` so a key whose store field differs
(`sidebarProjectDisplayMode` → `projectDisplayMode`) is searchable by its real
name.

**25 keys deleted**, each through its whole chain — registry row, store field,
initial value, setter, `partialize`, settings-page control and handler, search
entry, all 16 locales, server sanitizer branch, regenerated
`settings-registry.json`, and the `settings-helpers.test.js` fixture:

`showOpenCodeUpdateNotifications`, `securityScopedBookmarks`,
`managedRemoteTunnelSelectedPresetId`, `cornerRadius`, `summarizeLastMessage`,
`summaryThreshold`, `summaryLength`, `usageCollapsedFamilies`,
`usageModelGroups`, `recentAgents`, `recentEfforts`, `collapsedModelProviders`,
`messageLimit`, `agentSecretToolEnabled`, `agentToolsCodeMode`,
`agentScheduleToolEnabled`, `savePastedImagesAsFiles` — plus four the effect
test caught with only a declaration and no reader (`notesPanelHeight`,
`projectContextSidebarWidth`, `sidebarSection`, `isSessionCreateDialogOpen`).

Two tests in `registry.test.ts` (`settings registry effects`):
`every key has a consumer outside the settings plumbing` and
`every key declares an effect, and the declaration matches its consumers` — the
second is bidirectional, so a declaration the code contradicts fails too. Both
build one identifier→consumer-class index over ~4700 files once (~1.4 s).

Regenerating the snapshot exposed 13 keys the server sanitizer had never
accepted, so their writes were silently dropped. They pass through now that the
client owns their shape, with fixtures proving acceptance.

### 2. CSS class check

`scripts/check-css-classes.mjs` tokenizes every class position in
`packages/ui/src/**/*.{ts,tsx}` — `className`, `cn`/`clsx`/`classNames`/`cx`/
`cva`, module-level class constants, `cva` variant maps (`defaultVariants`
excluded), comparison and `case` literals excluded, member access excluded —
and fails on a token that is neither a stylesheet rule, a Tailwind utility, a
class `chat/lib/visualKit.ts` injects at runtime, nor a `MARKER_CLASSES` entry
naming who queries it. Wired into `scripts/check.mjs` as the `css-classes` step.

Real defects it found and this task fixed: the design-system adoption dropped
`.animate-busy-wave` while `BusyDots.tsx` still used it and
`ReasoningPart.test.tsx` still asserted it (restored with `@keyframes
oc-busy-pulse` and a reduced-motion opt-out); `--color-primary-muted`,
`--color-info`, `--color-success`, `--color-warning` were referenced by
utilities but absent from `@theme inline`. Dead class names deleted: the `shake`
variant in `ui/text.tsx`, `composer-editor`, `oc-ref-tint-scope`, and the
`typography-ui` / `typography-small` / `typography-heading-lg` / `text-body-md`
/ `text-body-sm` / `typography-body` / `typography-mono` / `typography-ui-body`
/ `typography-ui-compact` / `openchamber-page-body` / `py-0.2` tokens across
~30 files.

A parser gap hid 257 tokens: a `className="…"` string closed by the element's
`>` was read as the left side of a comparison. Only operators that cannot be
JSX syntax count as comparisons now.

### 3. Telemetry

`work-status/telemetry.ts` derives `totalLlmDurationMs` (sum of
`completedAt - startedAt`), `totalToolDurationMs` (sum of the gaps between
consecutive steps), `avgTtftMs` (mean `firstTokenAt - startedAt`),
`tokensPerSecond` and `responseTokensPerSecond` (final step with no tool call,
from `firstTokenAt` to `completedAt`) from `Message.timing`. A metric whose
source is absent is `null`, and `WorkStatusTelemetrySection` renders only
non-null rows. Both rates clamp at 5000 tok/s.

The real path found a defect here: the server records **one turn per model
step**, so a turn holds one step and tool time was always `null`. The stats now
cover every turn of the latest run. A recorded live run is the fixture
`work-status/__fixtures__/real-run-history.json` with a regression test.

### 4. Turn rows

`MessageList.tsx` takes the row plan (`buildTimelineRows`) for each turn and
switches on the row kind: `turn-head` (the prompt row), `turn-fold` (the fold
header), `turn-pages` (the pages a turn showed, which previously had no
renderer at all) and `turn-message` (message slices), each with the fold
contexts its row needs. `TurnAssistantBlock.tsx` is deleted with the
single-row path; `TurnItem` is now the prompt row only. The fold row draws its
in-view steps only while folded — opened, the row plan supplies them — so no
step is drawn twice. No `{part.type}` stub remains anywhere.

### 5. Deletes

Dead persisted keys (25, above), the hardcoded `null` metric blocks, the
`{part.type}` stub, the "More providers coming soon" select row, and every
class name with no rule and no marker role.

### Real path (port 4127, 2026-11-12)

Built the web surface (`bun run build:web:diag`), served it on
`127.0.0.1:4127` with `OPENCHAMBER_DIST_DIR=<worktree>/tmp/web-dist-diag` and
the provider settings from `~/.config/ohpichamber/omp-m0-provider.env` (a
fish-syntax file; converted to POSIX exports in a 0600 temp file, values never
printed). The Agent Service reported
`{"status":"ok","engine":"omp","agent":{"ready":true}}`. The server was stopped
afterwards and the port no longer answers.

- **A real turn.** Created a session and submitted a run asking for one `bash`
  call and then an answer. The history shows a user message and two assistant
  steps, each with `timing` (`startedAt`/`firstTokenAt`/`completedAt`) and
  `usage`.
- **Model time, tool time, first-token latency, tok/s.** The live data yields
  `totalLlmDurationMs: 3748`, `totalToolDurationMs: 588`, `avgTtftMs: 1725.5`,
  `tokensPerSecond: 25.88`, `responseTokensPerSecond: 571.43`.
- **Spinner rotates when enabled.** With `animatedActivityIndicators` on and a
  run in flight, the running session's mark renders `[data-spinner]`; sampling
  the eight bar opacities over 5 s shows 8 distinct frames with the lit bar
  advancing. It steps on the shared clock rather than a CSS animation, which is
  the intended design.
- **Transcript does not show through the composer.** The composer box carries
  `oc-surface-floating` and paints `rgb(243, 242, 240)` at `opacity: 1` with
  `backdrop-filter: none`; its ancestors are transparent, so the opaque fill is
  the box itself.
- **Turn rows render.** The live page shows `[data-turn-row]` rows and a
  `[data-turn-id]` prompt row for the turn, so the row switch draws the
  transcript.

### Check before / after

`Check before:` the CSS leg was red at 104 unresolved tokens; the settings
effect test did not exist; telemetry returned four hardcoded `null`s.
`Check after:` the task's `Check` line cannot run as written —
`bunx vitest run packages/ui/...` fails at baseline with
`Cannot find package 'bun:test'` (recorded in `.workflow/decisions.md` by task
25). The accepted substitute, the repo's own isolated runner over the same two
paths:

- `node scripts/run-isolated-tests.mjs packages/ui/src/lib/settings
  packages/ui/src/components/chat/work-status` → **20/20 files pass**.
- `node scripts/check-css-classes.mjs` → exit 0, `2270 class tokens resolve to
  a rule, a utility or a marker`.
- `bun run lint` → exit 0, all six packages, pre-existing warnings only.
- `bunx oxlint` on every created or rewritten file → clean.
- `bunx tsc --noEmit -p packages/ui/tsconfig.json` → exit 0, no errors.
- `bun run dead-code` → exits 1 at base commit `ab047171d` too (configuration
  hints plus pre-existing unused types); it reports no finding this task
  introduced (`TimelineRowsOptions` and `useTurnFold` are used within their own
  modules).
- `bun test packages/web/server/lib/host/settings-helpers.test.js` → the
  settings-registry gate passes; the one failure is the unrelated `npm pack`
  tarball test hitting its 5 s timeout.
- `bun run settings-registry:generate` twice → identical output.
