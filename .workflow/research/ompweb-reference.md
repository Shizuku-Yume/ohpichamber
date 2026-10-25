# ompweb as OMP adaptation reference

**Date:** 2026-10-25
**Reference:** `kahme247/ompweb` v0.5.2 (`647a045`, MIT), local clone `/home/shizuku/Project/ompweb`
**OMP:** 18.8.9 pinned source (`vendor/omp/c9de2b02`)
**Relation:** recipes for the fixes in `crude-port-ledger.md`. Read-only analysis; nothing here is implemented.

## 1. What ompweb is

Next.js (Node) web UI. It cannot import Bun-only `@oh-my-pi/*`, so it spawns `omp --mode rpc-ui --cwd <cwd>` per active session (`lib/omp/rpc-process.ts:106`, `lib/rpc-manager.ts`), reads session JSONL directly (`lib/session-reader.ts`) and uses `omp auth-gateway stdio` for credentials. Its `AGENTS.md` (868 lines) records protocol traps and is the most useful part.

**Decision: keep our in-process SDK worker; do not copy the subprocess design.** ompweb's process boundary exists only because Node cannot load OMP. Our Bun worker already imports OMP and depends on the vendored patch (`initialModelRefreshStrategy`, `observeBashJobs`), in-process host tools and the fail-closed interaction manager. Instead, reuse OMP's RPC-mode modules in-process: `package.json` exports `./modes/*`, `./modes/rpc/*`, `./slash-commands/*` (lines 398, 426, 454).

## 2. Reusable OMP modules

| Module | Constructor | Gives us |
|---|---|---|
| `modes/rpc/rpc-goal` `RpcGoalController` | `(session, onContinuationDropped?)` `rpc-goal.ts:98` | Goal create/resume/pause/drop, `goal` tool swap, autonomous continuation on `agent_end`, session-change handling |
| `modes/rpc/rpc-btw` `RpcBtwController` | `(session, output)` `rpc-btw.ts:51` | Ephemeral side question via `runEphemeralTurn`, `btw_delta`/`btw_record`, history sidecar |
| `modes/rpc/rpc-subagents` `RpcSubagentRegistry` | `(eventBus, output)` `rpc-subagents.ts:119` | Subagent lifecycle/progress frames; cancel/steer helpers in `rpc-mode.ts` |
| `slash-commands/acp-builtins` `executeAcpBuiltinSlashCommand` | `(text, SlashCommandRuntime)` | Headless builtins: returns `false` / `{consumed}` / `{prompt}` |

`SlashCommandRuntime` (`slash-commands/types.ts:66-118`) needs session, sessionManager, settings, cwd, output, refreshCommands, reloadPlugins; RPC also supplies `runCommandInBackground`. No TUI dependency.

Headless builtins worth an allowlist: `compact shake handoff retry rename todo jobs usage context tools effort model fast slow prewalk force advisor export mcp`. Block for a GUI host: `ssh wt move add-dir remove-dir marketplace plugins share stats trace computer dump` (they touch Host-owned workspace, network egress, installs or spawn servers).

Plan/vibe/goal entry is `handleTui` only; RPC exposes only `goal`. Plan and vibe need our own controller (section 4).

## 3. Recipes by ledger item

| Ledger | ompweb mechanism (file) | Our in-process recipe |
|---|---|---|
| CP-01/02 agent selector | No root agent selector; agents edited only as `task` definitions | Remove composer agent selector and `@agent` root override; mode switcher main/plan/vibe/goal |
| CP-03 effort | `["off", ...model.thinking.efforts]` (`app/api/models/route.ts:55`), `set_thinking_level` | UI reads `reasoningOptions` (already projected); worker `setThinkingLevel`; `variants` only for configured routes |
| CP-04 compact | `{type:"compact", customInstructions}` → `session.compact()`; reload context after (`rpc-mode.ts:2339`) | Canonical compact operation; drop `sendMessage('/compact')` |
| CP-05 attachments | Text files inlined with dynamic fence, 4 MB budget (`lib/chat-attachments.ts:114-126`); binaries rejected | Worker inlines text attachments into user content; others become explicit path text, not hidden custom message |
| CP-06/07 tools, todo | Category map per OMP name (`components/MessageView-tool-format.ts`); `TodoList.tsx` from `todo_update`/`todoPhases` pinned above composer | Replace OpenCode-2 buckets; todo card + composer tray from OMP `TodoPhase[]` |
| CP-08 ask | `set_ask_dialog: true` (`lib/rpc-manager.ts:522`); recommended preselect, multi, preview, "Other" input (`components/ExtensionDialog.tsx`) | Project `recommended`/`preview`/`multi`/timeout through our interaction manager; keep CAS/expiry |
| CP-09 revert | Fork = `branch` RPC new file; in-session branch = read-only leaf switch; never fatal | Non-fatal branch errors; split fork vs leaf navigation |
| CP-11 slash | `get_available_commands` + client prompt expansion (`lib/web-slash-commands.ts`) | Allowlisted `executeAcpBuiltinSlashCommand`; templates expanded; palette from `buildAvailableSlashCommands` |
| CP-12 btw | `btw`/`btw_cancel`/`get_btw_history`, pinned `BtwPanel` (`lib/btw.ts`, `hooks/useBtw.ts`) | `RpcBtwController` in worker; retire forked-session btw |
| subagents | `set_subagent_subscription:"events"`, roster tray with tokens/cost/tool (`ComposerPanels.tsx`) | `RpcSubagentRegistry` → canonical child events; add cancel/steer (ompweb lacks them) |
| queue | OMP owns queue; `abort_and_restore_queue` restores drafts | Host queue stays delivery authority (ADR); use OMP abort-and-restore for in-run steering only. Decide before touching. |
| model roles | AST-preserving YAML edit of `modelRoles` in `config.yml` (`lib/omp/model-roles.ts`) | Settings page for roles; map small-model override to `smol` |

ompweb does not solve real plan/vibe/goal: `/plan` and `/goal` are rewritten into plain prompts (`lib/web-slash-commands.ts:25-81`). We should do better.

## 4. Plan/vibe/goal recipe (from `modes/interactive-mode.ts`)

Mutual exclusion: plan (active/paused), vibe, goal (active/paused) never overlap (`:4928`, `:5165`, `:6009`).

**Plan enter (`:4923-4985`):** snapshot enabled + mounted tools; keep `write`; `setActiveToolsByName(planTools)`; `setPlanModeState({enabled, planFilePath: getPlanReferencePath() ?? "local://PLAN.md", workflow})`; `setPlanProposalHandler(t => preparePlanForReview(t))`; apply role `plan` via `resolveRoleModelWithThinking("plan")` + `setModelTemporary`; `appendModeChange("plan", {planFilePath})`; if streaming `sendPlanModeContext({deliverAs:"steer"})`.
**Plan exit (`:5040-5140`):** clear state and handler; `restoreNonMCPToolPresentation`; restore model; `appendModeChange("none" | "plan_paused")`; mid-turn wrap in `runModeExitTeardown`.
**Approve (`:5606-5785`):** proposal arrives via `preparePlanForReview` → GUI review dialog (approve / feedback / reject) → exit plan → optional compact with plan instructions → restore tools incl. `read` → `markPlanReferenceSent` → synthetic prompt `planModeApprovedPrompt`.
**Vibe (`:5998-6088`):** `activateVibeTools(["read","todo"])`, `setVibeModeState({enabled})`, `appendModeChange("vibe")`; exit aborts, kills `VibeSessionRegistry` workers, `deactivateVibeTools`.
**Goal:** `RpcGoalController` as-is.

Exact line numbers for plan/vibe must be re-read before implementation; the steps are from a scout pass.

## 5. Other ompweb patterns worth copying

- Live tool execution: `tool_execution_update` carries the full accumulated result; coalesce at display rate (`lib/message-update-coalescer.ts`).
- Tool-result images served by content hash, never base64 in events (`lib/media-cache.ts`).
- Composer-pinned trays for todos, subagents, btw (`components/ComposerPanels.tsx`).
- Mid-prompt ` /` = skill-only autocomplete inserting `/skill:<name>` (`lib/slash-autocomplete.ts`).
- `agent://<id>` links open subagent transcripts (`lib/agent-links.ts`).
- Session title via native `generate_title`, never during a run.
- Completion notification on `session_settled`, not prompt result (async jobs must finish).
