# 11: Wire checkpoint/rewind tools, /btw branch promotion (branchFromBtw), and Plan mode enhancements

**Effort:** m4-orchestration
**Task type:** feature
**Base commit:** a2c61afc5e
**Blocked by:** 04
**Files:** `packages/agent-contract/src/session.ts`, `packages/agent-service/src/worker/session.ts`, `packages/agent-service/src/worker/mode.ts`, `packages/agent-service/src/worker/session-native.test.ts`, `packages/ui/src/components/chat/btw/BtwPanel.tsx`, `packages/ui/src/components/chat/btw/useBtwPanelState.ts`, `packages/ui/src/components/chat/PlanReviewCard.tsx`
**Read first:** `.workflow/specs/m4-orchestration.md`; `.workflow/research/omp-tui-parity-audit.md` (§1.6, §2)
**Covers:** W14
**Check:** `bun test packages/agent-service/src/worker/session-native.test.ts packages/ui/src/components/chat/` and `bun run type-check` exit 0.

- [x] Wire `checkpoint` and `rewind` tool state rehydration and `#applyRewind` (`branchWithSummary` + `rewind-report` entry projection) in `packages/agent-service/src/worker/session.ts`.
- [x] Add `btw.branch` (`branchFromBtw`) control in `worker/session.ts` and a "Promote to Branch" + `<inject>` steering action in `BtwPanel.tsx`.
- [x] Support deferred mid-run Plan mode entry in `worker/mode.ts` (arming Plan mode for turn completion instead of throwing 409 `RUN_ACTIVE`), `plan.autosave`, and execution model selection in `PlanReviewCard.tsx`.

## Progress

- Check before: `bun test packages/agent-service/src/worker/session-native.test.ts packages/ui/src/components/chat/` (5 files passed in isolated subset, full directory had failures due to shared module mocks); `bun run type-check` (exit 0).
- Work:
  1. `packages/agent-service/src/worker/session.ts`: Replaced unsupported private cast for `completedRewindState` with native OMP API query `this.session.getLastCompletedRewind()`. Removed custom `rehydrateWorkerCheckpointRewindState` setter cast that was wiping native completed rewind state. Updated `selectBranch` rollback to invoke `navigateTree(previousLeaf)` instead of raw `manager.branch`, ensuring native `#rehydrateCheckpointRewindState` restores checkpoint and rewind records.
  2. `packages/agent-service/src/worker/session-native.test.ts`: Added regression test proving completed rewind rehydrates natively across navigation and a repeat `rewind` tool call refuses with exact OMP guidance (`Checkpoint already completed; continue from the retained rewind report instead of calling rewind again.`).
  3. BTW branch authority and rekeying: Updated `WorkerSession.operation('btw.branch')` to capture the newly minted `sessionId` from `sessionManager.getSessionId()`, rekey `WorkerSession._sessionId` and recreate `WorkerProjection` with the new session ID. In `packages/agent-service/src/supervisor/workers.ts`, added `rekey` method to update worker entries and fixed child process message reply routing to lookup using `entry.info.rootSessionId` instead of the closure-captured `input.rootSessionId`. In `packages/agent-service/src/projection/journal.ts`, added `SessionJournal.rekey`. In `packages/agent-service/src/sessions/registry.ts`, updated `btwBranch` to rekey live entries, worker registry, journal identity, and persist references for the new session ID. Added unit test in `packages/agent-service/src/sessions/registry-native.test.ts` verifying complete rekeying.
  4. `packages/ui/src/components/chat/btw/BtwPanel.tsx`: Added strict UI guard showing "Promote to Branch" and `<inject>` only when `panel.ephemeralStatus === 'completed'`. Updated `handlePromote` to navigate the UI via `openSessionLink(result.sessionId, null)` when a new session ID is returned. Updated `handleInject` to fall back to `createRun` strictly on `RUN_NOT_ACTIVE` errors. Added unit tests for `extractBtwInject` in `useBtwPanelState.test.ts`.
  5. Deferred Plan mode & execution model: Updated `WorkerModeController` in `worker/mode.ts` to cleanly disarm on `stopForHostAbort()` without contradictory mode events (`onModeChanged` emits `main`), and safely ignore in-flight transitions if aborted. In `session.ts`, updated `continuePlanReview` so that invalid execution model selection cleanly resets `this.reviewingPlan = false` without worker crash; for valid models, temporary model and resolved thinking level are set with `thinkingLevel ?? null` fallback for Zod schema compliance. Added regressions in `session-native.test.ts`. Added `plan.autosave` verification for disabled (null) and enabled (file write) states.
- Check after: `bun test packages/agent-service/src/worker/session-native.test.ts packages/ui/src/components/chat/` (1,490 pass across 191 files, 54/54 pass in session-native.test.ts); `bun run type-check` (passed with 0 errors across 5 projects, 3,206 files); `bunx oxlint` (0 errors, 0 warnings across all touched files); real-path smoke receipt recorded at `/home/shizuku/Project/ohpichamber-omp-artifacts/m4-c-2026-11-05/task11-smoke-receipt.json` (all 4 scenarios passed).
- Reviews: `WorkflowReviewer` caught worker reply routing lookup on rekeyed `entry.info.rootSessionId` (resolved); `SecurityReviewer` verified boundary safety, `<inject>` validation, and `branchFromBtw` authority (PASS).
