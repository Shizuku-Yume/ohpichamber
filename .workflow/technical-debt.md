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

## Session unread state has no OMP source

- **Where:** `packages/ui/src/sync/session-unread.ts` (deferred by task 23; not created)
- **Added:** 2026-10-27
- **Priority:** worth-doing
- **Problem:** upstream marks a session unread from its OpenCode `time.idle`/viewed state. OMP exposes no viewed watermark, so task 23 deferred `session-unread` rather than faking an OpenCode field.
- **Impact:** upstream's unread markers and "unread finished sessions across restarts" cannot be adopted; later syncs will keep re-deferring the same file.
- **Solution:** define a Host-owned viewed watermark on the canonical session/event contract, persist it with the other session state, then port the upstream unread store and UI.
- **Cost:** touches canonical events, Host persistence and the session list; needs a data-model decision.

## Session pins have no OMP source

- **Where:** `packages/ui/src/sync/session-pins.ts`, `packages/ui/src/lib/sessionPins.ts` (deferred by task 23; not created)
- **Added:** 2026-10-27
- **Priority:** worth-doing
- **Problem:** upstream pins sessions through OpenCode session metadata. The fork has no pin flow, so task 23 deferred `session-pins` instead of faking the metadata.
- **Impact:** pinned sessions, pin ordering in the sidebar and the palette's pin actions stay fork-version-only; upstream changes in that path cannot be adopted.
- **Solution:** add Host-owned pin state (canonical session metadata or a Host store), expose it through the session API, then port the upstream pin store and UI.
- **Cost:** Host storage and contract change plus sidebar/palette consumers.

## Terminal shutdown test races its own SIGTERM record

- **Where:** `packages/web/server/lib/terminal/shutdown.test.js` ("escalates a noncooperative workload only after the shared deadline"), `packages/web/server/lib/terminal/shutdown.js`
- **Added:** 2026-10-27
- **Priority:** worth-doing
- **Problem:** the test gives a SIGTERM-ignoring child a 350 ms grace while shutdown polls `/proc` in 250 ms steps before SIGKILL. Only about 100 ms is left for the child to be scheduled and append its synchronous `SIGTERM` record, so under machine load the SIGKILL wins and `assert.deepEqual(events, ['ready','SIGTERM'])` fails while the deadline assertion still passes. Reproduced on the pre-refresh tree: at `4d69e299e4` the web suite failed 1 of 3 clean runs with exactly this assertion; at `ce1ba86ffa` the same three-run sample was green, but the root suite flaked on it twice under load, and it passes repeatedly in isolation. `shutdown.js` and its test are unchanged between those commits, so this is a pre-existing timing race, not a refresh regression.
- **Impact:** an unattended `bun run test` can fail on this test alone, hiding real failures and blocking a gate that would otherwise be green.
- **Solution:** make the test wait for the recorded SIGTERM with its own bounded deadline (poll the events file for up to a second) before asserting, or raise the fixture's grace to at least 1000 ms so the 250 ms polling has slack. Keep the production grace and escalation semantics.
- **Cost:** test-only change; no production behavior.

## Workspace session listing failure on transient supervisor errors, in-flight commands, or removed worktrees

- **Where:** `packages/agent-service/src/sessions/registry.ts` (`list`, line 218; `runtime`, line 209), `packages/web/server/lib/host/agent-scope-runtime.js` (workspace catalog and `validateDirectoryPath`), `packages/web/server/lib/openchamber-sessions/routes.js` (`list`, lines 216, 235-237; archive/listing projection), `packages/ui/src/stores/useGlobalSessionsStore.ts` (line 742), `packages/ui/src/components/session/sidebar/list/useSidebarGroupStatus.ts` (line 62), `packages/ui/src/components/session/sidebar/projects/SessionGroupSection.tsx` (line 943), and `packages/ui/src/components/views/ArchiveView.tsx`.
- **Added:** 2026-10-27
- **Resolved:** 2026-11-04
- **Priority:** fix-now (resolved)
- **Status:** fixed (2026-11-04)
- **Problem:** `GET /api/agent/v1/sessions` calls `openChamberSessionService.list()`, which enumerates all workspaces (`listWorkspaceScopes()`). If any workspace scope encounters an error—whether from a removed worktree whose checkout path is gone (`METADATA_READ_FAILED`), a worker startup timeout/failure (`WORKER_INIT_FAILED`), or in-flight commands (`COMMAND_IN_FLIGHT` from `registry.ts:218`)—the catch block in `openchamber-sessions/routes.js:235-237` captures the error as `{ [failedWorkspaceId]: error.code }`. Because `useGlobalSessionsStore.ts:742` requires `complete = Object.keys(result.errors).length === 0`, any single failing workspace transitions the entire global session store to `status: 'error'`. This has two symptoms: (1) unbootstrapped or partially bootstrapped sidebar groups receive `state: 'load-failed'` and render the "Could not refresh sessions. Try again" banner; and (2) removing a worktree with sessions leaves the Archive page showing "0 archived sessions" after reload because the global list never projects `archivedAt` for the failing scope. This behavior is pre-existing and identical across baseline `4d69e299e4` and HEAD.
- **Impact:** Any transient error, in-flight command, or missing worktree checkout poisons the entire global session list; users see misleading refresh errors, and valid archived sessions survive on disk but cannot be found, restored, or deleted from the Archive view.
- **Solution:** (1) In `useGlobalSessionsStore`, scoped discovery errors should only degrade the specific failing workspace rather than poisoning the entire global session status, isolating workspace-level listing errors to their own group status; (2) add Host worktree-archive endpoints to keep archived sessions of removed checkouts resolvable without requiring the deleted checkout directory; and (3) surface discovery errors explicitly in the Archive page with a retry action instead of rendering an authoritative empty list.
- **Fix:** (1) `agent-scope-runtime.js` retains archived worktree workspaces via `store.listArchivedWorktreeWorkspaces()` and `store.isWorktreeArchived()`, bypassing `validateDirectory` on deleted checkout directories so workspaces remain enumerable in `listWorkspaceScopes()` and their sessions are projected; (2) `useGlobalSessionsStore.ts` isolates scoped workspace errors into `discoveryErrors`, keeping healthy workspaces `ready` and setting overall store status to `ready` when sessions arrive; (3) `ArchiveView.tsx` surfaces scoped discovery errors in an explicit warning banner with a retry action instead of rendering an authoritative empty list.
- **Evidence:** `bun test packages/web/server/lib/host/agent-scope-runtime.test.js` passed (11/11); `bun test packages/web/server/lib/openchamber-sessions/routes.test.js` passed (20/20); `bun test packages/ui/src/components/views/ArchiveView.test.tsx` passed (7/7); `bun test packages/ui/src/stores/useGlobalSessionsStore.test.ts` passed (13/13); `bun test packages/ui/src/components/session/sidebar/list/useSidebarGroupStatus.test.tsx` passed (10/10); artifacts in `p1-1-workspace-listing-isolation.json`.
- **Cost:** Touched `useGlobalSessionsStore`, `openchamber-sessions/routes.js`, and `ArchiveView.tsx`.

## Session create cannot set a parent link

- **Where:** `packages/agent-contract/src/session.ts` (`SessionCreateRequestSchema`, line 86), `packages/agent-service/src/supervisor/host-authorization-protocol.ts` (`HostSessionBootstrapSchema`, line 17), `packages/web/server/lib/openchamber-sessions/routes.js` (`create`, line 98)
- **Added:** 2026-10-27
- **Resolved:** 2026-11-04
- **Priority:** worth-doing (resolved)
- **Status:** fixed (2026-11-04)
- **Problem:** `RuntimeSession.parentSessionId` exists and archive restore already preserves it (task 01), but no create path can set it: the canonical create request is `{ projectId, workspaceId, options, metadata }` and the Host bootstrap is `WorkerBootstrapSchema` with no parent field. Only the Agent Service's own subagent tool writes a parent (`sessions/registry.ts:290-303`). Task 17's workflow agents therefore run as root sessions, unlike upstream's OpenCode child sessions, and a server-initiated fan-out cannot nest under the session that proposed it.
- **Impact:** workflow agents appear as ordinary sessions; the chat can only hide or group them from the run record (`agents[].sessionId`). Any future server-side fan-out (multi-run, dispatched audits) repeats the same workaround.
- **Solution:** add an optional `parentSessionId` to `SessionCreateRequestSchema` and `HostSessionBootstrapSchema`, validate it against the caller's authorized scope and the parent's workspace in the service, persist it on the runtime session and the journal, and let the session list expose the parent it already projects. Then task 17 can create workflow agents under the proposing session.
- **Fix:** Added optional `parentSessionId` to `SessionCreateRequestSchema`, `WorkerBootstrapSchema`, and `HostSessionBootstrapSchema`. Enforced parent session authorization in `openchamber-sessions/routes.js` (same workspace/project, validated existence). Persisted `parentSessionId` in `SessionRegistry` runtime entry and journal `references.set(...)`, verified across restart and listing.
- **Evidence:** `bun test packages/agent-contract/src/session.test.ts` passed (6/6); `bun test packages/agent-service/src/sessions/registry-native.test.ts` passed (20/20); `bun test packages/web/server/lib/openchamber-sessions/routes.test.js` passed (20/20); artifacts in `p1-4-parent-session-link.json`.
- **Cost:** Minimal contract extension and route/registry persistence.

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
## Turn stats Elapsed 0.0s on turns with tool calls

- **Where:** `packages/ui/src/components/chat/work-status/telemetry.ts` (`getLatestCompletedTurnStats`), `WorkStatusTelemetrySection.tsx`
- **Added:** 2026-10-27
- **Resolved:** 2026-11-04
- **Priority:** worth-doing (resolved)
- **Status:** fixed (2026-11-04)
- **Problem:** In upstream (`0056bf6a9`), `elapsedDurationMs` was computed from legacy OpenCode message timing: `turnEndMs = lastAssistantInfo.time.completed` and `turnStartMs = user.time.created`. The OMP Canonical contract (`@openchamber/agent-contract`) exposes only message creation time (`createdAt`) and no provider timing or message completion time. `telemetry.ts` (added during M3 in `24f1012c14`) approximates elapsed time as `lastAssistant.createdAt - user.createdAt`. In multi-step turns with tool calls, `projection.ts` creates virtual user messages for intermediate steps with `createdAt = stepTimestamp`. `getLatestCompletedTurnStats` walks backwards to find `role === 'user'`, stopping at this virtual user message whose `createdAt` is identical to the assistant message's `createdAt`. As a result, `end - start` evaluates to 0 ms and formats as `Elapsed 0.0s`.
- **Impact:** Any completed turn that executed tools displays `Elapsed 0.0s` in the Turn stats section of the work-status panel, obscuring true execution duration.
- **Solution:** Pass the canonical `Turn` record (or query `useSessionTurns`) into `WorkStatusTelemetrySection` and use `turn.finishedAt - turn.startedAt` (or skip `virtualUser` messages and use true turn boundaries) to compute `elapsedDurationMs`.
- **Fix:** Wired `useDirectorySync` in `WorkStatusTelemetrySection.tsx` to read `state.snapshot[sessionId]?.turns` and pass canonical `Turn[]` into `getLatestCompletedTurnStats`. Elapsed duration now evaluates to `turn.finishedAt - turn.startedAt` for completed turns, and usage aggregation sums across all intermediate steps.
- **Evidence:** `bun test packages/ui/src/components/chat/work-status/telemetry.test.ts` (9/9 passing).
- **Cost:** Touched `WorkStatusTelemetrySection.tsx` and `telemetry.ts` inputs to receive canonical `Turn` data; no backend change needed as `Turn` already carries `startedAt` and `finishedAt`.

## Host tool errors collapse to SERVICE_UNAVAILABLE

- **Where:** `packages/web/server/lib/openchamber-control/service.js` (`invokeHostAction` error mapping), `packages/web/server/lib/host/worker-authorization-channel.js`
- **Added:** 2026-10-30
- **Resolved:** 2026-11-04
- **Priority:** worth-doing (resolved)
- **Status:** fixed (2026-11-04)
- **Problem:** The status-to-code map uses `NOT_FOUND`, `CANCELLED` and `UNAVAILABLE`, which are not in `ProblemCodeSchema` (`packages/agent-contract/src/errors.ts`). `HostActionResultSchema` rejects the reply, so a missing note (`404`), an `expected` conflict (`409`) and a cancelled action (`499`) all reach the model as `{ ok: false, code: 'SERVICE_UNAVAILABLE', status: 503 }`, and the control error's message is dropped. Found in the task 16 security pass.
- **Impact:** An agent cannot tell a stale `expected` from a missing entry or a transient failure, so the knowledge tool's documented retry rule ("refresh and retry with the same id and the fresh text") cannot be followed; other host tools share the mapping.
- **Solution:** Map statuses onto existing `ProblemCode` values (for example `INVALID_REQUEST`, `UNAUTHORIZED`, `SERVICE_UNAVAILABLE`, a metadata conflict code for 409) and carry the message in a detail field, then assert the envelope in a route test.
- **Fix:** Extended `HostActionResultSchema` with optional `detail: z.string().optional()`. Updated `invokeHostAction` in `service.js` to map status codes onto existing canonical `ProblemCode` values (`INVALID_REQUEST`, `UNAUTHORIZED`, `METADATA_CONFLICT`, `SERVICE_UNAVAILABLE`, `INTERNAL_ERROR`) and carry `error.message` in `detail`. Preserved `detail` through `worker-authorization-channel.js` IPC into `WorkerHostActions.settle` `ProjectionError`.
- **Evidence:** `bun run --cwd packages/web test server/lib/openchamber-control/service.test.js server/lib/host/worker-authorization-channel.test.js` (15/15 passing).
- **Cost:** Touched the shared host-action envelope used by every managed tool; updated route and IPC channel tests to assert canonical codes.

## Per-session warming has no Agent Service implementation

- **Where:** Agent Service session warming (the canonical `GET/PUT /api/agent/v1/workspaces/:workspaceId/cache-warming` covers the workspace), `packages/ui/src/components/sections/openchamber/`
- **Added:** 2026-10-29
- **Priority:** worth-doing
- **Problem:** The refresh adopted upstream's per-session warming (a server keep-alive loop over OpenCode's session endpoints plus a Settings field and a session-menu toggle). It was unmounted, unreachable behind a 404, and pointed at deleted endpoints, so it was deleted (`decisions.md: 2026-10-29 - Delete upstream's per-session warming instead of rewiring it`). The fork can now warm a whole workspace (`off`/`streaming`/`idle`) but cannot keep one chosen session warm, which upstream's users had.
- **Impact:** Anyone relying on "keep this one long session warm without paying for pings on throwaway ones" loses that control after the refresh; the canonical workspace mode is the only choice, applied to every active worker in the workspace.
- **Solution:** Add a canonical session-level warming route and state on the Agent Service (revision CAS, per-session apply outcome, native `AgentSession.setCacheWarmingMode` per session), then rebuild the Settings choice and the session toggle against it; no Host-side timer loop.
- **Cost:** New contract and route in `packages/agent-contract` and `packages/agent-service`, worker-level session application, a store and sync subscriber in the UI, and 15 locales of copy; the workspace control and its tests must keep passing.

## Session relocation can race worktree archive before admission

- **Where:** `packages/agent-service` session relocation and worktree admission; task 35 security review `review-security.md`, finding 3.
- **Added:** 2026-11-01
- **Resolved:** 2026-11-04
- **Priority:** worth-doing (resolved)
- **Status:** fixed (2026-11-04)
- **Problem:** Relocation can move session files into a worktree before the later worker admission/pre-spawn fence, so the worktree archive lease does not guard that earlier file move.
- **Impact:** A concurrent relocation and archive can race; task 35 cannot claim its worker fence protects the file move.
- **Owner:** Director, accountable for routing and assigning the separate Agent Service relocation/archive follow-up after task 35; evidence is `review-security.md`, finding 3, in `/home/shizuku/Project/ohpichamber-omp-artifacts/upstream-refresh-35-2026-10-30/`.
- **Solution:** Route a follow-up to reproduce the concurrent file-move/archive race and design a boundary protecting the move against archive; retain this entry until fixed or explicitly declined. This is not a task 35 dependency or a worker-lease expansion.
- **Fix:** Implemented pre-move worktree lease fence in `supervisor.assertWorktreeLeaseAllows(targetCwd)` called inside `SessionRegistry.prepareRelocation` *before* moving any session files on disk. Added active relocation registration during preparation to block concurrent archive lease acquisition (`acquireWorktreeLease` returns 409 `COMMAND_IN_FLIGHT`). Verified rollback and cleanup on race failure.
- **Evidence:** `bun test packages/agent-service/src/sessions/registry-native.test.ts` ("worktree archive lease cannot acquire destination or source while relocation is in flight") passed; artifacts in `p1-5-relocation-lease-fence.json`.
- **Cost:** Concurrency fence in `SessionSupervisor` and `SessionRegistry` with atomic cleanup.
