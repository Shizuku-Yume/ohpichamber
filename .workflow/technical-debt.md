# Technical Debt

Code that makes the next change expensive, one entry per finding, so reviews don't
rediscover it and the reason it wasn't fixed yet is kept. `flow-architect` adds
entries; any skill that finds debt may add one.

## Format

Each entry is a level-2 heading naming the concrete symptom, under `## Entries`.
Refer to an entry by its heading.

```markdown
## Order total computed in three places

- **Where:** <files or modules>
- **Added:** <YYYY-MM-DD>
- **Priority:** fix-now | worth-doing | only-if-grows
- **Problem:** <what is wrong, with evidence>
- **Impact:** <what gets harder while it stays>
- **Solution:** <the change, in plain terms>
- **Cost:** <what the fix risks, how big it is>
```

An entry leaves this file in one of two ways:

- Fixed: the task that fixes it deletes the entry in its own commit.
- Declined by the user: delete the entry and append a decision entry to
  `decisions.md` (Decided: not fixing <symptom>; Instead of: fixing it; Because;
  Mine: no; Revisit when), so reviews don't re-propose it.

## Entries

## Root test contention flakes under multi-suite load

- **Where:** `packages/agent-service/src/supervisor/workers.capacity.test.ts` ("a pending worker operation and a restart reservation each postpone eviction"), and intermittent web suites (`server/lib/host/canonical-plugins.test.js`, `server/lib/git/service.test.js`, `server/lib/spaces/code-out.test.js`)
- **Added:** 2026-10-27
- **Priority:** worth-doing
- **Problem:** When the machine runs root tests (`bun run test` / `VITEST_MAX_WORKERS=2`) under heavy multi-process load, child process startup, scheduling, and graceful shutdown can exceed fixed assertions or timeout windows.
  In a 3-run baseline vs. tip verification sample with clean installs and `VITEST_MAX_WORKERS=2 bun run test`:

| Run | Baseline (`4d69e299e4`) | Integration Tip (`12928fb28e`) |
|:---:|---|---|
| Run 1 | Exit 1 (`logs/baseline-run-1.log`); failed `workers.capacity.test.ts:122` (eviction timing) | Exit 1 (`logs/tip-run-1.log`); failed `workers.capacity.test.ts:122` (eviction timing) |
| Run 2 | Exit 1 (`logs/baseline-run-2.log`); failed `workers.capacity.test.ts:122` (eviction timing) | Exit 0 (`logs/tip-run-2.log`); 7/7 suites passed (6366 pass / 142 skip) |
| Run 3 | Exit 0 (`logs/baseline-run-3.log`); 7/7 suites passed (6086 pass / 128 skip) | Exit 0 (`logs/tip-run-3.log`); 7/7 suites passed (6366 pass / 142 skip) |

  The eviction test failed 2 of 3 runs on baseline (66.7%) and 1 of 3 runs on tip (33.3%), confirming it as a pre-existing contention flake (stabilized at tip in `2d10f973ed`). The web test files had 0 failures across all 3 baseline runs and all 3 tip runs, proving that the transient failures in `canonical-plugins`, `git/service`, and `spaces/code-out` observed in earlier runs were contention flakes caused by concurrent root suites storming the CPU/memory.
- **Impact:** Root test gates fail intermittently on high-load machines even when code changes are correct, requiring multiple rerun attempts to obtain clean gate receipts.
- **Solution:** Avoid fixed `sleep` boundaries in process-lifecycle integration tests in favor of bounded polling on observable state (as implemented in `2d10f973ed`), and ensure parallel test runners isolate shared temp dirs and git fixtures to prevent worker contention.
- **Cost:** Test lifecycle assertion and polling adjustments; zero production code impact.

## Per-session warming has no Agent Service implementation

- **Where:** Agent Service session warming (the canonical `GET/PUT /api/agent/v1/workspaces/:workspaceId/cache-warming` covers the workspace), `packages/ui/src/components/sections/openchamber/`
- **Added:** 2026-10-29
- **Priority:** worth-doing
- **Problem:** The refresh adopted upstream's per-session warming (a server keep-alive loop over OpenCode's session endpoints plus a Settings field and a session-menu toggle). It was unmounted, unreachable behind a 404, and pointed at deleted endpoints, so it was deleted (`decisions.md: 2026-10-29 - Delete upstream's per-session warming instead of rewiring it`). The fork can now warm a whole workspace (`off`/`streaming`/`idle`) but cannot keep one chosen session warm, which upstream's users had.
- **Impact:** Anyone relying on "keep this one long session warm without paying for pings on throwaway ones" loses that control after the refresh; the canonical workspace mode is the only choice, applied to every active worker in the workspace.
- **Solution:** Add a canonical session-level warming route and state on the Agent Service (revision CAS, per-session apply outcome, native `AgentSession.setCacheWarmingMode` per session), then rebuild the Settings choice and the session toggle against it; no Host-side timer loop.
- **Cost:** New contract and route in `packages/agent-contract` and `packages/agent-service`, worker-level session application, a store and sync subscriber in the UI, and 15 locales of copy; the workspace control and its tests must keep passing.

## OMP TUI-owned behaviors have no GUI mirror or drift test

- **Where:** `packages/agent-service/src/worker/{projection,mode,builtin-commands}.ts`; `packages/ui/src/components/chat/todoData.ts`
- **Added:** 2026-11-13
- **Priority:** worth-doing
- **Problem:** `research/feedback-2026-11-12/12-tui-vs-sdk.md` found four gaps outside the 2026-11-12 maintainer report: `auto_compaction_start` is never consumed, so automatic compaction shows no live state; `todo_auto_clear` is unhandled and todos are read from transcript details instead of `session.getTodoPhases()`; plan-mode orchestration is mirrored from TUI-private code in `worker/mode.ts`; `worker/builtin-commands.ts` hand-keeps 30 of OMP's 89 slash commands.
- **Impact:** automatic compaction looks like a stall, a cleared todo list may linger, and each OMP upgrade can silently diverge plan mode and the command list.
- **Solution:** consume both events in the projection; add an upgrade-time test that compares the plan-mode mirror and the command allowlist with the pinned OMP package, as the tool presentation coverage test does.
- **Cost:** small for the events; the drift test needs a stable way to read OMP's TUI-private plan-mode steps.

## Cold new-chat first token waits on OMP session construction

- **Where:** `packages/agent-service/src/supervisor/workers.ts` (spare pool), `packages/agent-service/src/worker/session.ts`, `packages/agent-service/src/worker/catalog-models.ts:730-735`
- **Added:** 2026-11-15
- **Priority:** only-if-grows
- **Problem:** a new chat that skips `prepare` reaches its first `part.delta` in ~720–800 ms against the 600 ms W11 budget (waived 2026-11-15). The cost is `createAgentSession` (~110 ms), agent-loop preparation (~145 ms) and supervisor queueing (~60 ms); a spare cannot build a session graph ahead of time because OMP's `AgentRegistry.global()` is process-wide. Separately, `catalog-models.ts` calls `modelRegistry.reapplyModelPolicies()` on every selection, forcing a full offline catalog rebuild past the mtime gate (~37 ms of a prompt's non-provider time).
- **Impact:** paths that create a session without a draft (API callers, some automation) see roughly 200 ms more latency than the prepared path.
- **Solution:** ask OMP for an SDK seam that builds a session graph in a spare process; guard `reapplyModelPolicies()` with a settings/credential revision so unchanged policy skips the rebuild (the staleness tests at `catalog-models.test.ts:133` and `:215` must keep passing).
- **Cost:** the SDK seam needs an upstream change; the revision guard is small but touches catalog staleness.
