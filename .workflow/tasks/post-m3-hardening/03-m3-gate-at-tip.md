# 03: Rerun the M3 gate at the main tip and repair evidence lineage

**Effort:** post-m3-hardening
**Task type:** feature
**Base commit:** <commit-sha>

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
