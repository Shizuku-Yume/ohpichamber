# 35: Worktree archive end to end

**Effort:** upstream-refresh
**Task type:** feature
**Base commit:** <commit-sha>

**Delivers:** A finished worktree can be archived, restored and deleted for good. The Host answers upstream's worktree-archive endpoints against `refs/openchamber/archive/<id>`, releasing the workers that hold the folder before it removes it, and the Archive page lists each project's archived worktrees with **Restore** and **Delete**, so merged-worktree cleanup and the row's own archive action stop at a real Host route instead of a missing one.

**Blocked by:** None
**Files:** No new upstream adoption path: every upstream file below is already counted in an earlier task's list, and the two fork-owned internal routes are the fork's own. Host: `packages/web/server/lib/git/{service.js,routes.js,routes.test.js,service.test.js,DOCUMENTATION.md}` (task 01). Boundary: `packages/web/server/lib/spaces/{dispatcher.js,dispatcher.test.js,DOCUMENTATION.md}` (task 22/33). Composition root: `packages/web/server/index.js` (task 22) — one injected worker-lease hook, no other edit. Agent Service: `packages/agent-service/src/supervisor/{service.ts,workers.ts}` (the worktree lease and the directory-scoped release), `packages/agent-service/src/supervisor/service-capacity.test.ts` (the eviction proofs this task extends), a new `packages/agent-service/src/supervisor/service-worktree-lease.test.ts`, and `packages/agent-service/DOCUMENTATION.md`. Client: `packages/ui/src/lib/worktrees/{worktreeArchive.ts,worktreeManager.ts}` (task 09), `packages/ui/src/components/views/{ArchiveView.tsx,archive/ArchivedWorktreeRow.tsx}` (tasks 01 and 08), `packages/ui/src/hooks/useMergedWorktreeCleanup.ts` (task 24). The HTTP client is already on the integration branch and stays unchanged: `packages/ui/src/lib/gitApiHttp.ts` (`archiveGitWorktree`, `listGitWorktreeArchives`, `restoreGitWorktreeArchive`, `deleteGitWorktreeArchive`, lines 1636-1650), `packages/ui/src/lib/gitApi.ts` (`worktreeArchivesAvailable`, runtime dispatch), `packages/ui/src/lib/api/types.ts` (`GitWorktreeArchive`, `ArchiveGitWorktreePayload`, `GitWorktreeArchiveRestoreResult`, `DeleteGitWorktreeArchivePayload`, the four optional `GitAPI` members). Tasks 01, 08, 09 and 22 are archived, so this task edits their files.

**Read first:** Spec W5 and W6; upstream `0056bf6a9:packages/web/server/lib/git/routes.js` (archive block, lines 1830-1900) and `service.js` (archive block, lines 6605-6875); upstream `routes.test.js` `describe('git worktree archive routes')` (line 688) and `service.test.js` `describe('worktree archives')` (line 4760); `packages/web/server/lib/git/DOCUMENTATION.md`; the fork's `packages/web/server/lib/spaces/dispatcher.js` (`REFUSED_ACROSS_BOUNDARY_ROUTES`); the fork's removal and worker lifecycle: `packages/web/server/lib/git/service.js` `removeWorktree` (line 5913 — waits for an active bootstrap only), `packages/web/server/lib/openchamber-sessions/routes.js` `POST /api/openchamber/sessions/archive` (line 440) and its `archive` (line 241, `archiveStore.archive` — a metadata write), `packages/ui/src/lib/worktrees/worktreeRemovalFlow.ts` (`archiveSessionsThenRemoveWorktree`), `packages/agent-service/src/supervisor/workers.ts` (`workerEntries`, `withRoot`, `start`, `stop`, `evict` at line 473, `sessionIsIdle`, `hasNoRunningShellJobs`, the reaper and `WORKER_CAPACITY_POLICY` at line 54), `packages/agent-service/src/supervisor/service.ts` (`admit` at line 218, `DELETE /api/agent/v1/sessions/:id` at line 568, `DELETE /internal/workers/:rootSessionId` at line 629), `packages/agent-service/src/protocol.ts` (`WorkerBootstrap.cwd`), `packages/agent-service/src/supervisor/service-capacity.test.ts` (line 130, the idle unload; lines 215-224, the busy refusal); `packages/ui/src/lib/gitApiHttp.ts` archive section; upstream `packages/ui/src/lib/worktrees/worktreeArchive.ts` (285 lines), `components/views/archive/ArchivedWorktreeRow.tsx`, `components/views/ArchiveView.tsx`; `.agents/skills/locale-ui-patterns/SKILL.md`; `.agents/skills/performance-engineering/SKILL.md`.
**Covers:** W6

**Check:** `bun install --frozen-lockfile` and `bun run type-check` and `bun run lint` and `bun run test` all exit 0, `bun run --cwd packages/web test -- server/lib/git/routes.test.js server/lib/git/service.test.js server/lib/spaces/dispatcher.test.js server/lib/git/routes.change-id.test.js` and `bun run --cwd packages/agent-service test -- src/supervisor/service-capacity.test.ts src/supervisor/service-worktree-lease.test.ts` pass, and with the dev server on a local fixture repository:

- a linked worktree holding one uncommitted change is archived with `POST /api/git/worktrees/archives?directory=<project>` (200, folder gone, branch kept), even while a session opened in that worktree has an idle worker;
- `GET /api/git/worktrees/archives?directory=<project>` lists it with its branch, title and `sessionIds`; `POST /api/git/worktrees/archives/restore` puts the change back in a new checkout of that branch (200); `DELETE /api/git/worktrees/archives` removes the archive and, when asked, the branch;
- with a run in flight in that worktree, the same archive answers 409 `RUN_ACTIVE`, the folder stays and no ref is left behind;
- a session open at the path while an archive holds it answers 409 `COMMAND_IN_FLIGHT` and creates no worker.

Real path: a local fixture repository and no credentials; the HTTP observation is a throwaway script or the browser network panel, and a browser route mock does not count.

## Interfaces

### Archive routes

Host, all under `registerGitRoutes` and behind the existing lazy `getGitLibraries()` import:

- `GET /api/git/worktrees/archives?directory=<any checkout of the project>` → 200 `{ archives: Archive[] }`, newest `archivedAt` first. 400 `{ error: 'directory parameter is required' }` without the query.
- `POST /api/git/worktrees/archives?directory=<project>`, body `{ directory: <worktree path>, id, sessionIds?, title? }` → 200 `Archive`; `userAction`.
- `POST /api/git/worktrees/archives/restore?directory=<project>`, body `{ id }` → 200 `{ id, conflicts }`; `userAction`.
- `DELETE /api/git/worktrees/archives?directory=<project>`, body `{ id, deleteBranch? }` → 200 `{ id, branchDeleted }`; `userAction`.
- Status policy for the archive call: 400 for a missing `directory` (query or body) or a directory that does not resolve; 404 `WORKTREE_ARCHIVE_NOT_FOUND`; 409 `WORKTREE_ARCHIVE_IN_PROGRESS` and `WORKTREE_ARCHIVE_NOT_APPLIED`; 409 `RUN_ACTIVE` and `COMMAND_IN_FLIGHT` relayed from the supervisor with its code and the session or lease it names; 501 `{ error: 'Worktree bootstrap storage is not available' }` when the injected `worktreeBootstrapStore.remove` is missing and 501 `{ error: 'Worker lifecycle control is not available' }` when the lease hook is missing — both before any git or filesystem change; 503 `SERVICE_UNAVAILABLE` when the Agent Service cannot be reached or does not answer the lease; 500 only for an unexpected local failure. Only the 500 branch logs.

`Archive` is the record read from the snapshot commit's message: `{ id, ref, commit, head, path, branch, title, archivedAt, sessionIds, branchExists }`.

### Worker lease (Agent Service, internal and SDK-private)

Two private supervisor routes beside `/internal/workers`, reachable only by the Host through its existing `service.request` client (`packages/web/server/index.js` lines 1637-1658), never by the UI or an SDK caller:

```
POST /internal/worktree-leases      { directory: <absolute path> }
  201 { leaseId, released: [rootSessionId, ...] }
  400 INVALID_REQUEST      the directory is relative or empty
  409 RUN_ACTIVE           a session worker at that directory has an active run; details { sessionId }
  409 COMMAND_IN_FLIGHT    a worker there is starting, has pending operations or actions, has a
                           running shell job, or holds a restart reservation; details { sessionId }
DELETE /internal/worktree-leases/:leaseId      -> 204, idempotent
```

- Acquiring a lease is the release: under the pool's existing per-root serialization, `WorkerRegistry` enumerates **every** session worker whose `WorkerBootstrap.cwd` is the directory or inside it and runs the same guarded stop as `evict` (idle probe, no pending operations or actions, no running shell jobs, no restart reservation). The response lists the roots it stopped. Subagent sessions do not own workers; they ride their root, so a child session in the worktree is covered by its root's entry, and the root id is what the response names.
- A refusal creates no lease. Workers already stopped before the refusing one stay stopped; the caller sees 409 and changes nothing on disk, so sessions that still need a worker simply reopen cold.
- While a lease exists, `admit` — the single admission point for `POST /internal/sessions`, `POST /internal/workers` and reopen — answers 409 `COMMAND_IN_FLIGHT` with `details { leaseId }` for any `cwd` inside the leased directory, so no worker can start or reopen under a folder that is being removed. The lease is also checked in `WorkerRegistry.start` so a direct start cannot slip past.
- A lease expires after `capacityPolicy.worktreeLeaseTimeoutMs` (new constant, default 60 s, `unref`'d timer like the reaper) and expires with the service, so a Host that dies mid-archive cannot wedge a directory forever.
- The directory is the authority, never a caller-supplied id list: the Host validates and canonicalizes the worktree path before calling (it is the same path it is about to remove), and the service re-checks that it is absolute. `sessionIds` in the archive body is record metadata only and is not used to decide which workers to stop.

### Archive service

Service (`packages/web/server/lib/git/service.js`):

- `listWorktreeArchives(directory)`, `archiveWorktree(directory, { directory, id, sessionIds?, title? }, { bootstrapStore, worktreeWorkers })`, `restoreWorktreeArchive(directory, { id })`, `deleteWorktreeArchive(directory, { id, deleteBranch? })`, where `worktreeWorkers` is the injected `{ acquire(directory): Promise<{ leaseId, released }>, release(leaseId): Promise<void> }`.
- Archive ids are `^[A-Za-z0-9_-]{1,80}$`; the archive is a snapshot commit of the worktree — every change git does not ignore — under `refs/openchamber/archive/<id>`, whose parent is the commit the branch stood on and whose message is `OpenChamber worktree archive` followed by the JSON record; nothing else records an archive, so the repository is the list.
- Order of an archive: acquire the lease (nothing on disk is touched before it), snapshot and write the ref, remove the worktree the way `removeWorktree` removes it while keeping its branch, and release the lease in a `finally`. A failed snapshot or removal deletes the ref it wrote, leaves the folder or restores the caller's archived sessions where the upstream flow already did, and still releases the lease. The primary workspace, a stray directory, a worktree that never finished setup and a second archive of the same path are refused.
- Restoring creates a new checkout of the recorded branch and applies the snapshot over commits the branch gained after archiving; conflicts stay in the checkout, which then holds the changes, and the archive is dropped; when git refuses the apply, the archive is kept and the call fails with `WORKTREE_ARCHIVE_NOT_APPLIED`.
- Deleting removes the ref and, when asked, the branch — never a branch a checkout uses.

Boundary: `/api/git/worktrees` is already an entry in `REFUSED_ACROSS_BOUNDARY_ROUTES` and the matcher treats entries as prefixes, so `/api/git/worktrees/archives` and `.../restore` are refused across a space boundary without a new rule; the dispatcher test proves both, and `packages/web/server/lib/spaces/DOCUMENTATION.md` lists the archive routes with that family.

### Fork adaptations

- Upstream passes `disposeInstance: canDisposeWorktreeInstance ? createWorktreeInstanceDisposer({ buildOpenCodeUrl, getOpenCodeAuthHeaders }) : undefined`, which tears down an OpenCode HTTP instance for the worktree. The fork has no OpenCode runtime, and the worker lease above is the equivalent: the Agent Service owns the workers, releases every one at that directory and refuses new ones until the folder is gone. No adapter, no OpenCode URL or auth header, and no second lifecycle path is added.
- `worktreeBootstrapStore` is already injected into `git/routes.js` (lines 27, 166, 1517-1554); the archive route keeps using it as upstream does and adds the lease hook beside it.
- The fork's Archive page carries isolated-space groups (`fromDeletedSpace`, `refreshSpaceArchives`, `useSpaceArchivesStore`); archive rows are added for each project without touching that handling.

## Done when

- [ ] The four archive routes are registered by `registerGitRoutes`, resolve Git only through the lazy `getGitLibraries()` import, duplicate no Git logic, and the three mutations are `userAction`.
- [ ] `listWorktreeArchives` reads `refs/openchamber/archive/*` once per call and answers newest first; ids are validated before any ref is built, and a message that is not an archive record is skipped rather than failing the list.
- [ ] `archiveWorktree` acquires the lease before it touches anything, and releases it in a `finally` on every path; with the lease hook missing the route answers 501 before any git work and removes nothing.
- [ ] `archiveWorktree` snapshots the worktree including uncommitted, non-ignored changes, records `sessionIds` and `title`, keeps the branch, removes the folder, and deletes the archive again when the removal fails; the primary workspace, a non-worktree directory, a worktree that never finished setup and a second archive of the same path are refused with the documented codes.
- [ ] `POST /internal/worktree-leases` releases every session worker whose `WorkerBootstrap.cwd` is the leased directory or inside it, and answers the roots it stopped; a worker at another directory is untouched, so the scoping is by path, not by a caller-supplied id list.
- [ ] A run in flight at the leased directory refuses the lease with 409 `RUN_ACTIVE`; a starting worker, pending operations or actions, a running shell job or a restart reservation refuses it with 409 `COMMAND_IN_FLIGHT`; a refusal creates no lease, and no archive ref is written.
- [ ] While a lease is held, `admit` answers 409 `COMMAND_IN_FLIGHT` with `details { leaseId }` for `POST /internal/sessions`, `POST /internal/workers` and reopen at any path inside the directory, and `WorkerRegistry.start` refuses the same way; the same call succeeds after `DELETE /internal/worktree-leases/:leaseId`.
- [ ] A lease expires after `worktreeLeaseTimeoutMs` on the reaper-style `unref`'d timer and does not outlive the service; an expired lease no longer blocks admission.
- [ ] The archive call maps supervisor refusals to 409 with the supervisor's code and the session or lease it names, answers 503 when the Agent Service cannot be reached, and 500 only for unexpected local failures; only 500 logs.
- [ ] `restoreWorktreeArchive` creates a new checkout of the recorded branch, applies the snapshot over later commits, leaves conflicts in the checkout and drops the archive, and keeps the archive when git refuses the apply.
- [ ] `deleteWorktreeArchive` removes the ref and, when asked, the branch; a branch a checkout uses is never deleted.
- [ ] Upstream's `describe('git worktree archive routes')` (three cases) and `describe('worktree archives')` (seven cases) are adopted and pass against the fork's route and service.
- [ ] The space boundary refuses `/api/git/worktrees/archives` and `/api/git/worktrees/archives/restore` across a boundary, with a dispatcher test for both and a line in the spaces documentation; no dispatcher rule is added if the existing `/api/git/worktrees` prefix already covers them.
- [ ] New supervisor tests cover, behaviourally: an idle worker at the leased directory is stopped and its session reopens cold; a run in flight refuses the lease; two workers at the directory are stopped while one elsewhere is not; admission inside a lease is refused and succeeds after release; an expired lease stops blocking; and the archive call leaves neither a ref nor a missing folder on a refusal. No test asserts call counts of internal helpers.
- [ ] `lib/worktrees/worktreeArchive.ts` is adopted (project-keyed archive store, `loadWorktreeArchives`, `useWorktreeArchivesByProject`, `archiveWorktreeWork`, `archivedWorktreeLabel`, `newArchiveId`, `takeRestoredWorktree`) and `lib/worktrees/worktreeManager.ts` gains `archiveProjectWorktree`, the only place the client calls `git.worktree.archive`.
- [ ] The Archive page lists a project's archived worktrees above its archived sessions — name, branch and archive date on one line, **Restore** at the end, **Delete** on hover (always shown on `touch`) — Restore brings the worktree back with the sessions it recorded, and Delete offers the branch choice.
- [ ] `hooks/useMergedWorktreeCleanup.ts` archives through `archiveWorktreeWork` instead of reporting an archive it cannot perform; the fork's session archiving stays inside `archiveSessionsThenRemoveWorktree`.
- [ ] No second archive list or store exists, and no browser route mock, shim or empty-state placeholder stands in for the missing Host routes.
- [ ] Existing `sessions.archive.worktree.*` catalog keys are reused; any key the adopted code needs and the catalogs lack is added through task 20's catalogs in every locale it maintains.
- [ ] Product documentation is not edited here: `worktrees.mdx` and the Archive page prose belong to task 26, which waits for this task.

## Progress

Planned on 2026-10-30 by `flow-break` amend, from the ownership hole the upstream-refresh preflight found, and revised that day when a review rejected a release keyed on client-supplied session ids. The feature is half-adopted on integration `b76832437d`: the HTTP client and `GitAPI` members are present, `lib/worktrees/mergedWorktreeCleanup.ts` and `useMergedWorktreeCleanup` are mounted in `apps/AppEffects.tsx` and compute an `archive-only` outcome, the archive i18n keys exist, and `lib/worktrees/worktreeRemovalFlow.ts` with its test is present — but the Host has no archive route or service (`git/routes.js`, `git/service.js`), the Agent Service has no way to release the workers of a directory, `worktreeManager.ts` has no `archiveProjectWorktree`, `lib/worktrees/worktreeArchive.ts` is absent, and `views/ArchiveView.tsx` renders sessions only. Task 08 deferred worktree archive rows to task 09 with the note that they wait for the Host endpoints; task 09 deferred the same rows to "Host endpoints"; no task owned them until this one.

### Lifecycle facts (2026-10-30)

- `removeWorktree` (`packages/web/server/lib/git/service.js:5913`) waits for an active worktree bootstrap (`waitForActiveWorktreeBootstrap`) and refuses the primary workspace and unregistered directories; it checks no worker, so on its own it would delete a directory a live worker still has as its `cwd`.
- Archiving a session is a metadata write: `POST /api/openchamber/sessions/archive` (routes.js:440) calls `service.archive` (routes.js:241) and `archiveStore.archive(ids, archivedAt)`. It neither stops a worker nor refuses a running session. `archiveSessionsThenRemoveWorktree` (`lib/worktrees/worktreeRemovalFlow.ts:14`) archives the sessions before the removal for the directory's sake — an archived session must still exist while its folder does — not for the worker's.
- The Agent Service is the only place that knows which workers hold which directories: `WorkerRegistry.workerEntries` holds each session `WorkerBootstrap`, whose `cwd` is the worktree (`protocol.ts`), and `Workers.authorizationScope` exposes the same scope internally. `GET /internal/workers` returns `WorkerInfo` without `cwd`, and `GET /api/agent/v1/sessions?workspaceId=` returns a project-relative `displayPath`; neither can be used by the Host to enumerate a directory's workers. That is why the release belongs to the service and the directory is the input.
- The existing guarded stop is `Workers.evict` (`workers.ts:473`): 409 `RUN_ACTIVE` when the session is not idle, 409 `COMMAND_IN_FLIGHT` when the worker is starting, has pending operations or actions, has running shell jobs, or holds a restart reservation; `session-capacity.test.ts:130` proves the idle unload ("the session reopens cold with history intact") and `:215`-`:224` the busy refusal. The lease reuses exactly that body under the existing per-root serialization (`withRoot`).
- `DELETE /api/agent/v1/sessions/:id` (supervisor `service.ts:568`) → `SessionRegistry.delete` refuses `RUN_ACTIVE` and then deletes the session itself. The archive path must not use it; releasing a worker is not deleting its session.
- Idle workers are also reaped by the supervisor: `idleEvictionTimeoutMs` is 600 s (`workers.ts:56`) with a "not idle proven" probe (`:324`-`:342`). The lease is what makes the archive race-free rather than relying on that timer.
- Admission funnels through `SupervisorService.admit` (`service.ts:218`) for `POST /internal/sessions`, `POST /internal/workers` and reopen, which is where the lease check stops a start or reopen during removal; `WorkerRegistry.start` repeats the check so a direct call cannot bypass it.
- The Host reaches the supervisor through `hostAgentRuntime.service.request` (`packages/web/server/index.js:1637`, `:1651`, `:1658`). `registerGitRoutes` receives no such hook today (`git/routes.js:24`-`29`), so this task adds one injected lease hook and nothing else.

Recorded limits: the lease covers session workers, which is what can hold the folder; stateless and usage workers carry their own `cwd` and are excluded by kind (they are Host-internal reads with no session in the worktree). A lease is per directory, so an archive of a parent and a child path at once is out of scope: the client archives one worktree at a time. No worker start is possible inside a lease, so a "worker appears after the release" race is closed by construction rather than by a post-check.

### Relationship to task 07

Task 07's unlanded branch carries copies of `worktreeManager.archiveProjectWorktree` and `components/views/archive/ArchivedWorktreeRow.tsx` as orphans (dead-code findings). This task is their owner: whichever branch lands second drops the duplicate copy, and nothing in this task's Check depends on task 07.
