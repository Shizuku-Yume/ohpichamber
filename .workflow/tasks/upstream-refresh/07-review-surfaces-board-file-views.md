# 07: Review surfaces, Board and file/Git views

**Effort:** upstream-refresh
**Task type:** feature
**Base commit:** <commit-sha>

**Status:** blocked

**Delivers:** The UI renders upstream's Board, PR/review and tracker surfaces, references and comments, plus the Files, Git, worktree and diff views, on top of the refreshed server.

**Blocked by:** 06, 10, 33, 34
**Files:** Path list: `/home/shizuku/Project/ohpichamber-omp-artifacts/upstream-sync-2026-10-27/plan-paths/07.tsv` (268 paths: 235 clean/new, 18 both-side, 9 conflicts; +24k lines). Main locations: `packages/ui/src/components/{sourceBoard,comments,references,sourceControl,github,views}`, `packages/ui/src/lib/{source-control,trackers}`, and the host-related settings sections (`git-identities`, `projects`, `routing`, `remote-instances`). Deferred ownership from task 10: `components/ui/{JsonTreeViewer.tsx,JsonTreeView.tsx,JsonTreeView.test.tsx}` (needs this task's `views/files/FileTreeRowParts`/`fileTreeRow` and task 25's `lib/jsonTreeUtils`). Deferred from task 23: `stores/{useTrackerAuthStore,useTrackedItemsStore,useSourceBoardStore,useSourceControlAuthStore,useGitHubPrStatusStore}.ts` (+tests), `stores/{useChangeRequestContextStore,useInlineCommentDraftStore,useGitStore,useWalkthroughStore}.ts` (upstream reworks on this task's descriptors/DTOs); `stores/useLinearAuthStore(.test).ts` is deleted here together with its last callers (see the planning amendment: tasks 08/11/24 closed without dropping them). Deferred from task 15: `components/chat/composer/sessionReferences.{ts,test.ts}` (consumed by `references/sessionMentionChips`), `components/comments/InlineCommentInput.tsx` consumption of `isPastedInput` from `useTextareaInlinePicker`, and project-scoped magic prompt overrides in `packages/ui/src/lib/magicPrompts.ts` with project settings. Because those deferrals were accepted by tasks that have since closed, this task also edits the consumer files they named, and no others: `components/chat/ChatInput.tsx` (task 15), `components/chat/message/{MessageBody.tsx,parts/UserTextPart.tsx,parts/userTextPartContent.ts}`, `components/chat/markdown/MarkdownLink.tsx` (task 13), `components/layout/ContextPanel.tsx` (task 09), `sections/magic-prompts/{MagicPromptsPage.tsx,MagicPromptsSidebar.tsx}` and `sections/integrations/IntegrationsPage.tsx` (task 11), `App.tsx`, `apps/MobileApp.tsx`, `apps/runtimeEndpointReset.ts` (task 24). Each edit adopts the matching upstream `0056bf6a9` wiring; no other behavior in those files changes.

**Read first:** Spec W5; task 31 consumes `views/files/FileTreeRowParts`/`fileTreeRow` — keep them exported; `.agents/skills/ui-api-decoupling/SKILL.md`; `.agents/skills/locale-ui-patterns/SKILL.md`; `.agents/skills/performance-engineering/SKILL.md`; `.agents/skills/sync-state-invariants/SKILL.md`; `packages/ui/src/components/views/DOCUMENTATION.md`.
**Covers:** W5

**Check:** `bun install --frozen-lockfile` and `bun run type-check` and `bun run lint` and `bun run test` all exit 0, the affected UI tests pass, and in the running app the Board lists issues/PRs for a fixture repository, a PR diff renders, the Files tree opens a file, and a review comment thread can be created. Real path: one real host with credentials if available; otherwise the fixture and the limit are named.

## Done when

- [ ] Board, tracker and review components use the canonical client and task 06's routes; no direct provider fetch in the browser. Task 34 published `POST /api/git/change-id` and `GitAPI.addChangeIdToHead`; `PullRequestSection` replaces its direct `gitApiHttp.addChangeIdToHead` import with `gitApi.addChangeIdToHead` in this task's own commit.
- [ ] Files/Git/diff views open the fixture repository and show changed files, hunks and the sticky scrollbar behavior.
- [ ] References and comments work across sessions and worktrees.
- [ ] View tests pass; large lists use the upstream virtualization.
- [ ] `JsonTreeViewer`/`JsonTreeView` adopt upstream on this task's file-tree pieces and task 25's `jsonTreeUtils`; no fork copy remains.
- [ ] The deferred stores (`useTrackerAuthStore`, `useTrackedItemsStore`, `useSourceBoardStore`, `useSourceControlAuthStore`, `useGitHubPrStatusStore`, `useChangeRequestContextStore`, `useInlineCommentDraftStore`, `useGitStore`, `useWalkthroughStore`) are reworked from upstream on the new registry/DTO shapes; no OpenCode-shaped field is faked.
- [ ] `useLinearAuthStore` is deleted: this task retires its last callers (`App.tsx`, `apps/MobileApp.tsx`, `apps/runtimeEndpointReset.ts`, `sections/integrations/LinearSettings.tsx`) to `useTrackerAuthStore`'s `refreshTrackers`/`resetForRuntimeSwitch` and the `linear` runtime API that only they read, then deletes the store and its test; tasks 08/11/24 closed without dropping their imports, and task 31 carries no part of this. No Linear-shaped auth field is faked in its place.
- [ ] Session pins stay deferred: the missing Host source is the technical-debt entry `Session pins have no OMP source`; do not fake it.
- [ ] `sessionReferences` and `sessionMentionChips` work across sessions and worktrees; `InlineCommentInput` consumes `isPastedInput` from `useTextareaInlinePicker`. The wiring lands in the consumer files named in `Files` (`ChatInput.tsx` for composer references; `MessageBody.tsx`, `UserTextPart.tsx`, `userTextPartContent.ts`, `MarkdownLink.tsx` for the chips), which tasks 15 and 13 deferred here.
- [ ] Project-scoped magic prompt overrides in `packages/ui/src/lib/magicPrompts.ts` are wired with project settings.

## Progress

### Planning amendment (2026-10-30)

The execution record below is restored from branch `upstream-refresh/07` at `9a8f099471`; the branch itself is unchanged. This planning copy routes the missing project endpoints to task 33 and the missing Change-Id route/client contract to task 34, retires the obsolete session-warming blocker, and keeps the provider-backed gap as a named fixture limit rather than a credential blocker.

#### Deferred wiring this task now owns (2026-10-30 amendment)

The tasks that accepted these deferrals are archived and did not carry them out, so this task owns the wiring and the consumer files it lands in. Each gap was measured on integration `811ecef471` and on this task's branch:

- **Project-scoped magic prompts.** `lib/magicPrompts.ts` exports `fetchMagicPromptScopes` (line 1084), `saveScopedMagicPromptOverride` (1124), `resetScopedMagicPromptOverride` (1128) and `resetAllScopedMagicPromptOverrides` (1132) with no caller. Upstream's `sections/magic-prompts/MagicPromptsPage.tsx` (659 lines, `Scope = 'global' | 'project'`, `ProjectLabel`, `useProjectsStore`, `useSettingsDirectory`, `SettingsChipGroup`/`SettingsStackedField`) plus `MagicPromptsPage.test.tsx` is the wiring, and task 11's 370-line fork page is what it replaces. Every dependency exists here, `stores/useMagicPromptsStore.ts` is identical to upstream's, upstream adds only the `walkthrough` and `memory.tidy` prompt ids, and all 72 `settings.magicPrompts.page.*` keys are already in the catalogs. `MagicPromptsSidebar.tsx` gains the same two items and the `SettingsProjectSelector` mount.
- **Composer session references.** `components/chat/composer/sessionReferences.ts` is used only by its own test. Upstream's `ChatInput.tsx` block (`sessionMentionsRef`, `sessionLinkOrigins = appOwnOrigins()`, `resolveSessionLinks` with `findSessionLinks`/`sessionLinkKey` from `lib/sessionLinks.ts`, a file already present, and `sessionReferencesInText`) is the missing wiring; the fork's `useAttachReferences`/`ReferencePickerDialog` pipeline stays beside it.
- **Session mention chips.** `sessionMentionChips.tsx` and `SessionMentionChipButton.tsx` have no consumer. Upstream mounts them through `SessionMentionChipsContext` in `MessageBody.tsx` (`sessionMentionChipsOf(parts)`), `parts/UserTextPart.tsx`, `parts/userTextPartContent.ts` and `markdown/MarkdownLink.tsx`; those four files are the wiring site.
- **Tracker item view.** `views/TrackerItemView.tsx` imports only modules that already resolve here (`useLinkRepository` from `sourceBoard/boardRepository.ts:254`, `wasTrackerItemRequested`/`settleTrackerItemRequest` from `sourceBoard/openTrackerItem.ts:87-89`), and only `components/layout/ContextPanel.tsx` is missing: it keeps the `pr` mode but renders `PullRequestView` alone instead of upstream's `targetPath ? <TrackerItemView …/> : <PullRequestView/>`.
- **Generic tracker settings.** `IntegrationsPage.tsx` renders `LinearSettings` and `GitHubIntegration`; upstream's `TrackerSettings.tsx`, `TrackerProjectMapping.tsx`, `TrackerSessionComments.tsx`, `trackerSettingsCopy.ts` and `SourceControlProviderCard.tsx` are missing. Adopting them is what retires `LinearSettings` and with it the last `useLinearAuthStore` caller outside the app shell. This task's earlier note handed the card to task 21, which closed without it.
- **Fixture provider stand-in.** The named stand-in for the real path is `packages/sdk/examples/source-control-provider` (installed through `POST /api/guests`, `PUT /api/guests/:id/capabilities` granting `service`, `PUT /api/guests/:id/enabled`; the host registers `ext-source-control-provider` and forwards to the guest's `/source-control`), with `startFakeForge()` from `fake-forge.ts` behind a loopback `origin` on the fixture repository. No browser route mock satisfies the Check.

Not this task's slice: the Host worktree-archive routes and service, the Agent Service worktree lease and its Host supervisor restart hold, the archive client/store and the Archive page rows are task 35's; this task's Check does not depend on them, and it names that task as their owner instead of leaving the orphaned `archive/ArchivedWorktreeRow.tsx` unowned. "Remaining phase-2 steps" item 4 below is therefore split, not deleted: `TrackerItemView`, the mention chips and the session references are this task's, the worktree-archive row is task 35's. Task 31 adopts the sidebar files that call `openOnBoard` (`SidebarRefLinks`, `SessionNodeItem`, `SessionGroupSection`) and must consume this task's `openTrackerItem`; whichever branch lands second drops the duplicate `openOnBoard` path, the same merge-order rule as the 07/35 orphan. Task 31's `works/workActions.ts` also consumes task 35's `archiveWorktreeWork`.

### Branch and lineage

- Worktree: `/home/shizuku/Project/ohpichamber-worktrees/upstream-refresh-07`, branch `upstream-refresh/07`.
- Rebased onto the integration tip `c4ce06dc0` (task 20 i18n landed there).
- Tip after phase 1: `1de0b6d400` (11 commits above the integration tip); working tree clean.
- Phase 1 is complete; heavy gates (full `bun run test`, `bun install --frozen-lockfile`, real-path browser scenario) are deferred to the maintainer's "go heavy".

### Rebase conflicts

27 i18n catalog conflicts (`en`, `de`, `es`, `fr`, `ja`, `ko`, `nl`, `pl`, `pt-BR`, `tr`, `uk`, `zh-CN`, `zh-TW` × `.ts`/`.settings.ts`, plus `first-party-integrations.i18n.test.ts`). Every one was resolved to the integration side: task 20's catalogs already carry the whole upstream 0056bf6a9 catalog, and the adopted views' keys exist in it (`session.newWorktree.actions.startFromRepository.*`, `session.newWorktree.actions.startFromTrackerItem`, `pullRequestComparison.diffUnavailable`, `spaces.draft.preparing`, `diffFind.*`, `sourceBoard.*`). No task 07 key was missing, so the follow-up i18n commit retains only `linear-panel.i18n.test.ts` and `third-party-integrations.i18n.ts`.

### Linked issue cutover

`LinkedSidebarIssue.source` stays upstream's `repository | tracker | guest | external`; the legacy `github | gitlab | linear` members and the optional-matcher shim are gone. Callers migrated:

- `components/chat/work-status/WorkStatusContextSection.tsx` — `useRepositoryUrlMatcher`, `getLinkedSidebarChanges`/`getLinkedSidebarIssues`/`getDistinctLinkedIssues(session, matcher)`, `repositoryThread`/`workItem`, `useTrackedWorkItemStates`; fork skill/MCP panel behavior kept.
- `components/session/sidebar/list/SessionProjectCollection.tsx` — repository refs from `issue.ref`, tracker items from `workItem`, `repositoryThread` for changes.
- `components/session/sidebar/projects/SessionGroupSection.tsx`, `components/session/sidebar/sessions/SessionNodeItem.tsx` — same, plus `buildSessionIssueItems(issues, repositoryStates, trackerStates)` and provider-descriptor reference labels.
- `components/session/sidebar/sessions/sessionPrSummaries.ts` (+ test) — adopted upstream helper.
- `stores/useTrackedItemsStore.ts` — dropped the `any` shims and the `useTrackedLinearStates` alias; restored upstream hook signatures.
- `lib/linkedIssues.ts` (+ test adopted upstream), `lib/trackedItems/fromLinks.ts` (removed `githubThread`/`gitlabThread`/`linearIssue`).
- `agent-contract` `linkedIssueSchema` now accepts `kind: 'tracker'` with `provider` + `identifier`, so canonical metadata can persist non-Linear tracker links.

Also completed the picker-source cutover that the adopted dialogs depended on: `ReferencePickerSource` is `'repository' | tracker:<id>`; `ChatInput`, `NewWorktreeDialog` (generic registry-driven source list with `ProviderIcon`) and the tests use it. `usePullRequestComparison` now exposes `diffUnavailable`, so `DiffView` renders `ChangeRequestDiffUnavailable` with no retry instead of a cast-read optional field.

### Checks (rebased tip `1de0b6d400`)

Logs: `/home/shizuku/Project/ohpichamber-omp-artifacts/upstream-refresh-07-2026-10-27/logs/`.

- `bun run type-check` — exit 0 (`type-check.log`).
- `bun run lint` — exit 0 (`lint.log`); pre-existing warnings only.
- `bunx oxlint <rewritten files>` — exit 0 (`oxlint.log`); the workspace `bun run lint` is the authoritative rule pass.
- Focused tests — 40 files, all pass, 0 failures (`focused-tests.log`): linked issues, session summaries, sidebar/board, references, diff/terminal/file views, tracker and source-control stores, NewWorktreeDialog.
- `bun run dead-code` — exit 1 (knip findings, non-blocking as documented) (`dead-code.log`, `dead-code.diff` against `dead-code-integration-baseline.log`, copied from task 20's green run at `e96045d5db`; the integration tip differs from it by docs only).

### Dead-code delta

Counts moved from 17/60/24 findings to 20/71/56. New findings are not new behaviour: they are
(a) legacy GitHub/Linear DTOs and `Tracker*`/`Linear*` re-exports in `lib/api/types.ts` whose consumers the neutral provider reads replaced (33 types),
(b) adopted task 07 modules whose owning surface lands in a later task — `TrackerItemView`, `ArchivedWorktreeRow`, `SessionMentionChipButton`/`sessionMentionChips`, `authorSelection`, `web/src/api/github-references`, worktree-archive helpers, board `useLinkRepository`/`openTrackerItem` follow-ups, `sessionReferences` helpers, scoped magic-prompt overrides. Per-line table: `logs/dead-code.diff`; explanation is in the hand-off report.
Removed in this phase: `githubThread`/`gitlabThread`/`linearIssue`, `useTrackedLinearStates`, `isPrimaryMode`, `modelVariantNames`, and the three dead `SourceControlAPI.github*` members.

### Deferrals and cross-lane findings

- `useLinearAuthStore` removal: recorded in `31-one-view-sidebar-redesign.md`; task 07 no longer imports it from `NewWorktreeDialog`, but other lanes still do.
- `repositoryUrlMatcher.ts` is 07.tsv line 246 (adopted). `trackedItems/*` are **09.tsv** paths, not 07.tsv (the earlier hand-off note was wrong); they were adopted here because the linked-issue reads depend on them.
- Task 21 needs a line: the generic `components/sections/integrations/TrackerSettings` card is still missing, so the settings-card test in `lib/trackers/zeroCodeTracker.test.tsx` was removed. The rest of that file's expectations pass.
- Task 34 owns the missing `POST /api/git/change-id` route, its route test, and the `GitAPI.addChangeIdToHead` member; `PullRequestSection` currently calls `gitApiHttp.addChangeIdToHead` directly and will surface the missing route as a failure until task 34 lands and task 07 switches the call site to the member.
- `components/views/turnSnapshotDiff.ts` is only a type holder after the DiffView turn-scope projection; its doc comment is stale (outside this task's slice).

### Remaining phase-2 steps

1. `bun install --frozen-lockfile` and full `bun run test` at this tip.
2. Real-path scenario with headless Chrome/DevTools (no Xvfb): Board lists issues/PRs for the fixture repository, a PR diff renders, the Files tree opens a file, and a review comment thread can be created.
3. Wire the scoped magic-prompt overrides into project settings (Done-when item; the exports exist and are currently unreferenced).
4. Reachability of the adopted `TrackerItemView`, `ArchivedWorktreeRow`, session mention chips and worktree-archive row (owner: task 08/31), and decide the fate of the legacy GitHub DTO block in `lib/api/types.ts`.

### Rebase onto task 21 (`8ee84af280`)

Rebased at the maintainer's request. One conflict: `.workflow/tasks/upstream-refresh/31-one-view-sidebar-redesign.md` — task 21's `works/workActions.ts` line and this task's `useLinearAuthStore` deferral line; both kept, in that order. No i18n or `settings-registry.json` conflict. Static checks at the new tip: type-check 0, lint 0, oxlint 0, 40 focused test files pass, dead-code exit 1 with only `readWorktreeUse`/`WorktreeUse` added by task 21 relative to the pre-rebase report. Logs: `logs/rebase-8ee84af280-*.log`.

### Heavy gates (rebase onto `8ee84af280`; supersedes the phase-1 "deferred" note and the older tips above)

- `bun run test`: exit 0 (`logs/heavy-root-test-3.log`; 7/7 suites, UI 979/979 files, web 469 files, electron 54/54). Run 2 exited 1 on one web test, `canonical-plugins.test.js` (503 from a worker-init timeout); it passes alone (`logs/` plugin rerun in transcript) and passed in run 3, so it is recorded as a load-sensitive flake, not a task-07 regression.
- `bun run build`: exit 0 (`logs/heavy-build.log`).
- `bun run type-check` / `bun run lint` at the committed tip: 0 / 0 (`logs/heavy-final-*.log`).

### Real path attempt (headless Chrome, dev server on 3750/3751, isolated data dir)

The app boots and renders on `http://127.0.0.1:3750` with the fixture repo as project; screenshots `screenshots/02-main.png`, `03-board.png`, `04-files.png`. The Board header opens, but its body stays at “Looking for Git repositories...” and the Files tree has no entries. Direct probes from the page return 404 for `/api/git/projects` and `/api/git/project-worktrees` (`/api/fs/list` answers 200). The two project routes are absent at the observed tip `8ee84af280` and still absent at current integration `43dcd6ffc1`: `01.tsv` assigns `packages/web/server/lib/git/routes.js`, but archived task 01's Deliver/Done-when and the task 06/22 records do not own the project-overview or worktree-batch endpoints. Task 33 now owns them; the handlers exist at upstream `0056bf6a9` but not at integration. No source-control account is configured for the fixture, so issue/PR listing, PR diff and provider review comments remain unexercised; that is the Check's named fixture limit, not a hard credential blocker. Result: task 07's real path is blocked by task 33 at the host-route layer, and no UI acceptance claim is made until the fixture exercises the real routes. Fixture: `fixture-repo` (main + feature/files, renamed/deleted/binary files and one working-tree change).

### Done-when status at `b7f0d9e599` (not accepted; boxes intentionally left open)

1. **Board, tracker and review components use the canonical client and task 06's routes; no direct provider fetch in the browser — UNMET.** Components use the canonical client and `RuntimeAPIs`, and no browser call to a provider origin was found. The host routes they call are absent on this branch: `POST /api/git/projects` and `POST /api/git/project-worktrees` return 404 and are now task 33's, while `PullRequestSection` directly calls `gitApiHttp.addChangeIdToHead` until task 34 adds the `POST /api/git/change-id` route and the `GitAPI.addChangeIdToHead` member. Task 01's `01.tsv` path row does not make the project endpoints task 01 deliverables. Blocked by task 33 and task 34, not by credentials.
2. **Files/Git/diff views open the fixture repository and show changed files, hunks and sticky scrollbar behavior — NOT EXERCISED.** Unit tests for the file tree, `FileContentSearchResults`, `useRawAssetUrl`, image neighbors and `stickyScrollbarBinding` pass. In the real path the Files panel renders its toolbar but has no tree entries because repository discovery fails on the 404 above. Blocked by task 33's project routes; no credentials needed for the local fixture.
3. **References and comments work across sessions and worktrees — NOT EXERCISED.** Reference/reference-comment tests pass (`ReferencePreview*`, `liveReferences`, `resolveComposerReferences`, `ReferenceComments` paths), and `InlineCommentInput` consumes `isPastedInput` from `useTextareaInlinePicker`. No cross-session/worktree run was possible: session creation hit `WorkerPoolManager: worker initialization timed out after 10000ms`, and provider references need a connected source-control account. Provider references remain unexercised as the named fixture limit; the cross-session walk stays blocked by the worker timeout and the missing route/session pipeline.
4. **View tests pass; large lists use the upstream virtualization — PARTIAL.** The root UI suite passed 979/979 files and the focused 40-file set passed. Upstream virtualization/list components are adopted in source, but scroll cost/large-list behaviour was not measured in the real path. Blocked for measurement by task 33's project routes and the unauthenticated fixture.
5. **`JsonTreeViewer`/`JsonTreeView` adopt upstream on the file-tree pieces and task 25's `jsonTreeUtils`; no fork copy remains — CODE MET, ACCEPTANCE NOT RUN.** Both files are the adopted versions, `lib/jsonTreeUtils.ts` exists and `JsonTreeView.test.tsx` passes. Real-path render was not reached because Files is empty.
6. **The deferred stores are reworked from upstream on the new registry/DTO shapes; no OpenCode-shaped field is faked — PARTIAL.** The stores in `07.tsv` were adopted and type-check/lint pass; their focused tests pass (`useSourceBoardStore`, `useGitHubPrStatusStore`, `useTrackedItemsStore` consumers, sidebar/board suites). No runtime store behaviour was exercised beyond those tests.
7. **`useLinearAuthStore` is deleted after tasks 08/11/24 remove their imports — UNMET.** Recorded as a deferral line in `31-one-view-sidebar-redesign.md`; task 07 stopped importing it from `NewWorktreeDialog`, but other lanes still do.
8. **Session pins stay deferred; no fake — KEPT DEFERRED.** `lib/sessionPins.ts` is unreferenced (dead-code finding) and no pins source was fabricated.
9. **`sessionReferences` and `sessionMentionChips` work across sessions and worktrees; `InlineCommentInput` consumes `isPastedInput` — PARTIAL.** `InlineCommentInput` does consume `isPastedInput`; `sessionReferences` helpers exist. `sessionMentionChips.tsx`/`SessionMentionChipButton.tsx` are currently unreferenced (dead-code), so the cross-session/worktree chip behaviour is not wired or exercised.
10. **Project-scoped magic prompt overrides wired with project settings — UNMET.** `fetchMagicPromptScopes`/`saveScopedMagicPromptOverride`/`resetScopedMagicPromptOverride`/`resetAllScopedMagicPromptOverrides` are exported but have no callers.

### Blockers (distinct, none fixed here)

- **Task 33 — project repository batch routes.** `POST /api/git/projects` and `POST /api/git/project-worktrees` are missing at the observed tip `8ee84af280` and at current integration `43dcd6ffc1`; they exist only in upstream `0056bf6a9` (`git/routes.js`). `01.tsv` assigns `git/routes.js`, but archived task 01's Deliver/Done-when does not include these endpoints; the task 06/22 records do not own them. Task 33 now owns them; task 07 does not add the routes.
- **Task 34 — change-id route and caller contract.** `gitApiHttp.addChangeIdToHead` exists, but `POST /api/git/change-id` is not registered and `GitAPI` has no `addChangeIdToHead` member. Task 34 owns the route, its route test and the client contract/cutover; task 07's `PullRequestSection` consumes that member instead of the direct function import once task 34 lands.
- **Cross-session worker timeout.** Session creation hit `WorkerPoolManager: worker initialization timed out after 10000ms`, so the cross-session/worktree walk is not exercised. Rerun on a quiet machine after tasks 33/34; this is not a route or provider-credential blocker.

Provider-backed issue/PR listing, PR diff, references and review comments remain unexercised because no source-control account is configured. That is a named limit, not a hard blocker or waiver: the Check accepts the fixture alternative, and the fixture run must exercise the actual app and Host routes end to end. Per-session warming is retired by the maintainer decision; its former `/api/session/warming` 404 is obsolete and must not be implemented or carried as a blocker.

### Evidence index

- Root test: run 2 exit 1 (`logs/heavy-root-test-2.log`) — one web test, `server/lib/host/canonical-plugins.test.js`, received 503 from a 10 s worker-init timeout under parallel load. Isolated rerun passed 5/5; run 3 exit 0 (`logs/heavy-root-test-3.log`; 7/7 suites, UI 979/979 files, web 469 files, electron 54/54). Recorded as a load-sensitive flake, not a task-07 regression.
- Build: exit 0, `logs/heavy-build.log`.
- Static: `bun run type-check` 0 and `bun run lint` 0 at the committed tip, `logs/heavy-final-type-check.log`, `logs/heavy-final-lint.log`.
- Real path: dev-server log `logs/dev-server.log`; page probes `{"projects":404,"project-worktrees":404,"fs-list":200}`; screenshots `screenshots/02-main.png`, `screenshots/03-board.png`, `screenshots/04-files.png`; fixture `fixture-repo`. The retired session-warming probe is not part of this record.
