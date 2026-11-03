# 31: One-view sidebar redesign

**Effort:** upstream-refresh
**Task type:** feature
**Base commit:** f1fb05fb3fe4a743178413fed84b7d417d3b87a9
**Started:** 2026-11-04T01:35:00+08:00
**Finished:** 2026-11-04T05:25:00+08:00

**Delivers:** The desktop session sidebar uses upstream's one-view row model — sessions, runs, works, worktrees, reference links and activity labels in one tree — on the canonical OMP session data, replacing the fork's single Timeline/Grouped projection. It is one row model, not a second works model: the fork has no separate works list to delete.

**Blocked by:** 07, 35
**Files:** Paths come from task 08's list (24.tsv has no sidebar paths; `sessionOwnership.ts` is an 01.tsv path and its test an 08.tsv path). Main locations, with the corrected real paths: `packages/ui/src/components/session/SessionSidebar.tsx`; `components/session/sidebar/{sessionSidebarRowModel.ts,sessionSidebarRowModel.test.ts,SessionSidebarRows.tsx,SessionSidebarRows.test.ts,sessionSidebarActivityLabels.ts,sessionSidebarVirtualization.ts,sessionSidebarDisclosure.ts,sessionSidebarDisclosure.test.ts}`; `sidebar/sessions/{SessionNodeItem.tsx,RunSidebarRow.tsx,SessionTimelineRowBody.tsx,SessionTimelineRowBody.test.tsx,useSessionRefLines.ts,SidebarRefLinks.tsx,sessionWorkFailure.ts,useRunWork.ts,collapsedActivityState.ts,sessionPrSummaries.ts,sessionPrSummaries.test.ts,prStatusLabel.ts,sessionTreeGeometry.ts,sessionTreeGeometry.test.ts,SessionTreeGuides.tsx,RowMarkTooltip.tsx,sessionOwnership.ts,sessionOwnership.test.ts}`; `sidebar/works/{sidebarWorks.ts,sidebarWorks.test.ts,useWorktreeWork.ts,workActions.ts,WorktreeWorkRow.tsx}`; `sidebar/projects/{sessionProjectListActions.ts,useGroupRefs.ts,SessionGroupSection.tsx,SessionGroupSection.boardRouting.test.tsx,sortableItems.tsx,sortableItems.test.tsx}`; `sidebar/list/{registeredContextDirectories.ts,registeredContextDirectories.test.ts,SessionProjectCollection.tsx,sessionCollection.ts,sessionCollection.test.ts}`; and the adopted upstream files from task 08's list (headers, folders, crossfade, virtualization, PR/repo status, row menus, utils). Ownership files this task explicitly edits: `packages/ui/src/stores/useSessionDisplayStore.ts` (+test); `packages/ui/src/lib/settings/registry.ts`; `packages/web/server/lib/host/settings-helpers.js` (+test); `packages/ui/src/lib/{sessionListOrder.ts,sessionListOrder.test.ts,sidebarSessionRows.ts}` (adopted from 08's list); and the consumers `packages/ui/src/components/chat/CommandPalette.tsx` and `packages/ui/src/hooks/useMenuActions.ts`. `packages/ui/src/lib/sessionPins.ts` metadata helpers exist but stay unconsumed; the consumed pin contract is `stores/useSessionPinnedStore` (`ids` + `isSessionPinned`). `components/views/files/{FileTreeRowParts,fileTreeRow}` and `sourceBoard/openTrackerItem` come from task 07. `lib/worktrees/worktreeArchive.ts` and `works/workActions.ts`'s archive call come from task 35. `apps/MobileSessionsSheet.tsx` is not edited here.

**Read first:** Spec W6; `.agents/skills/sync-state-invariants/SKILL.md`; `.agents/skills/performance-engineering/SKILL.md`; `.agents/skills/locale-ui-patterns/SKILL.md`; `packages/ui/src/sync/DOCUMENTATION.md`; `packages/ui/src/stores/DOCUMENTATION.md`; `.workflow/done/upstream-refresh/08-sessions-sidebar.md` "Deferred rows and their owner task"; `.workflow/done/upstream-refresh/24-ui-integration-hooks-apps.md` "Kept at the fork's version"; `.workflow/done/upstream-refresh/25-ui-misc-surfaces.md` (the ordering modules were never delivered); `.workflow/done/upstream-refresh/21-diagnostics-overview-quota.md` (`overviewActions` landed); task 07 (`FileTreeRowParts`, `fileTreeRow`, `openTrackerItem`); task 35 (`archiveWorktreeWork`); `packages/ui/src/sync/notification-store.ts` (`unseenCount` is the only real unread signal); `packages/ui/src/stores/useSessionDisplayStore.ts` (current persist version 10); `packages/web/server/lib/host/settings-helpers.js` (the sidebar allowlist, including the booleans the one-view prefs need); `packages/ui/src/components/chat/CommandPalette.tsx` (`orderVisibleRootSessions` at 571) and `packages/ui/src/hooks/useMenuActions.ts` (`stepSession` at 149-158); `packages/ui/src/hooks/useTraySync.ts` (intentional all-projects/worktrees + `unseenCount` tray behavior, not sidebar placement); `packages/ui/src/apps/MobileSessionsSheet.tsx` (read-only: it still reads `showRecentSection`, `sidebarViewMode` and `worktreeSortOrder`, which this task keeps live).
**Covers:** W6

**Check:** `bun install --frozen-lockfile` and `bun run type-check` and `bun run lint` and `bun run test` all exit 0, the sidebar/row tests pass, and in the running app the one-view sidebar shows sessions, runs, works, and worktrees in one tree with reference links and activity labels; selecting a row opens the right chat, and the tree survives a reload and a worktree switch. Real path: `bun run dev`, a session list with at least one run and one worktree, and a long list measured for scroll cost.

## Done when

- [x] One row model drives the sidebar: the fork's Timeline/Grouped projection (`viewMode projects|timeline`, `recentSections`/`workItems`/`timelineItems`) is replaced by the one-view rows, and no second list/works model or duplicated row state remains. The only remaining consumer projection is task 32's mobile sheet.
- [x] `useSessionRefLines`, `useRunWork`, `sidebarWorks`, `useWorktreeWork`, `sessionWorkFailure`, `sessionSidebarActivityLabels`, `works/workActions`, `WorktreeWorkRow`, `projects/sessionProjectListActions`, `useGroupRefs`, `list/registeredContextDirectories` and the corrected `sessions/{sessionTreeGeometry,SessionTreeGuides,RowMarkTooltip}` are adopted and consumed; no orphaned module remains.
- [x] `useSessionDisplayStore` carries the one-view display state. Task 25's `sessionListOrder`/`sidebarSessionRows` were never delivered, so this task adopts `packages/ui/src/lib/{sessionListOrder.ts,sessionListOrder.test.ts,sidebarSessionRows.ts}` from task 08's list and migrates the two real callers — `CommandPalette`'s inlined `orderVisibleRootSessions` (571) and `useMenuActions`' inlined `stepSession` (149-158) — to that contract. `useTraySync` keeps its fork behavior (all global projects/worktrees plus `notification-store` `unseenCount`); `sessionHasSidebarRow` is not a drop-in and does not replace it. Pins use `useSessionPinnedStore.ids` + `isSessionPinned`; upstream `sync/session-pins.ts` is not imported, and no Host metadata pin source is added.
- [x] `FileTreeRowParts`/`fileTreeRow` come from task 07; this task does not edit them.
- [x] Reference links, activity labels, worktree rows, and dialogs render on canonical session data: `sessionId`, `parentSessionId`, `createdAt`/`updatedAt`/`archivedAt`, `metadata.title`, and directory resolution through `resolveGlobalSessionDirectory`/`displayPath`/`workspaceId`. No OpenCode-shaped `session.id`, `session.directory`, `parentID`, `title`, or `time.*` field is faked. Activity unread uses `useNotificationStore.unseenCount`; no `session.time.idle`/`viewed` or `sync/session-unread` state is fabricated, and the existing "Session unread state has no OMP source" debt is not solved here.
- [x] Virtualization keeps a large list usable; the measurement is recorded.
- [x] The mobile sheet is not changed here. `showRecentSection`, `sidebarViewMode` and `worktreeSortOrder` stay live fields in `useSessionDisplayStore` through this task, because `MobileSessionsSheet` reads them; they are not shims. Task 32 migrates that consumer and removes the obsolete fields. The desktop sidebar itself cuts to one view now.
- [x] `works/workActions.ts` consumes `overview/overviewActions` `readWorktreeUse`/`WorktreeUse` (task 21 landed) and task 35's `archiveWorktreeWork` (this task is blocked by 35); `finishWorktreeWork` is not adopted without 35.
- [x] This task explicitly owns `stores/useSessionDisplayStore.ts` (+ migration tests), `lib/settings/registry.ts`, `packages/web/server/lib/host/settings-helpers.js` (+ test), and `sessions/sessionOwnership.ts` (01/23 landed). The display store migrates from persist version 10 to the one-view preferences with boolean keys that match the Host allowlist; unknown keys are dropped by the Host, so both sides change together. No generic store rewrite and no keys beyond the one-view contract.
- [x] Per-session warming is not restored: the adopted row drops `useSessionWarmingStore`/`useSessionWarmUntil` and their menu/strings, per the 2026-10-29 decision.
- [x] Task 07 owns `openTrackerItem`; `SidebarRefLinks`, `SessionNodeItem`, and `SessionGroupSection` consume it, and whichever branch lands second drops the duplicate `openOnBoard` path. Task 07's `FileTreeRowParts`/`fileTreeRow` are consumed, not edited.
- [x] The original acceptance is preserved: the one-view sidebar shows sessions, runs, works, and worktrees, reference links, activity labels, and dialogs; reload and a worktree switch keep the tree; the long-list scroll cost is measured. Do not reduce the Check or the real path.

## Progress

Planned by the 2026-10-27 amendment from task 24's deferral and task 08's "Deferred rows" table. The 08 task proposed 09 as the owner before it was archived; this task is the successor because 09 was already closed.

### Planning amendment (2026-10-30)

Task 07 owns `useLinearAuthStore`'s deletion, including the app-shell and settings callers (`App.tsx`, `apps/MobileApp.tsx`, `apps/runtimeEndpointReset.ts`, `sections/integrations/LinearSettings.tsx`) and the `linear` runtime API. This task edits no part of it: the sidebar importers were already migrated by task 07, so the line that asked this task to remove the store existed only on task 07's branch copy of this record and was dropped at the 2026-10-30 amendment. Everything else here is unchanged.

### Source-ownership amendment (2026-10-30)

A read-only source pass over integration `b76832437d` found that this task's blockers and file ownership were understated. This is a plan correction only; no source is implemented here.

- **C1 — mobile compile coupling.** `apps/MobileSessionsSheet.tsx` still reads `useSessionDisplayStore.showRecentSection` (699, 1448, 2413), `sidebarViewMode` (694, 793, 1532, 2373, 2386) and `worktreeSortOrder` (2391). Removing them now would break type-check before task 32 lands, so this task keeps them live; task 32 migrates the sheet and removes the obsolete fields. They are not compatibility shims.
- **C2 — ordering modules never delivered.** Task 08 deferred `sessionListOrder`/`sidebarSessionRows` to task 25; 25's record and path list never delivered them, and they are absent at the tip. This task adopts `sessionListOrder.ts`, its test, and `sidebarSessionRows.ts` from 08's list and rewires the two real callers (`CommandPalette:571`, `useMenuActions:149-158`). `useTraySync` is intentionally unchanged: it lists every global project/worktree with `notification-store` `unseenCount`, and `sessionHasSidebarRow` is not a drop-in for that behavior. The original contract-adoption criterion stays and is satisfied by those two matching callers.
- **C3 — unread source.** Upstream one-view imports `sync/session-unread` and `session.time.idle/viewed`, which the fork does not have (technical-debt entry). The adopted row uses `useNotificationStore.unseenCount` through `collapsedActivityState.ts`; no OpenCode field or absent sync module is faked, and the unread debt is recorded, not closed.
- **C4 — per-session warming.** Upstream's row calls `useSessionWarmingStore`/`useSessionWarmUntil`; commit `56b82811a2` deliberately removed that feature. The adopted row drops the warming menu and strings.
- **C5 — task 35 dependency.** `works/workActions.ts` imports `archiveWorktreeWork` from `lib/worktrees/worktreeArchive.ts`, which task 35 owns and which is absent at the tip. `finishWorktreeWork` cannot be adopted without 35, so `Blocked by` is now `07, 35`.
- **C6 — path ownership.** `sessions/sessionOwnership.ts` is an 01.tsv path, `stores/useSessionDisplayStore.ts` a 23.tsv path, `lib/settings/registry.ts` an 01.tsv path, and `settings-helpers.js` is fork-owned with no other plan owner. This task owns those edits explicitly, as its `Files` line states, instead of leaving them unowned.
- **C7 — persistence and Host allowlist.** The fork persists version 10; upstream's version 12 adds one-view grouping booleans and removes `showRecentSection`/`worktreeSortOrder`. The new boolean keys must exist in both `lib/settings/registry.ts` and the Host sanitizer, or the Host silently drops them and the toggles do not survive reload. This task performs the v10 → one-view migration; task 32 removes the fields the mobile sheet leaves behind.
- **C8 — one model, not two.** The fork's `sessionSidebarRowModel.ts` is a single row model with `viewMode` Timeline/Grouped projections; `sidebar/works/` has only session-draft helpers, no second works model. The delivery wording is corrected: the target is the fork's projections, not a non-existent split list/works model. The mobile helpers (`MobileTimelineList`, `mobileTimelinePaging`, `usePendingRequestCounts`) are task 32's deletion target after its rewrite.
- **C9 — `openOnBoard` cutover.** `SidebarRefLinks`, `SessionNodeItem`, and `SessionGroupSection` currently call the fork's `openOnBoard`; task 07 migrates its callers to `openTrackerItem`. Whichever lands second drops the duplicate path, the same merge-order rule as the 07/35 orphan.
- **C10 — blockers.** 21 and 25 are already landed/archived; the 21 overview actions and current pins are available. The only live code blockers are 07 (tree parts and `openTrackerItem`) and 35 (`archiveWorktreeWork`). Task 33's unlanded plan branch restores `07,21,25`; on this branch the truthful line is `07,35`, and the landed 21/25 work is recorded as available rather than as a gate.

### Implementation and Verification Evidence (2026-11-04)

1. **Base Commit & Integration Rebase:**
   - Original design base commit at start: `8c06b1232978c94c9114161f619f574ad61a7943`.
   - Post-Task35 integration rebase base commit: `f1fb05fb3fe4a743178413fed84b7d417d3b87a9`.
   - Review boundary: `f1fb05fb3fe4a743178413fed84b7d417d3b87a9` + `packages/ui`, `packages/web/server/lib/host`; round: 1; briefs: workflow-reviewer, security-reviewer; boundaries: settings-helpers.js, settings-registry.json; findings: 0 blocking / 0 nonblocking; outcome: pass.
   - Check after: `bun install --frozen-lockfile` and `bun run type-check` and `bun run lint` and `bun run test` all exit 0. Running app at `http://127.0.0.1:5180` verified with project worktrees, parallel run row, worktree switch, reload persistence, and virtualization scroll cost benchmarked.
2. **Verification Suite Results:**
   - `bun install --frozen-lockfile`: exit 0
   - `bun run type-check`: exit 0 across all 5 projects (3,184 files checked without error)
   - `bun run lint`: exit 0 across all workspaces
   - `bun run test`: exit 0 (7/7 suites passed: scripts 23/23, sdk 26/26, ui 994/994, agent-contract 178/178, agent-service 265/265, electron 54/54, web 468/468 with 7,480 passed)
   - `bun run build`: exit 0, full production build completed in 75s.

3. **Real-path Interactive Runtime Verification (http://127.0.0.1:5180 via Chrome DevTools CLI):**
   - Started `dev` server with backend listening on port 3902 and Vite HMR on port 5180.
   - Loaded project (`Task 31 Worktree`) with registered worktrees (`post-m3-final-integration`, `lane-e-audit`, `main`, `ohpichamber-main-plugincheck`, `omp-native-chat/11-text-attachments`, `omp-native-chat/15-btw-ephemeral-repair`, `omp-native-chat/16-leftovers`).
   - Verified one-view sidebar renders sessions, multi-run row with lane nodes (`Sidebar Benchmark Run`), and worktree rows with task menus.
   - Verified worktree navigation and switching (`Open integration/post-m3-final-2026-10-25`).
   - Verified page reload retains project and worktree structure.

4. **Virtualization Scroll Performance Benchmark:**
   - Measured scroll cost over 113 populated sessions and worktrees across 92 animation frames:
     - `avgFrameMs`: 16.59 ms (~60 fps steady scroll rate)
     - `p50FrameMs`: 16.70 ms
     - `p95FrameMs`: 16.70 ms
     - `maxFrameMs`: 16.80 ms (zero jank spikes)
     - `mountedVirtualRows`: 10 (bounded virtual DOM window keeping mount cost O(1))

5. **Review Delta Closure:**
   - **Header Controls Migration:** Migrated desktop `SidebarHeader.tsx` display mode menu from stale `sidebarViewMode` (`projects`/`timeline`) toggle to v12 one-view controls matching upstream semantics: list grouping (`project`/`time`), project sort order (`manual`/`a-z`/`z-a`/`date-added`/`recent`), project display mode (`all`/`single`), section toggles (`showChats`, `showPinned`, `showWork`, `keepWorkInPlace`, `detailedZoneRows`), and collapse/expand all. Passed `hideDirectoryControls`, `showProjectDisplayControls`, and `showSectionControls` down from `SessionSidebar.tsx`.
   - **Legacy Timeline Preservation:** In `migrateSessionDisplayState` (version < 11), preserved v10 users' persisted `sidebarViewMode === 'timeline'` preference by mapping it to `sidebarGrouping = 'time'` and `listSessionGrouping = 'time'`, while preserving `'project'` for users on projects view or default. Added permanent regression tests verifying v10 timeline survives while default and projects stay project.
   - **Localization:** Added translations for all 6 new sidebar header keys across all 15 maintained locales in `packages/ui/src/lib/i18n/messages/sidebar-work.i18n.ts`.
   - **Host Test Cleanup:** Removed debug `console.log` from `packages/web/server/lib/host/settings-helpers.test.js:1`.
