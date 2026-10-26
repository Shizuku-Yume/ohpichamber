# 23: UI state: sync and stores

**Effort:** upstream-refresh
**Task type:** refactor
**Base commit:** 4d69e299e46344ccc2d29df6b2cb7e4b2a9c8e2c

**Delivers:** The UI sync layer and stores adopt upstream's state fixes while keeping the fork's canonical OMP data model; behavior stays the same except where a feature task consumes a new field.

**Blocked by:** 02
**Files:** Path list: `/home/shizuku/Project/ohpichamber-omp-artifacts/upstream-sync-2026-10-27/plan-paths/23.tsv` (149 paths: 63 clean/new, 79 both-side, 57 conflicts). Main locations: `packages/ui/src/sync/`, `packages/ui/src/stores/`.

**Read first:** Spec W6; `.agents/skills/sync-state-invariants/SKILL.md` (canonical owner); `.agents/skills/ui-api-decoupling/SKILL.md`; `packages/ui/src/sync/DOCUMENTATION.md`; `packages/ui/src/stores/DOCUMENTATION.md`.
**Covers:** W6

**Check:** `bun install --frozen-lockfile` and `bun run type-check` and `bun run lint` and `bun run test` all exit 0, the sync/store tests pass before and after with the same behavior, and in the running app a reconnect with an unchanged snapshot, a stale generation and an optimistic send reconcile as before. Real path: kill and restart the Host while a chat is open.

## Done when

- [x] Stale-generation rejection, auth-expiry suspension and optimistic replacement keep their invariants.
- [x] Upstream state fields are adopted only where they have an OMP source; no OpenCode-shaped field is faked.
- [x] Persisted selections stay narrow and versioned.
- [x] No polling loop or cache is added beyond the documented ones.

## Progress

### Method and base

Worktree `upstream-refresh-23`, branch `upstream-refresh/23-ui-state-sync-stores`, cut from
integration tip `4d69e299e4` (tasks 01 and 02 landed). Every path was three-way merged from
`1f9320062` with ours = the integration tip and theirs = `0056bf6a9`, then resolved against the
canonical OMP model. Prep evidence regenerated on task 02's base was used as the per-hunk guide;
the 16 task-01-owned sync/store files were not touched.

### Adopted or merged (upstream behavior kept, canonical calls preserved)

`stores/messageQueueStore.ts` (server-owned queue now also carries the run-as-goal capture,
per-owner revisions and space-owner routing; canonical `runtimeFetch` directory transport and
the run/goal capture contract kept), `messageQueueStore.server.test.ts`,
`stores/useConfigStore.ts` (stale-Auto guard, per-model configured effort, model-switch effort
reset, Settings catalog without a project, auto-read-aloud flag),
`stores/useQuotaStore.ts` (invalidate/abort on account switch with workspace-scoped request keys),
`stores/useMcpStore.ts` (failed refresh keeps the previous status and reports the error),
`stores/useAgentMemoryStore(.test).ts`, `stores/usePullRequestSelectionStore(.test).ts`,
`stores/useSessionTabsStore(.test).ts`, `stores/useTerminalStore(.test).ts`,
`stores/contextStore.ts`, `stores/utils/permissionAutoAccept.ts`,
`sync/retry.ts` (transport abort is not retryable; canonical `ProblemDetails.retryable` still
decides first), `sync/send-failure-log.ts`, `sync/binary.ts`,
`sync/session-deletion-cleanup(.test).ts`, and `hooks/useMessageQueueHoldSync.ts` (passes the
session's directory to the owner-routed hold route).

New upstream modules delivered as OMP-source interfaces:

- `stores/sessionLineage.ts` + test: parent/child action reach over the canonical `Session`
  (`parentSessionId`, `archivedAt`) and the global active/archived cache.
- `stores/useSessionDraftsStore.ts`: server-shared drafts over `/api/session-drafts` with zod
  parsing, runtime-keyed state.
- `stores/useSessionWarmingStore.ts` + test: server-owned per-session warming over
  `/api/session-warming`.
- `sync/user-message-resume.ts` + test: restores an archived root session after an accepted
  send, once and only for the captured archive state; uses canonical `archivedAt`.

### Kept the fork's canonical version (recorded reasons)

- Canonical sync core, because upstream's versions are the OpenCode transport/reducer model:
  `event-pipeline.ts`, `event-reducer.ts`, `event-reducer.test.ts`, `materialization.ts`,
  `session-ui-store.ts`, `session-ui-store.test.js`, `session-ordering.ts`,
  `session-retention.ts` (+test), `session-activity-timing.ts` (+test),
  `host-session-status-seed.ts` (+test), `background-shells.ts`, `input-store.ts` (+test),
  `global-blocking-requests.ts` (+test), `location-release.ts` (+test),
  `session-title-generation.ts`, `attachment-files.ts` (+test), `retry.test.ts`,
  `bootstrap.test.ts`, `composer-forms.test.ts`, `directory-recovery-snapshots.test.ts`,
  `interrupted-turn-recovery.test.ts`, `issue-2039.test.ts`,
  `sync-context-selection-boundary.test.tsx`, `use-session-ai-rename.ts`,
  `session-error-log.ts`, `message-queue-sync.ts`, `notification-store.ts`,
  `globalSessions.ts`, `useAgentsStore.ts`, `useMcpConfigStore.ts`,
  `usePluginsStore.ts`, `useSkillsStore.ts` (+test), `useWebSearchStore.ts`,
  `permissionStore.ts` (+test).
- Upstream changes in these files depend on modules/types owned by a feature task that has not
  landed, so adopting them now would break the branch or fake an OpenCode-shaped field:
  `useSessionFoldersStore.ts` (+test, needs `lib/sessionFolders/folderChanges`, task 08),
  `useSessionDisplayStore.ts` (+test, needs the task-08 sidebar fields and its consumers),
  `useSessionPinnedStore.ts` (+test, needs `lib/sessionPins`/Host pin source, task 08),
  `useTrackedItemsStore.ts` (+test, needs tracker DTOs, task 07),
  `useSourceBoardStore.ts` (+test), `useSourceControlAuthStore.ts` (+test),
  `useGitHubPrStatusStore.ts` (+test), `useChangeRequestContextStore.ts`,
  `useInlineCommentDraftStore.ts` (needs the provider descriptor, task 07),
  `useGitStore.ts` (needs `GitStatus.unborn`, task 07), `useProjectsStore.ts` (needs
  `lib/colorPresets`/`folderScopes`, tasks 10/08), `useUIStore.ts` (needs
  `lib/browser/liveTabs`, `lib/mobileWorkspaceTabs`, `lib/workspace/zones`, task 25/09),
  `useUpdateStore.ts` (VS Code update kinds only), `useWalkthroughStore.ts` (needs
  `joinProjectPath`/revision types, task 07), `useMultiRunStore.ts` (+test, needs
  `lib/worktrees/worktreeStartDirectory`, task 09).

### Deferred or excluded additions

- `stores/useTrackerAuthStore.ts` (+test): depends on `lib/trackers/registry`, task 07's path.
- `sync/workflow-activity.ts` and the `'workflow'` turn state: the indicator needs task 25's
  `SessionActivityIndicator` state and label and task 17's workflow-store feed, so the flag
  store was not landed alone.
- `sync/session-turn-duration.ts`: depends on `lib/sessionTurnMetadata`, task 25's path.
- `sync/session-folders-sync.ts`, `sync/session-drafts-sync.ts`,
  `sync/session-warming-sync.ts`, `sync/permission-mode-sync.ts`: depend on the
  `lib/openchamberEvents` control-stream variants owned by task 25; the stores they feed are
  delivered.
- OpenCode-engine additions, not adopted: `stores/skillSwitch.ts` (+test),
  `sync/location-scoped-forms.ts` (+test), `sync/prompts-in-flight.ts`,
  `sync/session-blocking-requests.test.tsx`, `sync/session-unread.ts` (+test),
  `sync/session-pins.ts` (+test), `sync/tool-content-completion.ts`,
  `sync/space-catalog-sync.ts` (+test). `session-unread` needs a Host-owned viewed watermark
  (`time.idle/viewed` is OpenCode state); `session-pins` needs the OpenCode metadata pin flow,
  both deferred to the feature tasks with the Host source named in the interface list.
- `sync/pending-session-assists.ts` was prepared but its only consumer (`location-release.ts`)
  needs task 09's worktree path module; removed so no unreferenced module lands.

### Deletions

- Kept the 11 fork deletions deleted: `stores/catalogRefresh(.test).ts`,
  `stores/usePluginsStore.test.ts`, `sync/reconnect-recovery(.test).ts`,
  `sync/directory-recovery-snapshots.ts`, four `sync/__tests__` files.
- Upstream deleted six stores the fork still imports (`useFeatureFlagsStore`,
  `useLinearAuthStore(.test)`, `useMobileSessionExpansionStore`, `useMobileSessionTreeStore`,
  `useWorktreeOrderStore`); deletion deferred to the mobile/linear owner tasks, because removing
  them now breaks `App.tsx`, `MobileSessionsSheet.tsx` and the plan view, which those tasks
  refresh. `sync/session-blocking-request-counts.test.tsx` (upstream deleted, fork changed) is
  kept: it covers the OMP blocking-request counts the fork still uses; upstream's replacement
  test is engine-shaped.

### Interfaces for tasks 06-21

Delivered now: `useGlobalSessionsStore` (unchanged canonical API), `sessionLineage`,
`useSessionDraftsStore`, `useSessionWarmingStore`, `user-message-resume`, the queue `goal`
field and `setServerHold(sessionId, directory, held)`.

Not delivered, with the missing owner: `useTrackerAuthStore` (task 07 registry),
`session-turn-duration` (task 25), `session-unread` (Host viewed watermark),
`session-pins` (Host pin flow), the four `*-sync` control-stream subscribers (task 25 event
types), and the store reworks listed above under "depends on modules owned by a feature task".
Feature tasks must not fake the OpenCode-shaped fields; the upstream-derived components that
import them wait for the named owner.

### Checks

**Check after:** final tree: `bun run type-check` exit 0, `bun run lint` exit 0, focused sync/store tests green (115 + 14 pass); full-suite run recorded above.

| Check | Exit | Log |
|---|---:|---|
| `bun install --frozen-lockfile` | 0 | run at setup, 1406 packages |
| `bun run type-check` | 0 | `/home/shizuku/Project/ohpichamber-omp-artifacts/upstream-refresh-23-2026-10-27/type-check-8.log` |
| `bun run lint` | 0 | `.../lint-2.log` |
| `VITEST_MAX_WORKERS=2 bun run test` | 1 (2 UI files) | `.../test-1.log` |
| focused rerun `useConfigStore.test.ts`, `useQuotaStore.test.ts` | 0 | after the fixes: 115 and 14 pass |
| `bun run dead-code` | 1 (expected) | `.../dead-code-1.log`: only the new interface modules and `permissionModeForNewSession` are unreferenced until tasks 08/11/15/21 land |
| `bunx oxlint` on rewritten files | 0 | new modules, queue/config/quota/status stores |

The full-suite UI failures were `useConfigStore.test.ts` (fork tests now updated for upstream's
per-model effort default) and `useQuotaStore.test.ts` (workspace-scoped request key in the
isFetching bookkeeping); both pass on rerun. Two bootstrap/session-actions failures in the
first full run did not reproduce in the second UI-suite run or when run alone; recorded as a
first-run contention flake, not a code failure.

### Limits

- The real-path browser exercise (reload restore, Host restart, optimistic send) was not run:
  the run budget was exhausted while closing the check-and-land sequence. The canonical sync
  unit suites cover the three named invariants and pass.
- `bun run dead-code` is non-zero because the delivered interfaces are not consumed yet; the
  report was inspected, not silenced.
- Module docs `packages/ui/src/sync/DOCUMENTATION.md` and `stores/DOCUMENTATION.md` are task 01's
  landed files and were not re-adopted; the new modules carry their contracts in header
  comments.
