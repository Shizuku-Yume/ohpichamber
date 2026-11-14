# 24: Meet the new-chat latency budgets and close task 17's races

**Effort:** ux-feedback-2026-11-12
**Task type:** bugfix
**Blocked by:** 17
**Covers:** W11
**Files:** `packages/agent-service/src/supervisor/{service,workers,catalog}.ts`; `packages/ui/src/sync/{session-ui-store,session-actions}.ts`; `scripts/perf/omp-performance.mjs`; `.workflow/decisions.md` (the task 17 entry that accepted about 880 ms)
**Read first:** the independent review of task 17, `/home/shizuku/Project/ohpichamber-omp-artifacts/ux-feedback-2026-11-13/independent-review/Review17.md` (all five findings); `.workflow/done/ux-feedback-2026-11-12/17-new-chat-latency.md` and its receipts; `research/feedback-2026-11-12/15-16-streaming-latency.md` (cause 2: the steps `admit` runs under the catalog lock); skills `performance-engineering`, `sync-state-invariants`
**Check:** run `bun run profile:omp` with the `create → run → first event` scenario on the fixture provider. It must record `POST /sessions` p50 ≤ 400 ms and the first `part.delta` ≤ 600 ms after send on a new chat. Spec W11 sets these budgets, and only the maintainer can waive them.

The supervisor tests must cover:
- a replacement worker that is waiting when an old registration fails is not stopped;
- a deferred registration failure surfaces with its cause as a session error and in diagnostics.

The UI tests must cover:
- a new chat renders the user bubble before `POST /sessions` resolves;
- a failed draft send does not override navigation that happened later.

Every test exits 0. Save receipts to `/home/shizuku/Project/ohpichamber-omp-artifacts/ux-feedback-2026-11-13/task24/`.

- [ ] Profile `admit` step by step. Take every remaining step that does not need to finish before the session id exists off the response path, keeping the order guarantees. Likely candidates are skill-source reconcile, `pluginRevision`, worker launch and ready, and catalog registration. If the budget still cannot be met after measurement, record the per-step numbers and the smallest contract change that would meet it (return the session id immediately and queue the prompt until the worker is ready). Then implement that change: it is the spec's named larger option and keeps the same user-visible behavior.
- [ ] Make stopping a worker after a failed registration conditional on its generation, with the check and the stop together inside `withRoot`.
- [ ] Surface a deferred registration failure with its cause.
- [ ] Show the optimistic user bubble at the draft submission boundary and carry it over when the session is created.
- [ ] Restore a failed draft only when the draft and the selection still belong to that submission.
- [ ] Delete the task 17 decision that accepted about 880 ms, or replace it with the measured outcome.
