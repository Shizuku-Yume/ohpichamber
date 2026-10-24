# 18: Enforce a worker capacity and idle-eviction policy

**Effort:** post-m3-hardening
**Task type:** feature
**Base commit:** a37446ac7a309f5ce8a9a27bec0de3e326a73cf9
**Started:** 2026-10-24T14:43:19+08:00
**Finished:** 2026-10-24T15:12:26+08:00

**Delivers:** The Agent Service enforces the measured worker cap and evicts idle workers, returning an explicit capacity outcome instead of growing without bound.

**Blocked by:** 17
**Files:** `packages/agent-service/src/supervisor/workers.ts`; the contract owner for the capacity outcome in `packages/agent-contract`

**Read first:** `.workflow/specs/post-m3-hardening.md`; task 17 `## Findings`; `.workflow/omp-migration/contracts.md` (Problem Details, unsupported/unavailable outcomes); `.agents/skills/sync-state-invariants/SKILL.md`
**Covers:** H11

**Check:** Service regressions: opening one root past the cap returns the capacity outcome; an idle worker past the timeout is stopped and its session reopens cold with history intact; a worker with a running turn or pending approval is never evicted.

## Done when

- [x] Policy values come from task 17, not guesses: `maxActiveRootWorkers: 5`, `idleEvictionTimeoutMs: 600_000`, `reapIntervalMs: 30_000`; only `kind: 'session'` roots count.
- [x] The UI shows the capacity outcome as a real message: the Agent Service Problem Details detail reaches the session load error and the create toast; no generic copy replaces it.

## Progress

- Dirty at start: none. The worktree was clean on `post-m3-hardening/13-non-linux-process-cleanup` at `c4b8ddcb0`; Task18 branch `post-m3-hardening/18-worker-capacity-policy` was created from `3571541ba21e728f47fc15beddbf2d070314e951`. The branch was rebased onto the coordinator's then-current main `aa75aea8f4a87f50281669c6fddab68cef2ba5d7` (parent `167b50c9e`) with a `git stash push -u` / no-conflict rebase / no-conflict pop; after main advanced, it was rebased again onto `7ff0e2507e051f9eb9e5e4b0c8f463aa5b1fa79a` with the same stash/rebase/pop sequence and no conflicts. While the final root gate ran, `main` advanced to `a37446ac7a309f5ce8a9a27bec0de3e326a73cf9` and the branch was moved onto it without conflicts; the working-tree change set and the gate run cover that base. No main write or merge.
- Check before: the pre-change supervisor had no cap or idle reaper; Task17 measured ten concurrent roots admitted. The Check could not pass before the change, and the new regression files fail without `WORKER_CAPACITY_POLICY`, the reaper, and the session idle predicate.
- Implementation: `WORKER_CAPACITY_POLICY` exports the measured values; `WorkerRegistry.start()` reserves a session root synchronously before the asynchronous bootstrap and refuses the next root with 503 `SERVICE_UNAVAILABLE` / `details.reason: "worker_capacity"` / the counts while leaving existing workers untouched. Stateless and usage workers are excluded from the count. The reaper is an unref'd 30 s timer, skips overlapping scans, and evicts only a ready `kind: 'session'` worker whose activity is older than 600 s and which has no pending operation, Host action, restart reservation, active run/pending prompt, opening/deletion/control, subagent write, or unresolved approval/question. Eviction reuses `stopEntry`; `SessionRegistry.isIdleForEviction()` owns the session half and the service wires it into the registry.
- UI: `canonicalProblemDetail()` preserves the server sentence. `ChatContainer` shows it instead of the generic load copy, and `createSession` propagates canonical refusals so the draft lifecycle shows the detail in an existing toast; ordinary transport failures keep the existing null return.
- Focused checks after: `bun test --timeout 60000 src/supervisor/workers.capacity.test.ts src/supervisor/workers.eviction.test.ts src/supervisor/service-capacity.test.ts` 7 pass / 0 fail / 34 expects; UI `session-creation-loading.test.ts` + `lib/problemMessage.test.ts` 9 pass / 0 fail / 31 expects. Agent-service and UI type-check exit 0. Changed-file `bunx oxlint` on the authored files reports no findings; the three large UI files retain only pre-existing anti-slop findings outside this diff. `git diff --check` and `.workflow/bin/workflow validate` (122 task files) exit 0.
- Check after: full root `bun run test` at this branch content passed 7/7 suites, exit 0 in 436 s: scripts 22/22, SDK 23/23, UI 806/806, agent-contract 177 pass/0 fail (1185 expects), agent-service 236 pass/7 skip/0 fail (1441 expects), Electron 44/44, Web 378 passed/9 skipped files (6128 passed/135 skipped tests). Evidence: `/home/shizuku/Project/ohpichamber-omp-artifacts/task18-2026-10-24/bun-run-test-final.log` and `.exit`. A pre-fix run is retained as `bun-run-test-run1-pre-reaper-fix.log`: the reaper read test-double `entries`, fixed by giving the live process map its own `workerEntries` name; Web also had one unrelated tmp-file assertion.
- Review: no separate review round completed in this worker. The spawned `reviewer` agent failed before producing findings with `unknown certificate verification error` (provider certificate). The change is left for the coordinator's `flow-verify` round; blocking findings, if any, remain the coordinator's to return.
- Rebase: the branch contains no commits of its own; the Task18 change set is uncommitted before the final commit and was moved across three main advances without conflicts. No `main` write, merge or landing.
