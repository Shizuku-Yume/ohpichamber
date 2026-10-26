# 08: Sessions and sidebar

**Effort:** upstream-refresh
**Task type:** feature
**Base commit:** 2e1239cd4b (upstream-refresh/integration tip at setup)

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

### Not adopted, with the owner that blocks it (all remain at the fork's version)

The upstream sidebar's "one view" redesign (Pinned / In work / list-by-time zones, worktree works
rows, detailed rows, draft rows in zones, tree guides, disclosure animation) is one contract
across tasks 07, 09, 21, 24 and 25. Adopting a part alone would either fail to compile or create a
second row model. Files kept at the fork's version for that reason: `sessionSidebarRowModel.ts`
and its test (also needs `lib/sessionPins`), `SessionNodeItem.tsx` (pins, unread, turn duration,
`openTrackerItem`, `FileTreeRowParts`), `RunSidebarRow.tsx`, `SessionTimelineRowBody.tsx`,
`SessionSidebarRows.tsx` (disclosure), `sessionSidebarVirtualization.ts`, `sessionSidebarDisclosure*`,
`sessionTreeGeometry.ts`, `SessionTreeGuides.tsx`, `RowMarkTooltip.tsx`, `useSessionRefLines.ts`,
`SidebarRefLinks.tsx`, `sessionWorkFailure.ts`, `useRunWork.ts`, `collapsedActivityState.ts`,
`SessionProjectScroller.tsx` (works/zone parts; its archive-all fix WAS adopted),
`SessionProjectCollection.tsx` (works/zone parts; drafts WERE adopted), `sessionCollection.ts`
(`lib/sessionWorkLineage`, task 25), `useSessionGrouping.ts` (worktree works), `activitySections.ts`
and its test (zones removed Recent upstream; the fork still ships Recent), `sidebar/works/*`
except the three draft files (worktree work rows need 07/09/21/25), `SidebarFooter.tsx`
(`DesktopInstanceMenu`, task 25), `SidebarHeader.tsx` (one-view display menu), `sessionSidebarHeaderPresentation.tsx`
(zone header contract), `shell/useSwitcherItems.ts` (worktree prefix matching rides the works
change; the helper exists upstream and in the fork's `worktreeIndex`), `SessionFolderItem.tsx`
(`FileTreeRowParts` chevron; the upstream canExpand/indent behavior waits for task 07),
`SessionDialogs.tsx` (`worktreePaths`, task 09; upstream also changes task 09's
`worktreeRemovalFlow` API), `sessionWorktreeMenu.ts` (`worktreePaths`), `SessionActivityDuration.tsx`
and `sync/session-turn-duration` (task 25), `NewWorktreeDialog*` (source-control provider and
tracker registries, tasks 06/07), `SessionSwitcherDropdown`'s `session-unread` swap (deferred by
task 23; no OMP viewed watermark), `collapsedActivityState`'s `session-unread`.
- `useProjectsInSidebarOrder.ts` (+test): needs `@/lib/opencode/model` and
  `sync/global-sync-store`, neither of which the fork has (canonical projects only); its
  consumers (Settings pickers, board, usage) are task 24/25. Move-chat and scheduled-tasks use
  the fork's order.
- `lib/sessionListOrder.ts` (+test) and `lib/sidebarSessionRows.ts`: consumers are the command
  palette and desktop tray (task 25); `sessionListOrder`'s pinned contract is the directory-keyed
  fork store, not upstream's metadata pins, so adopting it now would mix pin sources.
- `components/session/project-context/*` (KnowledgeComposer/EntryView/Split/Actions/SearchBar,
  NoteEditor, memoryTidy, knowledgeFormat, pendingKnowledgeDeletes, and the reworked
  Memory/Notes/Plans/Todos/ProjectNotesTodoPanel): tied to task 16's project-context API/route
  rewrite and task 15's emoji picker + task 09's context-panel header slot; the fork's panel
  keeps working. `project-context/DOCUMENTATION.md` likewise describes the deferred panel.
- `components/session/spaces/*`: the fork ships these components with no live consumer after
  Task38; `NewSpaceDialog` needs `@/lib/opencode/client` and `lib/spaces/registry-domains`
  (OpenCode engine / excluded spaces runtime), so the area was left untouched rather than
  half-adopted.
- `ScheduledTasksDialog/ScheduledTaskEditorDialog` and the new `scheduledTasksRequests.ts`:
  upstream's rework routes through `useProjectsInSidebarOrder` and a server request module whose
  server half is task 17/22's; kept the fork's dialogs.
- `views/archive/ArchivedWorktreeRow.tsx`, `useWorktreeArchiveActions.ts`: need task 09's
  `lib/worktrees/worktreeArchive`. The archive page itself (parent grouping, restore rule,
  subsession titles) was already adopted by task 01; worktree archive rows wait for 09.
- `views/PlanView.tsx` rewrite (saved plans only, markdown local assets, line-drag selection,
  `contextPanelHeaderSlot`): depends on task 16's plan store and task 09's header slot; only the
  feature-flag removal and gate were adopted.
- `session-unread`, `session-pins`, `session-turn-duration`, `useSessionPinnedStore` rework: stay
  deferred with task 23's reasons (no Host source; the technical-debt pin entry stands).

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
| `bun test` focused: folders route/store, drafts route, row model, archive/subtree, i18n | 0 | 15/17/8/38/17/69 pass |
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
