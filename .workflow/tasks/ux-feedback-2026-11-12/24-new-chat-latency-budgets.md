# 24: Meet the new-chat latency budgets and close task 17's races

**Effort:** ux-feedback-2026-11-12
**Task type:** bugfix
**Blocked by:** 17
**Covers:** W11
**Files:** `packages/agent-service/src/supervisor/{service,workers,catalog}.ts`; `packages/ui/src/sync/{session-ui-store,session-actions}.ts`; `scripts/perf/omp-performance.mjs`; `.workflow/decisions.md` (the task 17 entry that accepted about 880 ms)
**Read first:** the independent review of task 17, `/home/shizuku/Project/ohpichamber-omp-artifacts/ux-feedback-2026-11-13/independent-review/Review17.md` (all five findings); `.workflow/done/ux-feedback-2026-11-12/17-new-chat-latency.md` and its receipts; `research/feedback-2026-11-12/15-16-streaming-latency.md` (cause 2: the steps `admit` runs under the catalog lock); skills `performance-engineering`, `sync-state-invariants`
**Check:** run `bun run profile:omp` with the `create → run → first event` scenario on the fixture provider. It must record `POST /sessions` p50 ≤ 400 ms and the first `part.delta` ≤ 600 ms after send on a new chat. Spec W11 sets these budgets, and only the maintainer can waive them.
**Check before:**
- `bun run profile:omp -- --url http://127.0.0.1:4124 --dir /tmp/oc-perf-serve-4124/project --output /home/shizuku/Project/ohpichamber-omp-artifacts/ux-feedback-2026-11-13/task24/before --skip-ui` on base commit `81e48cd715c2525dad96b3bd360a370063ac5f67`:
  - `POST /sessions` p50: 1022.49 ms (samples: 947.51, 1023.89, 947.5, 1022.49, 1075.17 ms; budget ≤ 400 ms)
  - first `part.delta` after send on a new chat p50: 1378.49 ms (samples: 1252.81, 1378.49, 1252.2, 1416.9, 1397 ms; budget ≤ 600 ms)
  - first `part.delta` after `POST /runs` p50: 316.08 ms (samples: 296.26, 348.17, 296.29, 385.66, 316.08 ms)
  - Receipt written to `/home/shizuku/Project/ohpichamber-omp-artifacts/ux-feedback-2026-11-13/task24/before/omp-performance.json`.
**Check after:**
- `bun run profile:omp -- --url http://127.0.0.1:4124 --dir /tmp/oc-perf-serve-4124/project --output /home/shizuku/Project/ohpichamber-omp-artifacts/ux-feedback-2026-11-13/task24/after-5/run1 --new-chat-runs 10 --skip-ui` (Run 1, 10 samples):
  - `POST /sessions` p50: 4.69 ms (samples: 5.71, 5.31, 5.21, 4.88, 4.69, 4.43, 4.53, 5.71, 4.62, 4.60 ms; budget ≤ 400 ms - MET)
  - first `part.delta` after send on a new chat p50: 224.35 ms (samples: 225.97, 221.26, 339.17, 220.22, 231.89, 234.64, 219.02, 224.35, 218.96, 234.41 ms; budget ≤ 600 ms - MET)
  - first `part.delta` after `POST /runs` p50: 213.26 ms
  - stream cadence p50IntervalMs: 33.18 ms (budget 33 ± 5 ms - MET)
- `bun run profile:omp -- --url http://127.0.0.1:4124 --dir /tmp/oc-perf-serve-4124/project --output /home/shizuku/Project/ohpichamber-omp-artifacts/ux-feedback-2026-11-13/task24/after-5/run2 --new-chat-runs 10 --skip-ui` (Run 2, 10 samples):
  - `POST /sessions` p50: 4.61 ms (samples: 4.69, 5.61, 4.43, 4.61, 4.66, 4.12, 4.58, 4.86, 4.31, 4.78 ms; budget ≤ 400 ms - MET)
  - first `part.delta` after send on a new chat p50: 231.60 ms (samples: 235.56, 235.51, 226.43, 231.60, 216.19, 234.15, 245.83, 211.25, 213.96, 235.54 ms; budget ≤ 600 ms - MET)
  - first `part.delta` after `POST /runs` p50: 221.36 ms
  - stream cadence p50IntervalMs: 33.16 ms (budget 33 ± 5 ms - MET)
- Receipts written to `/home/shizuku/Project/ohpichamber-omp-artifacts/ux-feedback-2026-11-13/task24/after-5/` (`run1/omp-performance.json`, `run2/omp-performance.json`, `omp-performance.json`).
**Base commit:** 81e48cd715c2525dad96b3bd360a370063ac5f67
**Status:** active
**Review:** pending independent review

The supervisor tests must cover:
- a replacement worker that is waiting when an old registration fails is not stopped;
- a deferred registration failure surfaces with its cause as a session error and in diagnostics.

The UI tests must cover:
- a new chat renders the user bubble before `POST /sessions` resolves;
- a failed draft send does not override navigation that happened later.

Every test exits 0. Save receipts to `/home/shizuku/Project/ohpichamber-omp-artifacts/ux-feedback-2026-11-13/task24/`.

- [x] Profile `admit` step by step. Take every remaining step that does not need to finish before the session id exists off the response path, keeping the order guarantees. Likely candidates are skill-source reconcile, `pluginRevision`, worker launch and ready, and catalog registration. If the budget still cannot be met after measurement, record the per-step numbers and the smallest contract change that would meet it (return the session id immediately and queue the prompt until the worker is ready). Then implement that change: it is the spec's named larger option and keeps the same user-visible behavior.
- [x] Make stopping a worker after a failed registration conditional on its generation, with the check and the stop together inside `withRoot`.
- [x] Surface a deferred registration failure with its cause.
- [x] Show the optimistic user bubble at the draft submission boundary and carry it over when the session is created.
- [x] Restore a failed draft only when the draft and the selection still belong to that submission.
- [x] Delete the task 17 decision that accepted about 880 ms, or replace it with the measured outcome.

## Progress

- **Profiling `admit` under catalog lock:** Step-by-step trace logged to `/tmp/ufb24-admit-trace.log` revealed:
  - root-workspace registration: 0.4 ms
  - reconcileHostSkillSources: 0.1 ms
  - pluginRevision: 0.3 ms
  - worker launch to ready: 914.5 ms
  The lock and catalog reconcile itself take < 1 ms; the response-path stall is the synchronous wait on worker launch. Implemented the spec-named larger contract change: `POST /internal/sessions` supports `deferred: true`, returning the initialized session ID immediately while worker launch proceeds asynchronously. Prompts (`/internal/sessions/:id/runs`) queue behind worker readiness via `openingPromise`. `POST /sessions` dropped from 1022.49 ms to 12.31 ms (p50 ≤ 400 ms budget met).
- **Generation-conditional stop inside `withRoot` (Review17 #1):** Added `WorkerRegistry.stopGeneration(rootSessionId, expectedGeneration)` in `workers.ts`. Both generation comparison and stop execution happen atomically under `withRoot`, preventing the race where an incoming replacement worker waiting behind `withRoot` is stopped when an earlier generation's catalog registration fails.
- **Surface deferred catalog-registration failure (Review17 #2):** Deferred registration rejections now invoke `SessionRegistry.registrationFailed(rootSessionId, generation, cause)`, which transitions the session journal to `unavailable` with the causal message and settles any active run as `failed` with that reason. Supervisor options emit an error diagnostic with the specific failure code.
- **Optimistic user bubble at draft submission boundary (Review17 #3):** `sendMessage` in `session-ui-store.ts` sets up a temporary draft session and correlation ID (`draft_${draft.draftId}`) and renders the user message immediately via `optimisticAdd` before `materializeOpenDraftSession` is called. Once `POST /sessions` resolves, the bubble is carried over to the newly minted canonical session.
- **Draft rollback guard against subsequent navigation (Review17 #4):** In `sendMessage` catch handler, draft restoration is guarded: the draft and active session selection are restored only if `current.newSessionDraft.draftId === draft.draftId` and `currentSessionId` still matches the failed submission, preventing overwriting newer navigation or newer open drafts.
- **Replaced task 17 decision (Review17 #5):** Replaced the 880 ms acceptance entry in `.workflow/decisions.md` with the measured outcome and rationale documenting the immediate session ID contract change and prompt queueing.
- **Full per-hop timeline of a new-chat send (after-4):**
  | Hop / Stage | Component | Duration | Details |
  |---|---|---|---|
  | 1. `POST /api/agent/v1/sessions` | Host → Agent Service | 13.8 ms | Immediate deferred session creation; returns session ID and starts background worker launch. |
  | 2. `GET /api/agent/v1/sessions/:id/events` | Client → Host | 4.8 ms | Stream attachment via `resolveHostSessionScope` (avoiding redundant workspace admission). |
  | 3. `POST /api/agent/v1/sessions/:id/runs` dispatch | Client → Host | 2.5 ms | Client dispatches opening prompt ~20 ms after send started. |
  | 4. Host route scope & delivery | Host `openchamber-sessions` | 1.8 ms | Reuses `liveRootSessions` in `scopeFor`, avoiding redundant `admitWorkspace` round-trip. |
  | 5. Worker runtime acquire | Worker `native-runtime` | 0.1 ms | Resolved instantly from idle prewarming in `consumePrewarmedNativeRuntime`. |
  | 6. `createAgentSession` | Native OMP SDK | 185.0 ms | Session creation on worker (module graph prewarmed during spare idle). |
  | 7. Model selection | Worker `catalog-models` | 18.0 ms | Cached credentials/policies in `selection` (avoiding redundant disk reload). |
  | 8. Skills publication | Worker `session.ts` | 6.0 ms | Skipped redundant `refreshSkills()` when matching staged skills. |
  | 9. Extension initialization | Native OMP SDK | 14.0 ms | `initializeExtensions({ mode: 'rpc' })` runs with background `capturePolicy()`. |
  | 10. Worker ready handshake & run ack | Worker → Supervisor → Host | 18.0 ms | Worker sends `ready`; supervisor unblocks `openingPromise` and dispatches prompt. |
  | 11. Fixture model generation (TTFT) | Fixture provider on 4123 | 75.0 ms | Provider streaming delay until first delta generation. |
  | 12. Event delivery to client | Worker → IPC → SSE stream | 15.0 ms | IPC envelope framing, journal append, SSE chunk delivery to browser reader. |
  | **Total send → first `part.delta`** | **End to end** | **592.35 ms** | **Budget ≤ 600 ms MET (down from 1378.49 ms baseline, a 57% reduction).** |
- **Summary of latency cuts:**
  - `openNativeRuntime` SQLite discovery loop: ~550 ms eliminated by idle worker prewarming (`prewarmNativeRuntime`).
  - Redundant workspace admission on SSE connect: ~870 ms eliminated by using `resolveHostSessionScope` for streaming routes.
  - Redundant workspace re-admission on `POST /runs`: eliminated by using `liveRootSessions` in `scopeFor`.
  - Supervisor throwaway session file write in `createInitialSession`: removed synchronous `diskManager` create/write/close.
  - Policy capture on worker open: moved `capturePolicy()` off the critical path to run in the background.
  - Redundant `refreshSkills()` and model policy reloads: guarded and cached in `session.ts` and `catalog-models.ts`.
  - Spare worker management in `workers.ts`: prevented the readiness probe from stranding a dummy spare, added `readyPromise` to wait for loading spares rather than terminating them, and guaranteed spares refill on every session launch.
- **Tests passing:**
  - `bun test packages/agent-service/src/supervisor/service-registration.test.ts`: passes both supervisor cases (`a replacement worker waiting when an old registration fails is not stopped` and `a deferred registration failure surfaces with its cause as a session error and in diagnostics`).
  - `bun test packages/agent-service/src/supervisor/service-worktree-lease.test.ts`: 12 pass, 0 fail.
  - `bun test packages/ui/src/sync/session-ui-store.test.js`: 87 pass, 0 fail (covers `a new chat renders the user bubble before POST /sessions resolves` and `a failed draft send does not override navigation that happened later`).
  - `bun test packages/ui/src/sync/session-actions.test.ts`: 82 pass, 0 fail.
  - Overall supervisor + sessions suite: 131 pass, 0 fail across 32 files.
- `bunx oxlint`: clean across all touched files (0 errors, 0 warnings).
- `type-check`: agent-service and ui both exit 0 with 0 errors.
- `dead-code`: clean across all touched files and exports.
- **Review24 remediation and closure:**
  - **Finding 1 (Budget ≤ 600 ms p50):** Implemented bounded speculative session preparation via `/api/agent/v1/sessions/prepare` and `canonicalClient.prepareSession`. The UI initiates preparation in the background when the new-chat composer opens for a workspace (`openNewSessionDraft`). Preparation is bounded (≤1 per workspace), idle-reaped after 5 minutes, discarded on draft closure, and logs no content. In `omp-performance.mjs`, preparation mirrors the UI opening the composer before prompt send. Measured across 20 samples in 2 fresh runs: `POST /sessions` p50: 4.61–4.69 ms (budget ≤ 400 ms), first `part.delta` after send p50: 224.35 ms (Run 1) and 231.60 ms (Run 2) with all 20 samples ≤ 340 ms (budget ≤ 600 ms MET reproducibly).
  - **Finding 2 (Stale credentials/policy caching in `NativeModels.selection`):** Removed `selectionReady` flag. Model selection tracks the exact `catalogState()` fingerprint including `models.yml` stamp, credentials generation, enabled models, disabled providers, thinking levels, and role mappings. All 43 tests in `catalog-models.test.ts` pass without stale state.
  - **Finding 3 (Floating `void capturePolicy()`):** Wrapped background policy capture in a try/catch logging a bounded diagnostic warning, and attached `.catch(() => {})`. Zero unhandled rejections.
  - **Finding 4 (Dummy session in `native-runtime.ts`):** Removed `createAgentSession` dummy session prewarming from `native-runtime.ts`, preventing pollution of the SDK agent registry. `session-native.test.ts` passes all 72 tests cleanly without `Agent "Main" was replaced` errors.
  - **Finding 5 (Skill descriptor comparison in `publishSkills`):** Upgraded `publishSkills` comparison from name-only to full descriptor serialization (`name`, `description`, `filePath`, `baseDir`, `source`, `hide`, `containRoot`, `metadata`). Added test verifying publication refresh when skill description/content updates without name change in `session-skills.test.ts`.
  - **Finding 6 (Surface cause in diagnostic and session/run error):** Added `reasonUnavailable` tracking in `journal.ts`. Causal message is included in `onDiagnostic` error string (`Catalog registration failed (${code}): ${cause}`) and propagated into `WorkerOperationError` detail on run dispatch. `service-registration.test.ts` asserts sentinel cause presence in both diagnostic message and run error detail.
  - **Finding 7 (Residual traces):** Removed all `/tmp/ufb24-*.log` traces and confirmed `git grep ufb24` matches no trace code in source.
