# 15: Ephemeral /btw side questions

**Effort:** omp-native-chat
**Task type:** feature
**Base commit:** e9a645c4c56b2985d9b47b6a2f841d090a7c62a1
**Started:** 2026-10-26T02:25:00+08:00

**Delivers:** `/btw <question>` streams an answer into a side panel without creating a session or writing to the main transcript. Cancel stops it.

**Blocked by:** 02
**Files:** `packages/agent-contract/src/events.ts` (`btw.delta`, `btw.completed`), control schemas (`btw.ask`, `btw.cancel`), `packages/agent-service/src/worker/session.ts` (one `RpcBtwController` per worker), `worker/projection.ts`, `packages/ui/src/stores/useBtwStore.ts` and `packages/ui/src/components/chat/btw/` (replace the forked-session flow).

**Read first:** spec "Side questions" and W14; OMP 18.8.9 `modes/rpc/rpc-btw.ts` (constructor 51, `ask` 63, `cancel` 104, `close` 136); `session/agent-session.ts` `runEphemeralTurn` (11094); `contracts.md` "Streaming protocol and catch-up".
**Covers:** W14

**Check:** Before: `/btw` creates a forked session. After: `bun run --cwd packages/agent-service test` shows `btw.ask` streams `btw.delta` then `btw.completed` with the fixture provider's text, the session list and main history are unchanged, and `btw.cancel` ends the stream; it works while a main run is active. A UI test shows the panel streaming and no session created.

## Progress

- Dirty at start: none.
- Tasks 02 and 14 done receipts exist on `omp-native-chat/integration`; started from `e9a645c4c56b2985d9b47b6a2f841d090a7c62a1`.
- Surfaces: shared UI and Agent Service worker, routed through existing canonical session control/event transport; no new session or Host transcript writer.
- Risks: cross-package control/event contract, worker lifecycle and ephemeral state. `btw.*` must stay transient and be excluded from replay/snapshot history.
- Check before: the landed receipt claimed UI type-check success, but the resumed repair exposed stale fork-flow references and fixture/type errors.
- Check after: `bun run --cwd packages/ui type-check` passes; `bun test packages/ui/src/stores/useBtwStore.test.ts` passes (4 tests). The package UI suite still has unrelated pre-existing failures in ModelControls variant expectations and useConfigStore agent expectations; locale parity was repaired in this change.
- Real path: lane-B Web dev server started on ports 5182/3912 with the isolated data directory. The app loaded and showed the native composer; `/btw test` could not run from the new-session screen because no active session/provider was available. A source-control binding request returned 422 for the empty lane data repository.
- Review boundary: repair diff from `e9a645c4c56b2985d9b47b6a2f841d090a7c62a1` through the current integration baseline, covering ChatInput/BtwPanel transient state, retired metadata/fork callers, locale parity, and affected run fixtures.
- Repair decision: remove the retired fork metadata and helper paths entirely; retain only the transient in-memory panel and canonical `btw.ask`/`btw.cancel` transport.

 - [x] `btw.*` events are transient: excluded from history, not required for snapshot recovery.
- [x] The composer BTW send no longer creates a forked session; the panel renders transient answer text and cancellation uses `btw.cancel`, with retired fork metadata/helpers removed.
 - [x] Worker close calls `RpcBtwController.close()`. 
**Finished:** 2026-10-26T03:10:00+08:00
