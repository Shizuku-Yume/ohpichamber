# 10: Remove stale worktrees and branches, keeping every unmerged tip as a tag

**Effort:** tech-debt-sweep
**Task type:** refactor
**Blocked by:** 01, 02, 03, 05, 06, 07, 08, 09
**Covers:** W11
**Files:** git refs and `/home/shizuku/Project/ohpichamber-worktrees/` only; `.workflow/standards.md` only if it lists worktrees
**Read first:** `.workflow/specs/tech-debt-sweep.md` (item 5, "What it must not do"); CONVENTIONS §7
**Check:** `git worktree list` shows only `/home/shizuku/Project/ohpichamber`, `debt-integration`, and worktrees of running efforts (`fb15-*` and `rebrand-*` while their specs are not done); `git branch` shows only `main`, running efforts' branches and `tech-debt-sweep/*`; every unmerged tip that was removed resolves as `archive/<branch>`; `cleanup-ledger.tsv` (path, branch, class, tip, tag, action) is in the evidence directory.
**Base commit:** 82c9d9a91f29a96fba1d92ee206974f783533525

- [x] Classify every worktree and local branch outside the exclusions: merged (`git merge-base --is-ancestor <tip> main`), content-landed (`git cherry main <tip>` shows no `+`, or `git diff main...<tip>` is empty for its files), unmerged, dirty.
- [x] Dirty worktrees: inspect the diff. Throwaway build/test output is discarded; anything that looks like real work is committed onto the branch as `wip(archive): ...` before tagging. Record which.
- [x] Unmerged and content-landed tips are tagged `archive/<branch>` before removal; merged ones are removed without tags. `backup/*` branches become `archive/backup/*` tags.
- [x] `git worktree remove` each, then `git branch -D`, then `git worktree prune`; remove `m4-integration.lock` and the empty `m6-w5` directory.
- [x] Do not touch `fb15-*`, `rebrand-*`, `debt-*` worktrees of this effort still in use, any `ux-feedback-2026-11-15/*` or `rebrand/*` branch, remote-tracking refs, or existing tags.

## Progress

- **Check before:** 76 registered worktrees + 2 unregistered disk entries (`m4-integration.lock`, `m6-w5`); 149 local branches; 4 `archive/*` tags (`archive/tech-debt-sweep-2026-11-08/*`); `.workflow/bin/workflow next --no-color` reported 39 stale worktrees (pre-cleanup receipts in `/home/shizuku/Project/ohpichamber-omp-artifacts/tech-debt-sweep-2026-11-18/task10/check-before-*.log` and `check-before-remotes.log`).
- **Dirty worktrees resolved (patches saved in `/home/shizuku/Project/ohpichamber-omp-artifacts/tech-debt-sweep-2026-11-18/task10/dirty-diffs/`):**
  - Discarded (throwaway/superseded): `ux-12` unstaged duplicate `bun.lock` line; `ux-12-ui-foundation` unstaged `Promise.resolve([])` stub on deleted `packages/ui/src/components/views/useLastTurnDiff.ts`.
  - Committed as `wip(archive): ...` before tagging: `post-m3-hardening-12` (`post-m3-hardening/14-windows-release-signing`, `packages/electron/scripts/prepare-agent-runtime.test.mjs`) -> `f744d025db`; `ux-12` (`ux-and-omp-parity-remediation/12`, `packages/ui/src/components/sections/providers/custom-provider-form.ts`) -> `5da943eb83`; `ux-12-chat` (`ux-and-omp-parity-remediation/12-chat`, `packages/ui/src/components/chat/hooks/useChatAutoReadAloud.ts`) -> `e7ddb0a8b0`.
- **Check after:** `cleanup-ledger.tsv` (126 rows: 48 worktrees removed, 2 unregistered entries `m4-integration.lock` and `m6-w5` removed, 121 local branches deleted, 80 new `archive/<branch>` tags created including 3 `archive/backup/*` tags so all 84 `archive/*` tags resolve to exact tips). `git worktree list` has 28 entries (`/home/shizuku/Project/ohpichamber`, `debt-integration`, `debt-10`, 20 `fb15-*`, 5 `rebrand-*`); `git branch` has 28 branches (`main`, `tech-debt-sweep/{integration,10}`, 20 `ux-feedback-2026-11-15/*`, 5 `rebrand/*`). All 605 pre-existing tags and 786 remote-tracking refs intact. `verify_task10_check.py` passed 15/15 checks (`check-after.log`, `check-after-receipt.json`); `.workflow/bin/workflow next --no-color --all` exited `0` and reported 0 non-excluded stale worktrees (only the 18 intentionally excluded `fb15-01`..`fb15-18` worktrees of the running `ux-feedback-2026-11-15` effort). `.workflow/bin/workflow validate --no-color` exited `0` (`Workflow is valid (316 task files).`). Receipts: `cleanup-ledger.tsv`, `check-after.log`, `check-after-receipt.json`, `check-after-worktree-list.log`, `check-after-branches.log`, `check-after-archive-tags.log`, `check-after-workflow-next.log`, `workflow-validate-after.log` under `/home/shizuku/Project/ohpichamber-omp-artifacts/tech-debt-sweep-2026-11-18/task10/`.
- **Workflow metadata follow-up:** Dropped the retired `**Base branch:**` lines (keeping `**Base commit:**` intact) from 11 archived task files under `.workflow/done/{omp-through-m3,post-m3-hardening}/` whose referenced branches (`omp-through-m3/m1-integration`, `post-m3-hardening/{11,12,15,27}-*`) were deleted and archived as `archive/*` tags during this cleanup, bringing `.workflow/bin/workflow validate` to `0 error(s), 0 warning(s)`.
- **Review:** pass (base 82c9d9a91f29a96fba1d92ee206974f783533525; reviewer workflow-reviewer-10)
