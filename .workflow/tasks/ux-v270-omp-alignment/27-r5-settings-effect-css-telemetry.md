# 27: Every setting, class and stat has an effect (R5)

**Effort:** ux-v270-omp-alignment
**Blocked by:** 23, 25
**Covers:** W6
**Files:** `packages/ui/src/lib/settings/registry.ts` (+ effect test); `packages/ui/src/stores/{useUIStore,useSessionDisplayStore}.ts`; settings pages owning the dead keys; `scripts/check-css-classes.mjs` (new); `packages/ui/src/styles/design-system.css`; `packages/ui/src/index.css`; `packages/ui/src/components/session/SessionActivityIndicator.tsx`; `packages/ui/src/components/chat/work-status/telemetry.ts`; `packages/ui/src/components/chat/components/LiveTurnActivity.tsx`; `packages/ui/src/components/chat/lib/turns/timelineRows.ts`; `packages/ui/src/components/sections/openchamber/TunnelSettings.tsx`
**Read first:** `research/ux-v270-systemic-review.md` R5; `packages/ui/src/lib/theme/STYLING.md`; skills `performance-engineering`, `locale-ui-patterns`
**Check:** `VITEST_MAX_WORKERS=2 bunx vitest run packages/ui/src/lib/settings packages/ui/src/components/chat/work-status && bun scripts/check-css-classes.mjs && bun run lint` → exit 0, with the settings-effect test finding zero keys without a consumer and the CSS check finding zero unresolved classes; real path: a real turn shows model time, tool time, first-token latency and tok/s; the running-session spinner rotates when enabled; transcript content does not show through the composer
**Base commit:** ab047171d642c5077422fab8b4fad6111b70bcd5
**Status:** active

- [ ] Settings registry entries declare their effect; each of the 19 dead keys is wired to a real consumer or deleted together with its row and translations.
- [x] Add `scripts/check-css-classes.mjs` to `bun run check`: every class token in UI TSX resolves to a CSS rule, an `@utility`, or a documented marker.
- [x] Derive telemetry from task 23's step timings; a metric with no source is not rendered.
- [ ] Render turn pages through the merged upstream renderer, so no row kind lacks a renderer and no `{part.type}` stub remains.
- [ ] Deletes: dead persisted keys, the hardcoded `null` metric blocks, the `{part.type}` stub, the "More providers coming soon" item, and class names with no rule and no marker role.

## Progress

**Status: partial — two acceptance criteria remain open.** The run hit its
window budget; the work below is committed on `ux-v270-omp-alignment/27` and the
two open criteria are named precisely so the next window resumes without
re-deriving anything.

### Done and committed

`7b5266e40 feat(ui): make every class name and every turn stat resolve to a source`

- **CSS class check (criterion 2, complete).** `scripts/check-css-classes.mjs`
  scans every class position in `packages/ui/src/**/*.{ts,tsx}` (a tokenizer
  plus a context-stack parser: `className`, `cn`/`clsx`/`classNames`/`cx`/`cva`,
  module-level class constants, `cva` variant maps, `defaultVariants` excluded,
  comparison/`case` literals excluded, member access `x[y]` excluded) and fails
  on a token that is neither a stylesheet rule, a Tailwind utility, a class
  `chat/lib/visualKit.ts` injects at runtime, nor a `MARKER_CLASSES` entry that
  names who queries it. Wired into `scripts/check.mjs` as the `css-classes`
  step, so `bun run check` runs it.
  Result: `[css-classes] 2013 class tokens resolve to a rule, a utility or a marker`, exit 0.
- **Real defects it found, fixed:** the design-system adoption dropped
  `.animate-busy-wave` (restored with `@keyframes oc-busy-pulse` and a
  reduced-motion opt-out) while `BusyDots.tsx` still used it and
  `ReasoningPart.test.tsx` still asserted it; `--color-primary-muted`,
  `--color-info`, `--color-success`, `--color-warning` were referenced by
  utilities but missing from `@theme inline`, so `text-primary-muted`,
  `bg-info/10`, `text-success` and friends rendered unstyled.
- **Dead class names deleted** (no rule, no marker, no query, never had one):
  the `shake` variant in `ui/text.tsx`, `composer-editor`, `oc-ref-tint-scope`,
  `oc-ui-block`, `oc-ui-block-text`, `oc-ui-block-title`, and the
  `typography-ui` / `typography-small` / `typography-heading-lg` /
  `text-body-md` / `text-body-sm` tokens across 19 files.
- **Telemetry (criterion 3, complete).** `work-status/telemetry.ts` now derives
  `totalLlmDurationMs` (sum of `completedAt - startedAt`), `totalToolDurationMs`
  (sum of the gaps between consecutive steps), `avgTtftMs` (mean
  `firstTokenAt - startedAt`), `tokensPerSecond` and `responseTokensPerSecond`
  (final step with no tool call, from `firstTokenAt` to `completedAt`) from
  `Message.timing` — the field task 23 landed. A metric whose source is absent
  is `null`, and `WorkStatusTelemetrySection` already renders only non-null
  rows. Both rates clamp at 5000 tok/s. `mergeTimeIntervals` /
  `sumIntervalsDuration` were unused afterwards and are deleted with their test.
  `telemetry.test.ts`: 14 pass, 0 fail, 44 expect calls.
- **"More providers coming soon" deleted** from `TunnelSettings.tsx`
  (`9d9852c2d`).

### Open — criterion 1 (settings effect)

The 19 dead keys were identified and verified, and nothing was deleted yet
(`registry.ts` is untouched on this branch). The exact set, with the consumer
search that proved each one dead:

| key | why dead |
|---|---|
| `showOpenCodeUpdateNotifications` | no reader anywhere |
| `securityScopedBookmarks` | server sanitizes it; no Electron code ever reads or writes a bookmark |
| `managedRemoteTunnelSelectedPresetId` | only a legacy-key migration writes it; `TunnelSettings` keeps the selection in local state |
| `cornerRadius` | stored and persisted; no code consumes the radius |
| `summarizeLastMessage`, `summaryThreshold` | no reader; only the store setter |
| `summaryLength` | no reader (`summarization.js` takes a request param, not this setting) |
| `usageCollapsedFamilies`, `usageModelGroups` | `UsagePage` keeps collapse state in local `useState`; no reader |
| `recentAgents`, `recentEfforts` | written by `addRecentAgent`/`addRecentEffort`; nothing reads them |
| `collapsedModelProviders` | `toggleModelProviderCollapsed`/`setModelProvidersCollapsed` have no callers |
| `messageLimit` | `LOCAL_DEVICE_KEYS` entry with no reader |
| `agentSecretToolEnabled` | row in `OpenChamberToolsSettings`; no server or agent-service code reads it |
| `agentToolsCodeMode` | same |
| `agentScheduleToolEnabled` | same (the schedule actions are always registered) |
| `savePastedImagesAsFiles` | row in `ChatSettings`; `handlePaste` never consults it |

Deleting each needs, in one commit: the registry row, the `useUIStore` field +
initial value + setter + `partialize` entry, the settings-page row, the search
entry, the i18n key in all 15 locales, the server sanitizer branch, the
`settings-registry.json` snapshot (`bun run settings-registry:generate`), and
the `validValues` fixture line in `settings-helpers.test.js`. Then the effect
test: a `registry.test.ts` case that walks `SETTINGS_KEYS`, resolves the `ui`
binding's store key, and asserts each key is read by at least one non-plumbing
module — the consumer search above is the checker to encode.

### Open — criterion 4 (turn pages through the upstream renderer)

`timelineRows.ts` builds `turn-pages` rows and `LiveTurnActivity.tsx` exports
`TurnPagesRow`, but `MessageList.tsx` never calls `buildTimelineRows` and never
renders a `turn-pages` row: it still renders one `TurnItem` per turn with
`TurnAssistantBlock`. `TurnPagesRow` is dead code, and the `{part.type}` stub
the review names is already gone from this tree (it was replaced by
`ShownPartCard` in `77e00ef5e`). Closing this criterion means porting the
upstream `TurnRow` switch (`upstream/main:packages/ui/src/components/chat/MessageList.tsx`,
lines ~420-500) onto this fork's `TurnRecord`, wiring `MessageSliceContext`,
`LiveTurnHoistedPagesContext` and `useTurnFoldContexts`, and deleting
`TurnAssistantBlock` plus the per-turn `LiveTurnActivity` call site.

### Check before / after

`Check before:` not recorded (the window started from a lost session; the CSS
leg was red at 104 unresolved tokens, now 0).
`Check after:` `node scripts/check-css-classes.mjs` → exit 0, 2013 tokens
resolve. `bun test packages/ui/src/components/chat/work-status/telemetry.test.ts`
→ 14 pass, 0 fail. The task's `Check` line cannot run as written:
`bunx vitest run packages/ui/...` fails at baseline with
`Cannot find package 'bun:test'` (recorded in `.workflow/decisions.md` by task
25); the substitute is `bun --cwd packages/ui test <paths>`. `bun run lint` and
the settings-effect test were not run because criterion 1 is unfinished.
Real path not attempted: the window ended before it.
