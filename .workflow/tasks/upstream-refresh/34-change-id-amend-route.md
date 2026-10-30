# 34: Change-Id amend route and GitAPI contract

**Effort:** upstream-refresh
**Task type:** feature
**Base commit:** 811ecef47102ce4d737de56a7b41293e326a1e1e
**Started:** 2026-10-30T08:31:00+08:00
**Status:** active

**Delivers:** The Host answers `POST /api/git/change-id` by amending HEAD through the canonical Change-Id service, with the upstream route test and branch-status invalidation. The UI client exposes the call as `GitAPI.addChangeIdToHead` so task 07's `PullRequestSection` no longer imports the HTTP function directly.

**Blocked by:** None
**Files:** `packages/web/server/lib/git/routes.js` (the single route, wrapped in `userAction`), `packages/web/server/lib/git/routes.change-id.test.js` (adopt upstream's route test plus the cached-status behavior), `packages/web/server/lib/git/DOCUMENTATION.md`, `packages/web/server/lib/host/feature-routes-runtime.js` (pass `onBranchRewritten`), `packages/ui/src/lib/api/types.ts` (`GitAPI.addChangeIdToHead?`), `packages/ui/src/lib/gitApi.ts` (HTTP fallback and runtime dispatch). `packages/ui/src/lib/gitApiHttp.ts` already implements the HTTP call and stays the fallback. Do not edit task 07's `PullRequestSection.tsx`; that call site is task 07's one-line handoff to the member this task publishes.

**Read first:** upstream `0056bf6a9:packages/web/server/lib/git/routes.js` `POST /api/git/change-id` and `routes.change-id.test.js`; current `packages/web/server/lib/source-control/change-id.js` (`addChangeIdToHead`, refusal codes and `{ sha, changeId, branch }`); `packages/web/server/lib/source-control/routes.js` `invalidateBranchStatus`; current `packages/ui/src/lib/gitApiHttp.ts` `addChangeIdToHead` and zod result schema; `packages/ui/src/lib/gitApi.ts` dispatch conventions; `.agents/skills/ui-api-decoupling/SKILL.md`; task 07's Done-when item 1.
**Covers:** W5

**Check:** `bun install --frozen-lockfile` and `bun run type-check` and `bun run lint` and `bun run test` all exit 0; `bun run --cwd packages/web test -- server/lib/git/routes.change-id.test.js server/lib/source-control/change-id.test.js` passes; and with the dev server running against a local fixture repository, `POST /api/git/change-id?directory=<repo>` with the current `expectedHead` answers 200 `{ sha, changeId }`, moves HEAD to a commit whose message carries the trailer, and a stale `expectedHead` answers 409 `STALE_HEAD`. The browser UI's provider-gated Change-Id button is exercised only if a review host is configured; otherwise record that limit. No browser route mock satisfies the HTTP observation.

## Interfaces

`POST /api/git/change-id?directory=<repository>`, JSON body:

```json
{ "expectedHead": "<full 40-hex commit SHA>" }
```

- Missing/blank `directory`: 400 `{ "error": "directory parameter is required" }`.
- Success: 200 `{ "sha": "<full 40-hex>", "changeId": "I<40 lowercase hex>" }`.
- `addChangeIdToHead` is called with the directory and `expectedHead`; its `branch` result feeds `onBranchRewritten?.({ directory, branch })`, which is wired to `walkthroughBindingService.invalidateBranchStatus`.
- Helper refusals with an integer `status < 500` keep that status and answer `{ "error": message, "code": code }`: 400 `INVALID_REQUEST`, 409 `DETACHED_HEAD`, `STALE_HEAD`, `DIRTY_WORKTREE`, `MERGE_IN_PROGRESS`, `OPERATION_IN_PROGRESS`, `CHANGE_ID_PRESENT`.
- Any other failure answers 500 `{ "error": "Failed to add a Change-Id", "code": error?.code ?? "CHANGE_ID_FAILED" }` without exposing Git output.
- The route is a user action (`userAction`) because it rewrites a branch tip.

Client contract: `GitAPI.addChangeIdToHead?(directory, expectedHead): Promise<{ sha: string; changeId: string }>`; `gitApi.addChangeIdToHead` dispatches to `getRegisteredRuntimeAPIs()?.git?.addChangeIdToHead` when present, otherwise `gitHttp.addChangeIdToHead`, and emits `notifyGitStatusInvalidated(directory)` on the runtime path (the HTTP path already invalidates its own cache).

### Caller cutover ownership

`PullRequestSection.tsx` exists only on task 07's unlanded branch, so task 34 publishes the `GitAPI` member and the `gitApi` wrapper now, and task 07 replaces its direct `gitApiHttp` import with the wrapper in its own commit. This is the only ordering that avoids a cycle: task 07 waits on task 34's route/interface, while task 34 cannot edit a file that is not on integration yet. The handoff is recorded in task 07's Done-when item 1; task 34 owns the contract and its tests.

## Done when

- [x] The route is registered by `registerGitRoutes`, imports the canonical `source-control/change-id.js` implementation dynamically, and duplicates no Git amend logic. Registration smoke is throwaway verification, not a permanent assertion.
- [x] `feature-routes-runtime.js` wires `onBranchRewritten: walkthroughBindingService.invalidateBranchStatus`; a focused consumer-behavior test seeds a cached branch status and proves the amend invalidates it, with stale-head rejection as the companion refusal. Callback invocation counts remain throwaway smoke.
- [x] The upstream `routes.change-id.test.js` is adopted and passes against the fork's route: missing directory 400, stale head 409 with `STALE_HEAD`, success 200 with the new SHA and `I…` Change-Id, and the helper's trailer/metadata rules remain covered by `source-control/change-id.test.js`.
- [x] `GitAPI` declares the optional member and `gitApi.addChangeIdToHead` resolves the existing `gitApiHttp` implementation; the route's success/refusal behavior and the cached-status invalidation are tested. Runtime-versus-HTTP dispatch and the invalidation notification are throwaway smoke, not permanent forwarding tests.
- [x] `gitApiHttp.addChangeIdToHead` remains the single HTTP implementation and its zod result validation is unchanged.
- [x] Task 07's `PullRequestSection` direct import is handed off: its call site must use `gitApi.addChangeIdToHead`/the `GitAPI` member, not `gitApiHttp`, in task 07's own commit. Task 34 records that handoff in task 07's Done-when item 1 and does not edit task 07's unlanded file.
- [ ] Real path records the local fixture HTTP observation and names any provider-gated UI behavior that remains unexercised.

## Progress

Dirty at start: none (`git status --porcelain` empty). Base `811ecef47102ce4d737de56a7b41293e326a1e1e`, branch `upstream-refresh/34-change-id-amend-route`, worktree `/home/shizuku/Project/ohpichamber-worktrees/upstream-refresh-34`.

Check before: `grep -n 'change-id' packages/web/server/lib/git/routes.js` and the same file at `811ecef471` name no route, so `POST /api/git/change-id` answered 404 and `routes.change-id.test.js` did not exist. `source-control/change-id.js`, `invalidateBranchStatus`, `gitApiHttp.addChangeIdToHead` and its zod schema already existed.

### Implementation (2026-10-30)

- `packages/web/server/lib/git/routes.js`: `POST /api/git/change-id` inside `userAction`, dynamic import of `../source-control/change-id.js`, refusal codes passed through from an integer `status < 500`, other failures as `500 { error: 'Failed to add a Change-Id', code }` without Git output, and `onBranchRewritten?.({ directory, branch })` only after the rewrite.
- `packages/web/server/lib/host/feature-routes-runtime.js`: `onBranchRewritten: walkthroughBindingService.invalidateBranchStatus`, beside the other source-control options; the source-control routes are registered earlier in the same function.
- `packages/ui/src/lib/api/types.ts`: optional `GitAPI.addChangeIdToHead` beside `createGitCommit`. `packages/ui/src/lib/gitApi.ts`: dispatches to the runtime member when present (inside `runtimeStatusMutation`, the file's convention), otherwise `gitHttp.addChangeIdToHead`. `gitApiHttp.ts` is unchanged.
- Docs: route entry in `packages/web/server/lib/git/DOCUMENTATION.md` (Commit and Remote Operations); the Change-Id preflight entry in `packages/web/server/lib/source-control/DOCUMENTATION.md` now names `onBranchRewritten`/`invalidateBranchStatus`.
- Test: `packages/web/server/lib/git/routes.change-id.test.js` adapts the upstream route test (missing directory 400, stale `STALE_HEAD` 409 with HEAD unchanged, success 200 with the new SHA and a `Change-Id: I…` trailer) and adds the cached-status consumer test: a branch status seeded through the real `createChangeRequestStatusCache` survives a refused stale-head amend and is dropped for the rewritten branch only after a successful one.
- Task 07's `PullRequestSection.tsx` was not touched; its Done-when item 1 records the `gitApi.addChangeIdToHead` handoff.

Check after:

- `bun install --frozen-lockfile` exit 0.
- `bun run --cwd packages/web test -- server/lib/git/routes.change-id.test.js server/lib/source-control/change-id.test.js` exit 0, 17 tests.
- `bun run --cwd packages/web test -- server/lib/git/routes.test.js` exit 0, 66 tests.
- `tsc -b` in `packages/ui` and in `packages/web` exit 0. Local Bun is 1.4.2 while the scripts use `bun check -b` from Bun 1.4.4, so the equivalent `tsc -b` ran.
- `packages/ui`: `bun test src/lib/gitApi.test.ts` 13 passed, `bun test src/lib/gitApiHttp.test.ts` 64 passed, each file in its own process (the two files leak module state when run together, as `run-isolated-tests.mjs` documents).
- `oxlint -c oxlint.config.ts --report-unused-disable-directives` on the changed files exit 0; `node --check` on the changed JavaScript exit 0.

Owed at the final gate (not run under the coordinator's no-heavy rule): root `bun run type-check`, `bun run lint`, `bun run test`, `bun run dead-code`; the running dev-server fixture observation; task 07's provider-gated Change-Id button. Supertest drives the real Express route and real Git over HTTP, but not a running server, so the fixture observation stays unticked.

Merge note: lane 33 also edits `git/routes.js` (helpers near the top, batch routes before the worktree routes, a worktree-provenance block around the old line 1401) and `git/DOCUMENTATION.md` line 148. This patch sits at the options list and immediately before `POST /api/git/commit` and appends a bullet, so a `33`-then-`34` order merges both; `routes.js` is not replaced wholesale.

Artifacts: `/home/shizuku/Project/ohpichamber-omp-artifacts/upstream-refresh-34-2026-10-30/`.

Review boundary: `811ecef471..HEAD` + `packages/web/server/lib/git/routes.js`, `routes.change-id.test.js`, `packages/web/server/lib/host/feature-routes-runtime.js`, `packages/ui/src/lib/gitApi.ts`, `packages/ui/src/lib/api/types.ts`, `packages/web/server/lib/git/DOCUMENTATION.md`, `packages/web/server/lib/source-control/DOCUMENTATION.md`; round: 1; briefs: A,B,sec pending with the coordinator; boundaries: HTTP query and body reaching a Git process and a branch ref comparison-and-swap, cached branch-status invalidation, client dispatch; findings: pending.
