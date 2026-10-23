# 03: Rerun the M3 gate at the main tip and repair evidence lineage

**Effort:** post-m3-hardening
**Task type:** feature
**Base commit:** 7534abc9f
**Started:** 2026-10-23T06:50:01Z
**Status:** blocked

**Delivers:** A current M3 gate receipt names a commit in `main`'s history, was produced in the landing worktree with all phases exiting 0, and every status document cites only it.

**Blocked by:** 01, 02
**Files:** `.workflow/omp-migration/m3/` (receipts); `.workflow/done/omp-through-m3/retrospective.md`; `.workflow/development.md` "Current state"; `.workflow/specs/omp-through-m3.md` "Current status"; `AGENTS.md` "Purpose"

**Read first:** `.workflow/specs/post-m3-hardening.md`; `/home/shizuku/Project/ohpichamber-omp-artifacts/post-m3-review-2026-10-23/``GateRerun.md` findings 4, 5, 8, 9; existing receipt `.workflow/omp-migration/m3/task18-gate-final-2026-10-22.json`
**Covers:** H2

**Check:** Run type-check, lint, build, the full `bun run test`, `bun run dead-code`, `bun run docs:validate` and `.workflow/bin/workflow validate` in the landing worktree; then `git merge-base --is-ancestor <receipt sha> main` → exit 0.

## Done when

- [ ] The new receipt records commit, worktree path and per-phase exit codes; logs live under the evidence directory in `standards.md`.
- [ ] The `8d179c4e2` receipt is labeled historical: source-equivalent to `24f1012c1`, not covering later commits.
- [ ] `development.md` no longer claims "quota store 16/16" for suites that were failing; its counts are pinned to the new receipt.
- [ ] The retrospective cites the new receipt. Maintainer acceptance of `omp-through-m3` can be requested at `flow-close` after this task.

## Progress

Dirty at start: none (worktree clean at `7534abc9f`).

Check before:
- No receipt names a commit in current `main` history that covers the post-`8d179c4e2` commits; the root test and agent packages were not in the old gate's root counts.

## Blocked

The gate cannot produce a PASS receipt: `bun run dead-code` exits 1 on files outside Lane A. Observed at `7534abc9f` (log `/home/shizuku/Project/ohpichamber-omp-artifacts/task03-2026-10-23/dead-code-after-bridge-fix.log`):

- unused file `packages/agent-service/src/interaction/host-policy.ts`
- unused file `packages/agent-service/src/supervisor/host-authorization.ts`
- unused file `packages/agent-service/src/supervisor/host-skill-sources.ts`
- unused export `buildWorkerEnvironment` at `packages/agent-service/src/supervisor/workers.ts:100` (Lane B owns this file)

Lane A fixed its own dead-code finding by making `AgentSelectionState` non-exported in `packages/ui/src/stores/agentConfigBridge.ts` (currently uncommitted on this branch). The four remaining findings belong to another lane; task 03 does not edit them. Gate phases that could run: type-check 0, lint 0, build 0, docs:validate 0. The PASS receipt, root test phase, workflow validate phase and status-document updates wait for a green dead-code.

Decision needed: fix or assign the four agent-service findings to their owning lane, then rerun the full gate here.
