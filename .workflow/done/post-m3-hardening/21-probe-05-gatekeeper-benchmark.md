# 21: Run the PROBE-05 Host Gatekeeper benchmark

**Effort:** post-m3-hardening
**Task type:** spike
**Base commit:** 3571541ba21e728f47fc15beddbf2d070314e951
**Started:** 2026-10-24T14:05:00Z

**Delivers:** Answer to: what latency and CPU cost do 10,000 real Host-boundary file accesses through the Gatekeeper add, and does it need a cache?

**Blocked by:** None
**Files:** the Host Gatekeeper/authorizer owner (`packages/web/server/lib/host/worker-operation-authorizer.js` and its callers)

**Read first:** `.workflow/specs/post-m3-hardening.md`; `.workflow/omp-migration/architecture.md` line 747 (PROBE-05); `.workflow/done/omp-through-m3/23-m2-gate.md`; `scripts/perf/DOCUMENTATION.md`; `.agents/skills/performance-engineering/SKILL.md`
**Covers:** H12

**Check:** `## Findings` records p50/p95/p99 and CPU for the 10,000-access run on the real Host path, with the receipt in the evidence directory, and answers whether a cache is warranted.

## Done when

- [x] No cache is added by this task.
- [x] Time box: one benchmark design, run three times.

## Progress

- Dirty at start: none. Task17 is landed on `main` at `3571541ba`; this branch `post-m3-hardening/21-probe-05-gatekeeper-benchmark` was cut from it in `/home/shizuku/Project/ohpichamber-worktrees/lane-f-spikes`.
- Dependency evidence: `git merge-base --is-ancestor 3571541ba21e728f47fc15beddbf2d070314e951 main` succeeds, and `main` is exactly `3571541ba21e728f47fc15beddbf2d070314e951`; the Task17 archive record `.workflow/done/post-m3-hardening/17-worker-capacity-measurement.md` is present on `main`. Task17's landing was a branch-only fast-forward performed by this lane under explicit coordinator delegation, with its gate evidence in the Task17 artifact directory.
- Check before: spike, skipped per `flow-implement` step 1.
- Read: `.workflow/specs/post-m3-hardening.md` (H12, open item 21-24), `.workflow/omp-migration/architecture.md` PROBE-05 row, `.workflow/done/omp-through-m3/23-m2-gate.md`, `scripts/perf/DOCUMENTATION.md`, `.workflow/spike-tasks.md`, `flow-implement`, `performance-engineering`, and the Host ownership chain `agent-runtime.js` -> `createWorkerOperationAuthorizer` -> `project-directory-runtime.js`/`path-realpath-cache.js`/`approval-policy-store.js`/`guests/files.js`.
- Evidence: `/home/shizuku/Project/ohpichamber-omp-artifacts/lane-f/21-2026-10-24/` (`task21-gatekeeper-receipt.json`, sha256 `9e5acb600482d63529d677cf5a8401eba5777e3f7f97b4ab5c7b89300feb30ad`, plus the three per-run JSON files). The throwaway benchmark script was deleted after the receipt was written; no other task's evidence was touched.
- Check after: three runs of the same 10,000-access design recorded p50/p95/p99 and CPU on the real authorizer path; the cache answer is in `## Findings`.
- Landing gate: full root `bun run test` at HEAD `3571541ba21e728f47fc15beddbf2d070314e951` exited 0 in 429 s with `TMPDIR=/tmp/omp-task21-gate2-7RkIhV` (device 54, same as `/tmp`, 0 initial entries). 7/7 suites: scripts 22/22, sdk 23/23, ui 805/805, agent-contract 177 pass/0 fail, agent-service 229 pass/7 skip/0 fail, electron 44/44, web 378 passed/9 skipped files (6128 passed/135 skipped tests). Evidence `/home/shizuku/Project/ohpichamber-omp-artifacts/lane-f/21-2026-10-24/run-02/`. An earlier invocation failed before running tests (wrong working directory reported "a package.json script 'test' was not found"), and one attempt was cancelled on instruction (SIGTERM, exit 1); neither is a result.
- No source, spec, decisions, development, glossary, package or Task37 file changed. No cache added. No `main` write or merge.

## Findings

**Answered question:** what latency and CPU cost do 10,000 real Host-boundary file accesses through the Gatekeeper add, and does it need a cache?

**Design (one design, three runs).** Benchmarked the production boundary directly: `createWorkerOperationAuthorizer` from `packages/web/server/lib/host/worker-operation-authorizer.js` (the function `agent-runtime.js` installs as the Host's worker-operation authorizer), wired exactly as production does except for the policy source: real `createProjectDirectoryRuntime().validateDirectoryPath` (stat plus the production `path-realpath-cache`), real `openApprovalPolicyStore` SQLite store, real `resolveGuestFilePath` path authorization, and the production zod schemas. Each access is a `tool`/`read` request with a `NativeOperationDescriptor` whose `sourcePaths` is one real repository file, cycled over 14 real files in the workspace, against a real workspace `cwd` and a real agent directory; the resolved `HostWorkspacePolicy` snapshot is equivalent to what the service returns. Three fresh processes each performed 10,000 sequential awaits. Every request was allowed (30,000/30,000; 0 denied), confirming the measured path is the allow path, not an early rejection.

| Run | p50 | p95 | p99 | max | user CPU / access | system CPU / access | wall for 10,000 |
|---|---|---|---|---|---|---|---|
| 1 | 0.19 ms | 0.31 ms | 0.61 ms | 11.98 ms | 174.8 µs | 58.7 µs | 2174.6 ms |
| 2 | 0.14 ms | 0.25 ms | 0.37 ms | 9.86 ms | 135.8 µs | 49.2 µs | 1677.7 ms |
| 3 | 0.13 ms | 0.20 ms | 0.28 ms | 9.95 ms | 118.3 µs | 49.8 µs | 1486.3 ms |

Median of the run quantiles: p50 0.14 ms, p95 0.25 ms, p99 0.37 ms. Median per-access CPU is roughly 0.14-0.17 ms user and 0.05 ms system, so 10,000 accesses cost ~1.5-2.2 s wall and ~1.7-2.3 s CPU in total. The ~10-12 ms maxima are isolated scheduling/GC outliers, not a distribution shift: p99 stayed below 0.7 ms.

**Cache answer: not warranted.** The measured p95 (0.25 ms) and p99 (0.37 ms) per file access sit far below any perceptible interaction budget; a single recursive glob or diff of 10,000 files would spend ~1.5-2.2 s in total authorization, and that total is dominated by real path validation that a cache would have to invalidate correctly. The design already includes the production realpath cache, so the residual cost is chiefly the `realpath`/`stat` pairs and schema parsing rather than repeated avoidable resolution. Adding an authorization-result cache here would trade correctness risk (scope, policy, descriptor, and filesystem-change invalidation) for a gain invisible to users. PROBE-05's fallback is to keep path authorization intact and only optimize after measurement; no optimization is justified by this result.

**Limitations.** The service-backed `resolvePolicy` round trip and the IPC transport into the authorizer are excluded: the policy snapshot is resolved once because it is identical for every file access, and that per-admission cost is measured separately by the service work rather than per file. Measurements are one Linux x64 host with a warm page cache, real repository files, and sequential single-process calls; concurrent workers, cold caches, network filesystems and non-Linux platforms are not measured. Percentiles are per-process over 10,000 awaits.

**Recorded in:** this task file's `## Findings` and the receipt above. No spec/decisions/glossary edit: this lane may change task files only, and the result is a "no change needed" answer that requires no decision record.
