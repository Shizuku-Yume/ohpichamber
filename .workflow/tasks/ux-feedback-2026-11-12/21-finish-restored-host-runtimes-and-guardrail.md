# 21: Finish the restored Host runtimes and tighten the merge-gap guardrail

**Effort:** ux-feedback-2026-11-12
**Task type:** bugfix
**Blocked by:** 01
**Covers:** W1, W2
**Files:** `packages/web/server/index.js`; `packages/web/server/lib/host/feature-routes-runtime.js`; `packages/web/server/lib/{auto-review,pr-watch}/`; the Host action contract and dispatcher for `pr.watch`/`pr.unwatch` (`packages/web/server/lib/openchamber-control/`, `packages/agent-contract/src/native-policy-protocol.ts`); the UI event dispatcher and `packages/ui/src/stores/useAutoReviewStore.ts`; `scripts/upstream-gaps.mjs`, `scripts/lib/upstream-gaps/`, `scripts/upstream-gaps.allowlist.tsv`
**Read first:** independent review of task 01, `/home/shizuku/Project/ohpichamber-omp-artifacts/ux-feedback-2026-11-13/independent-review/Review01.md` (all seven findings); `.workflow/done/ux-feedback-2026-11-12/01-*.md`; `packages/web/server/lib/event-stream/global-hub.js`; skills `ui-api-decoupling`, `sync-state-invariants`, `relay-transport`, `openchamber-change-discipline`
**Base commit:** 81e48cd715c2525dad96b3bd360a370063ac5f67
**Status:** active
**Check:** run with the real composition, not substitutes. `bun run --cwd packages/web test -- server/lib/auto-review server/lib/pr-watch server/lib/host server/lib/openchamber-control` exits 0, with tests that build the runtimes the way `index.js` does. `node scripts/upstream-gaps.mjs --check` exits 0, and each of these makes it exit non-zero: deleting a tracker route handler, deleting the `setTerminalCloseOnExit` implementation while keeping its type, and deleting a `create*Runtime` call. Real path (Web, real provider, isolated data dir and `HOME`):
- a review flow starts an auto-review run that sends its review prompt and reports progress and completion in the strip;
- the agent creates a PR watch through the Host action, the strip appears, and a PR update wakes the session.
Save screenshots and the event log to `/home/shizuku/Project/ohpichamber-omp-artifacts/ux-feedback-2026-11-13/task21/`.

- [x] Cut auto-review and PR watch over to the canonical owners. Session activity, prompt sends, history reads and events go through the Canonical Client and the global hub's canonical events. Delete their OpenCode-shaped URL builders, prompt and history routes, and the `event.translated()` handling.
- [x] Add `pr.watch` and `pr.unwatch` to the Host action contract and dispatcher, and pass `prWatch` into the control service.
- [x] Pass the real `broadcastUiEvent` to the auto-review runtime, and route `openchamber:auto-review.updated` into `useAutoReviewStore`.
- [x] Guardrail: count only real mounted handlers as route coverage (not 404 fallbacks), match HTTP methods, detect store setters by their implementation, report `create*` constructors that exist only upstream, and separate an import from a call.
- [x] Remove the blanket allowlist rows (around the auto-review callbacks). Every remaining row cites a specific decision or OMP owner.
## Progress

- Base commit at start: `81e48cd715c2525dad96b3bd360a370063ac5f67`
- Scope summary:
  - Items 1–3 (runtime cutover, runtime worker):
    - Created `packages/web/server/lib/canonical-session-state.js` implementing `createCanonicalSessionState({ sessionService })` (evaluates session/subagent status via `sessionService.open` and `sessionService.list`) and `retainSessions(hub, leaseKey, sessionIDs)` (observation leases via `globalMessageStreamHub.retainSession`).
    - Migrated `packages/web/server/lib/auto-review/runtime.js` to `sessionService.send` with synthetic context and idempotency `commandKey`, `sessionService.history` with `readDispatchOutcome`, observation leases, and canonical events (`session.status` idle, `session.deleted`, `run.completed`/`failed`/`cancelled`). Deleted OpenCode URL builders, auth headers, staged revert commits, and `event.translated()`.
    - Migrated `packages/web/server/lib/pr-watch/runtime.js` to `sessionService.send` with synthetic wake message and `commandKey`, observation leases, and canonical events (`session.status` idle, `session.deleted`, `run.completed`/`failed`/`cancelled`). Deleted OpenCode URL builders, auth headers, and `event.translated()`. Fixed duplicate `statusOf` declaration.
    - Updated `packages/web/server/lib/host/feature-routes-runtime.js` to subscribe directly to canonical events (`session.status` idle, `run.completed`) instead of `event.translated()`.
    - Updated `packages/web/server/lib/host/shutdown-runtime.js` and `packages/web/server/index.js` to pass `autoReviewRuntime` and `prWatchRuntime` into `createGracefulShutdownRuntime` and stop both during server teardown. Made `stop()` in both runtimes release all observation leases, clear `observed`, and unsubscribe hub event/status listeners idempotently.
    - Added `pr.watch` and `pr.unwatch` to `HostToolActions.openchamber` in `packages/agent-service/src/native-policy-protocol.ts` and registered action definitions in `packages/web/server/lib/openchamber-control/actions.js`. Documented actions in `HOST_TOOL_DESCRIPTIONS.openchamber` in `packages/agent-service/src/worker/host-tool.ts` with explicit parameter wrapping guidance, and added parameter validation in `execute()`.
    - Implemented `pr.watch` and `pr.unwatch` execution in `packages/web/server/lib/openchamber-control/service.js` with 503 check, defaulting `sessionId` to `contextSessionId`, and directory resolution. Wired `prWatch: prWatchRuntime` into `createOpenChamberControlService` in `packages/web/server/index.js`.
    - Passed `broadcastOpenChamberUiEvent` to `createAutoReviewRuntime` in `packages/web/server/index.js`. Added `autoReviewUpdatedEventSchema` and envelope dispatch in `packages/ui/src/lib/openchamberEvents.ts`. Created `packages/ui/src/sync/auto-review-sync.ts` routing `openchamber:auto-review.updated` to `useAutoReviewStore`. Mounted `subscribeAutoReviewSync` and `subscribePrWatchSync` in `packages/ui/src/sync/sync-context.tsx`.
    - Recorded decision `## 2026-11-14 - Auto-review and PR watch retire OpenCode staged reverts, queue holds, and client-side routing` in `.workflow/decisions.md` (`Effort: ux-feedback-2026-11-12`, `Mine: yes`).
  - Items 4–5 (guardrail tightening, guardrail worker, commits `e7c4bbd25`, `b74c9c472`, `db21a0248`, `7f7758fc6`, `5f14e543f`):
    - Tightened `scripts/lib/upstream-gaps` audits: only mounted, used modules count; unconditional 404 prefix fallbacks and base-prefix constants excluded from route coverage; explicit HTTP method matching; store setters verified by AST implementation in store body; upstream-only constructors detected (`runtime-constructor`); unused-function audit strips imports/comments/strings and counts value uses. Allowlist citations validated against decisions or OMP module paths.
    - Dropped blanket auto-review callback rows and `controlService.prWatch` row. Re-cited 34 merge rows to specific decisions. Updated the 7 `route-deps` rows for `createAutoReviewRuntime` and `createPrWatchRuntime` to cite the new decision heading.
    - Note on allowlist backlog: ~238 pre-existing allowlist rows citing the generic 2026-11-10 merge decision remain as documented pre-existing backlog, out of scope of task 21.
- Real-path-found defect fixes:
  - `dispatch-results`: `readDispatchOutcome` updated in `packages/web/server/lib/dispatch-results/runtime.js` to scan across matching post-dispatch turns and return the terminal assistant reply text, preventing auto-review stalls when the agent produces intermediate tool-call turns without text. Added multi-turn regression test in `dispatch-results/runtime.test.js`.
  - Canonical terminal events: recognized `run.completed`, `run.failed`, `run.cancelled` alongside `session.status`.
  - Host tool `input` wrapper: `HOST_TOOL_DESCRIPTIONS.openchamber` updated to make parameters inside `input` explicit (`{"action":"pr.watch","input":{"url":"..."}}`); validation in `execute()` gives clear error guidance when `input` is omitted. Rebuilt `packages/agent-service` dist.
- Per-Review01-finding disposition (1–7):
  - Finding 1: Closed. Auto-review and PR watch cut over to canonical session service and global message stream hub. All OpenCode URL builders, headers, revert staging, and `event.translated()` removed.
  - Finding 2: Closed. `pr.watch` and `pr.unwatch` added to Host action contract in `native-policy-protocol.ts` and `actions.js`; control dispatcher implemented in `service.js` with 503 check; `prWatch: prWatchRuntime` passed in `index.js`.
  - Finding 3: Closed. `broadcastOpenChamberUiEvent` passed to auto-review runtime in `index.js`; `openchamber:auto-review.updated` envelope handled in `openchamberEvents.ts`; `subscribeAutoReviewSync` created and mounted in `sync-context.tsx`, updating `useAutoReviewStore`.
  - Finding 4: Closed. Route coverage audit in `audit-ui-api.mjs` traces real mounted handlers and matches HTTP methods; unconditional 404 fallbacks excluded.
  - Finding 5: Closed. Setter audit in `audit-settings.mjs` inspects Zustand store implementation bodies rather than interface declarations.
  - Finding 6: Closed. Blanket merge citations removed for restored auto-review callbacks and control dispatcher; genuine retirements cited to specific decisions.
  - Finding 7: Closed. Missing runtime constructors collected as `runtime-constructor`; unused function audit distinguishes imports from value uses.
- Review:
  - Independent reviewer: separate worker session `ufb21-reviewer` (model `gemini-3.8-flash`). Round 1 verdict `blocked` with 3 P2 findings (`/home/shizuku/Project/ohpichamber-omp-artifacts/ux-feedback-2026-11-13/task21-review-r1.md`), all 3 closed in code/tests/decisions; Round 2 verdict `approved` (`/home/shizuku/Project/ohpichamber-omp-artifacts/ux-feedback-2026-11-13/task21-review-r2.md`).
- Real-path verification:
  - Real-path passed with artifacts in `/home/shizuku/Project/ohpichamber-omp-artifacts/ux-feedback-2026-11-13/task21/`: `README.md`, `event-stream.log`, `session-c-history.json`, screenshots `01-initial-workbench.png` through `08-pr-unwatch-completed.png`. Verified auto-review strip mounts, sends review prompt to real provider, and settles clean; verified `pr.watch` created via Host action, strip appears, PR update wakes session with synthetic context, and `pr.unwatch` cleans up. No credentials leaked.
- Check after:
  - `VITEST_MAX_WORKERS=2 bun run --cwd packages/web test -- server/lib/auto-review server/lib/pr-watch server/lib/host server/lib/openchamber-control`: exits 0 (77 test files, 752 passed, 1 skipped).
  - `node scripts/upstream-gaps.mjs --check`: exits 0 (654 detected, 654 allowlisted, 0 unallowlisted).
  - `node --test scripts/upstream-gaps.test.mjs`: exits 0 (9/9 passed, including the three negative cases: deleting a tracker route handler, deleting `setTerminalCloseOnExit` impl while keeping type, and deleting a `create*Runtime` call).
  - `bun test packages/agent-service/src/worker/host-tool.test.ts`: exits 0 (7/7 passed).
  - `bun test packages/agent-service/src/worker/session-native.test.ts`: exits 0 (72/72 passed).
  - `bun test packages/web/server/lib/dispatch-results/runtime.test.js`: exits 0 (6/6 passed).
  - Scoped UI tests: `bun test packages/ui/src/sync/auto-review-sync.test.ts packages/ui/src/stores/useAutoReviewStore.test.ts packages/ui/src/lib/openchamberEvents.test.ts`: exits 0 (25 passed).
  - Type checks: `bun run --cwd packages/ui type-check` (exit 0), `bun run --cwd packages/web type-check` (exit 0), `bun run --cwd packages/agent-contract type-check` (exit 0), `bun run --cwd packages/agent-service type-check` (exit 0).
  - Agent service build: `bun run --cwd packages/agent-service build`: exits 0.
  - Lint: `bunx oxlint <changed-paths>`: clean (exit 0).
  - Dead code: `bun run dead-code`: inspected (no dead code introduced).
