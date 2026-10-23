# 07: Reproduce or close the unconfirmed review findings

**Effort:** post-m3-hardening
**Task type:** spike
**Base commit:** f56861c21
**Started:** 2026-10-23T06:35:53Z
**Finished:** 2026-10-23T07:02:30Z

**Delivers:** Answer to: which of the review findings below are real bugs? Each gets "confirmed, bugfix task NN drafted" or "not a bug" with evidence.

**Blocked by:** None
**Files:** `packages/agent-service/src/supervisor/workers.ts` (spawn 277-282, stop 383-403); `packages/agent-service/src/worker/shell.ts` (277-291); `packages/agent-service/src/sessions/registry.ts` (311-314, 433-448); `packages/ui/src/stores/globalSessions.ts` (54-58); `packages/ui/src/stores/useGlobalSessionsStore.ts` (284-288); `packages/ui/src/sync/session-actions.ts` (`optimisticSend`, 1630-1692); `packages/ui/src/lib/reviewFlow.ts` (371-396); `.workflow/omp-migration/contracts.md` line 127; `packages/web/server/lib/openchamber-sessions/routes.js` line 491

**Read first:** `.workflow/specs/post-m3-hardening.md`; `/home/shizuku/Project/ohpichamber-omp-artifacts/post-m3-review-2026-10-23/``AgentServiceReview.md` findings 4, 5, 8 and `UIReview.md` findings 2-3; `.workflow/spike-tasks.md`; `packages/ui/src/sync/DOCUMENTATION.md` lines 46-49 and 304-308
**Covers:** H6

**Check:** Each item has a recorded reproduction attempt (command, input, output) and a conclusion in `## Findings`; every confirmed item has a drafted bugfix task in this effort; `.workflow/bin/workflow validate` passes.

## Progress

Started 2026-10-23T06:35:53Z on branch `post-m3-hardening/07-review-findings-triage`, cut from landed `main` `f56861c21`. Dirty at start: none.
Time box: one reproduction attempt per item; no fix code in this spike. Worker-descendant result is handed to Lane B task 13; no `workers.ts` edit here.

Outcome: all five items have a recorded attempt in `## Findings`. Confirmed and drafted: task 33 (cold snapshot cursor), task 34 (project-scoped discovery), task 35 (restore documented optimistic review send), task 36 (metadata route contract). Worker descendants: confirmed, owned by existing Lane B task 13; no new task. Drafts were renumbered from 29-32 because Task 08's branch drafts 29.
Spike code discarded, not committed: `/tmp/repro-worker-descendant.mjs`, `/tmp/fake-worker.mjs`, `/tmp/repro-discovery-scope.mjs`, `/tmp/repro-cold-cursor.mjs`, and the temporary repo-context copies `packages/agent-service/tmp-repro-cold-cursor.mjs` and `packages/agent-service/tmp-repro-worker-stop.mjs` (removed). No source files changed by this task.

Review boundary: `f56861c21` + `.workflow/tasks/post-m3-hardening/07-review-findings-triage.md` and drafts 33-36; round: 1; briefs: A,B; boundaries: spike evidence and drafted task scope (no source change); findings: A 2 blocking / 0 nonblocking, B 4 blocking / 0 nonblocking.
Resolution: route item now records its command and output; task 33 chooses the shared-journal replay fix; task 35 becomes the bugfix that restores documented optimistic insertion; task 36 covers both stale contract statements at lines 127 and 501. The worker-descendant item stays at one recorded attempt per the timebox and is delegated to Lane B task 13 for full worker-stop verification.

## Done when

- [x] Worker descendants: does a shell child survive worker stop on Linux? Workers are not spawned in their own process group and stop kills only the direct PID.
- [x] Cold snapshot cursor: does a cursor returned for a cold deleted-space snapshot fail on the next replay?
- [x] Project-scoped discovery errors: can a `projectId`-scoped error make `useGlobalSessionsStore` drop that project's known sessions?
- [x] `optimisticSend`: is "no optimistic insert" intended under native ID allocation? If yes, the function name, the unused `_optimisticAdd`/`_optimisticRemove` guards and the sync docs are aligned as a docs/refactor task; if no, it is a regression.
- [x] Route drift: `PATCH /sessions/:id` in contracts versus `/sessions/:id/metadata` in the Host; decide which is right and draft the fix.
- [x] Time box: one reproduction attempt per item. Do not re-investigate the `sync-context.tsx:180` reattach finding; it was a false positive.

## Findings

**1. Worker descendants survive stop on Linux — confirmed; owned by Lane B task 13.**
Attempt: mirror the stop strategy with real processes — a parent spawns `sleep 300`, then the parent (only) is killed with `SIGKILL`, as `workers.ts` does (no `detached`/process group; `stopEntry` kills only `entry.child`).
Command: `bun /tmp/repro-worker-descendant.mjs`
Output:
```
{"parentPid":1384267,"grandchildPid":1384271}
{"parentAlive":false,"grandchildAlive":true}
```
Conclusion: confirmed. No fix or new task here: `workers.ts` and the process-registry/pidfd modules belong to Lane B, and its task 13 already owns this item. The reproduction above is the reference for that task.

**2. Cold deleted-space snapshot cursor cannot be replayed — confirmed.**
Attempt: create a real native session file, register it as a `deletedSpace` reference, initialize a real `SessionRegistry` (entry becomes unloaded), then call `snapshot()` followed by `journal()` as the stream route does.
Command: `bun packages/agent-service/tmp-repro-cold-cursor.mjs`
Output:
```
{"cursor":"9927e514-bebd-405f-a090-57e557e45beb:0","epoch":"9927e514-bebd-405f-a090-57e557e45beb","headSequence":"0","runtimeStatus":"unavailable"}
{"replayError":{"status":503,"code":"SESSION_RESTORE_FAILED","message":"SDK worker operation failed"}}
```
Conclusion: confirmed. The cursor is taken from `this.runtime(sessionId)`, not from the temporary journal that produced the snapshot, and `journal()` refuses unloaded entries, so the next attach is a 503 instead of a replay or the documented 410. Drafted bugfix task 33.

**3. Project-scoped discovery errors drop known sessions — confirmed.**
Attempt: call the exported predicate used by `replaceSessionsForDirectories` with the same session and three differently keyed errors.
Command: `bun /tmp/repro-discovery-scope.mjs`
Output:
```
{"projectScoped":false,"workspaceScoped":true,"sessionScoped":true}
```
Conclusion: confirmed. `isSessionDiscoveryFailed` (`globalSessions.ts:54-58`) recognises only `sessionId` and `workspaceId`, so a project-keyed error leaves that project's cached sessions removable. Drafted bugfix task 34.

**4. `optimisticSend` does not insert optimistically — confirmed regression against the documented contract; bugfix task drafted.**
Attempt: search the helper's use of the optimistic refs.
Command: `grep -n "_optimistic(Add|Remove|Confirm)" packages/ui/src/sync/session-actions.ts`
Output: declarations at 177-179, wiring at 265-267, guard at 1644-1646, and `_optimisticConfirm` at 1685; neither `_optimisticAdd` nor `_optimisticRemove` is ever called.
The function's own doc says it preserves the review-flow call contract "without manufacturing native history" because the native service allocates message/turn/part IDs; `packages/ui/src/sync/DOCUMENTATION.md` item 9 and lines 304-308 still promise optimistic insertion.
Conclusion: confirmed regression against the documented sync contract. The code comment records an implementation choice, not a maintainer decision; `packages/ui/src/sync/DOCUMENTATION.md:304-308` promises optimistic insertion and rollback, and native service IDs do not prevent a temporary client record that reconciles by the canonical message. Drafted bugfix task 35 to restore the documented optimistic insertion and rollback.

**5. Session metadata route drift — confirmed; the contract text is wrong.**
Attempt: compare the three definitions.
Command: `sed -n '127p' .workflow/omp-migration/contracts.md && sed -n '491p' packages/web/server/lib/openchamber-sessions/routes.js && sed -n '228p' packages/ui/src/api/canonicalClient.ts && sed -n '501p' .workflow/omp-migration/contracts.md`
Output:
```
| `PATCH` | `/api/agent/v1/sessions/:sessionId` | Update Host-owned session metadata through the Host writer | Required | Yes | JSON |
  router.patch('/:sessionId/metadata', express.json({ limit: '1mb' }), (req, res) => call(res, () => service.setMetadata(req.params.sessionId, req.body || {}), 'Failed to write session metadata'));
    return request(`/api/agent/v1/sessions/${id(sessionId)}/metadata`, scoped(C.SessionMetadataStateSchema, result => result.sessionId === sessionId), {
After authentication and authorization, the Host intercepts `PATCH .../sessions/:sessionId`, `GET .../metadata`, and every `/queue` route before the Agent proxy. …
```
Conclusion: Host and client agree on `/metadata`; the contract table row and the prose at line 501 are stale. Drafted bugfix task 36.

The `sync-context.tsx:180` reattach finding was not re-investigated (recorded false positive in the spec).
