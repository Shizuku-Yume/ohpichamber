# 34: Change-Id amend route and GitAPI contract

**Effort:** upstream-refresh
**Task type:** feature
**Base commit:** d3e1e435a60f792853a83abb46e74063eb6ae505
**Started:** 2026-10-30T08:31:00+08:00
**Status:** active

**Delivers:** The Host answers `POST /api/git/change-id` by amending HEAD through the canonical Change-Id service, with the upstream route test and branch-status invalidation. The UI client exposes the call as `GitAPI.addChangeIdToHead` for task 07's new review-surface Change-Id control and its call site.

**Blocked by:** None
**Files:** `packages/web/server/lib/git/routes.js` (the single route, wrapped in `userAction`), `packages/web/server/lib/git/routes.change-id.test.js` (adopt upstream's route test plus the cached-status behavior), `packages/web/server/lib/git/DOCUMENTATION.md`, `packages/web/server/lib/host/feature-routes-runtime.js` (pass `onBranchRewritten`), `packages/ui/src/lib/api/types.ts` (`GitAPI.addChangeIdToHead?`), `packages/ui/src/lib/gitApi.ts` (HTTP fallback and runtime dispatch). `packages/ui/src/lib/gitApiHttp.ts` already implements the HTTP call and stays the fallback. Do not edit `PullRequestSection.tsx` or add a Change-Id control: no Change-Id call site exists in the tree today, and the control, its call site and the provider-gated behavior are task 07's.

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

`PullRequestSection.tsx` is already tracked on integration and imports only `generatePullRequestDescription` and `getGitLog`; no Change-Id call site exists anywhere in the tree, and the `gitView.change.changeId.*` strings have no consumer. Task 34 therefore publishes the route, the `GitAPI` member and the `gitApi` wrapper with nothing to cut over; task 07 adds the review-surface Change-Id control and its call site, calling `gitApi.addChangeIdToHead` and never importing `gitApiHttp`. Publishing the contract first is what avoids a cycle: task 07 waits on task 34's route/interface, while task 34 must not invent UI that task 07 owns. The handoff is recorded in task 07's Done-when item 1; task 34 owns the contract and its tests.

## Done when

- [x] The route is registered by `registerGitRoutes`, imports the canonical `source-control/change-id.js` implementation dynamically, and duplicates no Git amend logic. Registration smoke is throwaway verification, not a permanent assertion.
- [x] `feature-routes-runtime.js` wires `onBranchRewritten: walkthroughBindingService.invalidateBranchStatus`; a focused consumer-behavior test seeds a cached branch status and proves the amend invalidates it, with stale-head rejection as the companion refusal. Callback invocation counts remain throwaway smoke.
- [x] The upstream `routes.change-id.test.js` is adopted and passes against the fork's route: missing directory 400, stale head 409 with `STALE_HEAD`, success 200 with the new SHA and `I…` Change-Id, and the helper's trailer/metadata rules remain covered by `source-control/change-id.test.js`.
- [x] `GitAPI` declares the optional member and `gitApi.addChangeIdToHead` resolves the existing `gitApiHttp` implementation; the route's success/refusal behavior and the cached-status invalidation are tested. Runtime-versus-HTTP dispatch and the invalidation notification are throwaway smoke, not permanent forwarding tests.
- [x] `gitApiHttp.addChangeIdToHead` remains the single HTTP implementation and its zod result validation is unchanged.
- [x] Task 07's review-surface Change-Id control and its call site are handed off: there was no existing call site to cut over, so task 07 adds both and calls `gitApi.addChangeIdToHead`/the `GitAPI` member, never `gitApiHttp`, in its own commit. Task 34 records that handoff in task 07's Done-when item 1 and does not build the control.
- [x] Real path records the local fixture HTTP observation and names any provider-gated UI behavior that remains unexercised: running dev server, stale `expectedHead` 409 `STALE_HEAD`, current `expectedHead` 200 `{ sha, changeId }` with HEAD moved to that SHA and the trailer in its message, and the real `gitApiHttp.addChangeIdToHead` zod parse of that answer. The provider-gated Change-Id button is task 07's and was not exercised or built here.

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

Check after (final rebased pin; the pre-rebase numbers in round 1 stay historical):

- `bun install --frozen-lockfile` exit 0 (log captured).
- `bun run --cwd packages/web test -- server/lib/git/routes.change-id.test.js server/lib/source-control/change-id.test.js` exit 0, **18 tests**.
- `bun run --cwd packages/web test -- server/lib/git/routes.test.js` exit 0, **72 tests** (task 33 added six batch cases after the rebase).
- `bun run --cwd packages/ui type-check` and `bun run --cwd packages/web type-check` (`bun check -b`, bun 1.4.4) exit 0; root `bun run type-check` exit 0.
- root `bun run lint` exit 0 (pre-existing warnings only).
- root `bun run test` exit 0: 7/7 suites, **7,396 passed, 142 skipped**.
- Real dev path: isolated Host on `127.0.0.1:3211`, stale `expectedHead` → 409 `STALE_HEAD`, current `expectedHead` → 200 `{ sha, changeId }` with HEAD moved to the answered SHA and `Change-Id: I…` in its message; the real `gitApiHttp.addChangeIdToHead` zod parse accepted that answer; throwaway dispatch smoke showed one runtime call and one invalidation, then one HTTP call and one further invalidation.
- Provider UI limit: the review host's Change-Id button is task 07's and was neither exercised nor built here; no configured review host exists in this fixture.
- `packages/ui`: `bun test src/lib/gitApi.test.ts` 13 passed, `bun test src/lib/gitApiHttp.test.ts` 64 passed, each file in its own process (the two files leak module state when run together, as `run-isolated-tests.mjs` documents). This ran before the rebase; the client function's real parse against the running server is the rebased-pin client proof.
- Focused anti-slop: 43 pre-existing findings, 0 in the added lines, base 43; normal `oxlint -c oxlint.config.ts` on the changed files exit 0; `node --check` exit 0. `bun run dead-code` exit 1, already red at the integration base, with our member as the only new entry until task 07 adds its caller.

### Rebase and final heavy proof (2026-10-30)

- Rebased the existing branch (`03e31ee13b`) onto the landed integration tip `d3e1e435a60f792853a83abb46e74063eb6ae505`; the rebase applied without conflicts and the diff against that base is the same 10 files as before (route, route test, option wiring, client member/wrapper, two docs, task records, decisions). Task 33's batch routes and worktree-provenance helpers, task 31's `Blocked by: 07` line and task 35's plan and decisions entries are preserved. Original start base `811ecef47102ce4d737de56a7b41293e326a1e1e` remains the historical record above.
- `bun install --frozen-lockfile` exit 0 with the log captured (`bun-install-frozen.log`).
- Focused tests on the rebased tree: `routes.change-id.test.js` + `source-control/change-id.test.js` 18 passed; `git/routes.test.js` 72 passed (task 33 added six batch cases).
- Type and lint on the rebased tree: `bun check -b` for `packages/ui` and `packages/web` exit 0; root `bun run type-check` exit 0; root `bun run lint` exit 0 (pre-existing warnings only).
- Root `bun run test` exit 0: 7/7 suites, 7,396 passed, 142 skipped (`root-test.log`).
- Real dev HTTP path against a local fixture repository (`dev-http-smoke.log`): the isolated Host ran from this worktree on `127.0.0.1:3211` with `OPENCHAMBER_DATA_DIR`/`OPENCHAMBER_CHATS_DIR` under the artifact directory and no UI build. `POST /api/git/change-id?directory=<fixture>` with a stale `expectedHead` answered `409 { code: 'STALE_HEAD' }` and left HEAD unchanged; with the current `expectedHead` it answered `200 { sha, changeId }`, moved HEAD to exactly that SHA, and `git log -1 --format=%B` shows `Change-Id: I…`.
- The real client function parsed that answer (`client-parse-smoke.log`): `gitApiHttp.addChangeIdToHead` against the running server returned the zod-parsed `{ sha, changeId }`, and the fixture's HEAD message carries the trailer.
- Throwaway dispatch smoke (`dispatch-smoke.log`): `gitApi.addChangeIdToHead` called a registered runtime member exactly once with the exact arguments and emitted exactly one invalidation; with no runtime registered it used `gitApiHttp`, whose own adapter emitted exactly one further invalidation. Not committed as a test.
- The provider-gated Change-Id button remains unexercised and belongs to task 07; no UI control was added here.
- Remaining: landing only. `bun run dead-code` is already red at integration base (16 unused files / 60 unused exports, including `addChangeIdToHead` until task 07 adds its caller), so it is a landing decision, not a defect to hide.

Merge note: task 33 landed before this rebase and both edits to `git/routes.js` and `git/DOCUMENTATION.md` survived; a landing of this branch applies one option line, one route block before `POST /api/git/commit`, and one appended documentation bullet. `routes.js` is not replaced wholesale.

Artifacts: `/home/shizuku/Project/ohpichamber-omp-artifacts/upstream-refresh-34-2026-10-30/`.

Review boundary: original base `811ecef47102ce4d737de56a7b41293e326a1e1e`, rebased base `d3e1e435a60f792853a83abb46e74063eb6ae505`; source closure `d3e1e435..dfc8be27f3` + `packages/web/server/lib/git/routes.js`, `routes.change-id.test.js`, `packages/web/server/lib/host/feature-routes-runtime.js`, `packages/ui/src/lib/gitApi.ts`, `packages/ui/src/lib/api/types.ts`, `packages/web/server/lib/git/DOCUMENTATION.md`, `packages/web/server/lib/source-control/DOCUMENTATION.md`, `.workflow/decisions.md`, the task 34 and task 07 records; round: 2; briefs: B and security received on the rebased pin, A pending with the coordinator; boundaries: HTTP query and body reaching a Git process and a branch ref comparison-and-swap, cached branch-status invalidation, client dispatch, response error surface; findings: round 1 0 blocking / 5 nonblocking (all batched); round 2 B 1 blocking document finding (fixed at `55ff710905`) and security PASS 0 blocking / 2 accepted unchanged nonblocking, no new findings.

### Review round 1 (2026-10-30)

Brief B (`review-quality.md`): 0 blocking, 3 nonblocking. Security brief (`review-security.md`): 0 blocking, 2 nonblocking; the new route was found authenticated, input-validated before any spawn, CAS-protected, space-guarded and output-minimal.

- B2 — the pass-through-versus-fixed-500 branch was untested. Added the route case in a temp repository with no configured identity, isolated with `GIT_CONFIG_GLOBAL=/dev/null`, `GIT_CONFIG_NOSYSTEM=1` and the identity variables removed: `git var GIT_COMMITTER_IDENT` fails outside every refusal. The test asserts `500`, the fixed public error `{ error: 'Failed to add a Change-Id', code }` (the code key is present but its child-process value is deliberately not pinned), that the response carries no Git command, stderr, path or email address, and that HEAD did not move.
- B1 — the notification callback sat inside the failure-mapping `try`, so a throwing callback would report a completed amend as a 500. No catch or retry was added: the wired callback is `walkthroughBindingService.invalidateBranchStatus`, a `this`-free in-memory `cache.invalidate` over the provider status caches, and a rewrite that already moved the ref has no I/O failure step there. The nonthrowing contract is recorded at the call and here; revisit only if a callback with I/O is wired to that seam.
- B3 — the caller-cutover record claimed `PullRequestSection.tsx` was absent and would drop a direct `gitApiHttp` import. Corrected in this task and in task 07's Done-when item 1: the file is on integration and imports only `generatePullRequestDescription`/`getGitLog`; no Change-Id call site exists anywhere, so task 07 still owns the new control and its call site.
- Security 1 — the 500 body forwards the raw child-process `code` (`128`, `ENOENT`) rather than `CHANGE_ID_FAILED`. Accepted as nonblocking by the coordinator: the task's Interfaces prescribe `code: error?.code ?? 'CHANGE_ID_FAILED'`, upstream answers the same, and only the failure class is exposed; the new test pins the observed body. Coordinator decision: preserve the task/upstream `error?.code ?? 'CHANGE_ID_FAILED'` expression and add no code-enum heuristic now.
- Security 2 — any `symbolic-ref` failure is reported as `DETACHED_HEAD`, so a missing or non-repository directory answers 409. Left unchanged: that is the canonical helper's existing refusal contract, it fails closed before the amend path, the same path oracle is reachable through `/api/git/check`, and task 34 must not fork the helper's semantics. Coordinator decision: preserve the existing `DETACHED_HEAD` mapping and change no helper API semantics now; recorded as a nonblocking tradeoff; no helper or API change and no follow-up task.

Rechecks after the batch (bun 1.4.4): `routes.change-id.test.js` + `source-control/change-id.test.js` 18 tests, `git/routes.test.js` 66 tests, `bun check -b` for `packages/ui` and `packages/web`, root `bun run type-check` and `bun run lint` (exit 0; lint warnings pre-existing), focused anti-slop with no finding in the added lines, normal `oxlint.config.ts` on the changed files, `node --check`.

### Review round 2 (2026-10-30, rebased pin)

- Security (`review-security.md`, pin `dfc8be27f3`, base `d3e1e435`): PASS — 0 blocking, 2 accepted unchanged nonblocking (raw child-process `code` in the 500 body; `symbolic-ref` failure reported as `DETACHED_HEAD`). No new findings and no source fix scope. The round-1 brief is preserved as `review-security-round1-c3ca629.md`.
- Quality Brief B on the same pin: one blocking finding, in the documents rather than the code. The rebase replay had inserted this task's `decisions.md` entry between the task 35 lease entry's `Revisit when` and its `Effort`, so the trailing Effort closed this entry and the task 35 entry lost its field. Fixed at `55ff710905`: `- **Effort:** upstream-refresh` and a blank line are back at the end of the task 35 entry, this entry keeps its own Effort, and no plan field was lost. Bounded receipt: `decisions-fix-receipt.txt` (diff of the repair, field placement, `workflow validate`). Source and callers were PASS in that brief; the fix is docs-only, so no code or root rerun was needed.
- Round-2 evidence at the final pin: `bun install --frozen-lockfile` 0, focused 18, `git/routes.test.js` 72, package and root type-checks 0, root lint 0, root test 7/7 suites with 7,396 passed and 142 skipped, dev HTTP 409 stale / 200 amended with trailer, real client parse, throwaway dispatch smoke. Receipts and logs are in the artifact directory.
