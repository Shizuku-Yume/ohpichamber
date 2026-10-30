# 34: Change-Id amend route and GitAPI contract

**Effort:** upstream-refresh
**Task type:** feature
**Base commit:** <commit-sha>

**Delivers:** The Host answers `POST /api/git/change-id` by amending HEAD through the canonical Change-Id service, with the upstream route test and branch-status invalidation. The UI client exposes the call as `GitAPI.addChangeIdToHead` so task 07's `PullRequestSection` no longer imports the HTTP function directly.

**Blocked by:** None
**Files:** `packages/web/server/lib/git/routes.js` (the single route, wrapped in `userAction`), `packages/web/server/lib/git/routes.change-id.test.js` (adopt upstream's route test), `packages/web/server/lib/git/DOCUMENTATION.md`, `packages/web/server/lib/host/feature-routes-runtime.js` (pass `onBranchRewritten`), `packages/ui/src/lib/api/types.ts` (`GitAPI.addChangeIdToHead?`), `packages/ui/src/lib/gitApi.ts` (runtime/HTTP dispatch), `packages/ui/src/lib/gitApi.test.ts`. `packages/ui/src/lib/gitApiHttp.ts` already implements the HTTP call and stays the fallback. Do not edit task 07's `PullRequestSection.tsx`; that call site is task 07's one-line handoff to the member this task publishes.

**Read first:** upstream `0056bf6a9:packages/web/server/lib/git/routes.js` `POST /api/git/change-id` and `routes.change-id.test.js`; current `packages/web/server/lib/source-control/change-id.js` (`addChangeIdToHead`, refusal codes and `{ sha, changeId, branch }`); `packages/web/server/lib/source-control/routes.js` `invalidateBranchStatus`; current `packages/ui/src/lib/gitApiHttp.ts` `addChangeIdToHead` and zod result schema; `packages/ui/src/lib/gitApi.ts` dispatch conventions; `.agents/skills/ui-api-decoupling/SKILL.md`; task 07's Done-when item 1.
**Covers:** W5

**Check:** `bun install --frozen-lockfile` and `bun run type-check` and `bun run lint` and `bun run test` all exit 0; `bun run --cwd packages/web test -- server/lib/git/routes.change-id.test.js` and the focused `gitApi` tests pass; and with the dev server running against a local fixture repository, `POST /api/git/change-id?directory=<repo>` with the current `expectedHead` answers 200 `{ sha, changeId }`, moves HEAD to a commit whose message carries the trailer, and a stale `expectedHead` answers 409 `STALE_HEAD`. The browser UI's provider-gated Change-Id button is exercised only if a review host is configured; otherwise record that limit. No browser route mock satisfies the HTTP observation.

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

- [ ] The route is registered exactly once by `registerGitRoutes`, imports the canonical `source-control/change-id.js` implementation dynamically, and duplicates no Git amend logic.
- [ ] `feature-routes-runtime.js` passes `onBranchRewritten: walkthroughBindingService.invalidateBranchStatus`; the route test proves a successful amend reports `{ directory, branch }` exactly once.
- [ ] The upstream `routes.change-id.test.js` is adopted and passes against the fork's route: missing directory 400, stale head 409 with `STALE_HEAD`, success 200 with the new SHA and `I…` Change-Id, and the helper's trailer/metadata rules remain covered by `source-control/change-id.test.js`.
- [ ] `GitAPI` declares the optional member, `gitApi.addChangeIdToHead` dispatches runtime then HTTP, and focused tests cover both paths plus the status-invalidation signal.
- [ ] `gitApiHttp.addChangeIdToHead` remains the single HTTP implementation and its zod result validation is unchanged.
- [ ] Task 07's `PullRequestSection` direct import is handed off: its call site must use `gitApi.addChangeIdToHead`/the `GitAPI` member, not `gitApiHttp`, in task 07's own commit. Task 34 records that handoff in task 07's Done-when item 1 and does not edit task 07's unlanded file.
- [ ] Real path records the local fixture HTTP observation and names any provider-gated UI behavior that remains unexercised.
