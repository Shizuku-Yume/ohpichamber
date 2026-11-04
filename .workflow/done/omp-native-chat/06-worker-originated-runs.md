# 06: Project OMP-initiated turns as worker-originated runs

**Effort:** omp-native-chat
**Task type:** feature
**Base commit:** dee0c88ebd6c52810fefaa74d5848a23ecf6a0d9
**Started:** 2026-10-25T00:00:00Z
**Finished:** 2026-10-26T00:00:00Z

**Delivers:** When OMP starts a turn without a Host prompt, clients see a normal canonical run with `origin` set: it streams, reaches a terminal state and can be aborted. While it is active, the Host refuses `/runs` with 409 and holds queued items, as for any active run.

**Blocked by:** None
**Files:** `packages/agent-contract/src/` (`RunSchema`: `origin: 'host' | 'plan' | 'goal'`, default `host`), `packages/agent-service/src/worker/projection.ts` (`queuedPrompts` 157, run opening at 299-303, `beginRun`), `packages/agent-service/src/worker/session.ts` (abort operation, `bind`), `packages/agent-service/src/sessions/registry.ts` (active-run tracking, abort 759), `packages/web/server/lib/message-queue/canonical-runtime.js` (dispatch waits on active run), `packages/ui` run status consumers; `contracts.md` "Single Delivery Owner" and "Run Terminal States".

**Read first:** spec "Worker-originated runs" and W4; glossary "Worker-originated run"; decisions.md: 2026-10-25 - Report OMP-initiated turns as worker-originated runs; skill `sync-state-invariants`.
**Covers:** W4

**Check:** Before: a native worker test that calls OMP `promptCustomMessage` (the call `RpcGoalController` uses) with no Host prompt sees no `run.started`. After: `bun run --cwd packages/agent-service test` shows `run.started` with the given `origin`, streamed parts, a terminal `run.completed`, and an abort through the normal `abort` operation ending it `run.cancelled`; a registry test shows `/runs` gets 409 `RUN_ACTIVE` meanwhile. `bun run --cwd packages/web test` shows a queued item dispatched only after that run ends. An Agent Service restart during such a run leaves it `failed` on reopen.
## Progress

- Dirty at start: none
- Surfaces: Web/PWA and Electron use the shared canonical Host/Agent Service run path; hosted mobile and Capacitor use the same contracts and canonical API; Guest remains unchanged and does not use this UI run flow.
- Check after: focused Agent Service native worker/projection/contract tests pass (244 passed, 7 skipped); Web package passes (6,051 tests); UI package passes 809/809 files. Full root test is blocked by existing web `server-startup-runtime.test.js` uncaught `stray 9/10` failures; lint is blocked by pre-existing `LegacyDataNotice.tsx` react-refresh errors. Type-check passes all packages.
- Real path: lane-c Web dev started on ports 5183/3913 with isolated data; root HTTP probe returned 404. Provider-env startup could not run because the operator env contains Bash-incompatible `set -g`; no secret values were exposed. Evidence: `/home/shizuku/Project/ohpichamber-omp-artifacts/omp-native-chat-06-2026-10-25/real-path.txt`.
- Review: workflow-reviewer subagent briefs unavailable in this worker invocation (tool rejected reviewer dispatch); performed the required built-as-asked and quality passes manually against `dee0c88ebd6c52810fefaa74d5848a23ecf6a0d9`. No blocking findings. Review boundary: Base commit through worker projection/session, contract, registry guards, UI sync/input/i18n and queue test changes; deliverable is worker-originated canonical runs and Host active-run serialization; trust boundaries are OMP worker events, Agent Service registry, Host queue and UI canonical event reducer.
- Review finding: fixed duplicate `ComposerStatusStrip` import and duplicate English origin keys; type-check now passes.
- Handoff resolved: registry active-run guards and abort path were already present and covered by the Agent Service suite; restart recovery is covered by journal/native tests. UI active-run behavior is implemented by shared sync state and ChatInput guards.
- Archive status: finished; all checklist items complete.

- [x] The worker exposes one internal entry point, `startWorkerRun(origin, start)`, that tasks 07 and 09 call; the projection opens the run before OMP emits `message_start`.
- [x] No user prompt is held in the worker; the Host stays the single delivery owner.
- [x] `origin` is in `Run`, snapshot and `run.started`; `contracts.md` updated.
- [x] UI treats the run as active (stop button, disabled send/mode switcher) and labels plan and goal origins.
