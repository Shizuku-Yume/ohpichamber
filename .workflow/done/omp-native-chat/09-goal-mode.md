# 09: Goal mode through RpcGoalController

**Effort:** omp-native-chat
**Task type:** feature
**Base commit:** 15c06af02f6eb404ca1482d7de5f6391aa55ea97
**Started:** 2026-10-26T00:00:00Z

**Delivers:** The user arms the composer's goal target, enters an objective and an optional token budget, and the agent continues turn after turn as `origin:'goal'` runs until it reports the goal complete, the budget runs out, or the user pauses, drops or aborts it. The objective, status and token use show above the composer. The composer goal UI talks only to OMP goal mode.

**Blocked by:** 05, 06
**Files:** the worker mode controller from task 05 (owns one `RpcGoalController` per worker and adds `rpc` to the session's `goal.continuationModes`), `packages/agent-contract/src/` (`goal` control, `SessionMode` goal fields), `packages/agent-service/src/worker/session.ts` (abort path calls `stopForHostAbort`), `packages/ui/src/components/chat/SessionGoalButton.tsx`, `SessionGoalRow.tsx`, `SessionGoalDialog.tsx`, `packages/ui/src/hooks/useSessionGoal.ts`, `packages/ui/src/stores/useSessionGoalArmStore.ts` and its consumer in `packages/ui/src/sync/session-ui-store.ts`, i18n.

**Read first:** spec "Session mode", "Session controls", "Goal entry points" and W7; OMP 18.8.9 `modes/rpc/rpc-goal.ts` (`RpcGoalSession` 34-53, constructor 98, `stopForHostAbort` 118, `handle` 207, `#enter` 267, `observe` 362, `#continuationWanted` 405) and `goals/settings.ts` (`goal.continuationModes` defaults to `["interactive"]`); `packages/web/server/lib/session-goal/DOCUMENTATION.md` "UI consumers" for what the current UI does.
**Covers:** W7
**Check:** `bun test --timeout 30000 packages/agent-service/src/worker/session-native.test.ts --test-name-pattern 'goal'`; native fixture covers three goal turns, rpc continuation gate, pause/drop/abort/resume, budget, empty objective and restart. Queue guards: `bun test packages/agent-service/src/sessions/registry-native.test.ts packages/agent-service/src/projection/journal.test.ts` and `bun run --cwd packages/web test -- server/lib/openchamber-sessions/routes-native-controls.test.js server/lib/message-queue/runtime.test.js`. UI controls: `bun test packages/ui/src/components/chat/SessionGoalDialog.test.tsx packages/ui/src/api/canonicalClient.transport.test.ts`.

- [x] `RpcGoalController` is used unchanged; its `observe` gets every session event; `continuationPending` keeps the Host from dispatching a queued item into a decided continuation.
- [x] Continuations go through task 06's `startWorkerRun('goal', …)`.
- [x] The arm store, goal button, strip and dialog use the `goal` control and `SessionMode`; pause, resume, edit-budget and remove map to `pause`, `resume`, drop-and-create and `drop`. No supervisor-only state (`blocked`, `turnsUsed`, audit note, evaluation model) is shown.
- [x] The Host supervisor is left in place here; task 16 removes it and the other entry points.
- [x] Goal copy in every locale (existing translated keys reused; no new key was introduced).

**Finished:** 2026-10-26T02:34:00Z

## Progress

- Dirty at start: none.
- Surface list: Web and Electron use the shared canonical goal control and session mode UI. Hosted mobile and Capacitor use the same shared controls; platform-specific acceptance remains outside this Linux/Web task.
- State ownership: OMP owns goal lifecycle/accounting and persistence; the Agent Service worker owns projection and worker-originated run admission. The Host authorizes and forwards. UI reads authoritative `SessionMode`; arming is transient composer state.
- Delegated independent worker lifecycle/native tests and UI/locale consumers; coordinator owns schemas, routing, transport, proof, review and landing.
- Check before: not recoverable from the task transcript or lane evidence; baseline was not rerun because implementation is already present in the worktree (per instruction).
- Check after: `bun test --timeout 30000 packages/agent-service/src/worker/session-native.test.ts --test-name-pattern 'goal'` (8 pass); registry/journal native tests (24 pass); Web native-control/queue tests (18 pass); UI goal-dialog/client tests (37 pass).
- Real path: started lane-c Web at ports 5183/3913 using prescribed lane-c data directory; `GET /api/agent/v1/sessions` returned HTTP 401 `UNAUTHORIZED` because this headless session has no Host authentication. `chrome-devtools` CLI is unavailable. Could not create/pause/resume/drop a live goal or exercise a provider-backed worker run. No credentials or secret-bearing files were read or exposed. Functional UI state transitions and worker continuation are proven by the Check fixtures/tests, not live app acceptance.
- Review boundary: Base 15c06af02f6eb404ca1482d7de5f6391aa55ea97; all 32 changed paths; native goal mode lifecycle, host controls/queue admission, shared UI and translations. Reviewer dispatch unavailable; performed both required briefs as self-review.
- Brief A (built/process): nonblocking evidence gap—no baseline Check output and no authenticated real-path run; recorded above. Requirements otherwise match task checklist and relevant tests.
- Brief B (quality): no blocking findings. Reviewed lifecycle/abort/reopen handling, authoritative mode projection, continuation queue gating, API boundary and UI control mappings against callers/tests; no issue found requiring changes.
- Review recheck: no code changes made from review.
- Browser automation and authenticated real-provider run omitted because browser CLI and Host credentials/session are unavailable; those are required to demonstrate live create/pause/resume/drop and worker-originated provider execution.
