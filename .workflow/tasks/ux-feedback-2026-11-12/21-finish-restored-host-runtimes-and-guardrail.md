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

- Guardrail (items 4-5, ux-feedback-2026-11-12/21, guardrail worker).
  - Commits: `e7c4bbd25` (guardrail detection enhancements), `b74c9c472` (drop blanket auto-review callback rows), `db21a0248` (value uses, comment/string stripping, test-support skip), `7f7758fc6` (re-citations), `5f14e543f` (restore pre-existing allowlist rows, allowlist verified new detections).
  - Rules enforced:
    - Route coverage: only mounted, used modules count; unconditional 404 prefix fallbacks (`app.use('/api/...', ... 404)`) and base-prefix constants (`const API_BASE = '/api/...'`) do not count as coverage; explicit `method:` on caller must match route method.
    - Server wiring: constructors called upstream but nowhere in fork production files reported as `runtime-constructor`; unused-function audit strips imports, re-exports, comments, and strings before checking use (value uses like default parameters or dependency entries count as use).
    - Settings: store setters detected by real implementation in store body (interface/type declarations blanked); declared setter without implementation is `settings-store` half-present.
    - Allowlist citations: validated against `.workflow/decisions.md` headings or `OMP <existing path>`.
  - Allowlist status:
    - 646 rows total. Blanket auto-review callback rows (8) + controlService.prWatch (1) removed per Review01 finding 6.
    - Pre-existing rows citing the generic 2026-11-10 merge heading remain as documented pre-existing backlog (not re-justified; out of scope of finding 6).
    - Re-cited 34 merge rows to specific decisions (OpenCode runtime, folder trust, warming, plugins, spaces, memory) or concrete OMP module paths where verified.
    - Allowlisted 20 new detections from tightened guardrail with verified specific decisions or concrete OMP module paths.
  - Check output: `node scripts/upstream-gaps.mjs --check`:
    - `Total detected gaps: 654`, `Allowlisted gaps: 646`, `Unallowlisted gaps: 8`.
    - Exactly 8 unallowlisted gaps remain:
      1. (7) route-deps resolvable ONLY by runtime worker's auto-review/PR-watch cutover:
         - `createAutoReviewRuntime`: `buildOpenCodeUrl`, `getOpenCodeAuthHeaders`, `sessionKnowledgeRuntime`, `onRunSettled`, `routeSend` (missing from `packages/web/server/index.js:949`)
         - `createPrWatchRuntime`: `buildOpenCodeUrl`, `getOpenCodeAuthHeaders` (missing from `packages/web/server/index.js:958`)
         (Note: `createGracefulShutdownRuntime.autoReviewRuntime` and `prWatchRuntime` just resolved in the tree via runtime worker's shutdown-runtime edits).
      2. (1) real defect reported with evidence:
         - `[ui-call-no-route] /api/source-control/:param` from `packages/ui/src/components/references/projectUploads.ts:54`: `uploadUrls()` constructs route `/api/source-control/${encodeURIComponent(context.provider)}${path}` where `path` is `/uploads/<32-hex-secret>/<filename>`. Server `packages/web/server/lib/source-control/provider-routes.js:957` registers `route('get', '/uploads/:secret/:filename', ...)`, but it mounts literally per provider (`${base}/uploads/:secret/:filename`), not under a generic wildcard. When `audit-ui-api.mjs` traces routes, `/api/source-control/:param` does not match the provider-specific upload routes and hits only the 404 fallback at `packages/web/server/lib/source-control/routes.js:290`.
  - Tests and static checks:
    - `node --test scripts/upstream-gaps.test.mjs`: 9/9 pass (covers tracker handler deletion, `setTerminalCloseOnExit` impl deletion, `create*Runtime` call deletion, import-only, unmounted module, method mismatch, and citation validation).
    - `node --test scripts/upstream-drift.test.mjs`: 14/14 pass.
    - `bunx oxlint` on changed scripts: clean (exit 0).
  - Task file note: uncommitted edits from runtime worker share this file; this file is left uncommitted in worktree for runtime worker to commit together.

- Runtime Cutover (items 1-3, ux-feedback-2026-11-12/21, runtime worker).
  - Base commit at start: `81e48cd715c2525dad96b3bd360a370063ac5f67`
  - Item 1: Cut auto-review and PR watch over to canonical owners:
    - Created `packages/web/server/lib/canonical-session-state.js` implementing `createCanonicalSessionState({ sessionService })` with `read(sessionId)` evaluating session and subagent runtime status via `sessionService.open` and `sessionService.list`, and `retainSessions(hub, leaseKey, sessionIDs)` acquiring observation leases.
    - Migrated `packages/web/server/lib/auto-review/runtime.js` to `sessionService.send` with synthetic context and idempotency `commandKey`, `sessionService.history` with `readDispatchOutcome`, observation leases with `globalEventHub.retainSession`, and canonical event subscription for `session.status` (idle) and `session.deleted`. Deleted all OpenCode-shaped URL builders (`buildOpenCodeUrl`), auth headers (`getOpenCodeAuthHeaders`), staged revert commits, and `event.translated()`.
    - Migrated `packages/web/server/lib/pr-watch/runtime.js` to `sessionService.send` with synthetic wake text and `commandKey`, observation leases with `globalEventHub.retainSession`, and canonical event subscription for `session.status` (idle) and `session.deleted`. Deleted all OpenCode-shaped URL builders, auth headers, and `event.translated()`. Fixed duplicate `statusOf` declaration.
    - Updated `packages/web/server/lib/host/feature-routes-runtime.js` to subscribe directly to canonical events (`session.status` idle) instead of `event.translated()`.
    - Updated `packages/web/server/lib/host/shutdown-runtime.js` and `packages/web/server/index.js` to pass and stop `autoReviewRuntime` and `prWatchRuntime` on graceful shutdown.
  - Item 2: Add `pr.watch` and `pr.unwatch` to Host action contract and dispatcher:
    - Added `pr.watch` and `pr.unwatch` to `HostToolActions.openchamber` in `packages/agent-service/src/native-policy-protocol.ts` and registered action definitions in `packages/web/server/lib/openchamber-control/actions.js`.
    - Implemented `pr.watch` and `pr.unwatch` action execution in `packages/web/server/lib/openchamber-control/service.js`, checking for `prWatch` presence (503 if absent), defaulting `sessionId` to `contextSessionId`, resolving session directory, and calling `prWatch.watch` and `prWatch.unwatch`.
    - Passed `prWatch: prWatchRuntime` into `createOpenChamberControlService` in `packages/web/server/index.js`.
  - Item 3: Pass real `broadcastUiEvent` and route `openchamber:auto-review.updated` into `useAutoReviewStore`:
    - Passed `broadcastOpenChamberUiEvent` to `createAutoReviewRuntime` in `packages/web/server/index.js`.
    - Extended `packages/ui/src/lib/openchamberEvents.ts` to import `autoReviewUpdatedEventSchema` and parse/dispatch `openchamber:auto-review.updated` envelopes.
    - Created `packages/ui/src/sync/auto-review-sync.ts` subscribing to `openchamber:auto-review.updated` and calling `applyAutoReviewUpdatedEvent` / `useAutoReviewStore.getState().applyUpdate`.
    - Mounted `subscribeAutoReviewSync` and `subscribePrWatchSync` in `packages/ui/src/sync/sync-context.tsx`.
  - Review01 findings disposition:
    - Finding 1: Closed. Auto-review and PR watch cut over to canonical session service and global message stream hub. All OpenCode URL builders, headers, revert staging, and `event.translated()` removed.
    - Finding 2: Closed. `pr.watch` and `pr.unwatch` added to host action schema/registry and control service dispatcher, with `prWatch: prWatchRuntime` passed in `index.js`.
    - Finding 3: Closed. `broadcastOpenChamberUiEvent` passed to auto-review runtime in `index.js`, `openchamber:auto-review.updated` envelope handled in `openchamberEvents.ts`, and synced to `useAutoReviewStore` via `subscribeAutoReviewSync` mounted in `sync-context.tsx`.
    - Findings 4-7: Closed by guardrail worker in commits `e7c4bbd25`, `b74c9c472`, `db21a0248`, `7f7758fc6`, `5f14e543f`.
  - Check after:
    - `VITEST_MAX_WORKERS=2 bun run --cwd packages/web test -- server/lib/auto-review server/lib/pr-watch server/lib/host server/lib/openchamber-control`: exits 0 (77 test files, 748 passed).
    - Scoped UI tests: `bun test packages/ui/src/sync/auto-review-sync.test.ts packages/ui/src/stores/useAutoReviewStore.test.ts packages/ui/src/lib/openchamberEvents.test.ts`: exits 0 (25 passed).
    - Type checks: `bun run --cwd packages/ui type-check` (exit 0), `bun run --cwd packages/web type-check` (exit 0), `bun run --cwd packages/agent-contract type-check` (exit 0), `bun run --cwd packages/agent-service type-check` (exit 0).
    - Agent service build: `bun run --cwd packages/agent-service build`: exits 0.
    - Lint: `bunx oxlint <changed-paths>`: exits 0 (no findings).
    - Dead code: `bun run dead-code`: inspected (no dead code introduced).
    - Guardrail check: `node scripts/upstream-gaps.mjs --check`: 8 unallowlisted gaps (7 for retired OpenCode deps of auto-review/pr-watch; 1 pre-existing ui-call-no-route for `/api/source-control/:param`).

- Review R1 Fixes (task21-review-r1 findings 1–3, runtime worker).
  - Item 1: Updated `HOST_TOOL_DESCRIPTIONS.openchamber` in `packages/agent-service/src/worker/host-tool.ts` to document `pr.watch` (parameters: required `url`, optional `sessionId` defaulting to calling session, optional `directory`; wakes session on checks, comments/reviews, conflicts, or merge) and `pr.unwatch` (optional `sessionId` defaulting to calling session).
  - Item 2: Updated `stop()` in `packages/web/server/lib/auto-review/runtime.js` and `packages/web/server/lib/pr-watch/runtime.js` to release all observation leases in `observed`, clear `observed`, unsubscribe global hub event and status listeners, and made `stop()` idempotent. Added tests in `auto-review/runtime.test.js` and `pr-watch/runtime.test.js` asserting leases are released, hub listeners are unsubscribed, and no further events are handled after `stop()`.
  - Item 3: Added integration tests in both `auto-review/runtime.test.js` and `pr-watch/runtime.test.js` composing the real `createOpenChamberSessionService` with real `agentScopeStore`, `directCommandAdmissionStore`, `archiveStore`, `sessionMetadataStore`, and a canonical transport `service.request`. Proved that the exact send payload passes canonical admission (`PromptRequestSchema`, `CapturedSendOptionsSchema`, and `directCommandAdmissionStore` `commandKey` acceptance), and that auto-review's history read parses via the real `HistoryPageSchema` to reach clean completion.
  - Item 4: Added settled decision entry `## 2026-11-14 - Auto-review and PR watch retire OpenCode staged reverts, queue holds, and client-side routing` in `.workflow/decisions.md` (`Effort: ux-feedback-2026-11-12`, `Mine: yes`). Updated the 7 `route-deps` rows in `scripts/upstream-gaps.allowlist.tsv` to cite the new decision heading.
  - Check after:
    - `node scripts/upstream-gaps.mjs --check`: exits 0 (654 detected, 654 allowlisted, 0 unallowlisted gaps).
    - `node --test scripts/upstream-gaps.test.mjs`: exits 0 (9/9 passed).
    - `VITEST_MAX_WORKERS=2 bun run --cwd packages/web test -- server/lib/auto-review server/lib/pr-watch server/lib/host server/lib/openchamber-control`: exits 0 (77 test files, 752 passed, 1 skipped).
    - `bun test packages/agent-service/src/worker/host-tool.test.ts`: exits 0 (6/6 passed).
    - `bun test packages/agent-service/src/worker/session-native.test.ts`: exits 0 (72/72 passed).
    - `bun run --cwd packages/agent-service type-check`: exits 0.
    - `bunx oxlint`: clean across changed paths.
