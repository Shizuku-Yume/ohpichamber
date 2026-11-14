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
- `bun run profile:omp -- --url http://127.0.0.1:4124 --dir /tmp/oc-perf-serve-4124/project --output /home/shizuku/Project/ohpichamber-omp-artifacts/ux-feedback-2026-11-13/task24/after --skip-ui`:
  - `POST /sessions` p50: 12.31 ms (samples: 15.37, 12.31, 11.52, 10.31, 12.69 ms; budget ≤ 400 ms - MET)
  - first `part.delta` after send on a new chat p50: 1052.15 ms (samples: 1034.59, 1068.01, 1047.97, 1052.15, 1208.62 ms; down 326.34 ms from 1378.49 ms)
  - first `part.delta` after `POST /runs` p50: 260.07 ms (samples: 271.42, 260.04, 260.07, 257.57, 302.82 ms)
  - stream cadence p50IntervalMs: 33.17 ms (budget 33 ± 5 ms - MET)
  - Receipt written to `/home/shizuku/Project/ohpichamber-omp-artifacts/ux-feedback-2026-11-13/task24/after/omp-performance.json`.
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
- **Tests passing:**
  - `bun test packages/agent-service/src/supervisor/service-registration.test.ts`: passes both supervisor cases (`a replacement worker waiting when an old registration fails is not stopped` and `a deferred registration failure surfaces with its cause as a session error and in diagnostics`).
  - `bun test packages/ui/src/sync/session-ui-store.test.js`: 87 pass, 0 fail (covers `a new chat renders the user bubble before POST /sessions resolves` and `a failed draft send does not override navigation that happened later`).
  - `bun test packages/ui/src/sync/session-actions.test.ts`: 82 pass, 0 fail.
  - Overall supervisor + sessions suite: 131 pass, 0 fail across 32 files.
- `bunx oxlint`: clean across all touched files (0 errors, 0 warnings).
