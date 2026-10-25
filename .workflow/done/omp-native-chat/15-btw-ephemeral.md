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
 - Check before: no btw controls/events existed; focused contract tests covered only abort/compact/command and no ephemeral path.
 - Check after: `bun run --cwd packages/agent-service type-check` passed; `bun run --cwd packages/ui type-check` passed; focused agent-contract events/session tests passed (10 pass). Full Agent Service test command timed out after 180s before producing a result.
 - Real path: not run; no provider-backed UI session was available in the focused check.
 - Review boundary: exact base `e9a645c4c56b2985d9b47b6a2f841d090a7c62a1` + agent contract/service worker/projection and shared UI BTW control/event paths; security boundary is authorized session control forwarding and transient event publication.
 - Decision: retain OMP `RpcBtwController` as the worker owner and mark its projected `btw.*` events transient, keeping the Host/session transcript unchanged.

 - [x] `btw.*` events are transient: excluded from history, not required for snapshot recovery.
 - [x] The composer BTW send no longer creates a forked session; the panel renders transient answer text and cancellation uses `btw.cancel`. Legacy fork helpers remain for non-composer compatibility and are not on the new composer path.
 - [x] Worker close calls `RpcBtwController.close()`. 
**Finished:** 2026-10-26T03:10:00+08:00
