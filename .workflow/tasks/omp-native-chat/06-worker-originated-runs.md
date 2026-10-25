# 06: Project OMP-initiated turns as worker-originated runs

**Effort:** omp-native-chat
**Task type:** feature
**Base commit:** <commit-sha>

**Delivers:** When OMP starts a turn without a Host prompt, clients see a normal canonical run with `origin` set: it streams, reaches a terminal state and can be aborted. While it is active, the Host refuses `/runs` with 409 and holds queued items, as for any active run.

**Blocked by:** None
**Files:** `packages/agent-contract/src/` (`RunSchema`: `origin: 'host' | 'plan' | 'goal'`, default `host`), `packages/agent-service/src/worker/projection.ts` (`queuedPrompts` 157, run opening at 299-303, `beginRun`), `packages/agent-service/src/worker/session.ts` (abort operation, `bind`), `packages/agent-service/src/sessions/registry.ts` (active-run tracking, abort 759), `packages/web/server/lib/message-queue/canonical-runtime.js` (dispatch waits on active run), `packages/ui` run status consumers; `contracts.md` "Single Delivery Owner" and "Run Terminal States".

**Read first:** spec "Worker-originated runs" and W4; glossary "Worker-originated run"; decisions.md: 2026-10-25 - Report OMP-initiated turns as worker-originated runs; skill `sync-state-invariants`.
**Covers:** W4

**Check:** Before: a native worker test that calls OMP `promptCustomMessage` (the call `RpcGoalController` uses) with no Host prompt sees no `run.started`. After: `bun run --cwd packages/agent-service test` shows `run.started` with the given `origin`, streamed parts, a terminal `run.completed`, and an abort through the normal `abort` operation ending it `run.cancelled`; a registry test shows `/runs` gets 409 `RUN_ACTIVE` meanwhile. `bun run --cwd packages/web test` shows a queued item dispatched only after that run ends. An Agent Service restart during such a run leaves it `failed` on reopen.

- [ ] The worker exposes one internal entry point, `startWorkerRun(origin, start)`, that tasks 07 and 09 call; the projection opens the run before OMP emits `message_start`.
- [ ] No user prompt is held in the worker; the Host stays the single delivery owner.
- [ ] `origin` is in `Run`, snapshot and `run.started`; `contracts.md` updated.
- [ ] UI treats the run as active (stop button, disabled send/mode switcher) and labels plan and goal origins.
