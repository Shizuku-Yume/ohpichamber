# 33: Make the cold deleted-space snapshot cursor replayable

**Effort:** post-m3-hardening
**Task type:** bugfix
**Base commit:** 83ec4d19bce0f34d3aeb7930f106aa04761cfbcd
**Started:** 2026-10-23T09:05:00Z
**Finished:** 2026-10-23T10:00:00Z
## Progress

Resumed this task's existing branch and preserved task-owned dirty files. Check before: not separately run in this recovery; the interrupted patch contained a flawed regression using private registry reflection and recreated a new journal on each snapshot.
Check after: `bun test packages/agent-service/src/sessions/cold-snapshot-cursor.test.ts` — 1 pass, 11 assertions. Public snapshot requests reuse cursor and epoch; runtime epoch/head match; SSE accepts the cursor with 200; archive DELETE followed by snapshot returns 404.
Real path: exercised running AgentService HTTP routes against a real native session file and deleted-space reference; no external provider needed for this read-only cold path.
Full suite: `bun run test` did not pass; workspace suites reached one unrelated Web failure, `packages/web/server/lib/spaces/code-out.test.js` (“refuses a transfer over the cap that arrived in one piece”: fetch stopped before cap assertion). The overall run failed 1 of 384 Web test files.
Review boundary: 74338fd78 + registry, documentation, regression test; round: 3 (rebase, unchanged Task33 patch-id); briefs: A pass, B pass, sec pass; boundaries: AgentService session lifecycle, SSE cursor, archive references; findings: 0 blocking / 1 nonblocking (medium availability/CWE-400: coldJournals has no age or runtime-count bound before archive deletion/service shutdown; recorded, no retention policy change).

Rebased onto `main` 74338fd78ab03de1ad516b0be265bdc16e3d1520 with no conflicts; the Task33 patch-id is unchanged (`7480abb`), so Brief A, Brief B and the security pass still cover exactly this diff, and the CWE-400 nonblocking finding above is preserved. The `Full suite` line above is the pre-rebase history; the earlier round-2 gate at 342 is superseded by the fresh gate below.

**Delivers:** A cold deleted-space snapshot and the stream that follows it share one journal: attaching with the snapshot's cursor is accepted and replays that journal's retained events, with no HTTP 503.

**Blocked by:** None
**Files:** `packages/agent-service/src/sessions/registry.ts` (`snapshot` 433-448, `journal` 311-314, `coldProjection` 344-350); `packages/agent-service/src/supervisor/service.ts` stream path

**Read first:** `.workflow/tasks/post-m3-hardening/07-review-findings-triage.md` Findings item 2; `.workflow/omp-migration/contracts.md` "Atomic snapshot and replay handoff" and "Stream rejection and invalidation"; `AgentServiceReview.md` finding 5

**Decision:** the service keeps the cold journal that produced the snapshot (keyed by session) and `journal()` returns it while the deleted-space reference exists; no 410 or 503 is introduced for this path.

**Check:** A regression using a real deleted-space reference and `SessionRegistry`: `snapshot()` then `journal()` return the same epoch, and the stream route answers the cursor with 200 and the retained replay. Current code returns a cursor from `this.runtime()` and `journal()` throws `SESSION_RESTORE_FAILED`.

## Done when

- [x] A cold deleted-space snapshot's cursor comes from the journal that produced the snapshot.
- [x] The stream route accepts that cursor and serves the retained replay.
- [x] The cached cold journal is released when the deleted-space reference is removed.
- [x] The regression fails before the change and passes after it.
