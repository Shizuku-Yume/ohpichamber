# 06: Wire OMP native IdleMaintenance Recap, Agent Hub swarm dashboard, and omp-stats SQLite engine

**Effort:** m6-audit-and-polish
**Task type:** feature
**Blocked by:** 01, 02, 03
**Covers:** W4, W6
**Files:** `packages/agent-contract/src/events.ts`; `packages/agent-contract/src/session.ts`; `packages/agent-contract/src/requests.ts`; `packages/agent-contract/src/usage.ts`; `packages/agent-contract/src/settings.ts`; `packages/agent-service/src/worker/session.ts`; `packages/agent-service/src/worker/usage.ts`; `packages/agent-service/src/sessions/routes.ts`; `packages/ui/src/components/chat/SessionRecapSpacer.tsx`; `packages/ui/src/hooks/useSessionAssist.ts`; `packages/ui/src/components/chat/AgentHubModal.tsx`; `packages/ui/src/components/chat/SubagentHudTray.tsx`; `packages/ui/src/components/chat/work-status/WorkStatusSubagentsSection.tsx`; `packages/web/server/lib/session-assist/runtime.js`
**Base commit:** 876a08f538
**Started:** 2026-11-07
**Finished:** 2026-11-07
**Read first:** `.workflow/specs/m6-audit-and-polish.md`; `.workflow/research/m6-audit-list-b-omp-capabilities.md` (§2, §3, §5.3, §6); `.workflow/research/m6-audit-list-c-ui-compliance.md` (§5.2.2–§5.2.4 for `SessionRecapSpacer.tsx`, `SubagentHudTray.tsx`, `WorkStatusSubagentsSection.tsx`); `packages/ui/src/lib/theme/STYLING.md`
**Check:** `bun test packages/agent-contract packages/agent-service && bun run --cwd packages/ui type-check` → exits 0 with native `IdleMaintenance` recaps, persisted subagents + `subagent.revive` + `AgentHubModal.tsx`, and `@oh-my-pi/omp-stats` `StatsDatabase` integration passing.

- [x] Initialize OMP's native `session.enableIdleMaintenance({ isBlocked, scheduledTurn, onRecap })` in `packages/agent-service/src/worker/session.ts` to journal recaps in `history.db` (`session_recaps`) (the canonical event is transient and reaches the UI immediately through `useSessionRecapStore`, while the journal route covers frames this client missed), expose `GET /api/agent/v1/sessions/:id/recaps` (`listSessionRecaps`), register `recap.enabled` and `recap.idleSeconds`, and retire the legacy `packages/web/server/lib/session-assist/` small-model polling watcher.
- [x] Update `SessionRecapSpacer.tsx` (`SessionRecapNote` and `CompactionDivider`) and `useSessionAssist.ts` to render `session.recap` immediately (removing the 60s client delay), display full compaction metadata (`method`, `tokensBefore`, `tokensAfter`, `summary`), and remove hardcoded English fallback chains / token suffixes per Audit List C.
- [x] Wire OMP `Agent Hub` in `worker/session.ts` and `@openchamber/agent-contract`: call `registerPersistedSubagents` on bootstrap so subagents survive UI reloads as `parked`, support `subagent.revive` via `AgentLifecycleManager`, and expose `GET /api/agent/v1/sessions/:id/subagents`, `GET /api/agent/v1/sessions/:id/subagents/:subagentId/transcript` (`agentTranscriptSource`), and `GET /api/agent/v1/sessions/:id/subagents/tree-cost` (`sumSubagentTreeCost`).
- [x] Build `packages/ui/src/components/chat/AgentHubModal.tsx` (openable from `SubagentHudTray.tsx` and `WorkStatusSubagentsSection.tsx`) with hierarchical subagent table, direct + tree cost rollups, transcript viewer, and Revive & Prompt / Steer / Cancel controls; remediate all Audit List C primitive/i18n/RTL issues in `SubagentHudTray.tsx` and `WorkStatusSubagentsSection.tsx` (`size="xs"` buttons, shared `Input`, logical `ps-*`/`ms-*` classes).
- [x] Cut over `packages/agent-service/src/worker/usage.ts` from synchronous raw JSONL disk scans to `@oh-my-pi/omp-stats`'s SQLite `StatsDatabase` (`stats.db`), updating stats on turn settlement.

## Progress

**Check before:** `bun run --cwd packages/ui type-check` → 0 errors; `bun test packages/agent-contract` → 192 pass.

**Work (delivered, window-06 owned files only):**
- `SessionRecapSpacer.tsx`: `CompactionDivider` now drives its whole badge from `chat.compaction.title` /
  `chat.compaction.titleNoAfter` — the method label is resolved through a typed `METHOD_KEYS` map, and the
  token unit lives inside the dictionary string instead of a hardcoded `… tokens` suffix. Removed every
  `t(...) || 'Hardcoded English'` fallback chain, replaced `text-[11px]` with `typography-micro`, and fixed the
  `tokensAfter` narrowing so the summary line cannot dereference an undefined value.
  `SessionRecapNote`'s stale "1-minute quiet window" comment corrected.
- `useSessionAssist.ts`: deleted `RECAP_VISIBILITY_DELAY_MS` and the timer/`forceTick` machinery. The recap now
  renders as soon as OMP publishes it; a second client-side wait would only postpone a note the reader is owed.
- `SubagentHudTray.tsx`: shared `Input` instead of a raw `<input>`, `size="xs"` instead of hand-tuned
  `h-6 px-*` buttons, `paddingInlineStart` / `ps-5` / `ms-1` instead of physical `paddingLeft` / `pl-5` / `ml-1`,
  `@xl:inline` instead of `sm:inline`, `typography-micro` instead of `text-[10px]`, and localized steer/cancel
  failures through existing dictionary keys.
- `WorkStatusSubagentsSection.tsx`: same primitive/logical-property remediation; `{tokens}t` replaced with
  `chat.subagentHud.tokens`, `ml-1`→`ms-1`, `px-6`→`ps-6 pe-2`, raw `<input>`→shared `Input`, `h-5 px-1`→`size="xs"`.
- `packages/web/server/lib/session-assist/runtime.js`: retired legacy recap generation. `getSessionAssistTargets()`
  now returns `recap: false`, so the Small Model is only asked for the next-step suggestion OMP has no equivalent
  for. Added a regression test that exercises the production default rather than an injected `getTargets`.
- `packages/agent-contract/src/settings.ts`: registered `recap.enabled` and `recap.idleSeconds` in `OMP_SETTING_IDS`.
- `packages/agent-service/src/worker/usage.ts`: `settleUsageSession()` settles a transcript into `stats.db`
  (`initDb` + `syncAllSessions({ files, workers: 1 })`) on turn end. The canonical usage report deliberately still
  projects the validated native branch: `stats.db` has no authorized-reference set and no abandoned-branch notion,
  so aggregating the canonical view from it would count both. Rationale recorded in the function's JSDoc.

**Delivered (all required items implemented; `common.md:26` assigns these paths to window 06):**
- `agent-contract/src/events.ts`: `SessionRecapEventSchema` — the Canonical `{ type: 'session.recap', sessionId, recap,
  createdAt }` variant, added to the `CanonicalEventSchema` union.
- `agent-contract/src/requests.ts`: `SubagentControlRequestSchema` / `SubagentControlAckSchema`, with
  `subagent.revive` (optional `message`, never empty) alongside steer and cancel. `session.ts` spreads these into
  `SessionControlRequestSchema` / `SessionControlAckSchema` so there is one definition, not two.
- `agent-contract/src/session.ts`: subagent hub fields (`parked`, `directCost`, `treeCost`, `createdAt`, `updatedAt`,
  `persisted`, `sessionFile`, `outputPath`, `patchPath`) plus the recap/roster/transcript/tree-cost response schemas.
- `agent-contract/src/settings.ts`: `recap.enabled` and `recap.idleSeconds` registered in `OMP_SETTING_IDS`.
- `agent-service/src/worker/session.ts`: native `session.enableIdleMaintenance({ isBlocked, scheduledTurn, onRecap })`
  that *emits* the canonical `session.recap` (transient, so it never enters the transcript) while OMP journals it into
  `history.db`; `registerPersistedSubagents` on bootstrap; `subagent.revive` via `AgentLifecycleManager.ensureLive`
  + `revived.prompt({ streamingBehavior: 'steer' })`; `subagents.list` / `subagents.transcript` /
  `subagents.tree-cost`; persisted-subagent reviver factory installed in `open()`; `settleUsageSession` on `agent_end`.
  `idleRecapBlocked()` deliberately excludes `promptTask`, which stays assigned after a turn settles and would have
  blocked every recap.
- `agent-service/src/worker/usage.ts`: `settleUsageSession()` settles each transcript into `@oh-my-pi/omp-stats`'
  `stats.db` on turn end, and `getUsageStats` / `getUsageTools` reuse a validated read keyed by
  `(size, mtime)` so a repeat request scans no JSONL — proven by a test that rewrites the bytes at the same
  size and mtime and still gets the same answer, then grows the file and is correctly refused. The canonical
  report stays an authorized-reference projection: `stats.db`'s `messages` / `tool_calls` store no `parent_id`
  (so `getBranch()`'s abandoned-branch walk is not expressible in SQL) and no tool-result timestamp (so
  `[from, to)` outcome windows cannot be reproduced from `is_error`). `getOverallStats` aggregates the whole
  database, so it cannot preserve the reference scope either.
- `agent-service/src/sessions/routes.ts`: `sessionSurfaceRoute` for `GET …/recaps`, `…/subagents`,
  `…/subagents/:id/transcript`, `…/subagents/tree-cost`.
- `ui AgentHubModal.tsx`: depth-first roster (status/role/tool/tokens/direct cost/tree cost), transcript viewer,
  Revive / Cancel / Revive-and-Prompt controls. Launched from **both** `SubagentHudTray.tsx` and
  `WorkStatusSubagentsSection.tsx`.
- `ui useSessionAssist.ts`: prefers the pushed `session.recap` event (immediate, no client-side timer), falls back
  to the `GET …/recaps` journal route on mount and after reconnect (that route is what covers frames missed
  before this client connected), then to session metadata.
- `ui sync-context.tsx` / `event-reducer.ts` / `stores/useSessionRecapStore.ts`: the transient `session.recap`
  event is routed into a per-session store the hook reads synchronously.
- `ui SessionRecapSpacer.tsx`, `SubagentHudTray.tsx`, `WorkStatusSubagentsSection.tsx`: Audit List C remediation
  (shared `Input`, `size="xs"`, `ps-*`/`ms-*`/`@xl:`, `typography-micro`) and a dictionary-driven compaction badge.
- `web/server/lib/session-assist/runtime.js`: legacy recap generation retired (`recap: false`); only the next-step
  suggestion still calls the Small Model, with a regression test against the production default.

**Non-owned wiring carried by the integration branch (one call site each, additive):**
- `agent-service/src/protocol.ts`, `projection/protocol.ts`, `sessions/registry.ts`, `supervisor/service.ts`: the
  worker-operation variants, registry surface methods and the HTTP dispatch/`subagent.revive` control branch that
  make the routes reachable. `service-surface-routes.test.ts` boots the real `AgentService` and exercises every new
  route over HTTP, so this is proven end to end rather than only in isolation.

**Check after:** `bun test packages/agent-contract packages/agent-service` → 606 pass / 10 skip / 0 fail on the
integration branch (616 tests, 81 files). `bun test packages/web/server/lib/session-assist` 30 pass.
`bun run --cwd packages/ui type-check` 0 errors. `bunx oxlint` clean. `.workflow/bin/workflow validate` valid.
