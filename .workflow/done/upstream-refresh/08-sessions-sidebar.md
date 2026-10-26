# 08: Sessions and sidebar

**Effort:** upstream-refresh
**Task type:** feature
**Base commit:** 2e1239cd4b
**Finished:** 2026-10-27

**Delivers:** Upstream's session list, unread/work markers, folders, archive and chat view shell work with OMP sessions, including the server-side session folder and draft support.

**Blocked by:** 10, 23
**Files:** Path list: `/home/shizuku/Project/ohpichamber-omp-artifacts/upstream-sync-2026-10-27/plan-paths/08.tsv` (169 paths: 108 clean/new, 60 both-side, 38 conflicts). Main locations: `packages/ui/src/components/session/`, `packages/ui/src/lib/{sessionFolders,sessionListOrder,sidebarSessionRows}`, `packages/ui/src/components/views/{ChatView,ArchiveView,PlanView}`, `packages/web/server/lib/{session-folders,session-drafts}`. Deferred from task 23: rework `stores/{useSessionFoldersStore,useSessionDisplayStore}.ts` (+tests) and `stores/useProjectsStore.ts` from upstream on the new folder/display/project shapes. `stores/useSessionPinnedStore.ts` stays at the fork's version: its Host-owned pin source is the technical-debt entry `Session pins have no OMP source`. Consume the task 23 interfaces `stores/sessionLineage.ts`, `sync/user-message-resume.ts` and `stores/useSessionDraftsStore.ts`. `views/PlanView.tsx` drops its `useFeatureFlagsStore` import so task 24 can delete the store.

**Read first:** Spec W6; `.agents/skills/sync-state-invariants/SKILL.md`; `.agents/skills/performance-engineering/SKILL.md`; `.agents/skills/locale-ui-patterns/SKILL.md`; `packages/ui/src/sync/DOCUMENTATION.md`; `packages/ui/src/stores/DOCUMENTATION.md`.
**Covers:** W6

**Check:** `bun install --frozen-lockfile` and `bun run type-check` and `bun run lint` and `bun run test` all exit 0, and in the running app a session list with unread and work markers renders, a chat opens from it, the archive shows an archived session, and a folder move survives a reload. Real path: send one prompt and watch the session move into work.

## Done when

- [x] Session rows, grouping, sorting and unread state read from the fork's stores; no second source of truth is added. Unread is the fork's notification-based unseen marker; upstream's `session-unread` stays with task 25 (no OMP viewed watermark).
- [ ] Archive and plan views match upstream behavior; Task38's spaces removal is not undone. The Archive page was verified at the running app; worktree archive rows wait for 09 and the PlanView rewrite for 16, so this item is only partly delivered (see the deferral table).
- [x] Reload and reconnect preserve selection, folders and draft text. Folder + selection survived the reload in the real path; an unsent Host draft reopened from its row; reconnect flushes/re-reads on the online event.
- [x] Session list performance is checked with a large fixture list; the measurement is recorded (5,000 sessions → 5,040 rows, median 29.4 ms).
- [ ] `sessionLineage`, `user-message-resume` and `useSessionDraftsStore` are consumed by the session list/actions; no delivered interface is left unreferenced. `sessionLineage` and `useSessionDraftsStore` are consumed; `user-message-resume` has no caller in this task's files (task 15's ChatInput) and stays owned by 15.
- [ ] The three deferred stores are reworked from upstream; `useSessionPinnedStore` stays deferred to the pin-source debt entry; no OpenCode-shaped field is faked. The folder store is fully reworked; the projects store gained the folder-scope cleanup; the display store's upstream shape is the one-view redesign and moves with 09 (see the amendment proposal).
- [x] `PlanView` no longer imports `useFeatureFlagsStore`; session pins remain deferred to the technical-debt entry `Session pins have no OMP source`.

## Progress

### State at this stop

Branch `upstream-refresh/08-sessions-sidebar`, worktree `upstream-refresh-08`, base
`2e1239cd4b`. The task lands with the folder/draft protocol, the sidebar draft rows, the archive
fixes, the injected store transport and the deferral table below; it is rebased onto the
integration tip just before the fast-forward.

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

### Checks at the rebased tip

| Check | Exit | Log |
|---|---:|---|
| `bun install --frozen-lockfile` | 0 | `logs/install-rebased.log`, 1406 packages |
| `bun run type-check` | 0 | `logs/type-check-rebased.log` |
| `bun run lint` | 0 | `logs/lint-rebased.log` (one pre-existing unused-disable warning in task 10's `tooltip.tsx`) |
| `VITEST_MAX_WORKERS=2 bun run test` | 0 | `logs/test-rebased.log`: 7/7 suites; web 375 passed / 9 skipped, 6096 tests. The known host-approval `network-defaults` failure did not reproduce, so no isolated-HOME rerun was needed. |
| `bun run dead-code` | 1 | `logs/dead-code-rebased-2.log`: only findings owned by other open tasks — task 10 (`pause-clock`, `popup-side`, `useDurationTicker`, `usePageColors`, `color.ts`), task 15 (`createSessionDraftId`, `SessionDraftTooLargeError`), task 21/25 (`sessionWarming*`), task 11/23 (`permissionModeForNewSession`), plus the pre-existing `knip.json` hints. Nothing from this change. |
| `bunx oxlint` on changed files | 0 | `logs/oxlint-authored-2.log` |
| focused bun tests, one process (folders route/store, drafts route, row model, archive/subtree, i18n) | 0 | `logs/focused-tests-3.log`: 118 pass / 25 files |
| `.workflow/bin/workflow validate` | 0 | after the task file moved to `done/` |

The folder store's test no longer mocks modules: `createSessionFoldersStore(runtime)` takes the
fetch, runtime key and device storage; the app singleton is built from `runtimeFetch`,
`getRuntimeKey` and safeStorage (commit `89e6554ae9`). The focused set now runs in one process.

### Performance

`row-model-bench.json` (script kept out of the repo): 20 projects × 250 sessions = 5,000
sessions, all groups fully revealed, `buildSessionSidebarRowModel` 15 iterations. Rows: 5,040;
median 29.41 ms, mean 30.64 ms, min 25.21 ms, max 49.91 ms. The model is memoized per input and
the virtualizer mounts ~24 rows, so this is the full-rebuild cost on a list change, not a frame
cost. The run was on the host CPU while no other build ran.

### Real path (observed)

`bun run dev` with `OPENCHAMBER_DATA_DIR=/tmp/ohpi-08-data`, `HOME=/tmp/ohpi-08-home` (a copy of
the OMP provider config, no secret printed), UI 6180 / API 6102. `GET /api/agent/v1/ready`
returned 200 `{"ready":true,"engine":"omp","version":"1.0.0"}` (`ready.json`).

- Real provider: model GPT-6 Astra (CLIProxyAPI); the prompt “Reply with exactly the word: ready”
  produced “ready” in the transcript, and the row showed its active marker while the turn ran
  (sidebar text `Session active …`). No provider values were printed.
- Folder: created “Work” from the session menu's Move to folder → New folder and the session was
  filed in it; the folder and the session under it were still there after a reload, with the
  session selected again (`01-folder-work-before-reload.png`, `02-folder-work-after-reload.png`).
- Draft: a Host draft was created with `PUT /api/session-drafts/ohpi08-demo` (named stand-in:
  composer publishing is task 15, so typing alone stores only the device draft). After a reload
  the sidebar showed the pen row “Open draft: Draft started on another client”; clicking it
  reopened the composer with that text (`03-draft-opened.png`).
- Archive: the page shows “1 archived session — Untitled Session — Just now”
  (`04-archive-page.png`). The session had to be archived through the Host route the UI calls
  (`POST /api/openchamber/sessions/archive`, 200) because the isolated OMP worker failed to
  restore the finished session (`SESSION_RESTORE_FAILED`, status `unavailable`) and the UI
  action rode on that status. No subsession could be produced: the available agents
  (scout/reviewer/security-reviewer/sonic/task) have no task tool, and two explicit prompts had
  the agent read the file itself. Archive-with-subsession behavior is covered by
  `sessionSubtreeActions`/`archiveAllSessions` tests; the live page was verified with a
  top-level session.
- Servers stopped; the isolated data and home stay under `/tmp` for inspection.

### Limits

- The one-view sidebar redesign, the display-store rework, project knowledge, spaces and
  worktree archive rows stay with the owners in the table above; `usePinnedStore` stays deferred.
- `user-message-resume` is delivered but its only caller is task 15's ChatInput; it remains
  referenced by its own test, so no dead-code finding appears.
- The isolated OMP profile could not restore a finished session after a worker restart, which
  blocked the UI archive action and any subagent turn; this is an environment limit of the copied
  provider config, not a change in this branch, and is recorded with the workaround above.

### Restore follow-up (2026-10-27)

The first real path archived through the Host route because the isolated OMP worker returned
`SESSION_RESTORE_FAILED` after the turn. Task 23's fix `4634e8bcf1` (native
`usage.reasoningTokens` failing the canonical `TokenUsage` parse) explains it, and the first
real path ran on a tree without it (`b04297e4c1`): `git merge-base --is-ancestor 4634e8bcf1
b04297e4c1` exits 1; against the landed `65862865d0` it exits 0.

Re-ran the real path in a temporary worktree at the landed tip with the agent-service dist
rebuilt (`bun run --cwd packages/agent-service build`), an isolated `HOME` holding only the OMP
provider config and `OPENCHAMBER_DATA_DIR=/tmp/ohpi-08r-data`, UI 6180 / API 6102. Provider:
GPT-6 Astra via CLIProxyAPI (real, no values printed). The prompt “Reply with exactly the word:
restored” answered “restored”; the session settled `idle` (not `unavailable`). The UI action
(session menu → Archive → “Archive session?” → Archive) archived it: `archivedAt
1793059058874`. After a reload the Archive page shows “1 archived session — Untitled Session —
Just now” (`05-archive-after-ui-reload.png`), and neither the console
(`console-restore-check.txt`) nor the dev log contains `SESSION_RESTORE_FAILED`. Verdict: the
restore defect is fixed by `4634e8bcf1`; the earlier archive workaround was a stale-tree/stale-
dist artifact.

