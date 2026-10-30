# 33: Project repository batch routes

**Effort:** upstream-refresh
**Task type:** feature
**Base commit:** 811ecef47102ce4d737de56a7b41293e326a1e1e

**Started:** 2026-10-30T08:18:01+08:00

**Finished:** 2026-10-30T10:27:14+08:00

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

Missing, empty or non-array `directories`, or more than 200 unique normalized entries: 400 `{ "error": "…" }`. Entries go through the existing `resolveDirectoryQuery` normalization: whitespace is trimmed, values that do not resolve to a non-empty directory are dropped, duplicates collapse to the first occurrence, and order is preserved. The frozen client only sends strings; dropping an unresolvable entry fails only that read instead of the whole batch. The 200 response is used for every per-directory failure, so one bad project never hides the rest. A repository-check failure that is not a non-repository answer is `{ "directory": "/repo", "error": "Failed to read project repository" }`.

## Done when

- [x] `POST /api/git/projects` and `POST /api/git/project-worktrees` are registered by `registerGitRoutes`, resolve Git only through the lazy `getGitLibraries()` import, and add no second Git implementation or engine dependency.
- [x] Request contract matches the existing `gitApiHttp` caller: JSON body `{ directories: string[], fields?: Array<'status' | 'root'> }`; `directories` is required, entries are trimmed, empty entries dropped, duplicates removed at first occurrence, and at most 200 entries are accepted. A missing/empty/non-array `directories`, or more than 200, answers 400 with `{ error }`. The optional `directory` query is the client's routing context only; the body entries are authoritative and a missing query is not a 400.
- [x] Both routes preserve input order and answer `{ projects: Entry[] }`, with a worker pool of at most 4 directories. A per-directory failure is an entry, never a whole-batch 500.
- [x] `/api/git/projects` always answers `isGitRepository` (a non-repository is `false`, not an error). `status` is read only when `fields` contains `status`; a status read calls `observeWorktreeTopology(directory)` without awaiting it, mirroring `GET /api/git/status`. `root` is read only when `fields` contains `root`, as `(await resolvePrimaryWorktreeRoot(directory)).root`. A requested field that fails is `null` and named in `errors` (`'status'` or `'root'`); the other field still answers. A non-repository with status requested reuses the canonical `nonRepoStatusPayload()` from the existing status route verbatim; with root requested it answers `root: null`. A non-repository error from the repository check becomes that canonical non-repository entry, not an `error`.
- [x] `/api/git/project-worktrees` calls `getWorktrees(directory)`, enriches provenance through the same `contributorProvenance.readMany` helper `GET /api/git/worktrees` uses (extract the shared helper rather than duplicating the loop), calls `observeWorktreeTopology` only for a non-empty listing, and answers `{ directory, worktrees }`. A read failure answers `{ directory, worktrees: null, errors: ['worktrees'] }`; a non-repository's authoritative empty list is a success.
- [x] The space boundary matches upstream: `/api/git/project-worktrees` is `refused_across_boundary`, while `/api/git/projects` is allowed to run for a space directory. The dispatcher tests cover both classifications and the spaces documentation lists the refused route.
- [x] Focused tests cover validation (missing, empty, non-string, duplicates, 200 and 201 entries), input order, field selection, canonical non-repository status/root, one directory failing without blanking others, provenance parity with the existing worktree route, and per-directory worktree failure. Topology notification and the 4-worker bound are throwaway smoke checks or invariant observations only; permanent tests must not assert `observeWorktreeTopology` call counts or worker internals.
- [x] Existing `gitApiHttp` batch tests stay green unchanged; no client endpoint, body shape, response field or cache behavior is renamed.
- [x] Real path records the app and route observations above, the fixture setup, and the provider limit. A mock that intercepts `/api/git/projects` or `/api/git/project-worktrees` in the browser does not count.

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

### Reviews and batched fixes

- **B (quality):** 0 blocking, 4 nonblocking. Fixed: removed `projects.filter(Boolean)` so every unique input keeps its entry; task Interfaces now matches the tested normalization (unresolvable entries dropped, 400 only for missing/empty/non-array or >200); Git docs now name the hard `{ directory, error }` repository-check shape. The whitespace client mismatch was noted only; the frozen client was not changed.
- **Security:** 0 blocking, 2 nonblocking. Fixed B1 by reconciling the contract text to the existing tested upstream normalization; fixed B2 by removing the client-supplied directory from all four new per-entry failure logs. No parser, space-UI or pre-existing boundary behavior was changed.
- Focused suites still pass 98/98; `node --check` on the changed server route exits 0; anti-slop on the authored delta has 0 findings (artifact record). The real app/fixture smoke and W5 evidence remain pending the heavy slot; no Done-when box is checked.

### Rebase and real path

- Rebased onto integration `d909d974f2f3645f8dd1a35c44920768b63f2bda`; the original Base commit stays `811ecef47102ce4d737de56a7b41293e326a1e1e`. Only conflict was task 31's dependency line; the integration version `07, 35` was kept.
- Frozen install (Bun 1.4.4) exit 0; root type-check exit 0; root lint exit 0; focused web suites 98/98; unchanged `gitApiHttp` contract suite 64/64.
- Real app on isolated ports 3730/3731 with the fixture repo: Board selected `fixture-repo` through its Project picker and showed Issues / Pull requests / Linear tabs; the page's own POSTs to `/api/git/projects` and `/api/git/project-worktrees` both answered **200** (network receipts below), with the project body showing `isGitRepository: true` and the worktree body listing `main` plus the linked `feature` worktree.
- Files panel for the fixture session listed `.git`, `src`, `README.md`, `rename-me.txt` and `uncommitted.txt`; opening `README.md` showed its `Fixture` heading. Screenshots: `final/board-final.png`, `final/board-final-chooser.png`, `final/files-readme-open.png`, `final/files-final.png`. Network status: `final/network-projects-final-status.txt` and `final/network-project-worktrees-final-status.txt` both show Status 200 (the final projects response content-length is 258 with `fields:["root"]`; the final status captures retain no response body). The saved `final/network-projects-body.json` and `final/network-project-worktrees-body.json` are earlier same-app page request bodies, not the final 10:24 requests. Provider issue/PR listing was not claimed; the baseline Board showed Connect GitHub, and the fixture is the named stand-in.
- A/B/security history: original reports at `review-quality.md` and `review-security.md` in the task artifact root; rebase checks at `final/review-quality-rebase.md` and `final/review-security-rebase.md`. The rebase reviewers reported 0 blocking findings; no source-text or forwarding tests were added.
- Review boundary: `d909d974f2` + the seven declared source/doc paths (`packages/web/server/lib/git/{routes.js,routes.test.js,DOCUMENTATION.md}`, `packages/web/server/lib/spaces/{dispatcher.js,dispatcher.test.js,DOCUMENTATION.md}`, and the task 33 record; the development entry is the eighth docs path in this archive); round: 3; briefs: A,B,sec; boundaries: batch intake, per-entry HTTP bodies, provenance, space boundary, auth registration; findings: B 0 blocking/4 nonblocking at `467cf35f2`, security 0 blocking/2 nonblocking at `467cf35f2`, rebase B/sec 0 new blocking at `53e2388378`, A 5 blocking docs/evidence corrections at `75832abae` all closed in this docs-only commit; A recheck pending.

### Final check after

- Frozen install with Bun 1.4.4: actual command and exit trace in `final/exit-codes.txt` (`bun install --frozen-lockfile`, exit 0); `final/install.log` is the auxiliary output and does not repeat the flag.
- Root type-check exit 0 (`final/type-check.log`, `final/type-check.exit`); root lint exit 0 (`final/lint.log`, `final/lint.exit`).
- Focused web suites 98/98 (`final/focused-web.log`); unchanged `gitApiHttp` contract suite 64/64 (`final/gitApiHttp-contract.log`).
- Final root `bun run test` exit 0: 7/7 suites; web 461 files passed / 9 skipped, 7,393 tests passed / 142 skipped; electron 54/54; agent-service 250 passed / 7 skipped. Receipts: `final/root-test.log`, `final/root-test.exit`.
- Real-path receipts: `final/board-final.png`, `final/board-final-chooser.png`, `final/files-readme-open.png`, `final/files-final.png`; network Status 200 lines in `final/network-projects-final-status.txt` and `final/network-project-worktrees-final-status.txt`. The `*-body.json` files are earlier same-app page bodies, not those final requests.
- This archive/docs-only commit changes no code; no heavy rerun is needed for it.

