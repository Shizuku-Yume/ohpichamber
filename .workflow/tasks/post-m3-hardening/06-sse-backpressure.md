# 06: Keep slow SSE readers connected under backpressure

**Effort:** post-m3-hardening
**Task type:** bugfix
**Base commit:** f72010e3e
**Started:** 2026-10-23T04:40:17Z
**Status:** paused

**Delivers:** A slow SSE reader receives every retained event in order; only real loss or an exceeded per-subscriber bound sends `stream.invalidated`.

**Blocked by:** None
**Files:** `packages/agent-service/src/supervisor/service.ts` (`stream`, lines 357-387); `packages/agent-service/src/supervisor/event-stream.ts`; the journal subscription it uses; the Host Gateway SSE forwarding for `/api/agent/v1/sessions/:id/events`; `.workflow/omp-migration/contracts.md` ("Stream rejection and invalidation" / bounded replay)

**Read first:** `.workflow/specs/post-m3-hardening.md`; `/home/shizuku/Project/ohpichamber-omp-artifacts/post-m3-review-2026-10-23/``AgentServiceReview.md` finding 3; `.workflow/omp-migration/contracts.md` (stream invalidation, bounded replay); `.agents/skills/relay-transport/SKILL.md`; `.agents/skills/performance-engineering/SKILL.md`
**Covers:** H5

**Check:** A service regression with a reader that pauses: a replay larger than the socket high-water mark arrives complete and ordered; a reader exceeding the stated bound gets `stream.invalidated`. The first half fails before the change.

Root cause at `842a48adc` (`service.ts:372-376`): a `false` return from `write()` signals backpressure, but the code unsubscribes and ends the stream as an overflow.

## Progress

Started 2026-10-23T04:40:17Z in worktree `/home/shizuku/Project/ohpichamber-worktrees/lane-c-hardening`, branch `post-m3-hardening/06-sse-backpressure`, cut from `main` at `f72010e3e`.
Dirty at start: none.
Root cause: `response.write()` returning `false` reports backpressure, but the stream path treats it as lost events, unsubscribes and ends with `DELIVERY_OVERFLOW`.
Host Gateway check (CONVENTIONS §8 step 4): `packages/web/server/lib/host/canonical-routes.js:349-356` forwards with `pipeline(Readable.fromWeb(response.body), res)`, which waits for `drain`; no sibling of the bug there. Check-only, no file change.

Code: the stream body moved to `packages/agent-service/src/supervisor/event-stream.ts` (`deliverSessionStream`, `EVENT_STREAM_QUEUE_LIMIT = 2048`) and `service.ts` delegates to it. Frames queue while `write()` reports backpressure and resume on `drain`; `DELIVERY_OVERFLOW` now means the queue bound was exceeded.
Check before: `bun test packages/agent-service/src/supervisor/event-stream.test.ts` against the extracted pre-fix logic: 1 pass / 1 fail. The paused-reader test failed at `expect(body).not.toContain("stream.invalidated")`: the old path ended the stream as an overflow once the replay passed the socket high-water mark.
Check after: same command, 2 pass / 0 fail. The unconsumed reader received all 1000 replay frames in sequence; a never-draining response ended once with `DELIVERY_OVERFLOW`.
Focused lint: `oxlint` reports nothing on `event-stream.ts`, `event-stream.test.ts` and `service.ts`.
Type-check: package-wide `bun run --cwd packages/agent-service type-check` exits 1 on 12 vendor OMP diagnostics; 0 diagnostics mention `packages/agent-service/src`.
Environment: network installs are not allowed. Test execution used `node_modules` symlinked from `/home/shizuku/Project/ohpichamber` (untracked, not committed).
Not run: root `bun run test` (main is red pending Lane A task 01) and no rebase/landing was attempted.
Authorization: the maintainer granted full permission and resolved the ownership conflict; `contracts.md`'s stream invalidation/bounded-replay section is now named in `Files`. The 2048-frame bound and drain semantics are recorded there. Root `bun run test` stays the landing gate until Lane A task 01 lands.
Review boundary: `f72010e3e` + `.workflow/omp-migration/contracts.md`, `.workflow/tasks/post-m3-hardening/06-sse-backpressure.md`, `packages/agent-service/src/supervisor/{service.ts,event-stream.ts,event-stream.test.ts}`; round: 1; briefs: A,B; boundaries: Agent Service session SSE delivery (no authentication, credential or process boundary changed); findings: 0 blocking / 0 nonblocking. Brief A and Brief B both pass.
Suite: `bun test packages/agent-service/src` — 223 pass / 7 skip / 0 fail across 33 files.
Real path: the regression drives a real loopback HTTP/1.1 SSE connection and a real Node `ServerResponse` through `deliverSessionStream`; a full service process with a live OMP worker was not exercised (no provider available), and the delivery queue is independent of worker projection.

Handoff: implementation, contract text, regression, both review briefs and the agent-service suite are complete and committed on `post-m3-hardening/06-sse-backpressure` in `/home/shizuku/Project/ohpichamber-worktrees/lane-c-hardening`. No open review findings. Next step once Lane A task 01 lands on `main`: `git rebase main`, run `bun run test` from the repository root until green, rerun this task's focused regression, then move this file to `.workflow/done/post-m3-hardening/`, run `.workflow/bin/workflow validate`, commit the archive, and fast-forward `main` per local-merge. `main` was still at `f72010e3e` and Lane A task 01 at `f6ef134bc` when this handoff was written. The worktree's `node_modules` is symlinked from the main checkout (untracked, not committed).

## Done when

- [x] `response.write()` returning `false` waits for `drain` with a bounded per-subscriber queue instead of ending the stream with `DELIVERY_OVERFLOW`.
- [x] The bound is a named constant and the contract documents it.
- [x] The Host Gateway forwarding is checked for the same pattern (CONVENTIONS §8 step 4).
