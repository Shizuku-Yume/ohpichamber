# 16: Next-prompt suggestions at turn end

**Effort:** ux-feedback-2026-11-12
**Blocked by:** None
**Covers:** W10
**Files:** `packages/agent-service/src/worker/` (suggestion driver beside `enableIdleMaintenance`); `packages/agent-contract/src/` (canonical suggestion event, setting); `packages/web/server/lib/session-assist/` (suggestion path deleted); `packages/web/server/index.js`; `packages/ui/src/hooks/useSessionAssist.ts` and the composer suggestion UI; Chat settings
**Read first:** `research/feedback-2026-11-12/12-tui-vs-sdk.md` ("Why our suggestion is slow", decision 1); `15-16-streaming-latency.md` (cause 5); `decisions.md` 2026-11-13 "Next-prompt suggestions run at turn end"; OMP `composer-prediction-controller.ts`, `composer-prediction-user.md`, `parseComposerPrediction(s)`; skills `sync-state-invariants`, `relay-transport`
**Check:** worker tests drive a completed `agent_end` and assert one `runEphemeralTurn` call on the session model (`session`), one small-model call (`small`) or none (`off`), with skip rules for aborted runs, drafts, streaming and compaction; the session-assist tests exit 0 with the suggestion path removed. Real path (Web, real provider): with the default setting, a suggestion appears within 5 s of a completed turn; switching to `small` and `off` behaves accordingly. The timing receipt goes in the evidence directory.

- [ ] Worker driver at completed `agent_end`: `runEphemeralTurn` with OMP's prompt and parser, or the small model; usage recorded with `appendModelUsage({purpose:'composer-prediction'})`; result published as a transient canonical event.
- [ ] Setting `suggestion.generator: session | small | off`, default `session`, on the Chat page.
- [ ] The composer shows the suggestion from the event; an outdated suggestion clears on the next send.
- [ ] Deletes: the Host suggestion runtime, `IDLE_QUIET_MS`, its metadata persistence and the `evaluateTurn` gate for suggestions.
