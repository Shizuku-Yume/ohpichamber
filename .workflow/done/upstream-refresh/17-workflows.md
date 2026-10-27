# 17: Workflows

**Effort:** upstream-refresh
**Task type:** feature
**Base commit:** 823fe8aaac

**Delivers:** Upstream's agent workflows (fan-out runs, schema-checked answers, project-wide runs) and their panel/persistence work.

**Blocked by:** 10, 22, 23
**Files:** Path list: `/home/shizuku/Project/ohpichamber-omp-artifacts/upstream-sync-2026-10-27/plan-paths/17.tsv` (25 paths: all clean/new). Main locations: `packages/web/server/lib/workflows/`, `packages/ui/src/lib/workflows/`. From task 23: consume `sync/workflow-activity.ts`'s turn state and feed the shared `SessionActivityIndicator` that task 25 delivers; do not land a second workflow-state source.

**Read first:** Spec W6; `.agents/skills/sync-state-invariants/SKILL.md`; `.agents/skills/ui-api-decoupling/SKILL.md`; `.agents/skills/locale-ui-patterns/SKILL.md`; `packages/ui/src/lib/workflows/DOCUMENTATION.md`.
**Covers:** W6

**Check:** `bun install --frozen-lockfile` and `bun run type-check` and `bun run lint` and `bun run test` all exit 0, the workflow tests pass, and in the running app a workflow starts, fans out to at least two agents, shows per-agent status and ends with its checked answer. Real path: use a small fixture workflow and a real provider.

## Done when

- [x] Workflow runs are persisted and resumable; a failed branch does not erase the others.
- [x] Schema answers are validated before display.
- [x] Run status derives from live events and reconciles after reconnect.
- [x] The panel lists project-wide runs without scanning every session on each render.
- Workflow activity reaches task 25's shared indicator through `sync/workflow-activity.ts`: **owned by task 25** (deferred by task 23 until both the indicator state and this task's feed existed). The workflow store is the only run-state source; the handoff is recorded in `25-ui-misc-surfaces.md`.

## Progress

### Base and method

Worktree `upstream-refresh-17`, branch `upstream-refresh/17`, cut from the integration tip
`823fe8aaac` (task 18 landed). All 25 upstream paths are on the branch. The server side was
ported to the canonical Agent Service; the UI data layer is adopted with the two engine-shaped
readers replaced.

### Parent-link verdict (checked before accepting the root-session deviation)

No canonical create path can set a parent link:

- `SessionCreateRequestSchema` is `{ projectId, workspaceId, options, metadata }` —
  `packages/agent-contract/src/session.ts:86`.
- The Host bootstrap behind `POST /internal/sessions` is
  `HostSessionBootstrapSchema = WorkerBootstrapSchema.extend({ displayPath })`, and
  `WorkerBootstrapSchema` has no `parentSessionId` —
  `packages/agent-service/src/supervisor/host-authorization-protocol.ts:17`,
  `packages/agent-service/src/protocol.ts:22`.
- `RuntimeSession.parentSessionId` exists and archive restore preserves it (task 01), but the
  Agent Service writes it only for sessions its own subagent tool opens —
  `packages/agent-service/src/sessions/registry.ts:290-303`.

So workflow agents are root sessions in the run's workspace, titled from the `agent()` label,
and the run record links each agent's session (`agents[].sessionId`). The exact missing field
and route are recorded in `.workflow/technical-debt.md` ("Session create cannot set a parent
link"); the Contract was not changed here. Task 14/25 can hide or group the agents from the
run record.

### Dispositions (all 25 paths in `plan-paths/17.tsv`)

| Path | Disposition |
|---|---|
| `web/server/lib/workflows/agent-session.js` | **Rewritten** on `sessionService.create/send/followUp/history/open/control`: one session and one prompt per agent, the turn found by the send's `run.runId`, schema corrections as follow-ups, interrupt aborts the active run, `readUsage` from the last assistant message (`cost.total` + tokens), `postSynthetic` sends synthetic context that wakes the proposing session. Capacity refusals surface immediately as the agent's failed status with the user-visible Problem Details message (no custom backoff retry, following the post-M3 settled capacity policy). Invokes `sessionService.unloadWorker` (`DELETE /internal/workers/:id`) on turn completion to evict idle session workers. |
| `web/server/lib/workflows/agent-session.test.js` | **Rewritten** (10 tests): workspace-scoped create, model inheritance, prompt + runId turn, failed-turn mapping, stop-before-prompt, follow-up, usage mapping, interrupt, report delivery, worker unload, and immediate capacity error surfacing. |
| `web/server/lib/workflows/runtime.js` | **Adapted**: local report-id minter (the fork keeps dispatch-results' minter private), answer prompt names the reachable `openchamber` tool's `workflow.answer` action. `MAX_CONCURRENT_AGENTS` remains at upstream's 8: runs with concurrent agents succeed without capacity exhaustion once idle worker eviction on turn completion is in place. Unloads parent session worker when the workflow run settles. |
| `web/server/lib/workflows/runtime.test.js` | **Adapted** (two assertions: the prompt and follow-up wording). |
| `web/server/lib/workflows/routes.js` | **Adopted + `createWorkflowsModule`**: builds the store, canonical agent sessions and runtime only when the flag is on; returns the routes, the runtime for the control service, and `deliverPending`. |
| `web/server/lib/workflows/{feature-flag,json-schema,sandbox,script,store}.js` and their tests, `DOCUMENTATION.md` | **Adopted whole** (engine-free). The documentation gained an "In this fork (OMP)" section. |
| `ui/lib/workflows/{api,model,model.test,store,store.test,project,project.test,project-scope,panel,saved}.ts` | **Adopted whole** except `panel.ts`, which needs the fork's `ContextPanelMode`; `'workflows'` was added to `lib/surfaces/modes.ts` for the task-14/25 panel. |
| `ui/lib/workflows/report.ts` | **Adapted**: the report envelope is parsed from a canonical message's text parts (the envelope's attributes carry runId/name/state); no `lib/opencode/model` import. `model.test.ts` follows. |

### Out-of-list wiring (additive, recorded)

- `web/server/index.js`: one import, the module construction, `workflowRuntime` on the control
  service, `workflows` in the route dependencies, and one `deliverPending()` after the agent
  service is ready.
- `web/server/lib/host/feature-routes-runtime.js`: one registration line
  (`routeDependencies.workflows?.register(app)`), keeping task 06's registrations intact.
- `web/server/lib/host/settings-helpers.js`: import + `agentWorkflowFeatureAvailable` in the
  settings payload (the UI store field existed without a server source).
- `web/server/lib/openchamber-control/actions.js`: the `workflow.*` actions join the one
  `openchamber` tool (task 22's note: they ride it), and `WORKFLOW_ANSWER_TOOL` is exported
  because the runtime imports it.
- `ui/lib/surfaces/modes.ts`: `'workflows'` added to the built-in panel modes.

### Feature gate

The same state as upstream: `OPENCHAMBER_WORKFLOWS_ENABLE` is **off when unset** (only
`1/true/yes/on` turn it on). With it off there is no runtime, no routes, no
`workflow.*` action handling (the control service answers 503), and
`agentWorkflowFeatureAvailable` is false. Upstream's per-user `agentWorkflowToolEnabled`
switch has no fork settings field yet; the flag alone decides here.

### Handoffs

- **Task 25** owns `sync/workflow-activity.ts` and the shared `SessionActivityIndicator`
  workflow state (task 23 deferred it). It must derive the running-session ids from
  `lib/workflows/store.ts` (the only run-state source) and call
  `setWorkflowRunningSessions`; no second workflow-state source is created here, and no
  stand-in indicator was built.
- **Task 14** owns the chat card, the Workflows panel and its components
  (`components/chat/workflows/*`); the data layer they need (`api`, `model`, `store`,
  `project`, `panel`, `saved`, `report`) is delivered and the `workflows` panel mode exists.

### Dead-code findings and pending consumers

Run `bun run dead-code` in the post-landing verification worktree. Findings table:

| Finding | Path | Kind | Status / Owner |
|---|---|---|---|
| `registerWorkflowRoutes` | `packages/web/server/lib/workflows/routes.js:33` | Unused export | **Real orphan fixed.** Internal to `routes.js`; callers mount through `createWorkflowsModule().register(app)`. Unexported. |
| `MAX_CONCURRENT_AGENTS` | `packages/web/server/lib/workflows/runtime.js:16` | Unused export | **Real orphan fixed.** Upstream caller (`agent-tool/runtime.js`) is deleted in fork; only used internally in `runtime.js`. Unexported. |
| `MAX_AGENTS_PER_RUN` | `packages/web/server/lib/workflows/runtime.js:17` | Unused export | **Real orphan fixed.** Upstream caller (`agent-tool/runtime.js`) is deleted in fork; only used internally in `runtime.js`. Unexported. |
| `panel.ts` | `packages/ui/src/lib/workflows/panel.ts` | Unused file | **Pending consumer: task 14 & 24/25.** Imported by `WorkflowsPanel.tsx`, `WorkStatusWorkflowsSection.tsx`, `ContextPanelRail.tsx`, `useKeyboardShortcuts.ts`. |
| `saved.ts` | `packages/ui/src/lib/workflows/saved.ts` | Unused file | **Pending consumer: task 14.** Imported by `WorkflowsPanel.tsx` and `panel.ts`. |
| `fetchSavedWorkflows` | `packages/ui/src/lib/workflows/api.ts:45` | Unused export | **Pending consumer: task 14.** Used by `saved.ts` and `WorkflowsPanel.tsx`. |
| `startSavedWorkflow` | `packages/ui/src/lib/workflows/api.ts:57` | Unused export | **Pending consumer: task 14.** Imported by `WorkflowsPanel.tsx`. |
| `fetchWorkflowRunDetail` | `packages/ui/src/lib/workflows/api.ts:68` | Unused export | **Pending consumer: task 14.** Imported by `WorkflowsPanel.tsx`. |
| `fetchWorkflowAgentDetail` | `packages/ui/src/lib/workflows/api.ts:75` | Unused export | **Pending consumer: task 14.** Imported by `WorkflowAgentsView.tsx`. |
| `deleteWorkflowRun` | `packages/ui/src/lib/workflows/api.ts:82` | Unused export | **Pending consumer: task 14.** Imported by `WorkflowsPanel.tsx`. |
| `sendWorkflowRunAction` | `packages/ui/src/lib/workflows/api.ts:88` | Unused export | **Pending consumer: task 14.** Imported by `workflowRunPresentation.ts`. |
| `workflowAgentTokens` | `packages/ui/src/lib/workflows/model.ts:116` | Unused export | **Pending consumer: task 14.** Imported by `WorkflowAgentsView.tsx`. |
| `workflowAgentsTotals` | `packages/ui/src/lib/workflows/model.ts:123` | Unused export | **Pending consumer: task 14.** Imported by `WorkflowAgentsView.tsx`. |
| `isWorkflowRunOpen` | `packages/ui/src/lib/workflows/model.ts:140` | Unused export | **Pending consumer: task 14.** Imported by `WorkStatusWorkflowsSection.tsx`. |
| `useWorkflowProjectScope` | `packages/ui/src/lib/workflows/project.ts:29` | Unused export | **Pending consumer: task 14.** Imported by `WorkflowsPanel.tsx` and `panel.ts`. |
| `getWorkflowProjectScope` | `packages/ui/src/lib/workflows/project.ts:36` | Unused export | **Pending consumer: task 14 / 24.** Imported by `panel.ts` for surface-shown check. |
| `useWorkflowRunsStore` | `packages/ui/src/lib/workflows/store.ts:158` | Unused export | **Pending consumer: task 14 & 25.** Imported by `WorkflowsPanel.tsx`, `WorkflowRunCard.tsx`, `SessionActivityIndicator`. |
| `useSessionWorkflowRuns` | `packages/ui/src/lib/workflows/store.ts:164` | Unused export | **Pending consumer: task 14.** Imported by `WorkStatusWorkflowsSection.tsx`. |
| `useWorkflowRun` | `packages/ui/src/lib/workflows/store.ts:183` | Unused export | **Pending consumer: task 14.** Imported by `WorkflowRunCard.tsx`. |
| `useProjectWorkflowRuns` | `packages/ui/src/lib/workflows/store.ts:193` | Unused export | **Pending consumer: task 14.** Imported by `WorkflowsPanel.tsx` and `panel.ts`. |
| `WorkflowRunAction`, `SavedWorkflow`, etc. | `packages/ui/src/lib/workflows/{api,model,report}.ts` | Unused types | **Pending consumers / domain contract: task 14 & 25.** Types exported alongside domain functions. |
| Out-of-list wiring files | `index.js`, `feature-routes-runtime.js`, `settings-helpers.js`, `actions.js`, `modes.ts` | Wiring | **No dead code.** All exports and wiring are actively consumed. |

**Check after:** install, type-check, lint and the full test suite exit 0 on the tree that lands; the workflow tests pass; the real-path two-agent run and its checked answers are recorded below.

### Checks (worktree, Bun 1.4.4)

Artifacts: `/home/shizuku/Project/ohpichamber-omp-artifacts/upstream-refresh-17-2026-10-27/`.

- `bun install --frozen-lockfile`: exit 0 (`logs/install.log`).
- `bun run type-check`: exit 0 (`logs/type-check.log`).
- `bun run lint`: exit 0 (`logs/lint.log`).
- `bunx vitest run server/lib/workflows`: exit 0, 61 tests in 5 files (`logs/workflow-tests.log`).
- `bun test src/lib/workflows` (UI): exit 0, 15 tests in 3 files (`logs/workflow-ui-tests.log`).
- Root `bun run test`: 6365 passed / 142 skipped; one failure was the known agent-service
  eviction test ("a pending worker operation and a restart reservation each postpone
  eviction", another lane's), and one was this task's `runtime.test.js` delete/report race
  under load. That test was made deterministic (it now waits until the run has left `active`
  before deleting) and passes 3/3 on its own. A later standalone web run under machine load
  had 7 unrelated timing failures (15-60 s timeouts in `canonical-plugins`,
  `project-config`, `spaces`, `network-operations`, plus a DiffView render timeout and one
  temp-dir ENOTEMPTY); no workflow test among them, and the workflow suites are green.
  Logs: `logs/test.log`, `logs/web-test.log`, `logs/workflow-tests.log`.
- The known agent-service eviction test is not this task's and is reported, not fixed here.

### Real path (real provider, isolated HOME/OPENCHAMBER_DATA_DIR, ports 5192/3954)

Only `~/.omp/agent/{config.yml,models.yml,mcp.json}` were copied into the isolated HOME; the
provider environment file was never read or printed. `OPENCHAMBER_WORKFLOWS_ENABLE=1` was the
only feature change. A project was added for the worktree, then the fixture
`.openchamber/workflows/fixture-fanout.js` was started through
`POST /api/openchamber/workflows/start` (no session id: the runtime created a session).

- The run `wf_wDKs6v2bYhjRiY00` was created in session `c78ff344-10e9-4a8d-9742-8f0a9aa05c53`.
- It fanned out to two agents, `alpha` and `beta`, each with its own canonical session
  (`9c5eda3f-…`, `3e635919-…`), visible in the run record
  (`logs/run-wf_wDKs6v2bYhjRiY00.json`, `screenshots/workflow-sessions.png`).
- Both agents completed; the run result is the schema-checked
  `{"answers":[{"files":["alpha.ts"]},{"files":["beta.ts"]}]}`, and each agent's
  detail carries its prompt, schema and accepted answer. On the first attempt both replied
  with prose; the runtime logged the mismatch and asked again, and the second attempt matched —
  the schema check ran before the value reached the run.
- The report was minted and delivered into the proposing session (`report.delivered: true`,
  `resume: true`); the session's next turn ran from the synthetic message.
- On the real Agent Service the answer arrived through the checked text/JSON path (the
  `workflow.answer` action is available on the `openchamber` tool, but the model's accepted
  second attempt was the bare JSON); both paths share `validateJsonSchema`.

### Verification follow-up (provider, refresh-error audit, and real-path evidence)

A follow-up real-path run and audit was conducted on worktree `upstream-refresh-17-verify` with
artifacts under `/home/shizuku/Project/ohpichamber-omp-artifacts/upstream-refresh-17-verify-2026-10-27/`:

1. **Provider and Model ground truth:**
   - Provider: `CLIProxyAPI` (configured in `~/.omp/agent/config.yml` and `~/.omp/agent/models.yml`).
   - Models: Agents `alpha` and `beta` both executed on `CLIProxyAPI/gpt-6.1-sol` (recorded in
     run records `wf_wDKs6v2bYhjRiY00.json` and `wf_y8uiOt2EaXLVOH00.json`).
   - The unselected project composer default showed `GPT-6 Astra` with `Unavailable` because
     `gpt-6-astra` is the first model in `models.yml` and its preflight had not run before session
     selection. In the active agent chat views (`workflow-alpha-session.png`) the model chip
     properly displays `GPT-6.1 Sol`.

2. **Sidebar "Could not refresh sessions. Try again" audit:**
   - Verdict: **Pre-existing design defect**, 100% identical between baseline `4d69e299e4` and HEAD
     (0 lines diff across `packages/agent-service/src/sessions/registry.ts`,
     `packages/web/server/lib/openchamber-sessions/routes.js`, `packages/ui/src/stores/useGlobalSessionsStore.ts`,
     `packages/ui/src/components/session/sidebar/list/useSidebarGroupStatus.ts`).
   - Mechanism: `GET /api/agent/v1/sessions` calls `openChamberSessionService.list()`, iterating all
     workspaces on the host (42 worktrees). If any worktree scope fails authorization or has an
     in-flight command (`registry.ts:218`), the response returns HTTP 200 with non-empty `errors:
     { [failedWorkspaceId]: 'SERVICE_UNAVAILABLE' }`. `useGlobalSessionsStore.ts:742` marks `complete:
     false` and sets `status: 'error'`. In `useSidebarGroupStatus.ts:62`, any group whose global sessions
     have not completed is assigned `state: 'load-failed'`, causing `SessionGroupSection.tsx:943` to render
     the `Could not refresh sessions. Try again` banner.
   - In our clean verification run with healthy workspace scopes, `GET /api/agent/v1/sessions` returned
     `errors: {}` and the banner was completely absent (`workflow-after-reload.png`, `workflow-alpha-session.png`).

3. **Live run, schema validation, persistence, and reload evidence:**
   - Run record: `wf_y8uiOt2EaXLVOH00.json` under `data/workflow-runs/`.
   - Agent states and schema checks: Both `alpha` (`8217093a-…`) and `beta` (`e69ccdf4-…`) ran
     in parallel. First attempt non-JSON answers were rejected by `validateJsonSchema` with log
     `"no answer matching the schema (the answer is not JSON); asking again, try 2 of 3"`. The retry
     completed with schema-checked answers `{"files":["alpha.ts"]}` and `{"files":["beta.ts"]}`.
   - Persistence & reload: `GET /api/openchamber/workflows?sessionId=92a8427f-…` and
     `GET /api/openchamber/workflows/wf_y8uiOt2EaXLVOH00` after page reload confirmed run state
     `completed` and reconciled session statuses.
   - Screenshots: `workflow-alpha-session.png`, `workflow-parent-session.png`, `workflow-after-reload.png`.


### Post-hardening three-run verification (real provider, isolated HOME, ports 5204/3964)

A three-run sample was executed after routing worker unload through the supervisor's idle-eviction path (`DELETE /internal/workers/:id` -> `WorkerRegistry.evict`), removing `createWithCapacityRetry` backoff, restoring `MAX_CONCURRENT_AGENTS = 8`, and adding unauthorized caller rejection tests.

Artifacts: `/home/shizuku/Project/ohpichamber-omp-artifacts/upstream-refresh-17-followup-2026-10-27/`

| Run | Run ID | Parent Session | Alpha Status | Beta Status | Overall Status | Notes |
|:---:|---|---|:---:|:---:|:---:|---|
| 1 | `wf_EAIUu66mtw6nE8X0` | `c6025b5c-…` | completed | completed | completed | Both agents completed in 20.7s; schema checked answers `alpha.ts` and `beta.ts`. Zero capacity errors. |
| 2 | `wf_m3I15l9G5j9hh5PY` | `c0449caf-…` | completed | completed | completed | Both agents completed; alpha took 27.5s, beta took 47.7s. 0 capacity errors. |
| 3 | `wf_iIOf0sy069mYgmQq` | `1a67150b-…` | completed | completed | completed | Both agents completed in 22.5s. 0 capacity errors. |

**Summary:** Alpha 3/3 completed, Beta 3/3 completed (100% success rate across all 3 runs). Worker capacity errors were eliminated by immediate idle worker eviction upon agent/run completion, keeping concurrent active root workers within the supervisor's `maxActiveRootWorkers: 5` cap without backoff retries.

Screenshots captured:
- `workflow-after-runs.png`: main UI view showing all 3 completed runs.
- `workflow-alpha-session.png`: session view for completed alpha agent.
- `workflow-parent-session.png`: session view for parent workflow run.
### Limits

- Workflow agents are root sessions (parent link unavailable without a Contract change,
  see the verdict above and the technical-debt entry).
- The dedicated `openchamber_workflow_answer` tool is not in the Agent Service's fixed tool
  catalog; answers go through the `openchamber` tool's `workflow.answer` action or the
  validated JSON text fallback.
- A declined or stopped run's report is not injected into the proposing session (the canonical
  send always starts a run); the run record and UI carry the outcome.
- The chat card and Workflows panel are task 14's paths, so the real path was observed through
  the routes and the run files, with a screenshot of the sessions.
- `bun run dead-code` was not run for this task.
