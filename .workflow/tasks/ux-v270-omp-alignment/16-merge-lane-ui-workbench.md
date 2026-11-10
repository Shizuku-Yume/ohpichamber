# 16: Resolve the merge in the workbench shell, sidebar and mobile apps

**Effort:** ux-v270-omp-alignment
**Blocked by:** 11
**Covers:** W1, W2
**Files:** `packages/ui/src/components/{session,layout,views,multirun,overview,projects,update,desktop,onboarding,sourceBoard,references}/**`; `packages/ui/src/apps/**`; `packages/ui/src/App.tsx`; any `packages/ui/**` path not owned by lanes 13-15 or 17
**Read first:** spec "How it is built" (Merge); `merge-lanes.tsv` lane 16; skills `ui-api-decoupling`, `drag-to-reorder`, `locale-ui-patterns`
**Check:** in a worktree on the scaffold branch, `bun scripts/upstream-drift.mjs --markers --lane 16` → 0; `bun run --cwd packages/ui type-check` reports no error in lane paths; `bun scripts/upstream-drift.mjs --check` on lane paths → 0 `unexplained`

- [ ] Resolve the conflicted paths with the merge rule. Adopt upstream's `SidebarHeader` order and menus (sections manager, mark all read, worktree name by branch, row context menus, worktree icon), `ContextSurfacePanes`, Files preview failure states, knowledge panes, the update dialog with release notes and progress, and the mobile walkthrough/connections surfaces.
- [ ] Restore silently deleted upstream workbench files unless a decision retires them.
- [ ] Deletes: the fork's rewritten sidebar header and other unexplained rewrites in lane paths.
