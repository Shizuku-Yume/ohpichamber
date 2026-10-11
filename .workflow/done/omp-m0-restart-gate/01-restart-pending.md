# 01: Probe approval and question restart cleanup

**Effort:** omp-m0-restart-gate
**Task type:** feature
**Started:** 2026-10-11
**Finished:** 2026-10-11

**Delivers:** A disposable restart-pending probe that records what happens to an unresolved OMP approval and question when their worker stops and a fresh worker starts. The report exposes explicit partial/unavailable evidence instead of treating parent capabilities as passed.

**Blocked by:** None
**Files:** `scripts/omp-m0/run.mjs`, `scripts/omp-m0/restart-pending.mjs`, `scripts/omp-m0/restart-pending-worker.mjs`, `scripts/omp-m0/restart-pending.test.mjs`, `.workflow/omp-migration/m0/`, `.workflow/development.md`, `.workflow/omp-migration/contracts.md`

**Read first:** `.workflow/specs/omp-m0-restart-gate.md` sections "How it is built", "What it must not do" and R1-R6; `.workflow/omp-migration/contracts.md` "Pending approvals on restart"; existing `scripts/omp-m0/envelope.mjs`, `capabilities.mjs`, `worker.mjs`, `run.mjs`, and their tests; `.workflow/development.md` M0 fixture evidence.

**Covers:** R1, R2, R3, R4, R5, R6

**Check:** `bun test scripts/omp-m0` → all tests pass; run the disposable restart-pending suite against the pinned source → schema 2 report includes approval/question pending, worker stop, fresh-worker identity, stale-resolution and cleanup observations, and any unresolved child evidence is `partial`/`unavailable` with a nonzero suite exit rather than a parent `passed` result.

- [x] Add a restart-pending suite path without adding an Agent Service or persistent approval/question store.
- [x] Hold approval and question requests before execution/answer submission and record only sanitized readiness markers.
- [x] Stop the owning worker, verify cleanup, start a distinct fresh OMP session, and compare actual tool/answer/event measurements; explicitly mark unavailable stale-resolution operations.
- [x] Preserve explicit unavailable/partial evidence when the SDK cannot provide durable restart behavior.
- [x] Add deterministic regression tests for incomplete aggregation, startup failure, measured side-effect/event counts, process cleanup, and report redaction.
- [x] Regenerate the canonical restart-pending artifact and update `development.md` and `contracts.md` without promoting proposed semantics.
- [x] Run focused/full M0 tests, oxlint on changed JavaScript, dead-code if exports/import shape change, workflow validation, docs validation, and the real disposable command.

## Progress

No Base commit or dirty-at-start Git inspection was recorded because Git access was not authorized. Baseline: `bun test scripts/omp-m0` passed 38 tests, 187 assertions. The restart-pending command was rejected with `INVALID_ARGUMENTS` because the suite path did not exist yet.

Execution initially reached `SUITE_TIMEOUT` twice at 120000 ms. The plan was clarified to avoid equating worker exit with observed stale-request rejection: R4 permits explicit unavailable evidence when no cross-worker SDK request handle exists. The fresh worker must load a real OMP session and before/after counts must be instrumented.

Workflow validation rejected a prose `Base commit` value and its validator attempted Git ref resolution. The metadata field was removed rather than inventing a ref or keeping a draft placeholder. No commit or landing was performed.

Check after: the real runner command against the pinned OMP source emitted schema version 2 with two passed probes and two partial probes, and exited with code 1 as required for incomplete restart evidence. The [canonical artifact](../../omp-migration/m0/restart-pending.json) retains the measurements and process cleanup. R1-R6 are satisfied, including the explicit unavailable branch of R4/R5. Durable stale-request responses and Agent Service restart rules remain unverified and proposed.

The controller now waits for the fresh worker's natural exit and requires code 0 for cleanup to pass. It checks measured pending/fresh counters and late events before assigning partial evidence. The worker records actual question settlement and uses a fresh OMP session. Startup errors are classified separately from runtime failures; immediate spawn errors are captured before identity polling.

Validation: `bun test scripts/omp-m0` passed 45 tests and 204 assertions; changed-script oxlint and `bun run dead-code` passed with no findings; `bun run docs:validate` passed 696 pages and 58 sidebar links. Workflow validation passed 10 task files after the Base metadata correction, with two existing Python deprecation notices. Existing envelope/process-group tests cover redaction, incomplete aggregation and termination; new restart tests cover measured-evidence failures, abnormal fresh exit, a real spawned missing-SDK startup and terminal publication at worker exit. A bare not-throw assertion was removed because it did not prove behavior.

Brief B found a blocking terminal-publication race. The poller could read an absent result, await its next file read, then observe the worker's exit after the final result had appeared. It incorrectly returned `RESTART_PENDING_WORKER_EARLY_EXIT`. A real child and FIFO synchronization made the regression deterministic: the new test failed before the fix with `kind: "error"` instead of `kind: "result"`. The controller now rereads final marker/result/error files after observing exit. The full suite passed after the fix, and the real OMP command regenerated the canonical artifact with the expected partial result and complete cleanup.

Brief A passed with no findings. Brief B initially blocked on the terminal-publication race, then passed after the fix and real-process regression. Security review passed with no findings. The named workflow-reviewer is unavailable, so independent general-purpose agents applied its two briefs to file snapshots. No effort decision was triggered or reversed, and no related debt entry was closed. The task is archived without commit or landing. The effort is accepted and closed in the [retrospective](retrospective.md); M0 remains open.
