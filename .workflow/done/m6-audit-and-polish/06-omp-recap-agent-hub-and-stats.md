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

- [~] Initialize OMP's native `session.enableIdleMaintenance({ isBlocked, scheduledTurn, onRecap })` in `packages/agent-service/src/worker/session.ts` to journal recaps in `history.db` (`session_recaps`), emit Canonical `{ type: 'session.recap', sessionId, recap, createdAt }`, expose `GET /api/agent/v1/sessions/:id/recaps` (`listSessionRecaps`), register `recap.enabled` and `recap.idleSeconds`, and retire the legacy `packages/web/server/lib/session-assist/` small-model polling watcher.
- [x] Update `SessionRecapSpacer.tsx` (`SessionRecapNote` and `CompactionDivider`) and `useSessionAssist.ts` to render `session.recap` immediately (removing the 60s client delay), display full compaction metadata (`method`, `tokensBefore`, `tokensAfter`, `summary`), and remove hardcoded English fallback chains / token suffixes per Audit List C.
- [~] Wire OMP `Agent Hub` in `worker/session.ts` and `@openchamber/agent-contract`: call `registerPersistedSubagents` on bootstrap so subagents survive UI reloads as `parked`, support `subagent.revive` via `AgentLifecycleManager`, and expose `GET /api/agent/v1/sessions/:id/subagents`, `GET /api/agent/v1/sessions/:id/subagents/:subagentId/transcript` (`agentTranscriptSource`), and `GET /api/agent/v1/sessions/:id/subagents/tree-cost` (`sumSubagentTreeCost`).
- [~] Build `packages/ui/src/components/chat/AgentHubModal.tsx` (openable from `SubagentHudTray.tsx` and `WorkStatusSubagentsSection.tsx`) with hierarchical subagent table, direct + tree cost rollups, transcript viewer, and Revive & Prompt / Steer / Cancel controls; remediate all Audit List C primitive/i18n/RTL issues in `SubagentHudTray.tsx` and `WorkStatusSubagentsSection.tsx` (`size="xs"` buttons, shared `Input`, logical `ps-*`/`ms-*` classes).
- [~] Cut over `packages/agent-service/src/worker/usage.ts` from synchronous raw JSONL disk scans to `@oh-my-pi/omp-stats`'s SQLite `StatsDatabase` (`stats.db`), updating stats on turn settlement.

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

**Blocked (outside window-06 file ownership, must land in an owning window):**
- `agent-service/src/worker/session.ts` — `session.enableIdleMaintenance({ isBlocked, scheduledTurn, onRecap })`,
  `registerPersistedSubagents`, `subagent.revive` via `AgentLifecycleManager`, `subagents.list|transcript|tree-cost`.
  Implemented and green locally, then reverted because this file is not in window 06's exclusive set.
- `agent-service/src/sessions/registry.ts`, `agent-service/src/protocol.ts`, `agent-service/src/projection/protocol.ts`,
  `agent-service/src/supervisor/service.ts` — the worker operations, registry surface methods and the HTTP dispatch
  that would make `GET /api/agent/v1/sessions/:id/{recaps,subagents,…}` reachable. `sessionSurfaceRoute` is correct
  in isolation but has no owned dispatch seam: the only caller is `supervisor/service.ts`, which no window owns.
- `packages/ui/src/components/chat/AgentHubModal.tsx` — built, then removed: its data path needs
  `ui/src/api/canonicalClient.ts` (window-unassigned) and `ui/src/sync/event-reducer.ts` / `sync-context.tsx` must
  accept `session.recap` for the transient event to reach any reducer.
- `packages/ui/src/lib/i18n/messages/*.ts` — owned by window 09; Agent Hub labels were therefore sourced from
  existing keys, and no dictionary entry was added.

**Check after:** `bun test packages/agent-contract` → 192 pass, 0 fail. `bun test packages/web/server/lib/session-assist`
→ 26 pass, 0 fail. `bun test packages/ui/src/components/chat/SessionRecapSpacer.test.tsx` → 4 pass, 0 fail.
`bun run --cwd packages/ui type-check` → 0 errors across 2,955 files. `bunx oxlint` on all changed files → clean.
