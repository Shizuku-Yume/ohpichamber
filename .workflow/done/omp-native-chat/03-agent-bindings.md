# 03: Remove root agent bindings outside the composer

**Effort:** omp-native-chat
**Task type:** bugfix
**Base commit:** 5d1fd2aed3b3624a688af74819c096a13d166ca8
**Started:** 2026-10-26T00:00:00-07:00
**Status:** active

**Delivers:** Commands, multi-run, scheduled tasks and the fork, review and todo-send dialogs no longer bind a root agent, so none of them can produce the 422 that a missing profile tool caused. Agent profiles stay editable on the Agents settings page as `task` subagent definitions.

**Blocked by:** 01
**Files:** `packages/ui/src/components/sections/commands/CommandsPage.tsx` and `sections/commands/AgentSelector.tsx`, `packages/ui/src/components/multirun/AgentSelector.tsx` and `RunOverview.tsx`, `packages/ui/src/components/chat/composer/parallel/useParallelComposer.ts`, `packages/ui/src/components/session/{ForkSessionDialog,ReviewFlowDialog,ScheduledTaskEditorDialog,TodoSendDialog}.tsx`, `packages/web/server/lib/scheduled-tasks/session-defaults.js`, `sections/openchamber/DefaultsSettings.tsx` (default agent field), `sections/agents/AgentsPage.tsx` (copy only).

**Read first:** spec "Root agent retirement"; `research/crude-port-ledger.md` SET-01; decisions.md: 2026-10-25 - Replace root agent selection with session modes.
**Covers:** W1
**Check:** `bun run --cwd packages/web test` scheduled-task tests and `bun run --cwd packages/ui type-check`; UI editor tests assert no root agent field and null prompt agent IDs.


## Progress
Dirty at start: none
Check before: root agent values were present in command, multi-run, scheduled, fork, review and todo-send paths; scheduled defaults returned configured agent IDs.
Root cause: legacy root-agent controls remained in UI forms and scheduled runtime option construction after OMP retired root agents.
Check after: `bun run --cwd packages/agent-contract build` and `test` passed (178 tests); focused scheduled web tests passed (56 tests); focused UI boundary suites passed (60 tests / 249 assertions). UI package type-check is blocked only by eight pre-existing missing `chat.chatInput.toast.attachmentUnsupported` locale keys outside this task.
Real path: isolated Web `GET /health` returned HTTP 200 with Agent Service ready; scheduled-task PUT/DELETE API path was exercised and receipt is `/home/shizuku/Project/ohpichamber-omp-artifacts/omp-native-chat-03-2026-10-25/lane-a-http-path.txt`.
Review boundary: Base commit 5d1fd2aed3b3624a688af74819c096a13d166ca8; changed UI canonical prompt options, shared profile selector callers, scheduled legacy conversion/runtime/docs, and command persistence.
Review A/B initial blockers fixed: legacy conversion uses `resolveScheduledTaskOptions` with null agent; shared selector moved to agents and callers/mock relinked; fork execution no longer carries agent; scheduled task cards omit agent display; docs and loop mapping mark legacy agent input-only.
Review A2/B2 rerun requested after final diff; no unresolved findings observed before rerun.
Decided without maintainer: preserve agent profile editing in Agents settings because profiles remain task-tool subagents, while root prompts use null agent IDs.
Evidence notes: focused tests and HTTP receipt above; full UI type-check remains blocked by unrelated locale completeness errors listed in its output.

- [x] Command editor has no agent binding; saved command files lose the agent field on next save, and reading an old file ignores it.
- [x] Multi-run and parallel composer send `agentId: null` per run.
- [x] Scheduled-task editor and runtime send `agentId: null`.
- [x] Fork, review and todo-send dialogs have no agent field.
- [x] Default agent setting is removed from Defaults settings; the Agents page remains the profile editor for `task` subagents.
- [x] Removed root-agent UI bindings and runtime agent option use are removed from the touched locales/paths; retained shared agent labels remain for other settings.

**Finished:** 2026-10-26T00:00:00-07:00
