# OMP 18.16.0 Built-in TUI & RPC Feature Parity Audit

**Date:** 2026-11-05
**Pinned OMP Source:** `@oh-my-pi/pi-coding-agent@18.16.0` & `@oh-my-pi/pi-tui@18.16.0` (`vendor/omp/650f3a10/tarballs/`)
**Compared Against:** OhPiChamber `main` (`packages/agent-contract`, `packages/agent-service`, `packages/web`, `packages/ui`)
**Relation:** Extends `omp-opencode-openchamber-audit.md` and `crude-port-ledger.md` by auditing every built-in OMP 18.16.0 TUI display, HUD, tool renderer, slash command, selector, and RPC controller against OhPiChamber's Web/Electron GUI.

---

## 1. Executive Summary

While OhPiChamber has replaced OpenCode's runtime with the OMP Agent Service and ported core chat modes (`Main`, `Plan`, `Vibe`, `Goal`), `/btw` side questions, and the `todo` tray, a comprehensive audit of OMP 18.16.0's built-in TUI (`pi-coding-agent/src/modes/` + `pi-tui/src/`) shows **7 major categories of OMP TUI features and displays** that are either missing, dropped at the worker projection boundary, or only partially adapted in OhPiChamber:

1. **Tool Output & Markdown Visual Displays (Broken or Unrendered in GUI):**
   - **`out://` Mid-Turn Replies (`internal-urls/out-protocol.ts`):** OMP's system prompt instructs the model to write to `out://` to show the user a reply mid-turn without ending the turn. In OhPiChamber, `out://` is disabled because `tuiTranscript` / `out.enabled` is unset in `worker/session.ts`, and if called, `ToolPart.tsx` misrenders `write("out://")` as a workspace file-write card instead of a borderless prose reply (`ReplyWriteComponent`).
   - **Inline ` ```svg ` Figures (`pi-tui/src/chat/figure-markdown.ts`):** OMP's system prompt explicitly tells the model *"You SHOULD draw it in a ` ```svg ` block; it renders inline as an image"*. OhPiChamber only renders ` ```mermaid ` blocks (`MarkdownMermaid.tsx`) and displays ` ```svg ` blocks as raw XML source code.
   - **Markdown Table Auto-Charts (`pi-tui/src/chat/table-chart.ts`):** OMP's system prompt tells the model *"Numbers to compare? Markdown table; the UI charts it underneath"*. OhPiChamber renders plain HTML tables with no chart visualization.
   - **`ast_edit` Diffs & `ast_grep` / `eval` / `lsp` / `checkpoint` / `rewind` Cards (`ToolPart.tsx`, `toolDiffUtils.ts`):** `toolDiffUtils.ts:133` hardcodes `part.toolName !== 'edit'`, dropping all visual diffs and file stats for `ast_edit`. `ast_grep`, `eval`, `lsp`, `checkpoint`, and `rewind` have no `toolDescription()` summary and dump raw JSON.
   - **Consecutive `read` Tool Grouping (`pi-tui/src/chat/read-tool-group.ts`):** OMP's TUI groups consecutive `read` calls in a turn into a single compact tree (`ReadToolGroupComponent`). OhPiChamber renders 15–30 separate `ToolPart` cards.
   - **Streamed Tool Arguments (`modes/controllers/tool-args-reveal.ts`):** `WorkerProjection` drops `tool_stream_update` events (`projection.ts:420-472`), so users see an empty tool card until the entire `write`/`edit`/`eval` tool call finishes streaming.

2. **Subagent Live HUD, Steering & Cancellation (`modes/rpc/rpc-subagents.ts`, `pi-tui/src/tools/task.ts`):**
   - OMP's TUI and RPC stream `TASK_SUBAGENT_PROGRESS_CHANNEL` and `TASK_SUBAGENT_EVENT_CHANNEL` (live token count, cost, active tool name, turn count, retry countdown, and 8-level nested agent tree) and support steering a running subagent (`steer_subagent` / `write agent://<id>`) or killing a single subagent (`cancel_subagent` / `proc://<id>/kill`) without aborting the parent run.
   - OhPiChamber only listens to `TASK_SUBAGENT_LIFECYCLE_CHANNEL` (start/finish), has no live subagent token/cost/tool progress HUD, and cannot steer or cancel an individual running subagent.

3. **Timeline Event Notices Dropped by `WorkerProjection` (`modes/controllers/event-controller.ts`):**
   - OMP's `AgentSessionEvent` bus emits 28 event types, but `packages/agent-service/src/worker/projection.ts:360-490` drops:
     - `todo_reminder` (`TodoReminderComponent`: when the model stops with incomplete todos, shows `"X incomplete todos - reminder Y/Z"`).
     - `ttsr_triggered` (`TtsrNotificationComponent`: when a Time-Traveling Stream Rule rewinds a stream violation).
     - `auto_retry_start` / `retry_fallback_applied` (when OMP retries or falls back across model chains).
     - `served_model_mismatch` / `cache_invalidation` markers.
     - `advisor_yielded` (`AdvisorMessageComponent`: watchdog advisor notes and severity rails).
   - **Compaction Divider (`CompactionSummaryMessage`):** OMP shows the compaction method (`soft-compacted`, `snap-compacted`, `shaken`), token reduction badge (`256K → 20K`), and expandable summary; OhPiChamber only emits `tokensBefore`.

4. **Model Roles (15+1 Roles), Fast/Slow Tiers, Presets & OMP Settings (`config/model-roles.ts`, `OmpSettingsPage.tsx`):**
   - OMP defines 16 model roles (`default`, `smol`, `slow`, `vision`, `plan`, `commit`, `tiny`, `memory`, `task`, `advisor`, `widget`, `image`, `web`, `speech`, `dictation`, `judge`), quick-cycle order (`cycleOrder: ["smol", "default", "slow"]`), provider service tiers (`tier.openai`, `tier.anthropic`, `tier.google` for `/fast` and `/slow`), and named `modelPresets`.
   - In OhPiChamber's `OmpSettingsPage.tsx`, `modelRoles` is a raw JSON `<Textarea>` with **zero** visual model selectors, and `cycleOrder`, `modelPresets`, `modelRoleStorage`, and `tier.*` are missing from `OMP_SETTING_IDS`.

5. **Background Jobs, `proc://`, and Job Widgets (`async/job-manager.ts`, `job-widgets/`):**
   - OMP's TUI has a full `/jobs` sheet (`showJobsSheet()`), `proc://` stream/stdin/kill controls, AI-generated one-line job captions (`JobCaptionWriter` via the `widget` role), and declarative regex metrics widgets (`JobWidgetRegistry`: sparklines, progress bars, meters, status grids).
   - OhPiChamber only shows a flat command string with a Stop button in `BackgroundShellsStrip.tsx` and has no output/stderr/intent inspector modal or `proc://` stdin/stream UI.

6. **Branching, `/btw` Promotion (`branchFromBtw`), and Checkpoints (`session/agent-session.ts`, `tools/checkpoint.ts`):**
   - OMP's TUI supports promoting an ephemeral `/btw` answer into a real conversation branch (`branchFromBtw`) or injecting `<inject>` prompts into the main session, plus `checkpoint` and `rewind` tools (`branchWithSummary`).
   - OhPiChamber's `BtwPanel.tsx` only has an ask input and Cancel button (no "Promote to Branch"), and `checkpoint`/`rewind` have no UI badges.

7. **Slash Commands, Magic Keywords & Composer Ergonomics (`slash-commands/`, `modes/magic-keywords.ts`):**
   - **Slash Commands:** OMP has 87 builtin slash commands; OhPiChamber's worker only allowlists 7 (`compact`, `shake`, `todo`, `jobs`, `usage`, `context`, `tools`). High-value headless commands like `/handoff`, `/retry`, `/rename`, `/effort`, `/model`, `/switch`, `/fast`, `/slow`, `/prewalk`, `/force`, `/advisor`, `/loop`, `/cleanse`, `/omfg`, `/tan`, `/seance`, `/pin`, `/fresh`, `/clear`, `/dirs` are rejected with 400.
   - **Magic Keywords (`modes/magic-keywords.ts`):** Standalone `ultrathink`, `orchestrate`, `workflowz`, and `jevify` glow in the TUI composer and inject OMP's built-in hidden notices (e.g. `ultrathink` bumps thinking to `xhigh`). OhPiChamber ignores them.
   - **Composer Autocompletes & Prediction:** OMP's TUI autocompletes internal URLs (`skill://`, `local://`, `proc://`, `agent://`, `history://`) and offers post-turn ghost-text prompt predictions (`ComposerPredictionController`).

---

## 2. Complete OMP 18.16.0 TUI Display & Component Matrix

| Area | OMP 18.16.0 TUI Feature | OMP Source Citation | OhPiChamber Current State | Gap Classification |
|---|---|---|---|---|
| **Tool / Prose** | `out://` Reply Write Component (`ReplyWriteComponent`) | `modes/controllers/tool-call-block.ts:19-35`, `internal-urls/out-protocol.ts:1-110` | `out://` throws `ToolError` (`tuiTranscript` unset); `ToolPart.tsx` renders it as a broken file write card | **Broken / High Priority** |
| **Markdown** | Inline ` ```svg ` Figure Rendering (`FigureMarkdown`) | `pi-tui/src/chat/figure-markdown.ts:15-80`, `prompts/system/system-prompt.md:14` | Rendered as raw XML code block in `MarkdownRendererImpl.tsx:156` | **Missing / High Priority** |
| **Markdown** | Numeric Markdown Table Auto-Chart (`TableChartComponent`) | `pi-tui/src/chat/table-chart.ts:15-80`, `prompts/system/system-prompt.md:12` | Rendered as plain table in `MarkdownTable.tsx` | **Missing / Medium Priority** |
| **Tool Cards** | `ast_edit` Diff & File Stats | `tools/ast-edit.ts:156-250`, `pi-tui/src/tools/ast-edit.ts` | `toolDiffUtils.ts:133` checks `toolName !== 'edit'`, dropping all `ast_edit` diffs | **Broken / High Priority** |
| **Tool Cards** | `ast_grep`, `eval`, `lsp`, `checkpoint`, `rewind` Renderers | `pi-tui/src/tools/{ast-grep,eval,lsp}.ts`, `tools/checkpoint.ts` | `toolDescription()` returns `null`; dumps raw JSON | **Missing / High Priority** |
| **Tool Cards** | Consecutive `read` Tool Grouping (`ReadToolGroupComponent`) | `pi-tui/src/chat/read-tool-group.ts:40-120`, `event-controller.ts:636-645` | Every `read` renders as a separate `ToolPart` card | **Missing / High Priority** |
| **Tool Cards** | Streamed Tool Arguments (`tool_stream_update`) | `modes/controllers/tool-args-reveal.ts:15-100` | `projection.ts:420-472` drops `tool_stream_update`; args blank until tool call ends | **Missing / High Priority** |
| **Subagents** | Live Subagent Progress (`TASK_SUBAGENT_PROGRESS_CHANNEL`) & Tree HUD | `modes/rpc/rpc-subagents.ts:97-240`, `pi-tui/src/tools/task.ts:35-150` | Only start/finish lifecycle projected (`worker/session.ts:127-130`); no live token/cost/tool progress | **Missing / High Priority** |
| **Subagents** | Subagent Steer (`steer_subagent`) & Cancel (`cancel_subagent`) | `modes/rpc/rpc-mode.ts:784-873` | No worker control for steering or cancelling a single subagent; `SubagentSchema` lacks `'cancelled'` | **Missing / High Priority** |
| **Timeline** | `todo_reminder`, `ttsr_triggered`, `retry_fallback_applied`, `served_model_mismatch` Notices | `event-controller.ts:392-475, 2920-2931`, `pi-tui/src/chat/{todo-reminder,ttsr-notification}.ts` | Dropped in `worker/projection.ts:360-490` | **Missing / High Priority** |
| **Timeline** | Rich Compaction Divider (`method`, `tokensBefore → tokensAfter`, summary) | `pi-tui/src/chat/compaction-summary-message.ts:18-80` | Only `tokensBefore` emitted on `session.compacted` | **Partial / Medium Priority** |
| **Settings / Roles** | Visual Pickers for 16 `modelRoles` + `modelPresets` + `tier.*` | `config/model-roles.ts:56-85`, `config/service-tier.ts:8-85` | `OmpSettingsPage.tsx` renders `modelRoles` as a raw JSON textarea; presets and service tiers absent | **Missing / High Priority** |
| **BTW** | Promote `/btw` to Branch (`branchFromBtw`) & `<inject>` | `session/agent-session.ts:13674-13780`, `btw-controller.ts:210-235` | `BtwPanel.tsx` only supports ask + cancel | **Missing / Medium Priority** |
| **Jobs** | `/jobs` Inspector Sheet, `proc://` Streams/Stdin, & `job-widgets/` | `modes/interactive-mode.ts:8343-8370`, `job-widgets/runtime.ts:54-104` | `BackgroundShellsStrip.tsx` only shows flat command pill + Stop button | **Partial / Medium Priority** |
| **Commands** | Extended Headless Slash Commands (`/handoff`, `/retry`, `/rename`, `/effort`, `/model`, `/fast`, `/slow`, `/prewalk`, `/force`, `/loop`, `/pin`, `/fresh`, `/clear`) | `slash-commands/builtin-*.ts`, `slash-commands/acp-builtins.ts` | Only 7 commands allowlisted in `worker/builtin-commands.ts:4` | **Partial / High Priority** |
| **Composer** | Magic Keywords (`ultrathink`, `orchestrate`, `workflowz`, `jevify`) & Turn Budgets (`+Nk!`) | `modes/magic-keywords.ts:88-125`, `modes/turn-budget.ts:1-35` | Not recognized in composer or worker | **Missing / Medium Priority** |
| **Composer** | Internal URL Autocomplete (`skill://`, `local://`, `proc://`, `agent://`, `history://`) | `pi-tui/src/prompt/internal-url-autocomplete.ts:1-80` | Only `@file` and `/command` autocomplete exist | **Missing / Medium Priority** |
| **Status Line** | 27-Segment Status Bar & Annotated Compaction/Speculation Gauge | `pi-tui/src/status-line/component.ts:3250-3295`, `segments.ts:206-1345` | Split across `Header.tsx`, `StatusRowContainer.tsx`, and `WorkStatusPanel.tsx` | **Partial / Medium Priority** |
| **Autonomous** | `/cleanse`, `/omfg`, `/tan`, `/seance`, Advisor Watchdog, Live Voice Mode | `cleanse/`, `omfg-controller.ts`, `tan-command-controller.ts`, `seance.ts`, `advisor/`, `rpc-live.ts` | Absent in GUI | **Missing / Advanced Optional** |
