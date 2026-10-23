# 03: Rerun the M3 gate at the main tip and repair evidence lineage

**Effort:** post-m3-hardening
**Task type:** feature
**Base commit:** 7534abc9f
**Started:** 2026-10-23T06:50:01Z
**Status:** active

**Delivers:** A current M3 gate receipt names a commit in `main`'s history, was produced in the landing worktree with all phases exiting 0, and every status document cites only it.

**Blocked by:** 01, 02
**Files:** `.workflow/omp-migration/m3/` (receipts); `.workflow/done/omp-through-m3/retrospective.md`; `.workflow/development.md` "Current state"; `.workflow/specs/omp-through-m3.md` "Current status"; `AGENTS.md` "Purpose"; `knip.json`; `packages/agent-service/src/supervisor/workers.ts`; `packages/ui/src/stores/agentConfigBridge.ts`

**Read first:** `.workflow/specs/post-m3-hardening.md`; `/home/shizuku/Project/ohpichamber-omp-artifacts/post-m3-review-2026-10-23/``GateRerun.md` findings 4, 5, 8, 9; existing receipt `.workflow/omp-migration/m3/task18-gate-final-2026-10-22.json`
**Covers:** H2

**Check:** Run type-check, lint, build, the full `bun run test`, `bun run dead-code`, `bun run docs:validate` and `.workflow/bin/workflow validate` in the landing worktree; then `git merge-base --is-ancestor <receipt sha> main` → exit 0.

## Done when

- [x] The new receipt records commit, worktree path and per-phase exit codes; logs live under the evidence directory in `standards.md`.
- [x] The `8d179c4e2` receipt is labeled historical: source-equivalent to `24f1012c1`, not covering later commits.
- [x] `development.md` no longer claims "quota store 16/16" for suites that were failing; its counts are pinned to the new receipt.
- [x] The retrospective cites the new receipt. Maintainer acceptance of `omp-through-m3` can be requested at `flow-close` after this task.

## Progress

Dirty at start: none (worktree clean at `7534abc9f`).

Check before:
- No receipt names a commit in current `main` history that covers the post-`8d179c4e2` commits; the root test and agent packages were not in the old gate's root counts.

Resolution of the dead-code block: the three "unused" agent-service modules are imported and instantiated by the production entry `src/index.ts`, which was missing from the `packages/agent-service` entry list in `knip.json`. Adding it (and dropping the unnecessary `export` on `buildWorkerEnvironment`) makes `knip` follow the real graph; no file was deleted and no rule was silenced. `bun run dead-code` now exits 0 with no findings.

Check after (tested commit `ddc180155cb2c1dfcef6642dce877e00de5397f8`, worktree `/home/shizuku/Project/ohpichamber-worktrees/post-m3-hardening-lane-a`; logs in `/home/shizuku/Project/ohpichamber-omp-artifacts/task03-2026-10-23/`):
- type-check 0 (`type-check-ddc.log`), lint 0 (`lint-ddc.log`), build 0 (`build-ddc.log`), test 0 (`test-ddc.log`), dead-code 0 with 0 findings (`dead-code-ddc.log`), docs:validate 0 with 672 pages / 56 links (`docs-ddc.log`), workflow validate 0 with 116 task files (`workflow-ddc.log`).
- Root test: scripts 22/22 files, SDK 23/23, UI 804/804, agent-contract 177 pass / 0 fail, agent-service 225 pass / 7 skip / 0 fail, Electron 44/44, Web 373 passed / 9 skipped files and 6102 passed / 135 skipped tests.
- Receipt `.workflow/omp-migration/m3/task03-gate-2026-10-23.json`; old receipt labeled historical.
- `git merge-base --is-ancestor ddc180155 main` is verified after the fast-forward landing.

**Finished:** 2026-10-23T07:23:08Z
