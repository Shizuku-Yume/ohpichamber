# 08: Sessions and sidebar

**Effort:** upstream-refresh
**Task type:** feature
**Base commit:** 2e1239cd4b

**Delivers:** Upstream's session list, unread/work markers, folders, archive and chat view shell work with OMP sessions, including the server-side session folder and draft support.

**Blocked by:** 10, 23
**Files:** Path list: `/home/shizuku/Project/ohpichamber-omp-artifacts/upstream-sync-2026-10-27/plan-paths/08.tsv` (169 paths: 108 clean/new, 60 both-side, 38 conflicts). Main locations: `packages/ui/src/components/session/`, `packages/ui/src/lib/{sessionFolders,sessionListOrder,sidebarSessionRows}`, `packages/ui/src/components/views/{ChatView,ArchiveView,PlanView}`, `packages/web/server/lib/{session-folders,session-drafts}`. Deferred from task 23: rework `stores/{useSessionFoldersStore,useSessionDisplayStore}.ts` (+tests) and `stores/useProjectsStore.ts` from upstream on the new folder/display/project shapes. `stores/useSessionPinnedStore.ts` stays at the fork's version: its Host-owned pin source is the technical-debt entry `Session pins have no OMP source`. Consume the task 23 interfaces `stores/sessionLineage.ts`, `sync/user-message-resume.ts` and `stores/useSessionDraftsStore.ts`. `views/PlanView.tsx` drops its `useFeatureFlagsStore` import so task 24 can delete the store.

**Read first:** Spec W6; `.agents/skills/sync-state-invariants/SKILL.md`; `.agents/skills/performance-engineering/SKILL.md`; `.agents/skills/locale-ui-patterns/SKILL.md`; `packages/ui/src/sync/DOCUMENTATION.md`; `packages/ui/src/stores/DOCUMENTATION.md`.
**Covers:** W6

**Check:** `bun install --frozen-lockfile` and `bun run type-check` and `bun run lint` and `bun run test` all exit 0, and in the running app a session list with unread and work markers renders, a chat opens from it, the archive shows an archived session, and a folder move survives a reload. Real path: send one prompt and watch the session move into work.

## Done when

- [ ] Session rows, grouping, sorting and unread state read from the fork's stores; no second source of truth is added.
- [ ] Archive and plan views match upstream behavior; Task38's spaces removal is not undone.
- [ ] Reload and reconnect preserve selection, folders and draft text.
- [ ] Session list performance is checked with a large fixture list; the measurement is recorded.
- [ ] `sessionLineage`, `user-message-resume` and `useSessionDraftsStore` are consumed by the session list/actions; no delivered interface is left unreferenced.
- [ ] The three deferred stores are reworked from upstream; `useSessionPinnedStore` stays deferred to the pin-source debt entry; no OpenCode-shaped field is faked.
- [ ] `PlanView` no longer imports `useFeatureFlagsStore`; session pins remain deferred to the technical-debt entry `Session pins have no OMP source`.

## Progress

### State at this stop (WIP, not landed)

Branch `upstream-refresh/08-sessions-sidebar`, worktree `upstream-refresh-08`, base
`2e1239cd4b`, commits `b8a25680a2` and `e605a24170`. `bun install --frozen-lockfile` exit 0
(1406 packages); `bun run type-check` exit 0; oxlint on every changed file exit 0; focused
suites green (folders route 15, drafts route 8, folders store 17, row model 38, archive/subtree
17, i18n 69 across 21 files). Full `bun run lint`, full test suite, dead-code, the real path and
the large-fixture performance measurement have NOT run yet; landing has NOT happened. The
remaining list is at the end.

### Adopted (upstream `0056bf6a9` content, adapted to the canonical OMP model)

- Folder change protocol end to end. `ui/src/lib/sessionFolders/{folderChanges,folderScopes}.ts`
  (new): one user action applied locally and sent as intent, with zod schemas shared by the
  client and the Host. `stores/useSessionFoldersStore.ts` (+test, 17 pass) reworked from
  upstream: server copy is the authority, a device's own folders are imported once, unsent
  changes survive reload, answers older than the shown revision are dropped, archive folders get
  the fixed id `archived:<scope>:<name>`. Removed the fork's VS Code branch (no such surface);
  every shipped surface has a Host. `useProjectsStore` forgets a closed project's folder scopes
  (root, archive, worktree) through `forgetScopes`.
- Host folder storage: `web/server/lib/session-folders/folder-changes.js` (new, upstream's
  semantics verbatim) and `routes.js` gained `PATCH /api/session-folders` applying changes to the
  Host metadata store in one transaction, answering with the stored snapshot and revision. The
  whole-copy `POST` stays as upstream keeps it, for a client from before shared folders. Get/save
  now share one `writeSnapshot`; `routes.test.js` extended (6 new change-protocol tests, 15 pass)
  and `DOCUMENTATION.md` written for the SQLite owner.
- Host session drafts: `web/server/lib/session-drafts/{routes.js,routes.test.js,DOCUMENTATION.md}`
  (new) adopted whole (8 tests pass) and registered in
  `lib/host/feature-routes-runtime.js` beside the folder routes. The cross-client control event
  is not emitted: its event type belongs to task 25's `lib/openchamberEvents.ts`.
- Sidebar consumption of `useSessionDraftsStore`: `SessionProjectCollection` reads the Host's
  drafts (loading once per mount), places each under the group whose directory holds it (else the
  project root), and the row model emits a new `draft` row before the group's sessions (search
  lists sessions only; a group with only a draft is not empty). `works/SessionDraftRow.tsx`,
  `works/useSessionDraftRow.ts`, `works/openSessionDraft.ts` adapted to the fork's composer draft
  identity (`sessionId: null` + `pendingComposerRestore`), because `workDraftId` needs task 15's
  publishing. Three row-model tests added.
- `sessionLineage` consumed: `sidebar/sessions/sessionSubtreeActions.ts` resolves archive/delete
  descendants through `readGlobalSessionLineage` (`activeThroughArchived` / `all`), matching the
  upstream policy table. `projects/archiveAllSessions.ts` (+test) adopted: Archive all now takes
  subagents with their parent and counts the outcome in top-level rows; the scroller calls it.
- `views/PlanView.tsx` drops `useFeatureFlagsStore` and the plan-mode gate; a plan view needs a
  file or a saved plan, nothing else. No other file in the task imports the store.
- Locale: the six draft strings (`attachmentsSingle/Plural`, `attachmentsMissing`, `discard`,
  `discardFailed`, `openAria`) added with real translations in all 13 dictionaries (en, de, es,
  fr, ja, ko, nl, pl, pt-BR, tr, uk, zh-CN, zh-TW; zh from upstream's meanings, pt-BR from
  upstream's `sidebar-work.i18n.ts`).
- `SessionSwitcherDropdown`: upstream's waiting-blink run mark, logical padding/start alignment.
  Kept the fork's notification-based unseen count as the unread source (no `session-unread`, no
  OMP viewed watermark yet).

### Deferred rows and their owner task (all remain at the fork's version)

Every deferred row names one open task in `.workflow/tasks/upstream-refresh/`. Proposed plan
amendment (for the plan owner, not applied here): **09-layout-works-worktrees owns the one-view
sidebar redesign** and its `Blocked by` grows to `07, 21, 25` so it lands last among the redesign's
prerequisites. The parts 07/21/24/25 must leave alone are listed at the end of this section.

| Deferred row | Owner | Why now |
|---|---|---|
| One-view sidebar redesign: `sessionSidebarRowModel(.test).ts`, `SessionNodeItem.tsx`, `RunSidebarRow.tsx`, `SessionTimelineRowBody.tsx`, `SessionSidebarRows.tsx`, `sessionSidebarVirtualization.ts`, `sessionSidebarDisclosure*`, `sessionTreeGeometry.ts`, `SessionTreeGuides.tsx`, `RowMarkTooltip.tsx`, `useSessionRefLines.ts`, `SidebarRefLinks.tsx`, `sessionWorkFailure.ts`, `useRunWork.ts`, `collapsedActivityState.ts`, `SessionProjectScroller/Collection` works/zone parts, `sessionCollection.ts`, `useSessionGrouping.ts`, `activitySections(.test).ts`, `sidebar/works/*` except the three draft files, `SidebarFooter.tsx`, `SidebarHeader.tsx`, `sessionSidebarHeaderPresentation.tsx`, `shell/useSwitcherItems.ts`, `SessionFolderItem.tsx`, `SessionDialogs.tsx`, `sessionWorktreeMenu.ts`, `NewWorktreeDialog*`, `prStatusLabel.ts`, `sessionPrSummaries.ts`, `useProjectsInSidebarOrder.ts` | 09 | One row-model/zone contract; a part alone does not compile or creates a second model. The display-store rework moves with it (apps/mobile task 25, layout task 09). |
| `scheduledTasksRequests.ts`, `ScheduledTasksDialog`, `ScheduledTaskEditorDialog` | 17 | Upstream's rework calls the scheduled-task server module 17 owns and the project order 24 owns. |
| `lib/sessionListOrder(.test).ts`, `lib/sidebarSessionRows.ts` | 25 | Consumers are the command palette and desktop tray; `sessionListOrder`'s pinned contract is the fork's directory-keyed store, not upstream's metadata pins. |
| `session-unread` swap in `collapsedActivityState.ts`/`SessionSwitcherDropdown.tsx`; `session-turn-duration`/`SessionActivityDuration.tsx`; `session-pins`/`useSessionPinnedStore` rework | 25 | No OMP Host viewed watermark or pin source yet (`technical-debt.md: Session pins have no OMP source`); task 23 deferred them here. |
| Project knowledge UI: `components/session/project-context/*` and `project-context/DOCUMENTATION.md` | 16 | Tied to 16's project-context API/route rewrite; also needs 15's emoji picker and 09's context-panel header slot. |
| `views/PlanView.tsx` full rewrite (saved plans only, markdown local assets, line-drag, header slot) | 16 | Depends on 16's plan store; only the feature-flag removal and gate were adopted here. |
| `views/archive/ArchivedWorktreeRow.tsx`, `useWorktreeArchiveActions.ts` | 09 | Need 09's `lib/worktrees/worktreeArchive`; the page's parent grouping/restore rule already landed with task 01. |
| `useProjectsInSidebarOrder.ts` (+test) | 24 | Needs a canonical-project replacement for `@/lib/opencode/model` + `sync/global-sync-store`; its consumers are Settings and apps. |
| `components/session/spaces/*` | 30 | No live consumer after Task38; `NewSpaceDialog` needs `@/lib/opencode/client` (excluded engine). 30 verifies the exclusion in W11; no feature task adopts it. |

Parts the other tasks leave alone: 07 (`FileTreeRowParts`/`fileTreeRow`, `openTrackerItem`) and
21 (`overviewActions`) provide helpers and do not edit `components/session/**`; 24/25 do not edit
`components/session/**`, `components/views/PlanView.tsx`, `stores/useSessionDisplayStore.ts` or
`stores/useSessionPinnedStore.ts`; their own paths stay theirs. 09 owns the files above once its
Blocked-by names 07/21/25.

### Interfaces and dead code

`sessionLineage` and `useSessionDraftsStore` are now referenced by the sidebar. `user-message-resume`
is NOT consumed: its only upstream caller is `components/chat/ChatInput.tsx` (task 15); no file in
this task's list sends a message, so a call here would be invented. Expected dead-code findings
until then: `prepareUserMessageResume`. Task 23's other delivered interfaces are consumed or
covered.

### Checks run

| Check | Exit | Evidence |
|---|---:|---|
| `bun install --frozen-lockfile` | 0 | 1406 packages |
| `bun run type-check` | 0 | final tree |
| `bun test` focused, isolated: folders route, drafts route, row model, archive/subtree, i18n | 0 | `logs/focused-tests-2.log`, 101 pass / 24 files |
| `bun test` focused, one process incl. folders store | 1 | `logs/focused-tests-1.log`: bun `mock.module('@/lib/runtime-switch')` in `useSessionFoldersStore.test.ts` pollutes later files of the same process; 68 pass, 2 module-load errors. The repo runner isolates suites; the store test alone is 17/17. |
| `bunx oxlint` changed files | 0 | exit 0 |
| `bun run lint` (full) | NOT RUN | |
| `VITEST_MAX_WORKERS=2 bun run test` | NOT RUN | |
| `bun run dead-code` | NOT RUN | expect `prepareUserMessageResume` |
| Real path (dev, sessions/folders/archive/drafts, reload) | NOT RUN | ports API 6102 / UI 6180 |
| Large-fixture performance measurement | NOT RUN | |

### Remaining work (exact)

1. `bun run lint`; `VITEST_MAX_WORKERS=2 bun run test` (record; rerun the known web
   network-defaults test with HOME/XDG_CONFIG_HOME at a fresh temp dir and record both);
   `bun run dead-code` and inspect (expect the interface finding above); logs under
   `/home/shizuku/Project/ohpichamber-omp-artifacts/upstream-refresh-08-2026-10-27/logs/`.
2. Performance: build the row model for a 5,000-session fixture and record build ms and row count
   (script under the evidence dir, not the repo); note the virtualizer bounds in the running app.
3. Real path: `bun run dev` with isolated `OPENCHAMBER_DATA_DIR` under /tmp, API 6102 / UI 6180;
   `GET /api/agent/v1/ready` 200; create two sessions in a fixture project, create a folder, drag/
   move one in, reload and confirm it stayed; archive a session and find it on the Archive page;
   restore it; `PUT /api/session-drafts/demo` then reload and confirm the pen row opens and its
   discard removes it (no composer publishing yet — named stand-in); send one prompt and watch
   the session move into work; screenshots + console log.
4. Finish or explicitly hand off the display-store rework: it needs the one-view components above.
   If the plan owner wants it now, it must be split with 07/09/24/25, not faked here.
5. Rebase onto the current integration tip, rerun install/type-check/lint/test, `git merge
   --ff-only` in `/home/shizuku/Project/ohpichamber-worktrees/upstream-refresh-integration`,
   recheck and rebase if it moved, move this file to `.workflow/done/upstream-refresh/`, run
   `.workflow/bin/workflow validate`, remove the worktree and branch.

### Limits

- The one-view sidebar redesign, the display-store rework, project knowledge, spaces and worktree
  archive rows are not in this WIP; they are blocked by the named owners above. `usePinnedStore`
  stays deferred. `session-unread` is not faked; the sidebar keeps the notification-based unseen
  marker, which is the fork's source.
- Draft rows render and open Host drafts, but nothing publishes a draft to the Host until task
  15 lands `useSessionDraftPublishing`; a draft created through the route (real-path stand-in) is
  the only way to see the row today.
