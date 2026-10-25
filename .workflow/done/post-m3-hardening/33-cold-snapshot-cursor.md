# 33: Make the cold deleted-space snapshot cursor replayable

**Effort:** post-m3-hardening
**Task type:** bugfix
**Base commit:** 83ec4d19bce0f34d3aeb7930f106aa04761cfbcd
**Base branch:** main
**Started:** 2026-10-23T09:05:00Z
**Finished:** 2026-10-25T11:55:00Z
## Progress

Rebase and scope: rebased onto current `main` `5caab3c649d5ec3e51d7ca81fd6c0b35d2a01e4c` with 0 conflicts; original `Base commit: 83ec4d19bce0f34d3aeb7930f106aa04761cfbcd` preserved.

Check before: verified in a disposable test restoring baseline `registry.ts` from before Task 33; `cold-snapshot-cursor.test.ts` failed as expected with HTTP 503 `SESSION_RESTORE_FAILED` on the stream request (receipt: `/home/shizuku/Project/ohpichamber-omp-artifacts/task33-final-2026-10-25/check-before-failure.log` and `.exit` 1).

Check after: `bun test packages/agent-service/src/sessions/cold-snapshot-cursor.test.ts` passed (1 pass / 0 fail / 12 expect() calls, receipt: `/home/shizuku/Project/ohpichamber-omp-artifacts/task33-final-2026-10-25/check-after.log` and `.exit` 0). Public snapshot requests reuse cursor and epoch; runtime epoch and head match; snapshot `headSequence` is 0; stream accepts `snapshot.cursor` with HTTP 200 `text/event-stream`; archive DELETE followed by snapshot returns 404. Since `deliverSessionStream` emits no synthetic frames and cold journals at head 0 have no transcript events, retained replay is legitimately empty at head 0.

Real path smoke: standalone HTTP scenario executed in `/home/shizuku/Project/ohpichamber-omp-artifacts/task33-final-2026-10-25/smoke-cold-snapshot-sse.log` (receipt `.exit` 0): verified snapshot 200 (cursor, epoch, head 0), stream 200 `text/event-stream` from `snapshot.cursor`, delete 200, post-delete snapshot 404.

Review findings: Brief A pass, Brief B pass, security pass with 0 blocking / 1 nonblocking (medium availability/CWE-400: `coldJournals` bound; documented, no retention policy change).

Full root gate: `TMPDIR=/tmp bun run test` passed cleanly at final source commit `3b6cdb12096751dea820018d1800ae6223f5a103` (7/7 suites passed: scripts 22/22, SDK 23/23, UI 809/809, agent-contract 177/0, agent-service 242/7/0, Electron 44/44, Web 372/9 files, 6051 pass / 128 skip; receipt: `/home/shizuku/Project/ohpichamber-omp-artifacts/task33-final-2026-10-25/root-test-3b6cdb12096751dea820018d1800ae6223f5a103.log` and `.exit` 0). The following docs/archive commit is source-equivalent to tested SHA `3b6cdb12096751dea820018d1800ae6223f5a103`.

Typecheck & lint provenance: Agent-service typecheck has 8 pre-existing base TS2742 diagnostics in vendor package `@oh-my-pi/omp-stats` (durably captured in `agent-service-typecheck-diagnostics.log`); Task 33 authored files (`registry.ts`, `cold-snapshot-cursor.test.ts`) have 0 diagnostics and 0 oxlint findings.

Task 33 is landed on `main`.
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
