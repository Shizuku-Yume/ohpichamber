# 06: Keep slow SSE readers connected under backpressure

**Effort:** post-m3-hardening
**Task type:** bugfix
**Base commit:** <commit-sha>

**Delivers:** A slow SSE reader receives every retained event in order; only real loss or an exceeded per-subscriber bound sends `stream.invalidated`.

**Blocked by:** None
**Files:** `packages/agent-service/src/supervisor/service.ts` (`stream`, lines 357-387); the journal subscription it uses; the Host Gateway SSE forwarding for `/api/agent/v1/sessions/:id/events`

**Read first:** `.workflow/specs/post-m3-hardening.md`; `/home/shizuku/Project/ohpichamber-omp-artifacts/post-m3-review-2026-10-23/``AgentServiceReview.md` finding 3; `.workflow/omp-migration/contracts.md` (stream invalidation, bounded replay); `.agents/skills/relay-transport/SKILL.md`; `.agents/skills/performance-engineering/SKILL.md`
**Covers:** H5

**Check:** A service regression with a reader that pauses: a replay larger than the socket high-water mark arrives complete and ordered; a reader exceeding the stated bound gets `stream.invalidated`. The first half fails before the change.

Root cause at `842a48adc` (`service.ts:372-376`): a `false` return from `write()` signals backpressure, but the code unsubscribes and ends the stream as an overflow.

## Done when

- [ ] `response.write()` returning `false` waits for `drain` with a bounded per-subscriber queue instead of ending the stream with `DELIVERY_OVERFLOW`.
- [ ] The bound is a named constant and the contract documents it.
- [ ] The Host Gateway forwarding is checked for the same pattern (CONVENTIONS §8 step 4).
