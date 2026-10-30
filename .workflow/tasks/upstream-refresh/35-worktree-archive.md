# 35: Worktree archive end to end

**Effort:** upstream-refresh
**Task type:** feature
**Base commit:** <commit-sha>

**Delivers:** A finished worktree can be archived, restored and deleted for good. The Host answers upstream's worktree-archive endpoints against `refs/openchamber/archive/<id>`, and the Archive page lists each project's archived worktrees with **Restore** and **Delete**, so merged-worktree cleanup and the row's own archive action stop at a real Host route instead of a missing one.

**Blocked by:** None
**Files:** No new upstream path: every file below is already counted in an earlier task's list. Host: `packages/web/server/lib/git/{service.js,routes.js,routes.test.js,service.test.js,DOCUMENTATION.md}` (task 01's paths). Boundary: `packages/web/server/lib/spaces/{dispatcher.js,dispatcher.test.js,DOCUMENTATION.md}` (task 22/33's fork-owned files). Client: `packages/ui/src/lib/worktrees/{worktreeArchive.ts,worktreeManager.ts}` (task 09), `packages/ui/src/components/views/{ArchiveView.tsx,archive/ArchivedWorktreeRow.tsx}` (task 01 and 08), `packages/ui/src/hooks/useMergedWorktreeCleanup.ts` (task 24). The HTTP client is already on the integration branch and stays unchanged: `packages/ui/src/lib/gitApiHttp.ts` (`archiveGitWorktree`, `listGitWorktreeArchives`, `restoreGitWorktreeArchive`, `deleteGitWorktreeArchive`, lines 1636-1650), `packages/ui/src/lib/gitApi.ts` (runtime dispatch, `worktreeArchivesAvailable`), `packages/ui/src/lib/api/types.ts` (`GitWorktreeArchive`, `ArchiveGitWorktreePayload`, `GitWorktreeArchiveRestoreResult`, `DeleteGitWorktreeArchivePayload`, `GitAPI.archive?`/`listArchives?`/`restoreArchive?`/`deleteArchive?`). Tasks 01, 08 and 09 are archived, so this task edits their files.

**Read first:** Spec W5 and W6; upstream `0056bf6a9:packages/web/server/lib/git/routes.js` (the archive block at lines 1830-1900) and `service.js` (the archive block at lines 6605-6875); upstream `routes.test.js` `describe('git worktree archive routes')` (line 688) and `service.test.js` `describe('worktree archives')` (line 4760); `packages/web/server/lib/git/DOCUMENTATION.md`; the fork's `packages/web/server/lib/spaces/dispatcher.js` (`REFUSED_ACROSS_BOUNDARY_ROUTES`); `packages/ui/src/lib/gitApiHttp.ts` archive section; upstream `packages/ui/src/lib/worktrees/worktreeArchive.ts` (285 lines), `components/views/archive/ArchivedWorktreeRow.tsx`, `components/views/ArchiveView.tsx`; `.agents/skills/locale-ui-patterns/SKILL.md`; `.agents/skills/performance-engineering/SKILL.md`.
**Covers:** W6

**Check:** `bun install --frozen-lockfile` and `bun run type-check` and `bun run lint` and `bun run test` all exit 0, `bun run --cwd packages/web test -- server/lib/git/routes.test.js server/lib/git/service.test.js server/lib/spaces/dispatcher.test.js` passes, and with the dev server on a local fixture repository: a linked worktree holding one uncommitted change is archived with `POST /api/git/worktrees/archives?directory=<project>` (200, folder gone, branch kept), `GET /api/git/worktrees/archives?directory=<project>` lists it with its branch, title and `sessionIds`, `POST /api/git/worktrees/archives/restore` puts the change back in a new checkout of that branch (200), and `DELETE /api/git/worktrees/archives` removes the archive and, when asked, the branch. In the running app the Archive page shows the archived worktree under its project, **Restore** brings it back with its sessions, and **Delete** removes it. Real path: a local fixture repository and no credentials; the HTTP observation is a throwaway script or the browser network panel, and a browser route mock does not count.

## Interfaces

Host, all under `registerGitRoutes` and behind the existing lazy `getGitLibraries()` import:

- `GET /api/git/worktrees/archives?directory=<any checkout of the project>` → 200 `{ archives: Archive[] }`, newest `archivedAt` first. 400 `{ error: 'directory parameter is required' }` without the query.
- `POST /api/git/worktrees/archives?directory=<project>`, body `{ directory: <worktree path>, id, sessionIds?, title? }` → 200 `Archive`. 400 without the body `directory`; 501 `{ error: 'Worktree bootstrap storage is not available' }` when the injected `worktreeBootstrapStore.remove` is missing; `userAction`.
- `POST /api/git/worktrees/archives/restore?directory=<project>`, body `{ id }` → 200 `{ id, conflicts }`; `userAction`.
- `DELETE /api/git/worktrees/archives?directory=<project>`, body `{ id, deleteBranch? }` → 200 `{ id, branchDeleted }`; `userAction`.
- Failures keep an error code: 404 `WORKTREE_ARCHIVE_NOT_FOUND`, 409 `WORKTREE_ARCHIVE_IN_PROGRESS` and `WORKTREE_ARCHIVE_NOT_APPLIED`, otherwise 500 with the message and code; a 500 logs, the other statuses do not.

`Archive` is the record read from the snapshot commit's message: `{ id, ref, commit, head, path, branch, title, archivedAt, sessionIds, branchExists }`.

Service (`packages/web/server/lib/git/service.js`):

- `listWorktreeArchives(directory)`, `archiveWorktree(directory, { directory, id, sessionIds?, title? }, { bootstrapStore, disposeInstance? })`, `restoreWorktreeArchive(directory, { id })`, `deleteWorktreeArchive(directory, { id, deleteBranch? })`.
- Archive ids are `^[A-Za-z0-9_-]{1,80}$`; the archive is a snapshot commit of the worktree — every change git does not ignore — under `refs/openchamber/archive/<id>`, whose parent is the commit the branch stood on and whose message is `OpenChamber worktree archive` followed by the JSON record; nothing else records an archive, so the repository is the list.
- Archiving snapshots, records the sessions the caller archived, removes the worktree the way `removeWorktree` removes it while keeping its branch, and deletes the archive again when the removal fails; the primary workspace, a stray directory, a worktree that never finished setup and a second archive of the same path are refused.
- Restoring creates a new checkout of the recorded branch and applies the snapshot over commits the branch gained after archiving; conflicts stay in the checkout, which then holds the changes, and the archive is dropped; when git refuses the apply, the archive is kept and the call fails with `WORKTREE_ARCHIVE_NOT_APPLIED`.
- Deleting removes the ref and, when asked, the branch — never a branch a checkout uses.

Boundary: `/api/git/worktrees` is already an entry in `REFUSED_ACROSS_BOUNDARY_ROUTES` and the matcher treats entries as prefixes, so `/api/git/worktrees/archives` and `.../restore` are refused across a space boundary without a new rule; the dispatcher test proves both, and `packages/web/server/lib/spaces/DOCUMENTATION.md` lists the archive routes with that family.

Fork adaptations, recorded in the code comments and this task's Progress:

- Upstream passes `disposeInstance: canDisposeWorktreeInstance ? createWorktreeInstanceDisposer(...) : undefined`. Neither symbol exists here: there is no OpenCode URL or OpenCode auth header to build, and the OMP session teardown runs through the Agent Service. The route passes `bootstrapStore` only and the service takes `options.disposeInstance` as optional, unchanged from upstream.
- `worktreeBootstrapStore` is already injected into `git/routes.js` (lines 27, 166, 1517-1554), so the 501 branch matches an existing capability rather than a new one.
- The fork's Archive page carries isolated-space groups (`fromDeletedSpace`, `refreshSpaceArchives`, `useSpaceArchivesStore`); archive rows are added for each project without touching that handling.

## Done when

- [ ] The four routes are registered by `registerGitRoutes`, resolve Git only through the lazy `getGitLibraries()` import, and duplicate no Git logic; the three mutations are `userAction`.
- [ ] `listWorktreeArchives` reads `refs/openchamber/archive/*` once per call and answers newest first; ids are validated before any ref is built, and a message that is not an archive record is skipped rather than failing the list.
- [ ] `archiveWorktree` snapshots the worktree including uncommitted, non-ignored changes, records `sessionIds` and `title`, keeps the branch, removes the folder, and deletes the archive again when the removal fails; the primary workspace, a non-worktree directory, a worktree that never finished setup and a second archive of the same path are refused with the codes above.
- [ ] `restoreWorktreeArchive` creates a new checkout of the recorded branch, applies the snapshot over later commits, leaves conflicts in the checkout and drops the archive, and keeps the archive when git refuses the apply.
- [ ] `deleteWorktreeArchive` removes the ref and, when asked, the branch; a branch a checkout uses is never deleted.
- [ ] The routes answer 400/404/409/500/501 exactly as the Interfaces section states, and the injection of `worktreeBootstrapStore` is exercised through a behaviour (an archive that lands and one that fails) rather than a call count.
- [ ] Upstream's `describe('git worktree archive routes')` (three cases) and `describe('worktree archives')` (seven cases) are adopted and pass against the fork's route and service.
- [ ] The space boundary refuses `/api/git/worktrees/archives` and `/api/git/worktrees/archives/restore` across a boundary, with a dispatcher test for both and a line in the spaces documentation; no dispatcher rule is added if the existing `/api/git/worktrees` prefix already covers them.
- [ ] No `disposeInstance` wiring is invented for OMP: the route passes `bootstrapStore` only, and the Progress section records why upstream's OpenCode disposer is not adopted.
- [ ] `lib/worktrees/worktreeArchive.ts` is adopted (archive store keyed by project, `loadWorktreeArchives`, `useWorktreeArchivesByProject`, `archiveWorktreeWork`, `archivedWorktreeLabel`, `newArchiveId`, `takeRestoredWorktree`) and `lib/worktrees/worktreeManager.ts` gains `archiveProjectWorktree`, which is the only place the client calls `git.worktree.archive`.
- [ ] The Archive page lists a project's archived worktrees above its archived sessions — name, branch and archive date on one line, **Restore** at the end, **Delete** on hover (always shown on `touch`) — and Restore restores the worktree with the sessions it recorded; Delete offers the branch choice.
- [ ] `hooks/useMergedWorktreeCleanup.ts` archives through `archiveWorktreeWork` instead of reporting an archive it cannot perform; the fork's session archiving stays inside `archiveSessionsThenRemoveWorktree`.
- [ ] No second archive list or store exists, and no browser route mock, shim or empty-state placeholder stands in for the missing Host routes.
- [ ] Existing `sessions.archive.worktree.*` catalog keys are reused; any key the adopted code needs and the catalogs lack is added through task 20's catalogs in every locale it maintains.
- [ ] Product documentation is not edited here: `worktrees.mdx` and the Archive page prose belong to task 26, which waits for this task.

## Progress

Planned on 2026-10-30 by `flow-break` amend, from the ownership hole the upstream-refresh preflight found. The feature is half-adopted today, on integration `811ecef471`: the HTTP client and `GitAPI` members are present, `lib/worktrees/mergedWorktreeCleanup.ts` and `useMergedWorktreeCleanup` are mounted in `apps/AppEffects.tsx` and compute an `archive-only` outcome, the archive i18n keys exist, and `lib/worktrees/worktreeRemovalFlow.ts` with its test is present — but the Host has no archive route or service (`git/routes.js`, `git/service.js`), `worktreeManager.ts` has no `archiveProjectWorktree`, `lib/worktrees/worktreeArchive.ts` is absent, and `views/ArchiveView.tsx` renders sessions only. Task 08 deferred worktree archive rows to task 09 with the note that they wait for the Host endpoints; task 09 deferred the same rows to "Host endpoints"; no task owned them until this one.

Task 07's unlanded branch happens to carry copies of `worktreeManager.archiveProjectWorktree` and `components/views/archive/ArchivedWorktreeRow.tsx` as orphans (dead-code findings). This task is their owner: whichever branch lands second drops the duplicate copy, and nothing in this task's Check depends on task 07.
