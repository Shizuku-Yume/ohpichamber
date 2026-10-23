# 33: Make the cold deleted-space snapshot cursor replayable

**Effort:** post-m3-hardening
**Task type:** bugfix
**Base commit:** <commit-sha>

**Delivers:** A cold deleted-space snapshot and the stream that follows it share one journal: attaching with the snapshot's cursor is accepted and replays that journal's retained events, with no HTTP 503.

**Blocked by:** None
**Files:** `packages/agent-service/src/sessions/registry.ts` (`snapshot` 433-448, `journal` 311-314, `coldProjection` 344-350); `packages/agent-service/src/supervisor/service.ts` stream path

**Read first:** `.workflow/tasks/post-m3-hardening/07-review-findings-triage.md` Findings item 2; `.workflow/omp-migration/contracts.md` "Atomic snapshot and replay handoff" and "Stream rejection and invalidation"; `AgentServiceReview.md` finding 5

**Decision:** the service keeps the cold journal that produced the snapshot (keyed by session) and `journal()` returns it while the deleted-space reference exists; no 410 or 503 is introduced for this path.

**Check:** A regression using a real deleted-space reference and `SessionRegistry`: `snapshot()` then `journal()` return the same epoch, and the stream route answers the cursor with 200 and the retained replay. Current code returns a cursor from `this.runtime()` and `journal()` throws `SESSION_RESTORE_FAILED`.

## Done when

- [ ] A cold deleted-space snapshot's cursor comes from the journal that produced the snapshot.
- [ ] The stream route accepts that cursor and serves the retained replay.
- [ ] The cached cold journal is released when the deleted-space reference is removed.
- [ ] The regression fails before the change and passes after it.
