# 09: Goal mode through RpcGoalController

**Effort:** omp-native-chat
**Task type:** feature
**Base commit:** <commit-sha>

**Delivers:** The user arms the composer's goal target, enters an objective and an optional token budget, and the agent continues turn after turn as `origin:'goal'` runs until it reports the goal complete, the budget runs out, or the user pauses, drops or aborts it. The objective, status and token use show above the composer. The composer goal UI talks only to OMP goal mode.

**Blocked by:** 05, 06
**Files:** the worker mode controller from task 05 (owns one `RpcGoalController` per worker and adds `rpc` to the session's `goal.continuationModes`), `packages/agent-contract/src/` (`goal` control, `SessionMode` goal fields), `packages/agent-service/src/worker/session.ts` (abort path calls `stopForHostAbort`), `packages/ui/src/components/chat/SessionGoalButton.tsx`, `SessionGoalRow.tsx`, `SessionGoalDialog.tsx`, `packages/ui/src/hooks/useSessionGoal.ts`, `packages/ui/src/stores/useSessionGoalArmStore.ts` and its consumer in `packages/ui/src/sync/session-ui-store.ts`, i18n.

**Read first:** spec "Session mode", "Session controls", "Goal entry points" and W7; OMP 18.8.9 `modes/rpc/rpc-goal.ts` (`RpcGoalSession` 34-53, constructor 98, `stopForHostAbort` 118, `handle` 207, `#enter` 267, `observe` 362, `#continuationWanted` 405) and `goals/settings.ts` (`goal.continuationModes` defaults to `["interactive"]`); `packages/web/server/lib/session-goal/DOCUMENTATION.md` "UI consumers" for what the current UI does.
**Covers:** W7

**Check:** Before: `control { type: 'goal', op: 'create' }` returns 400. After: `bun run --cwd packages/agent-service test` has a native test where the fixture provider answers two turns without completing the goal and then calls the goal tool to finish: two `origin:'goal'` runs follow the first without new Host prompts, and the snapshot ends `{kind:'goal', status:'complete'}`. With `rpc` missing from `goal.continuationModes` the same test sees no continuation, which proves the setting is applied. Pause, drop and an abort each stop continuation; after an abort no new goal run starts until `resume`. A budget smaller than the first turn ends `budget-limited`. An empty objective returns 400. A restart during a goal run reopens with the goal `paused`. UI tests: an armed send issues `goal create` with the typed objective and no `metadata.openchamber.goal` patch; the strip and dialog render from `SessionMode`.

- [ ] `RpcGoalController` is used unchanged; its `observe` gets every session event; `continuationPending` keeps the Host from dispatching a queued item into a decided continuation.
- [ ] Continuations go through task 06's `startWorkerRun('goal', …)`.
- [ ] The arm store, goal button, strip and dialog use the `goal` control and `SessionMode`; pause, resume, edit-budget and remove map to `pause`, `resume`, drop-and-create and `drop`. No supervisor-only state (`blocked`, `turnsUsed`, audit note, evaluation model) is shown.
- [ ] The Host supervisor is left in place here; task 16 removes it and the other entry points.
- [ ] Goal copy in every locale.
