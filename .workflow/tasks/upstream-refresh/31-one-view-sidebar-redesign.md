# 31: One-view sidebar redesign

**Effort:** upstream-refresh
**Task type:** feature
**Base commit:** <commit-sha>

**Delivers:** The desktop session sidebar uses upstream's one-view row model — sessions, runs, works, worktrees, reference links and activity labels in one tree — on the canonical OMP session data, replacing the fork's split list/works model.

**Blocked by:** 07
**Files:** Paths come from tasks 08 and 24's lists; there are no new upstream paths. Main locations: `packages/ui/src/components/session/sidebar/{sessionSidebarRowModel.ts,sessionSidebarRowModel.test.ts,SessionSidebarRows.tsx,SessionSidebarRows.test.ts,sessionSidebarActivityLabels.ts,sessionSidebarVirtualization.ts,sessionSidebarDisclosure*,sessionTreeGeometry.ts,SessionTreeGuides.tsx,RowMarkTooltip.tsx}`, `packages/ui/src/components/session/sidebar/sessions/{SessionNodeItem.tsx,RunSidebarRow.tsx,SessionTimelineRowBody.tsx,SessionTimelineRowBody.test.tsx,useSessionRefLines.ts,SidebarRefLinks.tsx,sessionWorkFailure.ts,useRunWork.ts,collapsedActivityState.ts,sessionPrSummaries.ts,prStatusLabel.ts}`, `packages/ui/src/components/session/sidebar/works/{sidebarWorks.ts,sidebarWorks.test.ts,useWorktreeWork.ts}` and the works/zone parts except the three draft files, `packages/ui/src/components/session/sidebar/{projects,list,shell}/**` (sessionCollection, useSessionGrouping, activitySections, useProjectsInSidebarOrder(.test), useSwitcherItems), `packages/ui/src/components/session/{SidebarFooter.tsx,SidebarHeader.tsx,sessionSidebarHeaderPresentation.tsx,SessionFolderItem.tsx,SessionDialogs.tsx,sessionWorktreeMenu.ts,NewWorktreeDialog*}` and `packages/ui/src/stores/useSessionDisplayStore.ts`. The six orphaned modules this task owns: `useSessionRefLines.ts`, `useRunWork.ts`, `sidebarWorks.ts` (+test), `useWorktreeWork.ts`, `sessionWorkFailure.ts`, `sessionSidebarActivityLabels.ts`. `views/files/FileTreeRowParts.tsx`/`fileTreeRow.ts` stay with task 07; `sync/session-pins.ts` and `stores/useSessionPinnedStore.ts` stay with task 25 (technical-debt entry `Session pins have no OMP source`) and are not faked here.

**Read first:** Spec W6; `.agents/skills/sync-state-invariants/SKILL.md`; `.agents/skills/performance-engineering/SKILL.md`; `.agents/skills/locale-ui-patterns/SKILL.md`; `packages/ui/src/sync/DOCUMENTATION.md`; `packages/ui/src/stores/DOCUMENTATION.md`; `.workflow/done/upstream-refresh/08-sessions-sidebar.md` "Deferred rows and their owner task"; `.workflow/done/upstream-refresh/24-ui-integration-hooks-apps.md` "Kept at the fork's version".
**Covers:** W6

**Check:** `bun install --frozen-lockfile` and `bun run type-check` and `bun run lint` and `bun run test` all exit 0, the sidebar/row tests pass, and in the running app the one-view sidebar shows sessions, runs, works and worktrees in one tree with reference links and activity labels; selecting a row opens the right chat and the tree survives reload and a worktree switch. Real path: `bun run dev`, a session list with at least one run and one worktree, and a long list measured for scroll cost.

## Done when

- [ ] One row model drives the sidebar; no second list/works model or duplicated row state remains.
- [ ] `useSessionRefLines`, `useRunWork`, `sidebarWorks`, `useWorktreeWork`, `sessionWorkFailure` and `sessionSidebarActivityLabels` are adopted and consumed (no orphaned module).
- [ ] `useSessionDisplayStore` carries the one-view display state; task 25's `sessionListOrder`/`sidebarSessionRows` and pins contract are consumed, not replaced.
- [ ] `FileTreeRowParts`/`fileTreeRow` come from task 07; this task does not edit them.
- [ ] Reference links, activity labels, worktree rows and dialogs render on canonical session data; no OpenCode-shaped field is faked.
- [ ] Virtualization keeps a large list usable; the measurement is recorded.
- [ ] The mobile sheet is not changed here; task 32 consumes this model.
- [ ] works/workActions.ts consumes overview/overviewActions.ts readWorktreeUse/WorktreeUse (adopted by task 21)

## Progress

Planned by the 2026-10-27 amendment from task 24's deferral and task 08's "Deferred rows" table. The 08 task proposed 09 as the owner before it was archived; this task is the successor because 09 was already closed.
