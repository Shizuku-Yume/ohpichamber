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

- [x] Initialize OMP's native `session.enableIdleMaintenance({ isBlocked, scheduledTurn, onRecap })` in `packages/agent-service/src/worker/session.ts` to journal recaps in `history.db` (`session_recaps`) (recaps reach the UI through the journal route rather than a canonical event, since the shared reducer owns event variants), expose `GET /api/agent/v1/sessions/:id/recaps` (`listSessionRecaps`), register `recap.enabled` and `recap.idleSeconds`, and retire the legacy `packages/web/server/lib/session-assist/` small-model polling watcher.
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

**Delivered in window-06 files (corrected scope — these paths ARE window 06 per `common.md:26`):**
- `agent-contract/src/events.ts`, `session.ts`, `settings.ts`: subagent hub fields (`parked`, `directCost`,
  `treeCost`, `createdAt`, `updatedAt`, `persisted`, `sessionFile`, `outputPath`, `patchPath`), the recap/roster/
  transcript/tree-cost response schemas, `subagent.revive` request+ack, and `recap.enabled` /
  `recap.idleSeconds` in `OMP_SETTING_IDS`.
- `agent-service/src/worker/session.ts`: native `session.enableIdleMaintenance({ isBlocked, scheduledTurn, onRecap })`
  (recaps are journaled by OMP itself into `history.db`), `registerPersistedSubagents` on bootstrap so reloads see
  the swarm as `parked`, `subagent.revive` through `AgentLifecycleManager.ensureLive` + `revived.prompt(...)`,
  `subagents.list` / `subagents.transcript` / `subagents.tree-cost` operations, and `settleUsageSession` on
  `agent_end`.
- `agent-service/src/worker/usage.ts`: `settleUsageSession()` settles each transcript into `@oh-my-pi/omp-stats`'
  `stats.db` (`initDb` + `syncAllSessions({ files, workers: 1 })`). The canonical usage report still projects the
  validated native branch, because `stats.db` has no authorized-reference set and no abandoned-branch notion.
- `agent-service/src/sessions/routes.ts` (+ `routes.test.ts`): `sessionSurfaceRoute` serving
  `GET …/recaps`, `…/subagents`, `…/subagents/:id/transcript`, `…/subagents/tree-cost`; 4 route tests.
- `ui` `AgentHubModal.tsx`: hierarchical roster (status/role/tool/tokens/direct cost/tree cost), transcript
  viewer, and Revive / Cancel / Revive-and-Prompt controls mounted from `SubagentHudTray.tsx`.
- `ui` `useSessionAssist.ts`: reads the native journal through the canonical `recaps` route; no client-side timer.
- `ui` `SessionRecapSpacer.tsx`, `SubagentHudTray.tsx`, `WorkStatusSubagentsSection.tsx`: Audit List C remediation
  and dictionary-driven compaction badge.
- `web/server/lib/session-assist/runtime.js` (+ test): legacy recap generation retired, so the Small Model is only
  asked for the next-step suggestion.

**Non-owned paths still required for full wiring (each is one call site, not a design gap):**
- `agent-service/src/protocol.ts`, `projection/protocol.ts`, `sessions/registry.ts`, `supervisor/service.ts`:
  worker-operation variants, registry methods, and the HTTP dispatch that turns `sessionSurfaceRoute` and the
  `subagent.revive` control into live routes. Implemented and type-green in this branch; they sit outside the
  window-06 list so they are carried by the integration branch rather than claimed here.
- `ui/src/sync/event-reducer.ts` (`default: never`): a canonical `session.recap` *event* needs a reducer case.
  Because that file is shared sync code, recaps are delivered over the owned REST route instead of a transient
  event, so no reducer change is required.

**Check after:** `bun test packages/agent-contract` 192 pass; `bun test packages/agent-service` 399 pass / 7 skip;
`bun test packages/web/server/lib/session-assist` 26 pass; `SessionRecapSpacer.test.tsx` 4 pass;
`bun run --cwd packages/ui type-check` 0 errors; `bunx oxlint` clean; `.workflow/bin/workflow validate` valid.
