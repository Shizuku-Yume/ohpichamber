# 24: UI integration: hooks, API, apps

**Effort:** upstream-refresh
**Task type:** refactor
**Base commit:** 74bbb98db7

**Delivers:** The UI's hooks, runtime API clients, app shells (web/desktop/mobile) and shared types adopt upstream's fixes while keeping the fork's runtime switching.

**Blocked by:** 02, 23
**Files:** Path list: `/home/shizuku/Project/ohpichamber-omp-artifacts/upstream-sync-2026-10-27/plan-paths/24.tsv` (118 paths: 75 clean/new, 37 both-side, 23 conflicts). Main locations: `packages/ui/src/{hooks,api,apps,contexts,types,lib/api}`, `App.tsx`, `main.tsx`. Deferred from task 23: delete `stores/{useMobileSessionExpansionStore,useMobileSessionTreeStore,useWorktreeOrderStore}.ts` (all consumers are App/apps/hooks here), remove the remaining `useFeatureFlagsStore` consumers in `App.tsx`, `apps/MobileApp.tsx`, `hooks/{useKeyboardShortcuts,usePlanDetection}.ts`, and delete `stores/useFeatureFlagsStore.ts` after tasks 08/09 drop their imports. The task-10/23 pre-adopted `hooks/{clockPausedContext,useDurationTicker,usePageColors}.ts` are already on the base; use them for the pause-clock/spinner surfaces.

**Read first:** Spec W6; `.agents/skills/ui-api-decoupling/SKILL.md`; `.agents/skills/desktop-shell/SKILL.md` (desktop app shell); `.agents/skills/sync-state-invariants/SKILL.md`.
**Covers:** W6

**Check:** `bun install --frozen-lockfile` and `bun run type-check` and `bun run lint` and `bun run test` all exit 0, the hook/API tests pass, and in the running app runtime switching, the desktop shell and the mobile shell entrypoints load the refreshed UI. Real path: switch runtimes and open the mobile web surface.

## Done when

- [x] Runtime switching keeps its checked target and does not destroy a live tunnel.
- [x] API hooks use `RuntimeAPIs`/`runtimeFetch`; no direct provider calls from components.
- [x] App shells load the same UI bundle and keep their entrypoints.
- [x] The four legacy stores are deleted (or `useFeatureFlagsStore` after 08/09 clear their imports); no consumer imports them.
- [x] `pause-clock`, `useDurationTicker` and `usePageColors` are consumed by the shell/app surfaces instead of per-spinner timers.
- [x] `useUpdateStore` keeps `service-manager` until task 22 exposes the desktop-host `installBlocked` states; task 25 completes that mapping.

## Progress

### Method and base

Worktree `upstream-refresh-24`, branch `upstream-refresh/24`, cut from integration tip `74bbb98db7`
(task 12 had landed and adopted `contexts/DiffWorkerProvider.tsx`; that path is a no-op here and
recorded as "adopted by 12"). Every both-side path was three-way merged from `1f9320062` (base),
`74bbb98db7` (ours) and `0056bf6a9` (theirs) with `git merge-file`; new files were taken whole.
Resolutions keep the canonical OMP model, `RuntimeAPIs`/`runtimeFetch`, and runtime switching.
`searchContents` (the 501 → search-unavailable mapping) is not in `plan-paths/24.tsv` and no file
here calls it, so it stays out of scope with the sidebar Contents search.

### Adopted or adapted (upstream behavior kept)

- `App.tsx`: upstream's typography (`typography-h1`, `typography-markdown`) and logical
  alignment; the `/health` `planModeExperimentalEnabled` probe and the `useFeatureFlagsStore`
  consumer are gone. OpenCode compatibility gate, diagnostics capture, desktop safe-start,
  catalog prefetch, source-control/tracker sync stay with tasks 05/06/07/18/21/25.
- `apps/MobileApp.tsx`: adopts `MobileToaster` (iOS keyboard viewport fix) and drops the plan-mode
  probe; runtime switching, canonical connections and session routing stay.
- `apps/MobileSessionsSheet.tsx`: the three stores are replaced by sheet-local expansion state;
  edit-order mode reorders projects only (upstream removed manual worktree order).
- `apps/MobileProjectEditSurface.tsx`: worktree drag order removed; worktrees follow discovery
  order.
- `apps/mobileConnections.ts` (+test): upstream's server-identity pairing (`serverId`,
  `isSameDevice`, secure-token keying) and health identity check kept.
- Apps: `MobileConnectionWelcome.tsx`, `MobileHeader.tsx`, `MobileSessionMetadata.tsx`,
  `MobileDeleteWorktreeDialog.tsx`, `MobileFullscreenSurface.tsx` (LTR slide), `mobileAppContext.tsx`,
  `MobileInstancesSurface.tsx`, `MobileQrScannerOverlay.tsx`, `MobileSessionRenameForm.tsx`,
  `IpadSidebarResizeHandle.tsx`, `ipadSidebarResize.ts` (LTR resize sign), `mobileConnectionUi.ts`,
  `mobileNativeChrome.ts`, `MobileToaster.tsx` (+test), `DOCUMENTATION.md`.
- Hooks/types/contexts: `hooks/{useCommitComparison,useEffectiveDirectory,useGlobalSessionsPolling.test,
  useIsContributorWorktree,useMessageSearch,useMessageTTS,useProjectActionsContext,
  useProjectContextOwner(.test),useSessionStatusBootstrap,useDurationTicker.test,usePageColors,
  clockPausedContext}.ts(x)`, `contexts/FireworksContext.tsx`, `lib/api/files-errors.ts`,
  `types/{desktop.d.ts,quota.ts,worktree.ts}`.
- `hooks/useChatSearchDirectory.ts`: upstream's `useSessionDirectory` resolution.
- `hooks/useMenuActions.ts`: upstream's zone-aware right-zone/terminal-zone targeting.
- `hooks/useKeyboardShortcuts.ts`, `hooks/usePlanDetection.ts`: flags consumer removed; plan
  surfaces always available (`planModeEnabled: true`, the task-09 stopgap).
- `lib/api/types.ts`: `GitStatus.unborn` added for task 07's store. The upstream Skills Catalog
  block is the retired OpenCode-shaped catalog; the fork's `useSkillsCatalogStore` uses
  `@openchamber/agent-contract` `SkillRepository*` types.

### Kept at the fork's version (missing owner module on this tip)

- `hooks/useAssistantStatus.ts` + test (OpenCode tools/MCP names → canonical contract instead).
- `hooks/useTraySync.ts` + test, `apps/MobileSessionSwitcher.tsx`, `apps/mobileWidgetSnapshot.ts`
  (`session-unread`, `session-turn-duration`, `sessionPins`: task 25).
- `hooks/useMergedWorktreeCleanup.ts` (`worktreeArchive`, provider registry: tasks 07/09).
- `hooks/useMessageQueueHoldSync.ts` (fork queue is always server-owned).
- `hooks/useContextWindowLimits.ts` (canonical sessions carry no model projection).
- `hooks/useGuestSurfaces.ts` (`statusSource`: task 25).
- `hooks/{useBranchComparisonBase,useGitComparison,usePullRequestComparison,useNestedGitDirectory,
  useSourceControlProviderSync.ts(+test)}.ts`, `lib/api/git-identity.ts` + test (provider
  registry/descriptor/projectPath, trackers, nested repos: tasks 06/07/25).
- `apps/{MobileChangesSurface.tsx(+test),MobileFilesSurface,MobileStatusPane,MobileWalkthroughScreen,
  MobileWorkspaceDrawer}.tsx` (diff/file views, work status, walkthrough, mobileWorkspaceTabs:
  tasks 07/14/21/25).
- `apps/mobileSidebar/{MobileSectionRows,MobileSessionList,MobileSessionRow,MobileWorkRows,
  mobileRowParts,mobileSessionActions,mobileSidebarGeometry,mobileSidebarState}` and the upstream
  `MobileSessionsSheet` rewrite: the one-view sidebar redesign needs `useSessionRefLines`,
  `useRunWork`, `sidebarWorks`, `useWorktreeWork`, `sessionWorkFailure`,
  `sessionSidebarActivityLabels`, `FileTreeRowParts`, `session-pins`, which tasks 08/09 deferred
  and no remaining task owns.
- `apps/deepLinkNavigation.ts` (nativeShortcutRequests), `main.tsx` (desktopSafeStart + OpenCode
  compatibility prefetch), `apps/ElectronMiniChatApp.tsx`, `apps/runtimeEndpointReset.ts`
  (opencodeClient, tracker/workflow/provider registries: tasks 05/06/07/17/25).
- `apps/MobileTimelineList.tsx` + test, `apps/mobileTimelinePaging.ts`,
  `apps/usePendingRequestCounts.ts` (+test): upstream deleted them with its mobile sheet rewrite;
  the fork's sheet still consumes them, so they stay (delete/modify reviewed and kept).
- New modules whose only consumers are other tasks' files or the retired VS Code surface:
  `hooks/{useAutoReadAloud.ts(+test),useCallableModelProviders.ts(+test),useBranchPullRequestRequest,
  useLimitFailoverNotices,useRelayLimitToast,useSettingsKeyboardShortcuts}.ts`,
  `apps/{usePendingRequests.ts(+test),mobileDirtySwitch.ts(+test),mobileSessionTitle,
  vscodeSettingsNavigation.ts(+test)}`.
- `apps/VSCodeApp.tsx`, `hooks/useQueuedMessageAutoSend.ts` + test stay deleted with the fork.

### Deferred from upstream by its own missing owner (recorded for the next task)

- Relay limit UI: `isRelayLimitReached`/`RelayTunnelStatus.closeCode` are task 19's relay change,
  absent on this tip. `mobileConnections` keeps the server-identity improvements without the
  `relay-limit` outcomes and `MobileConnectionWelcome` drops the notice kind; task 19 restores it.
- RTL: `useI18n().direction` and `isRightToLeft` are task 20's i18n helpers. The mobile fullscreen
  slide and iPad resize sign use LTR adapters until then.
- `MobileToaster` uses no `layout="banner"` because this tip's sonner type does not expose it;
  the viewport-offset fix is kept.

### Stores

Deleted `stores/useFeatureFlagsStore.ts`, `stores/useMobileSessionExpansionStore.ts`,
`stores/useMobileSessionTreeStore.ts`, `stores/useWorktreeOrderStore.ts`. A tree-wide grep finds
no import of any of them; no `useFeatureFlagsStore` import existed outside this task's paths.
`useUpdateStore` is untouched and still maps `service-manager` for task 25. `stores/DOCUMENTATION.md`
records the plan-surface change.

### Checks

| Check | Exit | Log |
|---|---:|---|
| `bun install --frozen-lockfile` | 0 | `logs/install-2.log` |
| `bun run type-check` | 0 | `logs/type-check-6.log`, re-run after the final edits |
| `bun run lint` | 0 | `logs/lint-2.log`, re-run after the final edits |
| `bunx oxlint` on the rewritten files | 0 | `logs/oxlint-1.log` |
| `bun run dead-code` | 1 (inspected) | `logs/dead-code-1.log`: pre-existing task-23 interface modules and other lanes' server files; none of this task's files |
| Root `bun run test` | 1 | `logs/test-1.log`: UI failed `mobileConnections.test.ts` (upstream relay-limit test, task 19) and `useGlobalSessionsPolling.test.ts` (OpenCode roots); both fixed and re-run green (`logs/ui-focused-tests.log`, 32 pass). The agent-service run failed only the known eviction test ("a pending worker operation and a restart reservation each postpone eviction"). Five web suites failed in the parallel run; the same five re-ran alone exit 0 (291 pass, 3 skipped, `logs/web-failed-rerun.log`), so those were contention flakes. |
| Web package build | 0 | `logs/web-build.log` |

### W6 real path (dev hosts, isolated data dirs)

- Dev host A on UI `5197` / API `3913` with `OPENCHAMBER_DATA_DIR=/tmp/omp-24-data`:
  `GET /api/agent/v1/ready` → 200 `{"ready":true,"engine":"omp"}`. The desktop web UI loaded
  the refreshed shell, added the fixture project `/tmp/ohpi24-fixture`, and showed the chat draft
  (`screenshots/desktop-web-loaded.png`).
- Mobile web surface `http://127.0.0.1:5197/mobile.html` loaded the refreshed mobile shell
  (sessions drawer, no-projects empty state, legacy-data notice) after the worker pool settled
  (`screenshots/mobile-web-2.png`).
- Runtime switching (host B on `5198`/`3914`): the app's `switchRuntimeEndpoint` was driven
  from the page. A cross-host switch to the unauthenticated host B answered 401, kept the app
  mounted, and switching back restored host A with the fixture project and its chat target
  selected. Same-origin transport switches (`probe-transport` → `url:http://127.0.0.1:5197`)
  kept the checked project and restored the full draft (`screenshots/desktop-after-switch.png`).
- Built web: `bun run --cwd packages/web build` exit 0, served by `packages/web/bin/cli.js serve`
  on `3000`; the built bundle loaded the refreshed UI (`screenshots/built-web.png`). Its Agent
  Service answered 503 in this launch (the CLI did not start one), so the built server was only
  checked for the UI bundle, not a chat.

### Limits

- No paired host token, relay tunnel or SSH tunnel was available, so a successful cross-host
  runtime switch and the "live tunnel survives" branch were not exercised; the same-origin
  transport switch and the failed-switch recovery were. Desktop Electron and Capacitor native
  launches were not run; the web and mobile-web entrypoints were.
- Task 19 restores the relay-limit outcomes/UI; task 20 replaces the LTR adapters; tasks 06/07/11/
  13/14/21/25 own the deferred modules listed above. `mobileSidebar/*` and the upstream mobile
  sheet rewrite remain blocked on the one-view sidebar modules that tasks 08/09 deferred without
  a remaining owner.
- `searchContents`' 501 mapping is not in this path list and has no consumer here; it stays with
  the task that adds the sidebar Contents search.
- No dependency changes: `bun.lock` is the integration tip's, including task 12's packages.

**Check after:** type-check 0, lint 0, focused UI tests 0 (32 pass), web failed files re-run 0 (291 pass), web build 0; the root suite is green except the known agent-service eviction test and the five web contention flakes that pass alone. Runtime switching kept its checked target; the live-tunnel branch is a named limit.

### Follow-up verification (integration tip)

#### 1. Root test receipt (`VITEST_MAX_WORKERS=2 bun run test`)
- Command: `VITEST_MAX_WORKERS=2 bun run test`
- Exit: 1 (`logs/root-test-max2.log`)
- Results: 6 of 7 workspace suites passed (scripts 23/23, sdk 26/26, ui 849/849, agent-contract passed, agent-service passed, electron 54/54).
- The web suite failed 3 test files (389 passed, 3 failed, 9 skipped out of 401):
  - `server/lib/host/canonical-plugins.test.js`: 2 failed under concurrency/load. Ran alone: 5 passed (88.92s). Identified as known flake under load.
  - `server/lib/git/service.test.js`: 1 failed under concurrency (`preserves mixed file bytes through stage, unstage and discard`). Ran alone under vitest: 254 passed, 3 skipped (55.78s). Contention flake under full test run load.
  - `server/lib/spaces/code-out.test.js`: 3 failed under concurrency. Ran alone under vitest: 267 passed, 2 skipped (141.20s). Contention flake under full test run load.
- Agent-service eviction test (`packages/agent-service/src/supervisor/workers.capacity.test.ts:109`, "a pending worker operation and a restart reservation each postpone eviction"): passed in this run; earlier cited in `.workflow/done/upstream-refresh/05-electron-shell.md:73` and task 24 checks as known timing flake.

#### 2. Built web Agent Service 503 verdict and clean chat run
- Rebuilt `packages/web` (`bun run build`, exit 0, `logs/web-build-clean.log`).
- Verdict: Pre-existing startup probe timing behavior, not introduced by task 24.
- Cause:
  `GET /api/agent/v1/ready` returns 503 `SERVICE_UNAVAILABLE` during the initial 2–4 second startup window while the Host server awaits the child `agent-service` worker process to boot and transition to `phase === 'ready'` (`server/lib/host/canonical-routes.js:147`).
  Once the child process reports ready, `/ready` transitions to HTTP 200 `{"ready":true,"engine":"omp","version":"1.0.0"}`.
  At commit `823fe8aaac` and at the landed tip, running the built server directly with isolated `HOME=/tmp/home24` and `OPENCHAMBER_DATA_DIR=/tmp/omp-24f-data` responds HTTP 200 on `/api/agent/v1/ready` within 3 seconds. Task 24 touched only UI files and had no backend changes.
- Clean real-path chat send:
  Clean start with built server on port 3935 (`clean-built-server-3935`), isolated HOME and data dir.
  `GET http://127.0.0.1:3935/api/agent/v1/ready` answered HTTP 200 immediately.
  Added fixture project `/tmp/ohpi24-fixture` via UI.
  Sent prompt: `"Reply with the single word: pong"`.
  Observed assistant reply: `"pong"` from GPT-6 Astra (elapsed 2.4s, 6.7K tokens).
  Captured screenshot: `screenshots/clean-real-path-pong.png` (and earlier run `screenshots/built-web-chat-pong.png`).
