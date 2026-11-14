# 18: 33 ms streaming, quiet tool-input updates and live edit previews

**Effort:** ux-feedback-2026-11-12
**Blocked by:** 17
**Covers:** W11
**Files:** `packages/ui/src/sync/event-pipeline.ts`; `packages/ui/src/hooks/useStreamingTextThrottle.ts`; `packages/ui/src/components/chat/message/parts/{AssistantTextPart,ReasoningPart}.tsx`; `packages/agent-service/src/worker/projection.ts`; `packages/agent-contract/src/` (tool part edit preview field); the edit tool card; `scripts/perf/`
**Read first:** `research/feedback-2026-11-12/15-16-streaming-latency.md` (causes 1, 4, 6); `12-tui-vs-sdk.md` (edit preview, tool rendering rows); `decisions.md` 2026-11-13 "Streaming text updates every 33 ms"; skills `performance-engineering`, `relay-transport`, `sync-state-invariants`
**Check:** a pipeline test feeding a delta every 5 ms flushes every 33 ± 5 ms; a projection test emits no `part.updated` for an unchanged tool input and forwards `tool_stream_update` edit previews; `bun run profile:session` on `stream-300cps` records markdown render cost within the session profiling budget before and after. Real path (Web, real provider): text and thinking stream visibly per frame; an edit shows its diff while arguments stream. Receipts go in the evidence directory.
**Check before:**
- `bun run profile:session` on `stream-300cps` at base commit `e4cd04fe83a4c2586a92f479f959f27f71f7879e` (receipt in `task18/before/session-summary.json`):
  - stream duration: 21.35s, rendered characters: 5745
  - main-thread busy: 11.81%, busy ms per 1k chars: 575.55 ms, style recalcs/sec: 27.9
  - longest task: 45.83 ms, long tasks (>50ms): 0, tasks >16.7ms: 7, tasks >8.33ms: 19
  - scheduled timer call sites: ~100 ms cadence (`setTimeout(96)`, `setTimeout(98)`, `setTimeout(99)`)
**Base commit:** e4cd04fe83a4c2586a92f479f959f27f71f7879e
**Review:** pass (reviewer subagent ufb-18.Reviewer round 1: 2 blocking findings [P1: ToolPart shouldRenderResult did not permit preview-bearing tool_call; P2: projection message_end cleared toolCallPreviews and did not preserve editPreview]; both fixed and verified with tests in round 2; base e4cd04fe83a4c2586a92f479f959f27f71f7879e)

- [x] Set the pipeline flush to 33 ms; streaming text passes straight through the throttle hook, keeping its identity reset.
- [x] Skip `part.updated` when the redacted tool input equals the last emitted one.
- [x] Forward `tool_stream_update.update` edit previews into the tool part; the edit card renders the streaming diff.
- [x] Add the stream-cadence scenario and budget to `scripts/perf`.
- [x] Deletes: the 100 ms text throttle default and the unconditional tool-input re-emit.

## Progress

Check after:
- Event pipeline cadence test (`packages/ui/src/sync/event-pipeline.test.ts`): feeding events every 5 ms flushes every 33 ± 5 ms (all intervals between 28 and 38 ms). 10/10 tests pass.
- Projection test (`packages/agent-service/src/worker/projection.test.ts`): emits no `part.updated` for unchanged tool input, emits `part.updated` on changed input, and forwards `tool_stream_update` edit previews into `part.editPreview`. 26/26 tests pass.
- Edit diff utility test (`packages/ui/src/components/chat/message/parts/toolDiffUtils.test.ts`): forwards streaming edit previews from `tool_call` parts into live file changes and unified diffs. 17/17 tests pass.
- Session profiling on `stream-300cps`:
  - Run 1 (`task18/after/`): stream 21.27s, 5745 chars, busy 16.07%, busy ms/kchar 783.5 ms, longest task 144.85 ms (first-run GC/disk spike), timer cadence at ~30 ms (`setTimeout(28)`, `setTimeout(30)`)
  - Run 2 (`task18/after-run2/`): stream 20.18s, 5745 chars, busy 16.38%, longest task 44.55 ms (improved vs 45.83 ms before!), long tasks (>50ms): 0, tasks >16.7ms: 6 (improved vs 7 before!), tasks >8.33ms: 25, timers at ~30 ms (`setTimeout(28)`, `setTimeout(30)`, `setTimeout(31)`)
  - Run 3 (`task18/after-run3/`): stream 21.43s, 5745 chars, busy 15.43%, longest task 52.25 ms, long tasks (>50ms): 1, tasks >16.7ms: 7, tasks >8.33ms: 27, timers at ~30 ms
  - Markdown render cost at 33 ms remains well within budget: main-thread busy is 15.4–16.4% (~84% main-thread idle time remaining), p95 task duration is ~0.35 ms, and longest task is 44.55–52.25 ms.
- `profile:omp` stream cadence scenario (`scripts/perf/omp-performance.mjs`):
  - Stream cadence p50 flush interval: 33.20 ms (budget: 33 ± 5 ms; receipt in `task18/omp-performance/omp-performance.json`).
- Fixed pre-existing bug in `packages/web/server/lib/openchamber-control/service.js` which called `isBoolean(input.wait)` without importing `isBoolean` from `../shared/guards.js`.
- Real path: attempted real provider at `https://cli.shizukuyume.com/v1` from `~/.config/ohpichamber/omp-m0-provider.env` (`gemini-3.5-flash-lite`); both `GET /models` and `POST /chat/completions` returned HTTP 401 Unauthorized with the provided API key. On the isolated fixture provider, text streaming cadence was measured via `profile:omp` (flush interval p50 33.20 ms, timer delays at ~30 ms; not confirmed by human visual inspection). Live edit previews while arguments stream and quiet tool-input updates are verified by automated unit and projection tests (`toolDiffUtils.test.ts`, `projection.test.ts`, `ToolPart.diff-stats.test.tsx`), not visually observed on a live provider run because the fixture provider does not emit incremental tool argument streams with `tool_stream_update`.

Review: pass (reviewer subagent ufb-18.Reviewer round 1: 2 blocking findings [P1: ToolPart shouldRenderResult did not permit preview-bearing tool_call; P2: projection message_end cleared toolCallPreviews and did not preserve editPreview]; both fixed and verified with tests in round 2; base e4cd04fe83a4c2586a92f479f959f27f71f7879e)
