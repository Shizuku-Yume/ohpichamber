# 03: Reconcile technical-debt.md, harden workers.capacity.test.ts contention polling, and prune merged historical worktrees

**Effort:** tech-debt-sweep
**Task type:** refactor
**Blocked by:** None
**Covers:** W3
**Files:** `.workflow/technical-debt.md`; `.workflow/decisions.md`; `packages/agent-service/src/supervisor/workers.capacity.test.ts`
**Read first:** `.workflow/specs/tech-debt-sweep.md`; `.workflow/technical-debt.md`; `.workflow/decisions.md`; `packages/agent-service/src/supervisor/workers.capacity.test.ts`
**Check:** `for i in 1 2 3 4 5; do bun test packages/agent-service/src/supervisor/workers.capacity.test.ts || exit 1; done && .workflow/bin/workflow validate` → exits 0 across 5 consecutive runs with reconciled `technical-debt.md` and pruned historical worktrees.

- [ ] Reconcile `.workflow/technical-debt.md` per its format rules: remove resolved entries (`Session unread state has no OMP source`, `Session pins have no OMP source`, and the 4 `Status: fixed` entries from 2026-11-04), verify `Per-session warming has no Agent Service implementation` is covered by `decisions.md` (recording the explicit declined decision if needed before removing from `technical-debt.md`), and remove `Root test contention flakes under multi-suite load` once hardened below.
- [ ] Harden `packages/agent-service/src/supervisor/workers.capacity.test.ts` ("a pending worker operation and a restart reservation each postpone eviction" and sibling eviction timing assertions) to rely strictly on deterministic signals / bounded state polling with generous contention slack rather than fragile wall-clock sleeps, and verify 5/5 consecutive passes.
- [ ] Safely prune historical worktrees under `/home/shizuku/Project/ohpichamber-worktrees/` (excluding `debt-*`) and their merged local task branches **only** when `git status --short` is empty AND `git merge-base --is-ancestor <HEAD> 2cd1a8c836` holds; leave any dirty or unmerged historical worktree untouched and list it in `## Progress`.
