# 08: Sessions and sidebar

**Effort:** upstream-refresh
**Task type:** feature
**Base commit:** <commit-sha>

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
