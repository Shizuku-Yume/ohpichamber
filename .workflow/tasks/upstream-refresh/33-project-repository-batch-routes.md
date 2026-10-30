# 33: Project repository batch routes

**Effort:** upstream-refresh
**Task type:** feature
**Base commit:** 811ecef47102ce4d737de56a7b41293e326a1e1e

**Started:** 2026-10-30T08:18:01+08:00

**Status:** active

**Delivers:** The Host answers `POST /api/git/projects` and `POST /api/git/project-worktrees` for the canonical project-overview client, so Board/Files discovery and worktree reads stop at a real Host route instead of a 404. The routes are the missing behavior from upstream `0056bf6a9`; they run on the fork's Git service and space boundary.

**Blocked by:** None
**Files:** No new upstream adoption path. `packages/web/server/lib/git/routes.js` (only the two batch handlers and the shared provenance helper; other routes unchanged), `packages/web/server/lib/git/routes.test.js` (focused cases), `packages/web/server/lib/git/DOCUMENTATION.md`, plus the fork-owned boundary files `packages/web/server/lib/spaces/dispatcher.js`, `packages/web/server/lib/spaces/dispatcher.test.js` and `packages/web/server/lib/spaces/DOCUMENTATION.md`. `packages/ui/src/lib/gitApiHttp.ts` and its tests already define the caller contract and must stay unchanged unless a test proves a real mismatch. The route file is task 01's assigned path and the dispatcher is fork-owned, so the 4,031-path accounting does not change.

**Read first:** task 07's Check and Blocked section; upstream `0056bf6a9:packages/web/server/lib/git/routes.js` handlers and the `batched project reads` block in its `routes.test.js`; current `packages/web/server/lib/git/routes.js` (`/api/git/check`, `/api/git/status`, `/api/git/primary-root`, `/api/git/worktrees`), `packages/web/server/lib/git/service.js` (`isGitRepository`, `getStatus`, `resolvePrimaryWorktreeRoot`, `getWorktrees`), `packages/web/server/lib/spaces/dispatcher.js`, `packages/ui/src/lib/gitApiHttp.ts` batch section, and `.workflow/done/upstream-refresh/22-web-host-core.md` for the fork-owned dispatcher.
**Covers:** W5

**Check:** `bun install --frozen-lockfile` and `bun run type-check` and `bun run lint` and `bun run test` all exit 0; `bun run --cwd packages/web test -- server/lib/git/routes.test.js server/lib/spaces/dispatcher.test.js` passes; and in the running app against a local fixture repository the Board discovers the repository, the Files tree opens a file, and the page's own requests to both new routes answer 200 (observed in the server log or browser network panel). Real path: no source-control account is required; the fixture is the accepted alternative, and provider issue/PR/diff/review behavior stays unexercised and named. No browser-level route mock satisfies this Check.

## Interfaces

`POST /api/git/projects?directory=<routing context>` and `POST /api/git/project-worktrees?directory=<routing context>`, both JSON.

Request:

```json
{ "directories": ["/repo", "/plain"], "fields": ["status", "root"] }
```

`fields` is optional and only `status`/`root` are read; unrecognised values are ignored. Both endpoints answer 200 with `{ "projects": Entry[] }` in normalized input order. `Entry` carries `directory` and, only where applicable, `isGitRepository`, `status`, `root`, `worktrees`, `errors` or `error`.

Project entry with both fields:

```json
{ "directory": "/repo", "isGitRepository": true, "status": { "...": "the same object GET /api/git/status returns" }, "root": "/repo" }
```

Non-repository entry with both fields:

```json
{ "directory": "/plain", "isGitRepository": false, "status": { "isGitRepository": false, "files": [], "branch": null, "ahead": 0, "behind": 0 }, "root": null }
```

Per-field failure keeps the entry and the other field:

```json
{ "directory": "/repo", "isGitRepository": true, "status": null, "root": "/repo", "errors": ["status"] }
```

Worktree entry:

```json
{ "directory": "/repo", "worktrees": [{ "path": "/repo", "branch": "main", "head": "…", "name": "repo" }] }
```

Worktree read failure/empty repository:

```json
{ "directory": "/repo", "worktrees": null, "errors": ["worktrees"] }
{ "directory": "/plain", "worktrees": [] }
```

Invalid batch (missing/empty `directories`, non-string entry, or more than 200): 400 `{ "error": "…" }`. The 200 response is used for every per-directory failure, so one bad project never hides the rest.

## Done when

- [ ] `POST /api/git/projects` and `POST /api/git/project-worktrees` are registered by `registerGitRoutes`, resolve Git only through the lazy `getGitLibraries()` import, and add no second Git implementation or engine dependency.
- [ ] Request contract matches the existing `gitApiHttp` caller: JSON body `{ directories: string[], fields?: Array<'status' | 'root'> }`; `directories` is required, entries are trimmed, empty entries dropped, duplicates removed at first occurrence, and at most 200 entries are accepted. A missing/empty/non-array `directories`, or more than 200, answers 400 with `{ error }`. The optional `directory` query is the client's routing context only; the body entries are authoritative and a missing query is not a 400.
- [ ] Both routes preserve input order and answer `{ projects: Entry[] }`, with a worker pool of at most 4 directories. A per-directory failure is an entry, never a whole-batch 500.
- [ ] `/api/git/projects` always answers `isGitRepository` (a non-repository is `false`, not an error). `status` is read only when `fields` contains `status`; a status read calls `observeWorktreeTopology(directory)` without awaiting it, mirroring `GET /api/git/status`. `root` is read only when `fields` contains `root`, as `(await resolvePrimaryWorktreeRoot(directory)).root`. A requested field that fails is `null` and named in `errors` (`'status'` or `'root'`); the other field still answers. A non-repository with status requested reuses the canonical `nonRepoStatusPayload()` from the existing status route verbatim; with root requested it answers `root: null`. A non-repository error from the repository check becomes that canonical non-repository entry, not an `error`.
- [ ] `/api/git/project-worktrees` calls `getWorktrees(directory)`, enriches provenance through the same `contributorProvenance.readMany` helper `GET /api/git/worktrees` uses (extract the shared helper rather than duplicating the loop), calls `observeWorktreeTopology` only for a non-empty listing, and answers `{ directory, worktrees }`. A read failure answers `{ directory, worktrees: null, errors: ['worktrees'] }`; a non-repository's authoritative empty list is a success.
- [ ] The space boundary matches upstream: `/api/git/project-worktrees` is `refused_across_boundary`, while `/api/git/projects` is allowed to run for a space directory. The dispatcher tests cover both classifications and the spaces documentation lists the refused route.
- [ ] Focused tests cover validation (missing, empty, non-string, duplicates, 200 and 201 entries), input order, field selection, canonical non-repository status/root, one directory failing without blanking others, provenance parity with the existing worktree route, and per-directory worktree failure. Topology notification and the 4-worker bound are throwaway smoke checks or invariant observations only; permanent tests must not assert `observeWorktreeTopology` call counts or worker internals.
- [ ] Existing `gitApiHttp` batch tests stay green unchanged; no client endpoint, body shape, response field or cache behavior is renamed.
- [ ] Real path records the app and route observations above, the fixture setup, and the provider limit. A mock that intercepts `/api/git/projects` or `/api/git/project-worktrees` in the browser does not count.

## Progress

### Start

Worktree `/home/shizuku/Project/ohpichamber-worktrees/upstream-refresh-33`, branch `upstream-refresh/33-project-repository-batch-routes`, cut from landed plan `811ecef471`.
`Dirty at start: none`. Blockers: `None`; no task archive prerequisite.

### Check before

A throwaway Express app that registers `registerGitRoutes` and posts to both endpoints (no dev server) reproduces the gap:

```
POST /api/git/projects 404 {}
POST /api/git/project-worktrees 404 {}
```

The routes are not registered. Implementation and focused tests are on the branch; the real-path app run is pending the coordinator's release of the task-19 heavy slot.

### Check after (partial; real app path pending)

- Focused web suites: 2 files, 98/98 tests pass (`server/lib/git/routes.test.js`, `server/lib/spaces/dispatcher.test.js`).
- `bunx tsc -p packages/web/tsconfig.json --noEmit` exit 0; `bun run --cwd packages/web lint` exit 0.
- A throwaway Express app with the real Git service (no mock, no dev server) now answers both routes: `projects` 200 with a real repo entry (status/root) plus a non-repo canonical entry, and `project-worktrees` 200 with the repo's worktree list.
- Real app + fixture UI path and the full task Check remain owed after the heavy slot is released. No archive, no landing, no task 34.

