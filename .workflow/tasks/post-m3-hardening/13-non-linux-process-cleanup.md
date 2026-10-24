# 13: Clean up Agent Service process trees on macOS and Windows

**Effort:** post-m3-hardening
**Task type:** feature
**Base commit:** 342c8182e20c8843176a5b714101f2f0696a5ea9
**Original branch point:** fd7b1968c
**Started:** 2026-10-23T20:10:00Z
**Status:** active

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

Rebase and scope: the branch was rebuilt from `c4b8ddcb0` onto current `main` `342c8182e20c8843176a5b714101f2f0696a5ea9`; the merge-base is `342c8182e`, the source/test tree is unchanged, and the final diff against `342c8182e` touches only Task13-owned paths. The pre-existing unrelated commit `377b6a8fc` (archived Task04/16 evidence) was excluded from the rebuild; its content remains reachable from `post-m3-hardening/lane-b-archive-evidence-fix` and the local backup `backup/task13-pre-clean-rebuild-8eecb53`. Original branch point: `fd7b1968c`. C07 archive commit `83ec4d19b` reproduced the Linux grandchild leak and assigned this fix to Lane B.

Check before: Task07's recorded reproduction at `83ec4d19b` ran `bun /tmp/repro-worker-descendant.mjs` and printed `{"parentPid":1384267,"grandchildPid":1384271}` followed by `{"parentAlive":false,"grandchildAlive":true}`. The pre-change stop killed only the direct worker pid, so the new real-process regression fails against that path.

Check after: `bun test --timeout 60000 src/supervisor/workers.process-tree.test.ts` in `packages/agent-service` reports 4 pass / 0 fail / 28 expect calls across 1 file. The unrelated sibling survives and the SIGTERM-resistant `sleep 300` worker descendant is gone after `WorkerRegistry.stop`; the Windows and macOS cases are construction-level tests. The prior c4b8 sentence recorded 22 expects; that number does not match the current suite and is superseded by this observation. Host process suites (`pidfd-terminator.test.js`, `managed-process-registry.test.mjs`, `agent-service-supervisor.registry.test.js`, `agent-service-supervisor.restart.test.js`) report 4 files / 33 tests passed with `bunx vitest run` after the review fix; the same four files reported 32 tests before the added export regression. `bun run type-check` in `packages/agent-service` exited 0 (13 OMP package declarations prepared); changed-file `oxlint` and changed host-file `eslint` exited 0; `git diff --check` exited 0; `.workflow/bin/workflow validate` reported "Workflow is valid (123 task files)."

Implementation: workers spawn detached on POSIX (`detached: process.platform !== 'win32'`); `WorkerRegistry.stopEntry` signals the group with SIGTERM, waits within the existing timeout, escalates to SIGKILL, and bounds a post-exit group observation. The Agent Service stop uses the birth-checked pidfd tree on Linux, the detached group signal on macOS, and hidden `taskkill /T /PID` for graceful Windows stop with `/T /F /PID` only on escalation. Limits documented next to the code: a POSIX descendant that creates its own session/group escapes fallback cleanup; Windows `taskkill` walks ancestry and cannot discover descendants after the leader exits, so its tree signal must run while the leader is alive; Linux keeps the pidfd tree as the authoritative path.

Review findings and resolution: quality brief B passed with 0 blocking / 0 nonblocking findings on `aa5e31302`. The independent requirements/process review found two blocking items. A1: `agent-service-supervisor.js` imported `terminateManagedProcess` for its default registry, but `managed-process-registry.js` did not export it; the Linux default-registry path threw, was caught, and fell back to killing only the leader. Fixed in `d94a15eca` by exporting the existing factory member and declaring it in `managed-process-registry.d.ts`, with a regression test that imports the named export; the host suite now reports 33 tests. A2: the branch range contained unrelated commit `377b6a8fc` changing archived Task04/16 records; fixed by the clean rebuild above, and the final range contains no changes to those records. Re-review after these fixes is requested at the current tip and its outcome is reported in the handoff.

Unverified platforms: native macOS and Windows execution was not performed (no machine available). Only the command/signal construction tests and the real Linux process observation exist; no real macOS group-signal run or Windows taskkill/process-tree run is claimed.

Root gate and state: the full root `bun run test` must run at the exact final tip; no pass is claimed here. Task13 stays `active` on this branch and is not landed or archived until that exact-SHA run succeeds. Task18 is archived on `main`; the earlier deferral note is superseded.
