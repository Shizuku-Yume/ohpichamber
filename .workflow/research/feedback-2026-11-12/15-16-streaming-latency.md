## Items 15–16: streaming latency, new-chat stall, next-prompt suggestion

I changed no repo files. I started an isolated server and fixture provider on ports 4811/4810 under `/tmp/oc-probe-sl2`, then stopped them and confirmed no processes or listeners remain. Throwaway files left outside the repo: `/tmp/sl2-probe.mjs`, `/tmp/sl2-pipeline.ts`, `/tmp/oc-probe-sl2`.

**What I measured**

1. The backend does not batch. I opened the Host's `/api/agent/v1/sessions/:id/events` SSE against the fixture provider (OMP worker → IPC → Agent Service → Host proxy). The gap between `part.delta` events had p50 3.8–5.2 ms, and delivered speed matched the fixture (300 and 1200 chars/s). The worst gap was 281 ms in the 300 cps run and 71 ms in the 1200 cps run; I did not find the cause of those stalls. The relay and compression stages are not in this path (`index.js:232-250` skips SSE compression).
2. The UI pipeline emits in 100 ms steps. The real `createEventPipeline` fed one delta every 5 ms flushed every 100 ms (min 99, max 101), with 20 events per flush.
3. New-chat timing, 3 runs against a fixture model that answers instantly:

| Stage | Measured |
|---|---|
| `POST /sessions` | 960, 1022 and 1023 ms (a 6 s settle before the run made no difference) |
| `POST /runs` ack | 104–110 ms |
| `run.started` after the `POST /runs` was sent | ~85 ms |
| User `message.created` after the POST | 245–357 ms |
| First `part.delta` after the POST | 262–375 ms |

**Ranked causes**

1. **Two stacked 100 ms gates, 10 Hz updates with ~5–10 tokens each (measured + code).**
   - `packages/ui/src/sync/event-pipeline.ts:5` sets `FLUSH_FRAME_MS = 100`. The subscribe callback at `:127-133` buffers events and flushes on a trailing timer.
   - `hooks/useStreamingTextThrottle.ts:11` adds another 100 ms per text part. `AssistantTextPart.tsx:45-49` and `ReasoningPart.tsx:529-533` both use the default.
   - OMP's TUI renders at a minimum 33 ms interval (`oh-my-pi/packages/tui/src/tui.ts:922`).
   - Upstream v2.7.0 had the same 100 ms flush but a 400 ms reveal interval, so the fork is already better than upstream. It is still 3–6× coarser than the TUI.
   - Thinking and text deltas are projected live (`projection.ts:737-741`), so this is not the "only at completion" case.
   - Fix: keep one gate.
     - Shorten the flush to one frame to ~33 ms.
     - Make the throttle hook pass text straight through while streaming (keep the identity reset).
     - Check with `profile:session` on `stream-300cps` that markdown re-parse stays acceptable; I did not measure it.
   - Decision for you: 16, 33 or 50 ms. I recommend 33 ms to match the TUI. A true typewriter effect (adaptive drain) would be a separate product choice.

2. **The ~1 s new-chat stall is `POST /sessions` (measured, plus code).** The UI awaits it before anything else: `session-ui-store.ts:1899` → `session-actions.ts:791`, then `createRun`.
   - Inside it, `service.ts:235-262 admit` runs these steps in order, all under the catalog serial lock (`catalog.ts:197-203`):
     - `registerRoot`
     - `catalog.registerWorkspace`
     - the Host skill-source `reconcile`
     - `pluginRevision` (`workspaces.ts:264`)
     - worker launch → ready
     - `registerCatalogWorker` (`service.ts:279`)
   - `registerCatalogWorker` calls `catalog.register` (`catalog.ts:216-236`), which awaits `mcp.read` and `skills.read` on the new worker before the response goes out.
   - **Why W9 reported success while the stall remained:** the R8 harness `measureDispatch` in `scripts/perf/omp-performance.mjs` calls `createSession` untimed and times only `POST /runs`. Task 28 recorded `POST /sessions` at 1.0–1.2 s as the "after" figure, and my 960–1023 ms matches it. The 150 ms budget therefore never covered the stall.
   - The pre-warmed spare (`workers.ts:~913`) did not visibly help. Whether a spare was adopted in my runs is [INFERENCE], since there is no trace hook.
   - The split between worker launch and catalog read is [INFERENCE] from the earlier Task 28 trace. That trace showed launch → `registerCatalogWorker` taking ~500 ms before the spare-worker change.
   - Fix shape:
     - Move `registerCatalogWorker` after the response, but keep the generation guard.
     - Add a `create → run → first event` scenario to `profile:omp` with a budget.
   - Decision, bigger option: return the session id immediately and queue the prompt until the worker is ready (a contract change).

3. **First token: no optimistic echo and a long pre-dispatch (measured + code).**
   - The normal send path adds no pending user message. `optimisticSend` is used only by `reviewFlow.ts:230`, and `sendMessage` (`session-actions.ts:152`) only calls `createRun`.
   - The bubble therefore appears after `POST /sessions` plus 245–357 ms plus a flush. That is roughly 1.3–1.4 s for a new chat, before any provider latency.
   - The worker has `selectOptions`, `sessionManager.flush()` and the OMP `session.prompt()` pre-dispatch (`session.ts:970-1058`, `1925-1952`) between the POST and `message_start`.
   - Fix: insert a pending user bubble in the normal path, reusing the `optimisticAdd`/`reconcileAcceptedSend` machinery. Attach the SSE before `createRun`. Profile `prepare` and `selectOptions` separately.

4. **Tool-argument streaming is chunky, and partly inherited from OMP (code only, not measured).** The fixture sends whole arguments in one frame, so I could not test it.
   - OMP only re-parses a tool call's arguments after at least max(256 bytes, len/32) of growth (`oh-my-pi/packages/utils/src/json-parse.ts:343,371-381`; used by Anthropic at `anthropic.ts:3352` and others). The TUI sees the same stale `partial.arguments`, so the code in an `eval` call updates in ≥256-byte jumps.
   - Our projection (`projection.ts:762-782`) fires `part.updated` with the whole re-copied and re-redacted input on every delta, even when the input is unchanged. Wire cost grows with the square of the argument length.
   - Fix: skip emitting when the input equals the last emitted one. Finer cadence would need our own partial-JSON accumulation from the delta strings; that is optional.

5. **The next-prompt suggestion arrives late because of a 60 s quiet timer (code).**
   - `packages/web/server/lib/session-assist/runtime.js:31` sets `IDLE_QUIET_MS = 60_000`, armed at `:230-236` when the turn ends. `evaluateTurn` is not wired (`index.js:905-915`), so the timer starts directly.
   - After the timer, a cold Small Model call runs with no prompt cache and rebuilds up to 3 turns of prompt. The result is then written to session metadata and reaches the UI as `session.updated`.
   - OMP's TUI does this at `agent_end`: `event-controller.ts:2360` calls `ComposerPredictionController.request()` (`composer-prediction-controller.ts`). That runs `session.runEphemeralTurn` on the session's own model, reads the prompt cache, and has a 15 s deadline.
   - The OMP `composerPredictions` setting exists, but `settings-ui.ts:241` is its only consumer in the fork. It is therefore likely a setting that does nothing [INFERENCE].
   - Fix options:
     - (a) Set the quiet window to 0 and keep the Small Model path. Quick, but slower than the TUI.
     - (b) Port the TUI behaviour into the worker at `agent_end` and publish the result through a new canonical event. I recommend this; it also gives the OMP setting a consumer. Do (a) first as a stopgap.

6. **Minor, not measured, all [INFERENCE].**
   - New markdown blocks arrive with a staggered fade of up to 4×55 ms (`MarkdownRendererImpl.tsx:181-199`), which adds to the "in paragraphs" feel.
   - The `eval`/`bash` live result goes through `part.updated`, so it inherits cause 1's cadence.
   - `publicDelta` (`projection.ts:500-514`) costs roughly roots × root length per delta. It is negligible.
   - `WorkerReplySchema` and `CanonicalEventSchema` are parsed per event across the IPC. This is fine for text and heavy for large tool inputs.

**Class:** causes 1 and 4 are instances of the same pattern: independent throttles stacked without a shared budget. Causes 2, 3 and 5 are another: performance budgets that were measured on the wrong path (`POST /runs` ack instead of what the user waits for).

**Not measured:** browser render and markdown parse cost, real-provider latency, tool-argument streaming, and the UI throttle hook itself. I took the throttle from code and the 100 ms cadence from the pipeline run. `ompStreamReplay.test.tsx` only checks the leading edge of the throttle, not latency.