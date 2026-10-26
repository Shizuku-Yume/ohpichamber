# 09: Layout, works view and worktrees

**Effort:** upstream-refresh
**Task type:** feature
**Base commit:** <commit-sha>

**Delivers:** Upstream's layout shell, works view, pane resizing, shortcuts, tracked items and worktree surfaces work with the fork's runtime and projects.

**Blocked by:** 10, 23
**Files:** Path list: `/home/shizuku/Project/ohpichamber-omp-artifacts/upstream-sync-2026-10-27/plan-paths/09.tsv` (105 paths: 81 clean/new, 24 both-side, 12 conflicts). Main locations: `packages/ui/src/components/{layout,mini-chat}`, `packages/ui/src/lib/{worktrees,workspace,trackedItems,shortcuts}`, `packages/web/server/lib/{projects,worktrees}`.

**Read first:** Spec W6; `.agents/skills/performance-engineering/SKILL.md`; `.agents/skills/drag-to-reorder/SKILL.md` (pane/row ordering); `.agents/skills/locale-ui-patterns/SKILL.md`; `.agents/skills/desktop-shell/SKILL.md` (Mini Chat window).
**Covers:** W6

**Check:** `bun install --frozen-lockfile` and `bun run type-check` and `bun run lint` and `bun run test` all exit 0, and in the running app the works view lists active work, the side panel keeps one width across tabs, Mini Chat opens on the right instance, and a worktree is created, switched and removed from a fixture repo.

## Done when

- [ ] Layout, panel widths and focus behavior match upstream; no dead pane or duplicate shell remains.
- [ ] Worktree create/switch/remove works and preserves unsaved editor state.
- [ ] Shortcuts do not collide with the fork's reserved keys.
- [ ] Mini Chat targets the correct runtime instance.
