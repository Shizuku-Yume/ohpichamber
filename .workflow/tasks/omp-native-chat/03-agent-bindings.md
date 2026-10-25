# 03: Remove root agent bindings outside the composer

**Effort:** omp-native-chat
**Task type:** bugfix
**Base commit:** <commit-sha>

**Delivers:** Commands, multi-run, scheduled tasks and the fork, review and todo-send dialogs no longer bind a root agent, so none of them can produce the 422 that a missing profile tool caused. Agent profiles stay editable on the Agents settings page as `task` subagent definitions.

**Blocked by:** 01
**Files:** `packages/ui/src/components/sections/commands/CommandsPage.tsx` and `sections/commands/AgentSelector.tsx`, `packages/ui/src/components/multirun/AgentSelector.tsx` and `RunOverview.tsx`, `packages/ui/src/components/chat/composer/parallel/useParallelComposer.ts`, `packages/ui/src/components/session/{ForkSessionDialog,ReviewFlowDialog,ScheduledTaskEditorDialog,TodoSendDialog}.tsx`, `packages/web/server/lib/scheduled-tasks/session-defaults.js`, `sections/openchamber/DefaultsSettings.tsx` (default agent field), `sections/agents/AgentsPage.tsx` (copy only).

**Read first:** spec "Root agent retirement"; `research/crude-port-ledger.md` SET-01; decisions.md: 2026-10-25 - Replace root agent selection with session modes.
**Covers:** W1

**Check:** Before: `grep -rn "agentId\|currentAgentName" ` over the listed files shows root agent values flowing into `PromptRequest.options`. After: UI tests for each listed editor assert no agent field and a captured `agentId: null`; `bun run --cwd packages/web test` asserts scheduled-task session defaults produce `agentId: null`; `bun run --cwd packages/ui type-check` passes.

- [ ] Command editor has no agent binding; saved command files lose the agent field on next save, and reading an old file ignores it.
- [ ] Multi-run and parallel composer send `agentId: null` per run.
- [ ] Scheduled-task editor and runtime send `agentId: null`.
- [ ] Fork, review and todo-send dialogs have no agent field.
- [ ] Default agent setting is removed from Defaults settings; the Agents page says profiles are subagents used by the `task` tool.
- [ ] Removed i18n keys deleted in every locale.
