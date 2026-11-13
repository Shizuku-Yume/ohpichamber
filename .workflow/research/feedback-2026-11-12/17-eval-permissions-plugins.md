Final report.

# Item 17: eval display

## Observed
The screenshot shows the eval row's input as a raw JSON blob (`{"language":"js","title":…,"code":"const t0=…\n…"}`), with the code as one escaped string inside a `max-h-60` scroll box. Below it comes bash-style text output and an error box. There is no code highlighting, no cell or step structure and no tool timeline.

## What OMP sends
Source is the installed 18.18.0 (`node_modules/@oh-my-pi/pi-coding-agent` and `pi-tui/src/tools/eval.ts`). `~/Project/oh-my-pi` is an older tree: it has `jsonOutputs` and `hasMarkdown`, which the installed build replaced with `views`. I designed against the installed one.

- **Call args**: `{language: "py"|"js", code, title?, timeout?, reset?}`. They stream through `toolcall_delta`, so the code is visible while it is being written.
- **Partial results**:
  - `tool_execution_update` is coalesced to 50 ms (`eval.ts` `LIVE_UPDATE_INTERVAL_MS`).
  - `content[0].text` is the whole tail buffer.
  - `details` is a full snapshot each time.
- **`details`** (`EvalToolDetails`):
  - `cells[]`: `{index, title, code, language, output, views?, status: pending|running|complete|error, durationMs, exitCode, statusEvents[], statusEventsElided}`. `views[]` holds `{text, view}` entries: table with columns and rows, json, or markdown.
  - Call level: `statusEvents`, `replies` (`out://` text), `images`, `notice`, `meta` (truncation), `isError`, and `async{state, jobId}` when auto-backgrounded.
- **Nested `tool.<name>()` calls are not separate tool events.** The bridge (`eval/js/tool-bridge.ts`, `summarizeToolResult`) calls `tool.execute` directly. It emits one completion-only status event per call:
  - `read`: `{path, chars, preview≤500}`
  - `write`: `{path, chars}`
  - `grep`: `{pattern, path, count}`
  - `glob`: `{pattern, count, matches≤20}`
  - `bash`: `{op:"run", cmd, code, output≤500}`
  - `todo`: `{chars, committed}`
  - anything else: `{op: name, chars}`
  - failures add `{hasError, error}`
- There is no start event, so a tool that is running right now is invisible. The only signals are the cell status and the last event.
- **Other event ops**:
  - `phase{title}` and `log{message}` from the helper prelude.
  - `agent` and `judge_batch`: progress snapshots coalesced by `id`, with `status`, `currentTool`, `lastIntent`, `toolCount`, `model`.
  - `mcp_progress`, `tool_define`, `workpool`, `completion`, `env`, `git_*`, `wait`.
  - `EVAL_TIMEOUT_PAUSE_OP` and `EVAL_TIMEOUT_RESUME_OP` are consumed internally and never reach the UI.

## What we receive and what we drop
- **Received in full** (verified): `agent-service/src/worker/projection.ts` `publishToolResult` and `toolResultOutput` (lines 233–255, 880–899) forward `{content, details}` verbatim into `ToolResultPart.output` on every partial and on the terminal frame. Input streaming and images also arrive.
- **Dropped by the UI** (verified by grep): nothing in `packages/ui`, `agent-service` or `agent-contract` reads `details.cells`, `statusEvents`, `views`, `replies` or `async`. The only use is `presentations.ts:200–206`, which yields the text "N cells".
- **Renders wrong today**:
  - `isShellTool()` (`toolPresentation/index.ts:121`) treats `eval` like `bash`. `formatToolInput` (`toolHelpers.ts:703`) only special-cases `input.command`, so eval falls through to `JSON.stringify(input)`. That is the blob in the screenshot.
  - Output is passed through the terminal and bash highlighter.
  - Input is capped at `max-h-60` (`ToolPart.tsx:1026`), which contradicts "show all content".
- **Running state is lost, a bug that also affects bash.**
  - `ToolPart.tsx:1232`: `running = !result && …`.
  - `MessageBody.tsx:1231–2017` hides the call row as soon as any `tool_result` part exists, including a partial one.
  - So after the first streamed update the row loses its shine and spinner while the cell is still running.
  - `tool.started` and `tool.completed` do update `call.status` (`event-reducer.ts:564–576`), and `pairedCall` is available. The fix is to take liveness from `call.status`.
- **Secondary gap** (inference): `latestTodoPhases` (`todoHistory.ts`) only reads results of the `todo` tool. A `tool.todo()` call inside eval commits phases (OMP's TUI watches `statusEvents` for `todo` with `committed`), but the event carries no phases. The todo tray will not update from eval.
- **Perf** [INFERENCE]: each partial re-sends all cell code and output. The UI must memoise highlighting by code string.

## How the OMP TUI renders it (`tui/src/tools/eval.ts`)
- **Head**: the title, or "Eval", plus a language badge, a `background` badge and "N cells".
- **One run box per cell**, in order:
  - caption `i/N title` (multi-cell calls only);
  - code (`runInput`);
  - output (`runOutput`);
  - `views` in place of the printed text they stand for (tables, json tree, markdown);
  - a status section showing the newest 8 events behind an "N earlier" row;
  - a foot with state (running, done, failed, cancelled), elapsed time or `durationMs`, `exitCode`, notice and truncation.
- A failed cell tints its box.
- `agent` events render as a task-tree below the cell.
- Expanded shows `preview` blocks under `read` and `run` events.
- Images and `replies` draw after the call.

## Design mapped to our components
Add a native eval presenter in `components/chat/message/parts/`. It is selected in `ToolExpandedContent`/`ToolPart` for `toolBaseName === 'eval'` and no longer uses the shell path. Stop using `isShellTool` for eval. Add `useEvalView(call, result)` in `toolView.ts` that Zod-parses `details`. Zod is already used in `presentations.ts`. If `details` is absent (the call row before any result), fall back to `call.input` as a single pending cell.

- **Header row** (`ToolPart`): title, plus `describeResult` such as `3 cells · 1.2s · 4 tool calls`. Eval-specific `describeResult` in `presentations.ts` (extend `eval`).
- **Cell box** (new `EvalCellBlock`, one per cell):
  - Caption `1/3 · title`, language chip and a status dot.
  - Status dot and spinner: use `MinDurationShineText`/`BusyDots`; state comes from `cell.status`.
  - Elapsed time from `durationMs`.
  - Code via `WorkerHighlightedCode` (`javascript` or `python`), uncapped. Collapse above about 40 lines with a toggle.
- **Step timeline** (new `EvalStepList`, ReadToolGroup-style `├──` tree):
  - Source: `cell.statusEvents`. Each row has an icon by op (read/write/grep/glob/run/phase/log/agent), a one-line summary and an error tint.
  - The newest row is marked "last completed"; while the cell is running, show a pulsing "next…" row.
  - `phase` renders as a heading, `agent` reuses the subagent row look, and `statusEventsElided` becomes "N earlier".
  - Expanded `preview` or `output` goes in a mini `WorkerHighlightedCode`.
- **Output**:
  - Text goes through `renderTerminalOutput`, with `ToolScrollableSection followKey` to tail-follow while running.
  - `views`: table to a small table (the `GuestToolTable` styling pattern), json to `JsonTreeViewer`, markdown to `SimpleMarkdownRenderer variant="tool"`. Split the output text by `views[].text` as OMP's `splitEvalOutput` does.
  - `replies` render as the existing `ReplyWrite` prose.
  - `images` go through the existing image block with `onShowPopup`.
  - `notice`, `meta` truncation and the async/background badge go in a footer line.
- **Errors**: keep the existing error box. Cell `exitCode` and the failing step row show where it stopped.
- **New i18n keys** are required in all locales.

## Fix shape
1. Fix `running` in `ToolPart` (one line, covers bash too).
2. Add the eval parser and presenter described above.
3. Optional follow-up: add the todo tray reading eval `todo` events.

**Decision for the maintainer:** how much of the step timeline to ship at first. I recommend the full cells + steps + output. Nested calls will only show after completion, since that is all OMP sends.

---

# Items 13 and 14

## #25, agent tool permissions (item 13)
**Component**: `packages/ui/src/components/sections/agents/AgentsPage.tsx:322–402` (section "tool permissions"). It is a flat 2–4 column checkbox grid of `OMP_TOOL_NAMES` (`lib/toolPresentation/index.ts:27`), plus a free-text "permission preset ID" input.

**Facts** (verified):
- **The grid edits an activation set, not permissions.** `allowedTools` goes to `setActiveToolsByName` in `agent-service/src/worker/session.ts:683–686`.
- **"Show all" can break a profile.** It sets `[...OMP_TOOL_NAMES]`, the static UI registry, which includes `ida`, `retain`, `search` (an alias of grep), `web`, `memory`, `openchamber_*` and `vibe_*`. If any of them is not registered in the session, selecting the profile throws 422 `UNSUPPORTED_CAPABILITY`.
- **The registry can't say what is available.** The UI has no live tool catalog. The service has `availableToolNames` and `getAllToolInfos()`, but only uses them for validation.
- **The preset ID does nothing.** Nothing applies `permissionPresetId` to behaviour. `worker-operation-authorizer.js:11` validates it against `['ask','safety','auto']` and `stores/DOCUMENTATION.md:685` says no preset catalog exists. A free-text box for a three-value token is an empty-shell field.
- **Upstream v2.7.0** used `AgentPermissionsEditor.tsx` (`git show bc50ba56a:…`): one row per tool with a name, an effect hint and a chip group (inherit/allow/ask/deny), expandable patterns, an MCP server section and "add custom key". It was OpenCode rule-based; that model is gone.

**Metadata available for grouping**:
- Per tool: `label` and `icon` and `group` in `TOOL_PRESENTATIONS` (`presentations.ts`).
- From OMP: `ToolInfo {name, description, sourceInfo, mcpServerName, mcpReadOnlyHint}` and each tool's `approval` tier (read/write/exec; some tiers are function-valued per call).
- OMP has no category field. The groups must be fork-owned.

**Proposal**:
- Group the tools as: Files and search (read, write, edit, apply_patch, ast_*, glob, grep, find), Execution (bash, eval, debug, lsp, task, wait), Web and external (web_search, github), Planning and memory (todo, checkpoint/rewind, memory/recall/learn, goal, think, advise), Multi-agent (vibe_*), OpenChamber (openchamber_*, notify), and MCP/extension tools from the agent's own list.
- Each group is a collapsible `SettingsSection`-style block with a header checkbox (all/some/none), "N of M".
- Rows are `SettingsCheckboxRow`s with the label, a one-line description and a small tier chip (read/write/exec).
- Put the three quick actions in the header as `SettingsChipGroup`.
- Replace the preset text input with a `SettingsChipGroup` (ask/safety/auto) or remove it until it has a runtime effect.

**Needed from the service**: expose a tool catalog (name, label, description, tier, availability), so the grid shows only registered tools and "Show all" never produces an unselectable profile.

## #26, OMP Plugins page (item 14)
**Components**:
- `components/sections/plugins/PluginsPage.tsx` (installed, marketplace, `InstalledRow`).
- `ExtensionControlCenter.tsx` (the "capabilities" block in the screenshot).
- `AddPluginDialog.tsx` and `MarketplaceSourcesDialog.tsx`.

**Why it looks dry** (from the code and screenshot):
- **Empty installed section**: it is one muted line.
- **No hierarchy**: the capability list is flat, with a switch on every row.
- **Rule rows** show raw regex or glob triggers as chips. `ExtensionControlCenter.tsx:172,225` forces uppercase on `kinds[].label`, so "SKILLS" and "RULES" stay English and unlocalized.
- **Noisy paths**: `…/builtin-defaults:go-add-c…` rows dominate (26 of 31 are bundled rules).
- **The inspector** shows only the first row by default.

**Data available** (`agent-contract/src/plugins.ts`):
- `ExtensionItem {kind, name, scope, path, enabled, shadowed, disabledReason, toggleable, description?, triggers[], content?, metadata{transport,host,port,…}}`.
- `ExtensionInventory.providers[] {displayName, enabled, itemCount, …}`.
- Marketplace `details {category, tags, author, commands, agents, hooks, mcpServers, lspServers, dapAdapters}`.
- Installed `{name, version, description, scope, enabled}` plus update info.

**Upstream patterns to follow**:
- **MCP and Skills catalog**: `SettingsCard` grid (icon tile, status pill, subtitle, footer) plus `SettingsCardSearch`, as in `McpGrid.tsx`.
- **Skills catalog**: source cards plus a virtualized `divide-y` list (`SkillsCatalogRows.tsx`).
- **Integrations**: collapsible `IntegrationCatalogCard`.
- `PATTERNS.md` asks for a flat hierarchy with no card chrome in ordinary settings pages. Catalog and list pages are the exception, and their precedents are those shared card components.

**Proposal**:
- **Installed plugins** as a `SettingsCard` grid: icon, version and update pills, enabled switch via `control`, scope chip, capability counts in the footer (commands, agents, hooks, MCP servers). An empty state with an explanation and an "Add plugin" CTA that opens `AddPluginDialog`.
- **Capabilities** (`ExtensionControlCenter`) restructured by kind first:
  - Chip tabs from `kinds[]` (localized labels, with counts).
  - Sources shown as one compact row of switches.
  - Bundled/builtin collapsed by default, with a "Show N bundled" toggle.
  - Rows show kind icon, name, a `description` line (or an "always on" pill for always-apply rules), a status pill and a switch.
  - Raw trigger or regex text and the full path move into the inspector. The row shows at most one trigger chip.
- **Marketplace**: keep the list but give it category chips from `details.category` and `tags`, a card layout for matching, and counts of declared capabilities.

**Design choice for the maintainer**: the first two options are "restructure the existing component" and "rebuild as cards". I recommend restructuring `ExtensionControlCenter` and cardifying installed plugins only.