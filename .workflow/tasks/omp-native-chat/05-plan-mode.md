# 05: Session mode with plan enter and exit

**Effort:** omp-native-chat
**Task type:** feature
**Base commit:** <commit-sha>

**Delivers:** The composer's mode switcher offers Main and Plan. Switching to Plan on an idle session restricts tools to OMP's plan set and applies the `plan` model role; switching back restores both. The session snapshot reports `SessionMode`, and the mode survives a reload and an Agent Service restart. This is the thin end-to-end slice of session modes; review, vibe and goal build on it.

**Blocked by:** 01, 02
**Files:** `packages/agent-contract/src/session.ts` and `snapshot.ts` (`SessionMode`), control schemas from task 02, `packages/agent-service/src/worker/` (new mode controller beside `session.ts`), `worker/projection.ts` (`session.updated`), `packages/agent-service/src/protocol.ts`, `sessions/registry.ts`, `supervisor/service.ts`, `packages/web/server/lib/openchamber-sessions/routes.js`, `packages/ui/src/api/canonicalClient.ts`, the composer slot freed in task 01, the session sync store that holds the snapshot.

**Read first:** spec "Session mode", "Session controls" and W3; glossary "Session mode"; OMP 18.8.9 `modes/interactive-mode.ts` `#enterPlanMode` (4923) and `#exitPlanMode` (5041), resume handling near 4906-4916; `session/agent-session.ts` `setPlanModeState` (6729), `getPlanReferencePath` (6818), `resolveRoleModelWithThinking` (6968); `session/session-manager.ts` `appendModeChange` (3428). Re-read these line numbers first. Skills: `sync-state-invariants`, `ui-api-decoupling`.
**Covers:** W3

**Check:** Before: `control { type: 'mode.set', mode: 'plan' }` returns 400. After: `bun run --cwd packages/agent-service test` has a native test: `mode.set plan` on an idle session makes the snapshot report `{kind:'plan', status:'active', planReference:'local://…'}`, `getEnabledToolNames()` equals OMP's plan set, the `plan` role model is active, a reopened worker on the same session file reports the same mode, and `mode.set main` restores the previous tools and model; `mode.set` during a run returns 409 `RUN_ACTIVE`. A UI test shows the switcher reflecting snapshot mode and disabled during a run. `bun run dev`: switch to Plan, reload, Plan is still selected.

- [ ] `SessionMode` in contract, snapshot and `session.updated`, with schema tests; `contracts.md` updated.
- [ ] Worker mode controller owns plan enter and exit and writes `appendModeChange`; on open it restores from OMP session context, including `plan_paused`.
- [ ] The plan proposal handler is installed but returns OMP's default result until task 07 replaces it.
- [ ] Plan reference is always a `local://` URL, never a host path.
- [ ] Switcher shows Main and Plan only; Vibe and Goal appear with their tasks.
- [ ] Two clients: the second sees the mode change through `session.updated` without reload.
