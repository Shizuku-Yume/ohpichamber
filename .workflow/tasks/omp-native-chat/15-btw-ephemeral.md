# 15: Ephemeral /btw side questions

**Effort:** omp-native-chat
**Task type:** feature
**Base commit:** <commit-sha>

**Delivers:** `/btw <question>` streams an answer into a side panel without creating a session or writing to the main transcript. Cancel stops it.

**Blocked by:** 02
**Files:** `packages/agent-contract/src/events.ts` (`btw.delta`, `btw.completed`), control schemas (`btw.ask`, `btw.cancel`), `packages/agent-service/src/worker/session.ts` (one `RpcBtwController` per worker), `worker/projection.ts`, `packages/ui/src/stores/useBtwStore.ts` and `packages/ui/src/components/chat/btw/` (replace the forked-session flow).

**Read first:** spec "Side questions" and W14; OMP 18.8.9 `modes/rpc/rpc-btw.ts` (constructor 51, `ask` 63, `cancel` 104, `close` 136); `session/agent-session.ts` `runEphemeralTurn` (11094); `contracts.md` "Streaming protocol and catch-up".
**Covers:** W14

**Check:** Before: `/btw` creates a forked session. After: `bun run --cwd packages/agent-service test` shows `btw.ask` streams `btw.delta` then `btw.completed` with the fixture provider's text, the session list and main history are unchanged, and `btw.cancel` ends the stream; it works while a main run is active. A UI test shows the panel streaming and no session created.

- [ ] `btw.*` events are transient: excluded from history, not required for snapshot recovery.
- [ ] The forked-session btw code and its i18n keys are removed.
- [ ] Worker close calls `RpcBtwController.close()`.
