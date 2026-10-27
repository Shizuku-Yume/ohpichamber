# 09: Layout, works view and worktrees

**Effort:** upstream-refresh
**Task type:** feature
**Base commit:** 2e1239cd4b35818289db66a159b8650da38e80d2
**Status:** active

**Delivers:** Upstream's layout shell, works view, pane resizing, shortcuts, tracked items and worktree surfaces work with the fork's runtime and projects.

**Blocked by:** 10, 23
**Files:** Path list: `/home/shizuku/Project/ohpichamber-omp-artifacts/upstream-sync-2026-10-27/plan-paths/09.tsv` (105 paths: 81 clean/new, 24 both-side, 12 conflicts). Main locations: `packages/ui/src/components/{layout,mini-chat}`, `packages/ui/src/lib/{worktrees,workspace,trackedItems,shortcuts}`, `packages/web/server/lib/{projects,worktrees}`. Deferred from task 23: rework `stores/useMultiRunStore(.test).ts` from upstream on `lib/worktrees/worktreeStartDirectory`. `components/layout/{ContextPanelRail,Header}.tsx` drop their `useFeatureFlagsStore` imports so task 24 can delete the store.

**Read first:** Spec W6; `.agents/skills/performance-engineering/SKILL.md`; `.agents/skills/drag-to-reorder/SKILL.md` (pane/row ordering); `.agents/skills/locale-ui-patterns/SKILL.md`; `.agents/skills/desktop-shell/SKILL.md` (Mini Chat window).
**Covers:** W6

**Check:** `bun install --frozen-lockfile` and `bun run type-check` and `bun run lint` and `bun run test` all exit 0, and in the running app the works view lists active work, the side panel keeps one width across tabs, Mini Chat opens on the right instance, and a worktree is created, switched and removed from a fixture repo.

## Done when

- [ ] Layout, panel widths and focus behavior match upstream; no dead pane or duplicate shell remains.
- [ ] Worktree create/switch/remove works and preserves unsaved editor state.
- [ ] Shortcuts do not collide with the fork's reserved keys.
- [ ] Mini Chat targets the correct runtime instance.
- [ ] `useMultiRunStore` adopts upstream's rework on the fork's worktree start directory; multi-run state stays per project.
- [ ] Layout files no longer import `useFeatureFlagsStore` (task 24 deletes the store after 08/09).

## Progress

### Landed on the branch

**Commit `25e1f618ff` — worktree subsystem (green).**
- `lib/worktrees/worktreePaths.ts` (+test): checkout containment, `findWorktreeHoldingDirectory`, `projectPathForCheckoutFolder`.
- `lib/worktrees/worktreeStartDirectory.ts` (+test): folder-aware start directory with named fallbacks and removal of a checkout that never populated.
- `lib/worktrees/worktreeManager.ts` (+test): `holdsConfiguredProject` (a checkout holding a sub-folder project is not offered for deletion) and the `forgetRemovedWorktree` extraction. Upstream's archive/title/generated-branch additions were **not** adopted (need Host archive endpoints, `GitWorktreeArchive`, `CreateGitWorktreePayload.taskTitle/generatedBranch*`, `WorktreeMetadata.title` — owned by 01/22/24/25).
- `lib/worktrees/worktreeRemovalFlow.ts` (+test): `archiveSessionsThenRemoveWorktree` — archive sessions before the checkout goes, restore them when removal fails or throws. Callers updated: `components/session/SessionDialogs.tsx`, `apps/MobileDeleteWorktreeDialog.tsx`.
- `lib/worktrees/sessionWorktreeMove.ts` (+test): moves between worktrees/projects use the project folder of the moved session (existing worktree, quick worktree, source-branch lookup), and the same-checkout check uses containment.
- `lib/worktreeSessionCreator.ts`: `resolveFolderProjectRef` (folder-aware project resolution, host-owned prefix/primary root).
- `sync/session-ui-store.ts`: `setWorktreeMetadata(sessionId, metadata, cwd?)` so the attachment's cwd can be `<worktree>/<folder>` while the root stays the worktree identity.
- `stores/useMultiRunStore.ts` (+test): lanes of a project on a repository folder start in that folder of their worktree; a failed checkout removes the worktree; per-run dispatch follows the start directory.
- Host: `/api/git/toplevel` now reports `prefix` (`--show-prefix`, symlink-correct) with a service test; `lib/gitApiHttp.ts` exposes `resolveGitRepositoryPrefix`, `gitApi.ts` re-exports it and `validateWorktreeDirectory`.
- i18n: `session.newWorktree.toast.startFolder{Unknown,Missing,Unverified}` added in all 13 locales with real translations ("session started", no engine name).
- Verified: `bun check --all` clean for all touched files; 14/14 worktree test files; `useMultiRunStore.test.ts` 16 pass.

**Commit `eb4e606ede` — layout WIP (does not type-check yet).**
- `lib/workspace/{zones,zoneFit,zoneDropTargets}.ts` (+tests) adopted from upstream as the zone model.
- `stores/useUIStore.ts` rewritten from the three-way merge: zone placement, per-zone views and sizes (`contextZoneSizes`, one size per zone — the "one width across tabs" behavior), zone-aware open/close/tab settling, `fileTreeSide`, `sidebarFoldedForExpandedZone`, persistence v24 migration of per-surface widths. Fork-only fields kept: plan tabs (`projectPlanId`/`projectPlanRef`), `chatRenderMode`, `persistChatDraft` setter, `moveContextFilePaths` (upstream's 4-arg form), the fork's `targetDirectory` rule (terminal/chat only) and the retired "Last turn" tab drop. Upstream's VS Code branches, live browser tab limit, mobile workspace tabs and archive-on-done were stripped. Store tests adapted to zone sizes: 67 pass.
- Layout zone modules adopted and compiling: `zoneDrag`, `zoneEscape`, `zoneHosts`, `zoneSync`, `zoneFitWatch`, `zoneInteractiveContext`, `zoneSurfaceDragContext`, `MovablePane`, `ZoneDropOverlay` (needs i18n keys), `ZoneFitArbiter`, `ZoneMoveMenuItems` (needs i18n keys), `useOpenUntilSettled`, `rightSlot`, `contextPanelHeaderSlot(+context)`, `contextPanelSessionTitles`, `contextBreakdown`, `ContextRailUsage`, `sessionTabReveal`, `useSidebarPeek` (needs RTL helpers), `hooks/useLayoutAnimationMs.ts` (prerequisite from task 24), `prefersReducedMotion` export in `lib/layoutAnimation.ts`.
- `components/layout/ContextSurfacePanes.tsx`: adapted keep-alive pane host (file/editor+tree, pinned chat, current project's browser tabs, diff, terminal, walkthrough, plugin surfaces) with zones, PauseClock, Escape and header slots; no draft-space, live-tab throttling, tracker or plan-request integration (owned by 25/07/24).
- `components/layout/ContextPanel.tsx`: adapted upstream zone frame (three zones, resizers, header drag, close/expand per zone, zone menu); tracker/workflows/change-request wording removed (07/17), canonical session titles restored, tab drag-out removed until `SortableTabsStrip` gains `onTabDragOut` (task 20's file).
- `lib/path-utils.ts`: `getDisambiguatingFolders` added (still needs the local `sameParts` helper — see remaining).

### Remaining (exact list, for the next turn)

1. `lib/path-utils.ts`: add `const sameParts = (a, b) => a.length === b.length && a.every((part, i) => part === b[i]);` before `getDisambiguatingFolders` (definition from upstream `0056bf6a9`).
2. Finish type-check of the layout adoption and resolve each remaining UI error: `ContextPanel.tsx` (post-sameParts), `ContextPanelRail.tsx` (adapt: fork's `lib/surfaces/registry` + no source-control provider groups until 07, no `ContextRailSurfacesDialog` until 11), `ContextSidebarTab.tsx` (apply upstream header-slot/contextBreakdown hunks on canonical `@openchamber/agent-contract` types; drop `toolContentShells`), `ContextRailUsage(.test).tsx` (`@/lib/opencode/model` → canonical Message), `Sidebar.tsx`/`TitlebarLeftControls.tsx`/`useSidebarPeek.ts` (RTL helpers; LTR adapters for now), `mini-chat/MiniChatLayout.tsx` (canonical Session/model/provider shapes; `getInlineStartSide` → LTR), `Header.tsx`/`SessionTabsStrip.tsx` (18 + 1 conflicts; adopt upstream Mini Chat runtime args, session tab reveal, drop `useFeatureFlagsStore`), `MainLayout.tsx` (three ContextPanel frames, ContextSurfacePanes, ZoneDropOverlay, ZoneFitArbiter, useSidebarPeek), `GuestHosts.test.tsx`/`PluginPane.openSurface.test.tsx` (guest protocol fixture: keep the fork's v1 contract or take task 04's v2; do not adopt v2 here).
3. i18n (all 13 locales, real translations): `contextPanel.zone.{move,drop}{Left,Right,Bottom}`, `contextPanel.zone.resize*`/instructions used by the frame and pane, `contextRail.usage*`/`configure` keys used by adopted files, `settings.openchamber.keyboardShortcuts.action.open_project_actions.label` (adopt), and any key the adopted files name; do not add `background_session_work` (handler is task 15's composer).
4. Shortcuts: adopted `config/registry/dispatcher` (+tests) are in place; wire `open_project_actions` (Header/project actions) or keep the config entry out until the dialog shortcut handler lands; confirm no collision with fork reserved keys.
5. Defer with reasons (keep fork version / delete new file): `ProjectActionsButton` + `ProjectActions{Dialog,Provider,Scope}.tsx` + `useProjectActionsRunner` + `projectActionsRunnerContext` + `ProjectActionRunIndicator` (need `lib/projectActionSelection`, `projectActions.resolveProjectActionIconName`, `useDraftSpaceTarget`; task 25); `ProjectEditDialog` (projectSettingsTabs, task 11); `ContextRailSurfacesDialog` (+test) (`SettingsSortableVisibilityList`, `agentWorkflowFeatureAvailable`; tasks 11/17); `SidebarFilesTree` upstream rework + `fileTreeRows` (file content search, task 07); `SessionProjectIcon` (`resolveProjectColor`, task 25); `lib/trackedItems/*` and `worktreeArchive.ts`/`relocateRestoredSession.ts`/`mergedWorktreeCleanup.ts` archive flows (tasks 07 and Host archive endpoints); `SidebarTopBar`/`TitlebarLeftControls` only if their i18n helpers stay unlanded.
6. Run the Check: `bun install --frozen-lockfile`, `bun run type-check`, `bun run lint`, `VITEST_MAX_WORKERS=2 bun run test` (record the host-config `network-defaults` failure and the fresh-HOME rerun), `bun run dead-code` (record expected unreferenced modules), `bunx oxlint` on created/rewritten files.
7. Real path on ports API 6202 / UI 6280 with `OPENCHAMBER_DATA_DIR` under /tmp, throwaway Git repo under /tmp: works view, one panel width across tabs, Mini Chat on the right instance, worktree create → switch → remove, screenshots + console log, `GET /api/agent/v1/ready` 200; stop servers.
8. Task record: dispositions per path, move to `.workflow/done/upstream-refresh/`, `.workflow/bin/workflow validate`, rebase onto the current integration tip, rerun install/type-check/lint/test, `git merge --ff-only` in the integration worktree, remove worktree/branch.

### Round 2 — layout shell, store slice and checks

**`useUIStore` ownership (checked).** `packages/ui/src/stores/useUIStore.ts` is **not** in
`plan-paths/09.tsv`; task 23 deferred the upstream rework and the plan gave the file to task 25. Lane 08
has no diff against the integration tip for it (`git -C …/upstream-refresh-08 diff --stat
upstream-refresh/integration -- packages/ui/src/stores/useUIStore.ts` is empty), so there is no overlap to
rebase. 09 took only the zone-model slice the layout needs, and task 25 must keep it instead of
re-adopting upstream's whole file:

- `ContextPanelDirectoryState.zones: MovedZoneViews` (left/bottom views) and the right zone's top-level
  `isOpen`/`expanded`/`activeTabId`; `ContextPanelTab` is unchanged otherwise.
- `contextSurfaceZones: ContextZonePlacement` (per-device surface placement), `contextZoneSizes:
  Partial<Record<ContextZone, number>>` (one size per zone), `sidebarFoldedForExpandedZone`, `fileTreeSide`.
- Zone-aware tab helpers (`touchContextPanelState`, `upsertContextPanelTab`, `closeContextPanelTabs`,
  `moveContextPanelFileTabs`), `openContextFile({ expanded })`, `toggleContextPanelExpanded(directory, zone)`,
  `closeContextZone`, `setContextZoneSize`, `moveContextSurfaceToZone`, `setSidebarFoldedForExpandedZone`.
- Persist **version 24**: per-surface `widthByMode` migrates to `contextZoneSizes` (the zone keeps the size of
  the surface it shows), panels gain closed left/bottom zones, placements parse to `{}`. A `merge` sanitizer
  runs on every start, so a corrupt/partial/newer blob opens empty and closed instead of crashing.
  Tests cover a v23 blob (tabs, active tab, sizes) and malformed blobs (non-object panel map, unknown tab
  modes, bad zone data, bad rail order/side): `useUIStore.contextPanel.test.ts`, 70 pass.
- Fork-only store fields upstream deleted were restored: plan tabs (`projectPlanId`/`projectPlanRef`),
  `chatRenderMode`, `persistChatDraft` setter, `moveContextFilePaths` (upstream's 4-arg form),
  `notesPanelHeight`, `projectContextSidebarWidth`, runtime-status dialog state, session-work and
  expanded-tool display settings. Upstream-only additions were stripped: VS Code branches, live browser tab
  limit, mobile workspace tabs, `worktreeArchiveOnDoneEnabled`.
- Fork's `targetDirectory` rule (terminal/chat only) and the retired "Last turn" tab drop are kept; upstream's
  `turn` diff scope and tracker branch tab are not adopted.

**Layout adoption this round (all type-checking):**
- `lib/workspace/{zones,zoneFit,zoneDropTargets}` (+tests), the zone layout modules/overlays, `MovablePane`,
  `ContextSurfacePanes` (adapted keep-alive pane host: file/editor+tree, pinned chat, current project's
  browser tabs, diff, terminal, walkthrough, plugin surfaces; zones, PauseClock, Escape, header slots),
  `ContextPanel` zone frame (three zones, resizers, header drag, per-zone close/expand, zone menu, canonical
  session titles; no tracker/workflows/change-request wording; tab drag-out removed until
  `SortableTabsStrip.onTabDragOut` lands), `contextPanelHeaderSlot`, `contextBreakdown`, `sessionTabReveal`,
  `zoneSync`/`zoneFitWatch`/`zoneEscape`/`zoneDrag`/`zoneHosts`/`zoneInteractiveContext`/`zoneSurfaceDragContext`,
  `useLayoutAnimationMs` (task 24 prerequisite), `layoutAnimation.prefersReducedMotion`,
  `path-utils.getDisambiguatingFolders` + `sameParts`.
- `MainLayout` renders the three zone frames around the chat column, the keep-alive pane host after them, the
  drop overlay and the fit arbiter; zone placement follows other windows.
- `ContextPanelRail` is zone-aware: highlights surfaces shown in any zone and closes the surface's zone.
- Mini Chat: the header passes `runtimeKey` with `apiBaseUrl`/`clientToken` (the Electron main-side relay
  support is task 05's), new windows open pinned, the worktree branch lookup is folder-aware, and the window
  follows zone placement. `MiniChatLayout` keeps the fork's canonical session/model shapes.
- `useFeatureFlagsStore` is gone from both layout consumers: Header gates the plan tab on session
  availability alone, and the rail passes `planModeEnabled: true` until task 25 rewrites the registry option.
- Shortcuts: upstream registry/dispatcher (declining handler passes to the next registration) and
  `open_project_actions` config adopted; `background_session_work` was not added (its handler is task 15's
  composer). `open_project_actions` label added to all 13 settings dictionaries. Zone move/drop labels added
  to all 13 main dictionaries. No binding collides with a fork-reserved key.
- Deferred (kept the integration version / removed the new file): ProjectActions split (`ProjectActions*
  Dialog/Provider/Scope`, `useProjectActionsRunner`, `projectActionsRunnerContext`, `ProjectActionRunIndicator`;
  need `lib/projectActionSelection` + `projectActions.resolveProjectActionIconName` + `useDraftSpaceTarget`,
  task 25), `ProjectEditDialog` (project settings tabs, task 11), `ContextRailSurfacesDialog` (sortable
  visibility list + workflow flag, tasks 11/17), upstream `SidebarFilesTree` + `fileTreeRows` (file content
  search, task 07), `SessionProjectIcon` (`resolveProjectColor`, task 25), `useSidebarPeek` (needs RTL helpers
  and the task-08 Sidebar), tracked items (task 07), worktree archives (Host endpoints).

**Round-2 checks:** `bun run type-check` exit 0 (`logs/type-check-1.log`); `bun run lint` exit 0
(`logs/lint-2.log`, one pre-existing unused-disable warning in `components/ui/tooltip.tsx`); 22/22 layout test
files; `useUIStore.contextPanel.test.ts` 70 pass; worktree focused tests 14/14 and multirun 16 pass from the
worktree commit. Full suite, dead-code, oxlint-on-authored and the real path follow before landing.

### Round 3 — real path, dispositions and checks

**Ownership check (both answers recorded).** `packages/ui/src/stores/useUIStore.ts` is not in
`plan-paths/09.tsv`; the plan gives it to task 25. Lane 08 has no diff against
`upstream-refresh/integration` for it, so there is no overlap. 09 landed only the zone slice
documented above (zone state/sizes/views/helpers, v24 migration with an every-start sanitizing
`merge`, and the fork-only fields restored). Task 25 must keep those and re-base upstream's
remaining `useUIStore` work (live tabs, mobile workspace tabs) on them instead of replacing the file.

**Adopted here (green):** `lib/workspace/{zones,zoneFit,zoneDropTargets}` (+tests);
`components/layout/{zoneDrag,zoneEscape,zoneHosts,zoneSync,zoneFitWatch,zoneInteractiveContext,
zoneSurfaceDragContext,MovablePane(+test),ZoneDropOverlay,ZoneFitArbiter,ZoneMoveMenuItems,
ContextSurfacePanes,ContextPanel,useOpenUntilSettled,rightSlot,contextPanelHeaderSlot(+context),
contextPanelSessionTitles,contextBreakdown,sessionTabReveal}`; `MainLayout` (three zone frames + pane
host + overlays); `ContextPanelRail` (zone-aware highlight/close + rail context-menu zone moves);
`Header`/`ContextPanelRail` without `useFeatureFlagsStore`; `MiniChatLayout` (runtimeKey, pinned,
folder-aware branch, zone sync); `hooks/useLayoutAnimationMs`; `lib/layoutAnimation` reduced-motion
helper; `lib/path-utils` `getDisambiguatingFolders`/`sameParts`; shortcuts registry/dispatcher with
declining handlers + `open_project_actions` (label in all 13 settings dictionaries); zone move/drop
labels in all 13 dictionaries; worktree subsystem (see commit `25e1f618ff`), including the host
`/api/git/toplevel` prefix and the restored personal `worktreeDirectory` project setting
(`project-setup.js`/`project-config.js`, with its unit tests).

**Kept at the fork's version / deferred (reason):** ProjectActions split (`ProjectActionsDialog`,
`ProjectActionsProvider`, `ProjectActionsScope`, `ProjectActionRunIndicator`,
`useProjectActionsRunner`, `projectActionsRunnerContext`) needs `lib/projectActionSelection`,
`resolveProjectActionIconName` and `useDraftSpaceTarget` (task 25); `ProjectEditDialog` needs the
project settings tabs (task 11); `ContextRailSurfacesDialog` needs the sortable visibility list and
the workflow flag (tasks 11/17); upstream `SidebarFilesTree`/`fileTreeRows` need the file content
search views (task 07); `SessionProjectIcon` needs `resolveProjectColor` (task 25); `useSidebarPeek`
needs RTL helpers and the task-08 Sidebar; `PluginPane.openSurface.test` uses task 04's guest surface
API; tracked items need tracker descriptors (task 07); `worktreeArchive`, `relocateRestoredSession`'s
archive flow and `mergedWorktreeCleanup`'s restored/removing logic need Host worktree-archive
endpoints and runtime archive APIs (tasks 01/22/24/25); VS Code branches, live browser tab limit,
mobile workspace tabs and archive-on-done were stripped from the store.

**Checks (evidence `/home/shizuku/Project/ohpichamber-omp-artifacts/upstream-refresh-09-2026-10-27/`):**

| Check | Exit | Log |
|---|---:|---|
| `bun install --frozen-lockfile` | 0 | setup, 1406 packages |
| `bun run type-check` | 0 | `logs/type-check-1.log` |
| `bun run lint` | 0 | `logs/lint-2.log` (one pre-existing unused-disable warning in `components/ui/tooltip.tsx`) |
| `bun run dead-code` | 1 (expected) | `logs/dead-code-2.log`: only findings delivered by earlier tasks for later consumers (session drafts/warming/lineage, popup-side, page colors, permission default) |
| `bunx oxlint` on authored files | 0 | `logs/oxlint-authored.log` |
| focused layout tests | 0 | 22/22 files |
| `useUIStore.contextPanel.test.ts` | 0 | 70 pass (includes v23→v24 and corrupt-blob migration tests) |
| worktree tests / multirun | 0 | 14/14 files, 16 pass |
| full suite (first run) | 1 | `logs/test-1.log`: registry/telemetry version expectations and project worktreeDirectory tests (fixed since), plus load-sensitive flakes: scripts runner (`/proc` race, passes alone), agent-service capacity (sleep-based), canonical-plugins 503 |
| full suite (rebased final tree) | 6/7 suites | `logs/test-final.log`: sdk, ui (374 files / 6089 tests), agent-contract, scripts, electron and web all pass; only `agent-service`'s sleep-based `workers.capacity.test.ts` failed under load, and passes alone (`logs/agent-service-capacity-rerun.log`, 6 pass) |

**Real path (observed, dev on API 6202 / UI 6280, `OPENCHAMBER_DATA_DIR=/tmp/ohpi-09-data`, fixture
`/tmp/ohpi-09-fixture`).** `GET /api/agent/v1/ready` 200 `{"ready":true,"engine":"omp","version":"1.0.0"}`.
Added the fixture project, opened the Files surface (tree-only 240 px; with a file 640 px), resized the
right zone to 520 px by dragging its handle, switched Files→Git and the zone stayed 520 px, moved Git
to the left zone from the rail's context menu (right zone closed, placement persisted), reloaded and the
layout came back (store version 24, `contextSurfaceZones {"git":"left"}`, `contextZoneSizes {"right":520}`,
left zone open on git). Created worktree `swift-hedgehog` from the works view, the app switched to it
(Git panel showed branch `swift-hedgehog`, working tree clean), the works view listed it with its path,
and the delete dialog removed the worktree and its local branch (`git worktree list`/`branch` show only
`main`). Created a second worktree `archive-check`; it was removed the same way (toast “Worktree
“archive-check” removed”, repo back to `main` only). Screenshots: `screenshots/01-initial-layout.png`,
`02-files-pane-right.png`, `03-git-same-width.png`, `04-git-moved-left.png`,
`05-reload-keeps-layout.png`, `06-works-view.png`, `07-worktree-created.png`,
`08-worktree-active-git.png`, `09-works-view-lists-worktree.png`, `10-final-layout.png`; console log
`logs/console.log`, server log `logs/dev.log`.

**Check after (final rebase onto `4634e8bcf1`):** `bun install --frozen-lockfile` exit 0
(`logs/install-land.log`), `bun run type-check` exit 0 (`logs/type-check-land.log`), `bun run lint`
exit 0 (`logs/lint-land.log`), full suite (`logs/test-land.log`): sdk, ui (374 files / 6089 tests),
agent-contract, scripts, electron and web pass; `agent-service` had one sleep-based timing failure
(`registry-native.test.ts`, 7.6 s test under load) and passes alone
(`logs/agent-service-registry-rerun.log`). The earlier run of the same suite failed a different
agent-service timing test, so the flake follows load, not this change.

**Follow-up — 503 cause, regression verdict, removal with a live session.** The setup matched the
session task's: a temporary worktree at the landed tip, `bun install --frozen-lockfile`, the compiled
agent-service rebuilt (`bun run --cwd packages/agent-service build`; dev serves `dist`), an isolated
`HOME=/tmp/ohpi-09-home` holding only copies of `~/.omp/agent/{config.yml,models.yml,mcp.json}`, a
fresh `OPENCHAMBER_DATA_DIR=/tmp/ohpi-09-data2`, UI 6280 / API 6202. A session was created in the UI
and a real provider answered “ready” in the transcript (model default Gemini 3.8 Flash / scout for the
isolated profile; the host profile answered as GPT-6 Astra in a second run).
The original 503 was `[agent-service] worker …: Worker initialization failed (UNSUPPORTED_CAPABILITY)`
at worker open. It does not reproduce with the rebuilt dist: the landed tree creates sessions with both
the isolated and the host profile, and the pre-09 tip `65862865d0` with the same setup also created a
session and answered “ready” (`logs/dev-pre09.log`). Verdict: not a regression in this task's commits
and no code fix was needed (no fix SHA); the earlier ad-hoc worktree ran the compiled agent-service
from before the final rebase and failed at worker initialization, and the documented rebuild removes it.
Removal with a live session was then exercised: worktree `followup-session` got a real-provider
session, the delete dialog said “This removes the selected worktree and archives 1 linked session”,
and deleting removed the checkout and its branch (`git worktree list` / `branch` show only `main`).
The Host wrote the archive row (`session_archive` has the session; its OMP session file stays under the
isolated HOME), so the session is retained, not lost. The Archive page still shows “0 archived
sessions” after a reload: once the checkout is gone, listing the session's workspace returns
`METADATA_READ_FAILED`, and the Host only projects archived state onto sessions of currently resolvable
workspaces; the worktree-archive record that would list removed checkouts is deferred to the Host
worktree-archive endpoints (tasks 01/22/24/25). This is the known archive-visibility gap, not a
regression. Evidence: `screenshots/11-worktree-session-ready.png`,
`12-delete-dialog-archives-linked-session.png`, `13-archive-after-worktree-reload.png`,
`logs/dev-session.log`, `logs/dev-hosthome.log`, `logs/dev-pre09.log`,
`logs/followup-archive-evidence.txt`. Servers stopped and the temporary worktrees and `/tmp` data
removed afterwards.

**Limits.** Archived sessions of removed worktrees are retained but not listed in the Archive page
until the deferred worktree-archive surface lands (see the follow-up above). The console shows
pre-existing warnings outside this task's surfaces (nested button in a picker dialog, `setState` during
render in `VisibleSessionProjects`, 404s for optional assets).
