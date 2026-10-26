# OMP-native chat basics

**Status:** in progress
**Priority:** high
**Integration branch:** omp-native-chat/integration

## What this is for

Chat now runs on OMP, but the composer still behaves like OpenCode. It offers a root agent picker although OMP has no root agent: picking a custom profile, or one whose tools are missing, makes new chats fail with 422. OMP's plan, vibe and goal modes can't be reached at all. Several controls are mechanical ports that send the wrong thing to OMP: the effort picker reads routing variants, Compact sends the literal text `/compact`, non-image attachments reach the model as a hidden path, tool rows and the status line use OpenCode 2 tool names, the todo tool has no card, the ask dialog drops previews, `/btw` forks a whole session, and slash commands ignore OMP builtins. The evidence and locations are in `research/crude-port-ledger.md` (CP-01 to CP-08, CP-10 to CP-12, SET-01).

If nobody fixes this, the Linux build fails on everyday actions, and settings work, the upstream merge and multi-platform release all build on a chat surface that misrepresents the engine.

## What it does

- A new chat starts in the main conversation. The composer has a mode switcher (Main, Plan, Vibe, Goal) where the agent picker was. Agent definitions remain as subagents for the `task` tool and are edited in Settings, not selected per chat.
- Plan: tools narrow to OMP's plan set and the session's plan model role applies. When the agent proposes a plan, a review card shows it with Approve, Approve and compact, Send feedback and Reject. Approving leaves plan mode and starts execution in the same session.
- Vibe: OMP's vibe tools replace the normal set until the user switches back.
- Goal: the user enters an objective and optional token budget; the agent continues turn after turn until it reports the goal complete, the budget runs out, or the user pauses, drops or aborts it. The current goal shows above the composer. OMP's goal mode is the only goal loop: the Host's Session Goals supervisor is retired, and its entry points (composer target button, fork-from-answer, plan implement, scheduled tasks, CLI `--goal`) start an OMP goal instead.
- The mode survives reload, reconnect and Agent Service restart.
- The effort picker lists the selected model's real thinking levels (`off` plus the model's efforts).
- Compact compacts the session, with optional instructions, and the transcript shows the compaction marker.
- Text attachments reach the model as visible content. Other files reach it as a visible path note. An oversized text file gets a clear refusal, never a silent drop.
- Tool rows and the status line name OMP tools correctly. `todo` renders as a checklist with phases, and the current list is pinned above the composer.
- The ask dialog shows option previews and preselects the recommended option.
- The slash palette lists allowlisted OMP builtins and prompt templates, and runs them.
- `/btw` asks a side question in a panel without creating a session.

## How it is built

### Boundary

OMP stays in-process in the Agent Service worker (`WorkerSession` over `AgentSession`). Every new control follows the existing path: UI `canonicalClient` → Host session routes (authorization only) → Agent Service supervisor → session registry → worker operation. The Host holds no mode state. Reused OMP pieces come from the pinned 18.8.9 package exports (`./modes/rpc/*`, `./slash-commands/*`): `RpcGoalController`, `RpcBtwController` and `executeAcpBuiltinSlashCommand`. Interactive-mode code is a recipe only; it is not imported. `research/ompweb-reference.md` has the source line references.

### Session mode

`SessionMode` joins the canonical runtime session record and the session snapshot, and changes emit `session.updated`:

```ts
type SessionMode =
  | { kind: 'main' }
  | { kind: 'plan'; status: 'active' | 'paused'; planReference: string } // `local://PLAN.md` style, never a host path
  | { kind: 'vibe' }
  | { kind: 'goal'; status: 'active' | 'paused' | 'budget-limited' | 'complete'; objective: string; tokenBudget: number | null; tokensUsed: number };
```

OMP's session state is the source of truth. The worker's mode controller reads it on open, so a reopened or restarted session reports the mode OMP restored, and writes every transition with `sessionManager.appendModeChange`. Plan, vibe and goal are mutually exclusive, as in OMP. A mode change while a run is active returns 409 `RUN_ACTIVE`; the switcher is disabled during a run. Steering a running turn into plan mode is out of scope for this effort.

Plan enter and exit follow OMP's `interactive-mode.ts` (`#enterPlanMode` 4923, `#exitPlanMode` 5041): snapshot the enabled tool set, `setActiveToolsByName` with the plan set, `setPlanModeState`, `setPlanProposalHandler`, apply the `plan` model role with `resolveRoleModelWithThinking`, then restore all of it on exit. Vibe follows `#enterVibeMode` 5998 and `#exitVibeMode` 6062. Goal is `RpcGoalController` unchanged. OMP's `goal.continuationModes` defaults to `["interactive"]`, so the worker adds `rpc` to it for its sessions; without that the controller never continues. A dropped goal reports `{kind:'main'}`.

### Session controls

The existing `POST /api/agent/v1/sessions/:sessionId/control` body (today only `abort`) gains these operation types, each a worker operation of the same name:

- `mode.set` `{ mode: 'main' | 'plan' | 'vibe' }`
- `goal` `{ op: 'create' | 'resume' | 'pause' | 'drop', objective?, tokenBudget? }`, passed to `RpcGoalController.handle`
- `compact` `{ instructions?: string }`, calling `session.compact()` and emitting `session.compacted` exactly as auto-compaction already does
- `btw.ask` / `btw.cancel`, through `RpcBtwController`
- `command` `{ text }`, through `executeAcpBuiltinSlashCommand` with the allowlist below

Every control is refused with 409 while a run is active, except `btw.*`, `goal pause`, `goal drop` and the read-only builtins `context`, `usage`, `tools`, `jobs` and `todo`. Answers use the existing Problem Details shapes.

### Worker-originated runs

Today the projection opens a canonical run only for a prompt the Host submitted (`queuedPrompts` in `projection.ts`). Plan approval and goal continuation make OMP start a turn by itself, and those events are currently dropped. The projection gains a worker-originated run: same `run.*` events, same `Run` record, plus `origin: 'host' | 'plan' | 'goal'`. The Host treats an active worker-originated run like any other active run, so `/runs` and the queue wait for it and abort reaches it. This is not a second queue: the worker never holds a user prompt, it only reports turns OMP started by itself (decisions.md: 2026-10-25 - Report OMP-initiated turns as worker-originated runs). A goal turn the Host aborted calls `RpcGoalController.stopForHostAbort()`, so continuation stops until the user resumes.

### Plan review

The plan proposal handler turns a proposal into a pending question of a new kind, `plan-review` (plan title, plan reference, plan text, actions `approve`, `approve-compact`, `feedback` with text, `reject`). It goes through the existing interaction manager, so CAS, generation identity, reconnect recovery and fail-closed expiry come with it. Approve follows `#approvePlan` (5606): leave plan mode, compact with the plan as instructions when asked, restore tools, `markPlanReferenceSent`, then start a worker-originated run with OMP's rendered `plan-mode-approved` prompt. Feedback returns the text to the plan turn; reject leaves the agent in plan mode.

### Goal entry points

The Host Session Goals supervisor (`packages/web/server/lib/session-goal/`) is removed: its idle timer, small-model audit, continuation prompt, objective files and `metadata.openchamber.goal` writes. Every place that started a supervisor goal now sends the `goal create` control instead, with the objective it already computes: the composer target button and goal dialog, fork-from-answer and plan implement "Run as goal", scheduled tasks with `execution.goalEnabled`, and CLI `session create|send|fork --goal`. A create on a new session is sent after the session exists and before its first prompt; OMP starts the first goal turn itself. The goal button, strip, dialog and sidebar glyph read `SessionMode`. The Host notification runtime keys "goal active" and "goal settled" off `session.updated` mode changes, so per-turn ready notifications stay suppressed during a goal and one notification fires when it completes or hits its budget. The default token budget setting stays; the evaluation-model setting is removed.

### Root agent retirement

`PromptOptions.agentId` stays in the contract but must be `null` for every root prompt. A non-null value, or an `agentMention`, is rejected with 400 `INVALID_REQUEST` at Host admission, before any queue write or dispatch. At start-up the Host rewrites stored queue and scheduled items that still carry a root `agentId` to `null` and logs how many it changed. Agent profiles remain the `task` subagent catalog that the Agents settings page edits. The composer, mobile agent button, command editor, multi-run editor, scheduled-task editor and the fork, review and todo-send dialogs lose their agent field.

### Effort

The effort picker lists `reasoningOptions` from the model catalog (`off` plus the model's efforts) and sends `reasoningEffort`. The worker already applies it with `setThinkingLevel` in `selectOptions`. `variants` remain only for configured `thinking.effortRouting` routes and are labelled as routes, not efforts.

### Attachments

Images are unchanged. A text attachment becomes an OMP `fileMention` message: `path` is the attachment name, never a host path, and `content` is the decoded text, so OMP sends it to the model as `<file path="…">`. Text means a `text/*`, JSON, XML, YAML or source-code media type, or Host-converted document text, that decodes as UTF-8 with no NUL byte. Limits are 500,000 characters per file (the contract's document-projection limit) and 1,000,000 per prompt. Over either limit, admission returns 413 `PAYLOAD_TOO_LARGE` before a run starts. Any other file is rejected at admission with 400 `INVALID_REQUEST` naming the file. The hidden `ohpichamber.attachment` path message goes away.

### Rendering

The status row and tool cards classify tools by OMP's builtin tool names, using the tool registry of the pinned package as the list. Unknown names, MCP tools and extension tools fall into a generic category with their own name shown. The `todo` tool renders a checklist with phases, and the latest todo state on the active branch is pinned above the composer. The ask dialog keeps `preview` in the UI schema, renders it, and preselects `recommended`.

### Slash commands

The palette lists prompt templates and these OMP builtins: `compact`, `shake`, `todo`, `jobs`, `usage`, `context`, `tools`. Builtins run through the `command` control; their output text returns in the control response and shows as a notice. Anything else is refused with 400 `INVALID_REQUEST`, which keeps commands that touch the workspace, the network, installs or session topology out of the GUI (`ssh`, `wt`, `move`, `add-dir`, `marketplace`, `plugins`, `share`, `handoff` and the rest). Prompt templates keep going through the existing `commands/expand-text` route.

### Side questions

`/btw` opens a side panel. `btw.ask` runs `RpcBtwController.ask`, which uses `runEphemeralTurn`: no session is created and nothing is written to the main transcript. Streaming text arrives as `btw.delta` and `btw.completed` events on the session stream, keyed by record id. The current forked-session btw store is removed.

## What it must not do

- **No subprocess runtime.** No `omp --mode rpc-ui` process, and no import of `interactive-mode.ts` or TUI code.
- **No mode state in the Host.** The Host authorizes and forwards; OMP's session holds the mode.
- **No Host queue change.** The Host stays the single delivery owner (contracts.md "Single Delivery Owner"). OMP's queue is used only for in-run steering, as today.
- **No mid-run mode switch.** Steering a running turn into or out of plan mode waits for a later effort.
- **No settings work.** Permission-mode mapping, personality, model roles, LSP, extensions, MCP file handling and the usage page are ledger batch B3. Jobs, checkpoints, shake and handoff UI are B4. Each gets its own effort.
- **No independent goal audit.** OMP's goal ends when the agent calls its `goal` tool, the budget runs out, a continuation makes no progress, or the user stops it. No second model judges completion.
- **No other surfaces.** This effort is checked on Linux, Web and Electron. Mobile and the other desktop platforms come with M5.

## What was considered and rejected

- **Run OMP as `omp --mode rpc-ui`, as ompweb does.** The RPC process already implements goal, btw, subagents and commands, and it is OMP's maintained host interface. ompweb uses it only because Node can't load OMP. Our Bun worker already imports OMP and depends on the vendored patch, in-process host tools and the fail-closed interaction manager; a subprocess would duplicate the worker and move those guarantees across a pipe (decisions.md: 2026-10-25 - Drive OMP modes in-process instead of the rpc-ui subprocess).
- **Keep the agent picker, filtered to profiles that load.** This is the smallest change and keeps a familiar control. But OMP has no root agent: profiles are `task` subagent definitions, and a root override changes tools behind OMP's back, which is what produced the 422. Modes are how OMP changes root behaviour (decisions.md: 2026-10-25 - Replace root agent selection with session modes).
- **Plan as a prompt rewrite, as ompweb's `/plan` does.** It needs no worker change. But the tools are not restricted, no plan file is produced, nothing survives a reload and there is no approval step, so it is not plan mode.
- **Mode as a per-run `PromptOptions` field.** Each prompt would carry its mode, which suits queued sends. But a queued item would then switch the mode at dispatch time, behind the mode the user can see, and OMP keeps mode as session state.
- **A separate plan-review endpoint.** Its shape could be exact. But it would repeat the question CAS, expiry, generation and reconnect rules the interaction manager already proves.
- **Host-driven goal continuation.** The Host already owns delivery, so it could send each continuation prompt. But `RpcGoalController` already owns budget accounting, the no-progress stop and session-change handling, and copying it would split goal state between two processes.
- **Keep the Host supervisor's independent audit on top of OMP goal mode.** A separate small model judging each turn catches an agent that declares success too early, and needs three `blocked` verdicts before stopping. But it means two goal state machines, two token counters and a Host process prompting the session behind OMP's goal runtime. The maintainer chose OMP alone; an audit can return later as an optional OMP-side check (decisions.md: 2026-10-25 - Use OMP goal mode as the only goal loop).
- **Inline every attachment as text, like ompweb.** Simple. But binary bytes are not text, and the contract caps document projections at 500,000 characters.

## How we will know it works

Contract shapes get schema tests in `agent-contract`. Worker behaviour is tested against a real OMP `AgentSession` whose provider is a local `Bun.serve` chat-completions fixture configured through the real catalog, the harness `worker/session-native.test.ts` already uses. That proves the OMP calls and the projection, not model behaviour. Host admission and migration get `packages/web` tests. UI gets component tests. Only W15 uses a real provider, loaded from the operator env file named in `standards.md`.

- **W1.** With an agent profile whose `allowedTools` names an unavailable tool present, a new chat sends and completes. Composer, mobile composer, command editor, multi-run, scheduled-task, fork, review and todo-send UIs show no agent field.
- **W2.** A root prompt or queue append with a non-null `agentId`, or with `agentMention`, gets 400 `INVALID_REQUEST`, and nothing is queued or dispatched. After a Host restart over a queue holding root `agentId` items, every item has `agentId: null` and the log states the count.
- **W3.** `mode.set plan` on an idle session: the snapshot reports `{kind:'plan', status:'active'}` with a `local://` reference; the worker's active tools equal OMP's plan set; a `write` outside the plan file is refused by OMP; the `plan` role model is applied. The mode survives a page reload and an Agent Service restart. `mode.set main` restores the previous tools and model. `mode.set` during a run gets 409 `RUN_ACTIVE`.
- **W4.** OMP starting a turn without a Host prompt emits `run.started` with `origin` set, streams normally, reaches a terminal `run.*`, and an abort stops it. While it runs, `/runs` gets 409 and a queued item waits.
- **W5.** A plan proposal appears as a `plan-review` question. Approve leaves plan mode, restores tools and starts an `origin:'plan'` run with the plan-approved prompt. Approve and compact also emits `session.compacted` first. Feedback returns the text to the planning turn. Reject keeps plan mode. A second client's stale answer gets the existing CAS conflict. A reconnect shows the pending review again. Expiry fails closed.
- **W6.** `mode.set vibe` activates OMP's vibe tools, survives a restart, and `mode.set main` restores the previous tools.
- **W7.** A goal is created with an objective: the agent continues over at least two `origin:'goal'` runs without new prompts, and stops on complete, budget, pause, drop or user abort. The composer shows the objective, status and token use. An abort does not start another goal turn until the user resumes.
- **W8.** For a model with efforts `[low, medium, high]`, the picker shows `off, low, medium, high`, and a send at `high` runs with thinking level `high`. A model without reasoning shows no picker. A model with configured routes shows them as routes.
- **W9.** Manual compact with instructions emits `session.compacted`, and the transcript shows the marker. During a run it gets 409. No `/compact` text appears in the transcript or reaches the provider.
- **W10.** The fixture provider's captured request contains a text attachment's content inside `<file path="<name>">`, and no host path appears in any client-visible payload. An attachment over 500,000 characters, or a prompt over 1,000,000, gets 413 before a run. A zip attachment gets 400 naming the file. An image is still sent as an image.
- **W11.** Every builtin tool in the pinned OMP registry maps to a status and card category; an MCP tool shows its own name. A `todo` call with two phases renders both phases and their items, and the composer tray shows the latest list, also after a reload.
- **W12.** An ask question with option previews renders them and preselects the recommended option; answering still goes through CAS.
- **W13.** The slash palette lists the seven allowlisted builtins and the prompt templates. `/context` returns its text as a notice without starting a run. `/ssh` is refused with 400. A prompt template still expands.
- **W14.** `/btw <question>` streams an answer into the side panel. The session list and the main transcript are unchanged afterwards, and cancel stops the stream.
- **W15.** Real path: `bun run dev` on Linux with a real provider. Start a chat in Main, switch to Plan, get a plan, approve it, watch it execute, compact with instructions, reload the page, and confirm the mode and transcript. Then run a two-turn goal and abort it. Receipt and screenshots go to the evidence directory in `standards.md`.
- **W16.** Regression: `bun run test`, `bun run type-check` and `bun run lint` pass at the root, and the existing chat flows behave as before: send, queue, steer, follow-up, abort, approval, question, fork, revert and reopen.
- **W17.** `packages/web/server/lib/session-goal/` and the `/api/goals` routes are gone, and no Host code writes `metadata.openchamber.goal`. Fork-from-answer and plan implement with "Run as goal", a scheduled task with `goalEnabled`, and `openchamber session create --prompt <p> --goal` each produce a session whose snapshot reports `{kind:'goal', status:'active'}` with the expected objective, followed by an `origin:'goal'` run. While that goal is active no per-turn ready notification fires; when it completes exactly one notification fires.

Breakage shows as a 4xx Problem Details code in the composer toast, a `mode` that disagrees between snapshot and composer, or a worker fatal-exit line in the Agent Service log. Edges: an empty goal objective (400), a plan proposal with no plan file (OMP's own error, shown in the transcript), a reconnect during plan review, two clients switching modes at once (the second gets 409 once the first run starts, or a no-op if it is idle and already in that mode), and an Agent Service restart during an `origin:'goal'` run (the run ends `failed`, and the goal is `paused` on reopen).

## Open questions

None. OMP 18.8.9 passes its optional millisecond ask timeout to rich dialogs; the worker forwards it in the existing `omp.ask` schema and the UI countdown is informational while InteractionManager CAS expiry remains authoritative.

## Notes

- Evidence and source references: `research/crude-port-ledger.md`, `research/ompweb-reference.md`. OMP line numbers are for 18.8.9 and must be re-read before use.
- CP-09 (revert) is not in this effort: `selectBranch` retiring the worker after a partly applied navigation is deliberate (it prevents prompting against a stale native context). It gets a bugfix task only with a reproduction.
- Subagent lifecycle is already projected through `TASK_SUBAGENT_LIFECYCLE_CHANNEL`; `RpcSubagentRegistry` is not needed here.
- The retired supervisor had a `blocked` status; OMP has none. Where the supervisor would have blocked, OMP stops continuing after a no-progress turn and waits for the user, or keeps going. Goal metadata from the supervisor left on existing sessions is ignored, not converted.
- Tasks: `tasks/omp-native-chat/`.
