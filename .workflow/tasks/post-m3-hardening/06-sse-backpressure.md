# 06: Keep slow SSE readers connected under backpressure

**Effort:** post-m3-hardening
**Task type:** bugfix
**Base commit:** f72010e3e
**Started:** 2026-10-23T04:40:17Z
**Status:** blocked

**Delivers:** A slow SSE reader receives every retained event in order; only real loss or an exceeded per-subscriber bound sends `stream.invalidated`.

**Blocked by:** None
**Files:** `packages/agent-service/src/supervisor/service.ts` (`stream`, lines 357-387); the journal subscription it uses; the Host Gateway SSE forwarding for `/api/agent/v1/sessions/:id/events`

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

## Blocked

- **Assumed:** Task 06 may document the bound in the stream contract section of `.workflow/omp-migration/contracts.md`, since `Done when` requires "The bound is a named constant and the contract documents it".
- **True:** the Parallel sessions table grants Lane C only `contracts route text`; the stream invalidation section is outside that scope. A draft edit was made and reverted; `git diff` shows no change to `contracts.md`.
- **True:** root `bun run test` is red on `main` pending Lane A task 01 (quota fixtures), so the required landing gate cannot pass from this lane.
- **Needed:** either extend Lane C ownership to the stream-bound paragraph in `.workflow/omp-migration/contracts.md`, or have the owning session add it: "Backpressure is not event loss. The service keeps a bounded per-subscriber queue of 2048 frames (`EVENT_STREAM_QUEUE_LIMIT` in `packages/agent-service/src/supervisor/event-stream.ts`), which holds one full retained replay of 1000 events plus live traffic; when `write()` returns `false` it waits for `drain` and then continues in order. `DELIVERY_OVERFLOW` is sent only when that bound is exceeded, replay continuity is lost or the epoch changes." Code and regression are complete on this branch; the task stays unarchived.

## Done when

- [x] `response.write()` returning `false` waits for `drain` with a bounded per-subscriber queue instead of ending the stream with `DELIVERY_OVERFLOW`.
- [ ] The bound is a named constant and the contract documents it.
- [x] The Host Gateway forwarding is checked for the same pattern (CONVENTIONS §8 step 4).
