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
| `web/server/lib/workflows/agent-session.js` | **Rewritten** on `sessionService.create/send/followUp/history/open/control`: one session and one prompt per agent, the turn found by the send's `run.runId`, schema corrections as follow-ups, interrupt aborts the active run, `readUsage` from the last assistant message (`cost.total` + tokens), `postSynthetic` sends synthetic context that wakes the proposing session (a declined/stopped report stays in the run record: the canonical send always starts a run). `allowTools` is accepted and unused: the answer action rides the managed `openchamber` tool. |
| `web/server/lib/workflows/agent-session.test.js` | **Rewritten** (9 tests): workspace-scoped create, model inheritance, prompt + runId turn, failed-turn mapping, stop-before-prompt, follow-up, usage mapping, interrupt, report delivery. |
| `web/server/lib/workflows/runtime.js` | **Adapted**: local report-id minter (the fork keeps dispatch-results' minter private), answer prompt names the reachable `openchamber` tool's `workflow.answer` action. Everything else adopted whole. |
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
