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
- Check after (final): the corrected real Host-path benchmark satisfies the task's intent with three 10,000-access runs through the real supervisor/service/worker/IPC/policy path, receipt `real-path/task21-host-path-receipt.json`; the earlier authorizer-only slice is retained as partial evidence. A prior gate run-03 at the rebased SHA exited 1 on one Web spaces `code-out` timing assertion (6/7 suites), recorded below; it is not a Task21 failure but no green full gate exists at this SHA.
- Landing gate: full root `bun run test` at HEAD `3571541ba21e728f47fc15beddbf2d070314e951` exited 0 in 429 s with `TMPDIR=/tmp/omp-task21-gate2-7RkIhV` (device 54, same as `/tmp`, 0 initial entries). 7/7 suites: scripts 22/22, sdk 23/23, ui 805/805, agent-contract 177 pass/0 fail, agent-service 229 pass/7 skip/0 fail, electron 44/44, web 378 passed/9 skipped files (6128 passed/135 skipped tests). Evidence `/home/shizuku/Project/ohpichamber-omp-artifacts/lane-f/21-2026-10-24/run-02/`. An earlier invocation failed before running tests (wrong working directory reported "a package.json script 'test' was not found"), and one attempt was cancelled on instruction (SIGTERM, exit 1); neither is a result.
- No source, spec, decisions, development, glossary, package or Task37 file changed. No cache added. No `main` write or merge.
- Post-rebase gate (single authorized run): `run-03`, HEAD `3642516ebeb4f453d357cd89489a3142ae567f44` over base `7ff0e2507e051f9eb9e5e4b0c8f463aa5b1fa79a`, exited 1 in 427 s with `TMPDIR=/tmp/omp-task21-gate3-nSlT8S` (device 54, same as `/tmp`, 0 initial entries). 6/7 suites passed; the only failure is Web `server/lib/spaces/code-out.test.js` > "refuses a transfer over the cap that arrived in one piece" (`expected null to be '0'` at the fetch-stop assertion), a timing-sensitive spaces test unrelated to this task-only diff. Evidence `21-2026-10-24/run-03/`. No green full gate exists at this SHA; no second gate was run on instruction, and this is not claimed as a pass.
- Final lineage (2026-10-24): the branch was rebased again onto `main` `b3f961876ecb81fe6dcb938a4f107640f9b74729`; final HEAD `4ca354624077e62b1eb721cf189091f32fa19cb4`. Measurement bases recorded inside the receipts: real-path run 1 measured over base `a37446ac7a309f5ce8a9a27bec0de3e326a73cf9` (the then-current `main`), runs 2-3 over base `b3f961876ecb81fe6dcb938a4f107640f9b74729`; every run executed archive HEAD `3642516ebeb4f453d357cd89489a3142ae567f44` as its `head`. All external evidence is preserved byte-for-byte: `real-path/real-run-1.json`-`real-run-3.json`, `real-path/task21-host-path-receipt.json`, `real-path/logs/`, the void `real-path/attempt-deadline-too-short.json`, the authorizer-only `task21-gatekeeper-receipt.json` and per-run JSONs, the focused `focused-code-out/` evidence, and `run-03/` exit-1 evidence. The real-vs-supplied layer limitation stands: the Host SQLite scope/settings store is not instantiated and the harness supplies the captured workspace-scope shape.

- Rebase produced branch head `4ca354624077e62b1eb721cf189091f32fa19cb4`; the lineage metadata commit brings the final HEAD to `3bd876a92ed811a2313cbab81c1192392fedcc4c`.
- Fresh post-rebase reviews over base `b3f961876` -> HEAD `3bd876a92`: Brief A `lane-f-driver-3.Task21BriefA` PASS (no findings, confidence 0.94); Brief B `lane-f-driver-3.Task21BriefB` PASS (no findings, confidence 0.98). Neither is a pre-rebase or authorizer-only review.
- Final gate (single clean run, after both briefs passed): `run-04`, HEAD `3bd876a92ed811a2313cbab81c1192392fedcc4c` over base `b3f961876ecb81fe6dcb938a4f107640f9b74729`, exited 0 in 455 s with `TMPDIR=/tmp/omp-task21-gate4-NK9mhJ` (device 54, same as `/tmp`, 0 initial entries). 7/7 suites: scripts 22/22, sdk 23/23, ui 808/808, agent-contract 177 pass/0 fail, agent-service 237 pass/7 skip/0 fail (244 tests, 39 files), electron 44/44, web 378 passed/9 skipped files and 6128 passed/135 skipped tests. Evidence `21-2026-10-24/run-04/` (log, exit, environment). This is the only green full gate at this SHA; `run-03` stays recorded as its exit-1 predecessor at the earlier rebase.

## Findings

**Answered question:** what latency and CPU cost do 10,000 real Host-boundary file accesses through the Gatekeeper add, and does it need a cache?

**Corrected real Host-path measurement (primary answer; three runs).** A second design traverses the real boundary rather than the authorizer alone: the production Host supervisor `createAgentServiceSupervisor` spawns the built Agent Service process; a real SDK worker is admitted through the service; a named loopback provider (`loopback`/`loopback-model`, `openai-completions`) drives actual `read` tool calls over real empty files in the workspace, 500 calls per provider turn. Every read produces a real `policy.request` from the worker to the service and a real `worker.authorization.request` over the Host IPC channel into `createWorkerOperationAuthorizer`, and `resolvePolicy` performs the production HTTP round trip to `/internal/workspaces/:id/authorization-policy` for each authorization. Latency is instrumented around exactly the authorizer invocation, so it includes the per-authorization policy resolution.

| Run | p50 | p95 | p99 | max | mean | wall for 10,000 | reads / authorizations / policy calls |
|---|---|---|---|---|---|---|---|
| 1 | 1.83 ms | 2.38 ms | 3.64 ms | 133.46 ms | 2.16 ms | 3143 s | 10,000 / 10,021 / 10,021 |
| 2 | 1.81 ms | 2.20 ms | 2.91 ms | 91.50 ms | 1.95 ms | 3062 s | 10,000 / 10,021 / 10,021 |
| 3 | 1.78 ms | 2.21 ms | 2.81 ms | 78.35 ms | 1.88 ms | 3030 s | 10,000 / 10,021 / 10,021 |

Median-of-runs p50 1.81 ms, p95 2.21 ms, p99 2.91 ms; max 78-133 ms. Each run recorded 0 denied requests, `descriptorReadTargets === readCalls === 10,000` (every read carried a one-path native descriptor) and `resolvePolicyCalls === 10,021` (10,000 reads plus 21 `provider.use` checks), so every counted access demonstrably crossed worker IPC, Host authorization and the service-backed policy resolution (`ipcProof: true` in all three). Host-process CPU over the measured window was 43.5-47.1 ms user and 1.3-1.6 ms system per read, but that window includes the in-process loopback fixture parsing and serialising the growing provider history and the 500-call SSE frames, so it is an upper bound, not the Gatekeeper's own CPU. Receipt: `/home/shizuku/Project/ohpichamber-omp-artifacts/lane-f/21-2026-10-24/real-path/task21-host-path-receipt.json` (sha256 `03c798be7cedefd9ed8ab18a332199ad7a42f99635cb713a62c825d3bbf2970a`), with `real-run-1.json`-`real-run-3.json` and logs. A void partial (`attempt-deadline-too-short.json`, 2956/10,000, harness wait deadline) is preserved, labelled and not counted; one aborted run3 launch produced no output and is not a repetition.

**Layers, stated precisely.** Real: the Host supervisor and its IPC channel, the spawned built service, the SDK worker and its tool loop, loopback-driven `read` calls over real files, worker authorization IPC, `createWorkerOperationAuthorizer`, the per-authorization service policy HTTP round trip, realpath/stat validation and the SQLite approval-policy store. Supplied by the harness: workspace-scope resolution uses a captured scope map; the Host's SQLite scope/settings store is **not** instantiated. This is therefore a real Host service/IPC/policy path with a supplied scope-resolution layer, not a fully production Host process.

**Cache answer: not warranted.** Per-access authorization through the real path costs p95 2.21 ms and p99 2.91 ms, dominated by the existing per-authorization policy HTTP round trip (the authorizer-only slice below measured p95 0.25 ms with that round trip excluded). A 10,000-file tool operation therefore spends ~22-29 s in authorization end-to-end, while interactive per-tool-call use stays in single-digit milliseconds. Removing the round trip would mean reusing a policy snapshot across authorizations, reopening scope, policy-revision and filesystem invalidation risk; that is a separate optimization to measure only if bulk-access latency becomes a product problem. PROBE-05's fallback is to keep path authorization intact.

**Limitations.** One Linux x64 host, one loopback provider, one worker, sequential tool calls, warm page cache. The fixture runs in the measuring Node process, inflating the CPU window; CPU is reported as that upper bound and the authorizer-only slice supplies the narrower figure. Authorizer latency includes the production policy round trip. Cold caches, concurrency, network filesystems and non-Linux platforms are unmeasured.

### Prior slice (authorizer only; partial evidence, not the Check answer)

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
