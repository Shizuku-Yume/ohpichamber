# 13: Clean up Agent Service process trees on macOS and Windows

**Effort:** post-m3-hardening
**Task type:** feature
**Base commit:** 342c8182e20c8843176a5b714101f2f0696a5ea9
**Base branch:** main
**Original branch point:** fd7b1968c
**Started:** 2026-10-23T20:10:00Z
**Finished:** 2026-10-25T11:25:00Z

**Delivers:** Stopping or timing out the Agent Service or a worker on macOS and Windows terminates its whole process tree, instead of failing closed.

**Blocked by:** 07
**Files:** `packages/web/server/lib/host/managed-process-registry.js` (33-38); `packages/web/server/lib/host/pidfd-terminator.js` (41-62); `packages/web/server/lib/host/agent-service-supervisor.js` (184-197); `packages/agent-service/src/supervisor/workers.ts` (spawn and stop)

**Read first:** `.workflow/specs/post-m3-hardening.md`; `/home/shizuku/Project/ohpichamber-omp-artifacts/post-m3-review-2026-10-23/``AgentServiceReview.md` findings 4, 7 and `PlanGapAnalysis.md` finding 3; task 07 `## Findings` (worker descendants); `.agents/skills/desktop-shell/SKILL.md`
**Covers:** H9

**Check:** A Linux regression proves that a worker's shell descendant is gone after stop; that check fails before the change if task 07 confirmed the leak. macOS (process group signaling) and Windows (`taskkill /T /F` or a Job Object) paths have unit tests for their command construction. Real macOS/Windows runs are recorded as not performed unless a machine is available.

## Done when

- [x] Workers run in their own process group (POSIX) so stop can signal the group.
- [x] The non-Linux fallback is implemented and its limits are documented next to the code.
- [x] Unverified platforms are named explicitly in `## Progress` and in `development.md`.

## Progress

Rebase and scope: candidate `7464b6d5d188a0116e9a42b6acab7bbcdeca6118` (merge-base `74338fd78ab03de1ad516b0be265bdc16e3d1520`, original branch point `fd7b1968c`) was rebased cleanly onto current `main` `b5bb70313c625e8e606e31bede6288638e9300ad`; the merge-base with `main` is `b5bb70313c625e8e606e31bede6288638e9300ad`, and the final diff touches only Task13-owned paths. Original branch point: `fd7b1968c`. C07 archive commit `83ec4d19b` reproduced the Linux grandchild leak and assigned this fix to Lane B.

Check before: Task07's recorded reproduction at `83ec4d19b` ran `bun /tmp/repro-worker-descendant.mjs` and printed `{"parentPid":1384267,"grandchildPid":1384271}` followed by `{"parentAlive":false,"grandchildAlive":true}`. The pre-change stop killed only the direct worker pid, so the new real-process regression fails against that path.

Check after: `bun test --timeout 60000 src/supervisor/workers.process-tree.test.ts` in `packages/agent-service` reports 4 pass / 0 fail / 28 expect calls across 1 file. The unrelated sibling survives and the SIGTERM-resistant `sleep 300` worker descendant is gone after `WorkerRegistry.stop`; the Windows and macOS cases are construction-level tests. Host process suites (`pidfd-terminator.test.js`, `managed-process-registry.test.mjs`, `agent-service-supervisor.registry.test.js`, `agent-service-supervisor.restart.test.js`) report 4 files / 33 tests passed with `bunx vitest run`. In `managed-process-registry.test.mjs`, the authored export assertion was updated in `cd23f9b5c` to verify consumer-visible default-registry behavior (`terminateManagedProcess(undefined/4242) resolves false`) rather than runtime `typeof`, resolving the oxlint `anti-slop(no-runtime-typeof)` rule. `bun run type-check` in `packages/agent-service` exited 0; oxlint on changed files exited 0; `git diff --check` exited 0; `.workflow/bin/workflow validate` reports workflow is valid.

Positive real default-registry process-tree smoke: executed in `/home/shizuku/Project/ohpichamber-omp-artifacts/task13-final-2026-10-25/smoke-default-registry-process-tree.mjs`, spawning a detached leader with `OPENCHAMBER_MANAGED_PROCESS_TOKEN` and a child `sleep 300` descendant, registered via default exported `registerManagedProcess`, and terminated via default exported `terminateManagedProcess(child.pid, 'SIGTERM')`; verified `childAlive: false, grandchildAlive: false` and `terminateManagedProcess: true`, exit 0. Receipts in `smoke-default-registry-process-tree.log` and `.exit` (0).

Implementation: workers spawn detached on POSIX (`detached: process.platform !== 'win32'`); `WorkerRegistry.stopEntry` signals the group with SIGTERM, waits within the existing timeout, escalates to SIGKILL, and bounds a post-exit group observation. The Agent Service stop uses the birth-checked pidfd tree on Linux, the detached group signal on macOS, and hidden `taskkill /T /PID` for graceful Windows stop with `/T /F /PID` only on escalation. Limits documented next to the code: a POSIX descendant that creates its own session/group escapes fallback cleanup; Windows `taskkill` walks ancestry and cannot discover descendants after the leader exits, so its tree signal must run while the leader is alive; Linux keeps the pidfd tree as the authoritative path.

Review findings and resolution: quality brief B passed with 0 blocking / 0 nonblocking findings on pre-rebase `aa5e31302` (rebased equivalent `41528a83b`). The independent requirements/process review found two blocking items. A1: `agent-service-supervisor.js` imported `terminateManagedProcess` for its default registry, but `managed-process-registry.js` did not export it; fixed in `c4db1b9be` (final source commit `cd23f9b5c`) by exporting the member and declaring it in `managed-process-registry.d.ts`, with a consumer-visible regression test. A2: the branch range contained unrelated commit `377b6a8fc` changing archived Task04/16 records; fixed by the clean rebuild, and the final range contains no changes to those records.

Historical gate: `TMPDIR=/tmp bun run test` at pre-rebase `577432eee` exited 1 with 6 failed Web files / 13 failed tests (372 passed / 9 skipped files; 6119 passed / 135 skipped tests) while an unrelated Task34 root suite ran concurrently. Receipt: `/home/shizuku/Project/ohpichamber-omp-artifacts/task13-2026-10-24/root-test-577432eeeb8c51ed93ef1aa256dbeb83ef6c893d.log` and `.exit` (1). No edits were made after that failed run; it is preserved as historical evidence, not a pass.

Unverified platforms: native macOS and Windows execution was not performed (no machine available). Only the command/signal construction tests and the real Linux process observation exist; no real macOS group-signal run or Windows taskkill/process-tree run is claimed.

Root gate and landing: exact root `bun run test` executed at final source commit `cd23f9b5ccff8b6529324ae15fc8dc9d8c067e23` in worktree `ohpichamber-lane-b-task13-final` exited 0 with all 7/7 suites passing (scripts 22/22, SDK 23/23, UI 809/809 files, agent-contract 177 pass / 0 fail, agent-service 241 pass / 7 skip / 0 fail, Electron 44/44, Web 372 passed / 9 skipped files, 6051 passed / 128 skipped tests). Receipt: `/home/shizuku/Project/ohpichamber-omp-artifacts/task13-final-2026-10-25/root-test-cd23f9b5ccff8b6529324ae15fc8dc9d8c067e23.log`, `.exit` (0) and `.head` (`cd23f9b5ccff8b6529324ae15fc8dc9d8c067e23`). The following docs/archive commit is source-equivalent to tested SHA `cd23f9b5c`. Task13 is completed and landed.
