# 10: Remove stale worktrees and branches, keeping every unmerged tip as a tag

**Effort:** tech-debt-sweep
**Task type:** refactor
**Blocked by:** 01, 02, 03, 05, 06, 07, 08, 09
**Covers:** W11
**Files:** git refs and `/home/shizuku/Project/ohpichamber-worktrees/` only; `.workflow/standards.md` only if it lists worktrees
**Read first:** `.workflow/specs/tech-debt-sweep.md` (item 5, "What it must not do"); CONVENTIONS §7
**Check:** `git worktree list` shows only `/home/shizuku/Project/ohpichamber`, `debt-integration`, and worktrees of running efforts (`fb15-*` and `rebrand-*` while their specs are not done); `git branch` shows only `main`, running efforts' branches and `tech-debt-sweep/*`; every unmerged tip that was removed resolves as `archive/<branch>`; `cleanup-ledger.tsv` (path, branch, class, tip, tag, action) is in the evidence directory.

- [ ] Classify every worktree and local branch outside the exclusions: merged (`git merge-base --is-ancestor <tip> main`), content-landed (`git cherry main <tip>` shows no `+`, or `git diff main...<tip>` is empty for its files), unmerged, dirty.
- [ ] Dirty worktrees: inspect the diff. Throwaway build/test output is discarded; anything that looks like real work is committed onto the branch as `wip(archive): ...` before tagging. Record which.
- [ ] Unmerged and content-landed tips are tagged `archive/<branch>` before removal; merged ones are removed without tags. `backup/*` branches become `archive/backup/*` tags.
- [ ] `git worktree remove` each, then `git branch -D`, then `git worktree prune`; remove `m4-integration.lock` and the empty `m6-w5` directory.
- [ ] Do not touch `fb15-*`, `rebrand-*`, `debt-*` worktrees of this effort still in use, any `ux-feedback-2026-11-15/*` or `rebrand/*` branch, remote-tracking refs, or existing tags.
