# 05: Session mode with plan enter and exit

**Effort:** omp-native-chat
**Task type:** feature
**Base commit:** bdab03a03459c420621a299e179acf14ba526c3b
**Started:** 2026-10-26T03:57:49+08:00
**Status:** active

**Delivers:** The composer's mode switcher offers Main and Plan. Switching to Plan on an idle session restricts tools to OMP's plan set and applies the `plan` model role; switching back restores both. The session snapshot reports `SessionMode`, and the mode survives a reload and an Agent Service restart. This is the thin end-to-end slice of session modes; review, vibe and goal build on it.

**Blocked by:** 01, 02
**Files:** `packages/agent-contract/src/session.ts` and `snapshot.ts` (`SessionMode`), control schemas from task 02, `packages/agent-service/src/worker/` (new mode controller beside `session.ts`), `worker/projection.ts` (`session.updated`), `packages/agent-service/src/protocol.ts`, `sessions/registry.ts`, `supervisor/service.ts`, `packages/web/server/lib/openchamber-sessions/routes.js`, `packages/ui/src/api/canonicalClient.ts`, the composer slot freed in task 01, the session sync store that holds the snapshot.

**Read first:** spec "Session mode", "Session controls" and W3; glossary "Session mode"; OMP 18.8.9 `modes/interactive-mode.ts` `#enterPlanMode` (4923) and `#exitPlanMode` (5041), resume handling near 4906-4916; `session/agent-session.ts` `setPlanModeState` (6729), `getPlanReferencePath` (6818), `resolveRoleModelWithThinking` (6968); `session/session-manager.ts` `appendModeChange` (3428). Re-read these line numbers first. Skills: `sync-state-invariants`, `ui-api-decoupling`.
**Covers:** W3

**Check:** Before: `control { type: 'mode.set', mode: 'plan' }` returns 400. After: `bun run --cwd packages/agent-service test` has a native test: `mode.set plan` on an idle session makes the snapshot report `{kind:'plan', status:'active', planReference:'local://…'}`, `getEnabledToolNames()` equals OMP's plan set, the `plan` role model is active, a reopened worker on the same session file reports the same mode, and `mode.set main` restores the previous tools and model; `mode.set` during a run returns 409 `RUN_ACTIVE`. A UI test shows the switcher reflecting snapshot mode and disabled during a run. `bun run dev`: switch to Plan, reload, Plan is still selected.

 - [x] `SessionMode` in contract, snapshot and `session.updated`, with schema tests; `contracts.md` updated.
 - [x] Worker mode controller owns plan enter and exit and writes `appendModeChange`; on open it restores from OMP session context, including `plan_paused`.
 - [x] The plan proposal handler is installed but returns OMP's default result until task 07 replaces it.
 - [x] Plan reference is always a `local://` URL, never a host path.
 - [x] Switcher shows Main and Plan only; Vibe and Goal appear with their tasks.
 - [x] Two clients: the second sees the mode change through `session.updated` without reload.

## Progress

- Dirty at start: none.
- Surfaces: Web uses the shared composer and canonical Host control path; Electron uses the same shared composer and Host path; hosted mobile uses the shared composer and Host path; Capacitor mobile uses the shared composer and connected Host path. Mobile-specific verification remains outside this effort.
- State ownership: OMP session context owns durable mode; the worker projects it into canonical session snapshots/events; UI session sync consumes that authority without Host-owned mode state.
- Risks: shared contract, persisted OMP mode context, worker tool/model permissions and all shared UI consumers. Validate native restore/tool/model behavior, schemas, UI state, Host forwarding and root type/lint checks.
- Check before: `SessionControlRequestSchema.safeParse({type:'mode.set',mode:'plan'})` returned `success:false`, `No matching discriminator`; Host maps this parser failure to 400. Native plan and composer checks do not exist yet.
- Delegated implementation: isolated worker owns Agent Service; isolated worker owns UI; isolated mechanical worker updates Host full-runtime test fixtures. Owner retains contract, Host forwarding test, documents and assembled validation.
- Check after: contract suite 182 pass; focused native mode tests 5 pass; focused UI mode/transport/reducer tests 55 pass; targeted sync/global child/persistence tests 42 pass. Full Agent Service suite reached 252 pass and one unrelated `workers.capacity` timing failure; full UI suite reached 805/811 files with six unrelated existing failures; root type-check reached eight existing locale `attachmentUnsupported` diagnostics. Built Agent Service succeeded. Real Web path passed: live provider-backed session entered Plan, snapshot returned active `local://PLAN.md`, reload retained Plan, then Main restored in snapshot; evidence: `/home/shizuku/Project/ohpichamber-omp-artifacts/omp-native-chat-05-2026-10-25/real-path.txt`.
- Review boundary: `bdab03a03459c420621a299e179acf14ba526c3b` + complete working-tree diff; round 1; briefs A, B; boundaries: Host authorization/forwarding, Agent Service worker→OMP persisted context, canonical snapshot/events, UI sync/composer. Brief A pass (0 findings). Brief B one nonblocking finding fixed: active Plan now returns before resolving stale Main catalog/model options in `worker/session.ts`.
- Decisions made without maintainer: top-level `session.updated.mode` is used for mode-only updates because the journal owns epoch/head and a partial RuntimeSession would violate the contract; this keeps two clients synchronized without inventing projection state.

**Finished:** 2026-10-26T04:45:00+08:00
