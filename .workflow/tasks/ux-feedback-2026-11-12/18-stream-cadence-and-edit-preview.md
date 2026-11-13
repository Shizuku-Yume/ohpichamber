# 18: 33 ms streaming, quiet tool-input updates and live edit previews

**Effort:** ux-feedback-2026-11-12
**Blocked by:** 17
**Covers:** W11
**Files:** `packages/ui/src/sync/event-pipeline.ts`; `packages/ui/src/hooks/useStreamingTextThrottle.ts`; `packages/ui/src/components/chat/message/parts/{AssistantTextPart,ReasoningPart}.tsx`; `packages/agent-service/src/worker/projection.ts`; `packages/agent-contract/src/` (tool part edit preview field); the edit tool card; `scripts/perf/`
**Read first:** `research/feedback-2026-11-12/15-16-streaming-latency.md` (causes 1, 4, 6); `12-tui-vs-sdk.md` (edit preview, tool rendering rows); `decisions.md` 2026-11-13 "Streaming text updates every 33 ms"; skills `performance-engineering`, `relay-transport`, `sync-state-invariants`
**Check:** a pipeline test feeding a delta every 5 ms flushes every 33 ± 5 ms; a projection test emits no `part.updated` for an unchanged tool input and forwards `tool_stream_update` edit previews; `bun run profile:session` on `stream-300cps` records markdown render cost within the session profiling budget before and after. Real path (Web, real provider): text and thinking stream visibly per frame; an edit shows its diff while arguments stream. Receipts go in the evidence directory.

- [ ] Set the pipeline flush to 33 ms; streaming text passes straight through the throttle hook, keeping its identity reset.
- [ ] Skip `part.updated` when the redacted tool input equals the last emitted one.
- [ ] Forward `tool_stream_update.update` edit previews into the tool part; the edit card renders the streaming diff.
- [ ] Add the stream-cadence scenario and budget to `scripts/perf`.
- [ ] Deletes: the 100 ms text throttle default and the unconditional tool-input re-emit.
