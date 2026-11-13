# Maintainer feedback 2026-11-12: merge losses, permissions, settings ownership and chat latency

**Status:** in progress
**Priority:** high
**Integration branch:** ux-feedback-2026-11-12/integration

## What this is for

The maintainer used the installed build of `main` (`97284e9cf`) and reported 17 problems: denials under YOLO, a fake marketplace install, missing settings titles and options, a broken Usage page, a local machine listed as a remote device, hollow settings that look wired, dry Agents and Plugins pages, slow suggestions, a one-second stall on new chats, chunky streaming, and an opaque `eval` display.

Each problem is traced to its cause in [research/feedback-2026-11-12](../research/feedback-2026-11-12/README.md). A read-only follow-up audit compared the whole tree against upstream `bc50ba56a` and audited every settings page that had not been audited. Its output is `/home/shizuku/Project/ohpichamber-omp-artifacts/ux-feedback-dispatch-2026-11-13/`: `REPORT.md`, `audit-merge.md`, `audit-merge.tsv` and `audit-settings-shells.md`. Most problems fall into four classes:

- **The v2.7.0 merge kept upstream UI but dropped its Host wiring, and overwrote fork fixes.** These parts of the UI call routes or stores that no longer exist:
  - notification channels, auto-review, PR watch, provider logos, small-model providers and diagnostics files;
  - SSH passphrase import.

  These earlier fixes or settings were lost:
  - `pairedDevices`, quota `workspaceId` and the terminal close-on-exit option;
  - per-workspace session tabs;
  - three race guards.

  The audit lists 15 P0 and 44 P1 rows. One P0 (`/api/fs/preview/:grant`) is a false positive: the route is registered as a regex at `fs/routes.js:1489`.
- **Allowlists that only cover what was known when they were written.**
  - The Host authorizer's fall-through denies every OMP tool the fork did not name, including `eval`, `find`, `ast_*` and `mcp__*`.
  - The OMP settings allowlist reaches 157 of OMP's 602 settings.
  - The settings-effect test counts a store field as a consumer, so controls that write a field nobody reads pass it.
- **Two implementations of one capability.** These pairs coexist:
  - OpenChamber's image and memory host tools beside OMP's;
  - a Host suggestion pipeline beside OMP's turn-end prediction;
  - two 100 ms throttles stacked on the stream;
  - a root default agent that OMP rejects.
- **Budgets measured the wrong path.** The W9 dispatch budget timed `POST /runs`, while the user waits on `POST /sessions` (about 1 s) and on the first streamed token.

Nine product decisions settled on 2026-11-13 bind this effort: `decisions.md` entries tagged `ux-feedback-2026-11-12`.

## What it does

- Restores every Host route, runtime, store setter, setting and fork fix the merge dropped, or records why it stays retired. A guardrail in `bun run check` fails the next merge that drops one.
- Authorizes OMP tools by tier. Under `auto`, `eval`, search tools and MCP calls run without a denial or a prompt. Under `ask` and `safety` they prompt like `bash`. A read outside the workspace becomes an approval card; writes outside it stay refused, with the Host's reason visible to the model and the user.
- Installs MCP servers at project or user scope, chosen at install time. An install that saved but did not connect says so, and Settings → MCP shows the server with its scope.
- Gives every settings page its title and description, moves static prose behind the info icon, and removes the root default agent everywhere.
- Places OMP settings on the page that owns their concept, adds Tools and Memory pages, and renders the OMP page's long tail from OMP's registry. Settings with a sentinel show "Default" or "Auto" instead of `-1`. OMP owns image generation and agent memory.
- Rebuilds the Agents tool-permission editor on a live tool catalog and the Plugins page on the shared card patterns.
- Replaces the Usage page with an OMP-native dashboard: an all-providers comparison and a view per configured provider.
- Generates the next-prompt suggestion at turn end from the session model or the small model, as the user chooses.
- Shows the user's message at once and starts a new chat without the one-second stall. Text, thinking and tool input stream every 33 ms, and an edit's diff appears while its arguments stream.
- Renders `eval` as cells with code, a live step timeline and structured output, as the OMP TUI does.

## How it is built

**Merge-gap guardrail (`scripts/upstream-gaps.mjs`).** The audit scripts become one check. It compares upstream `bc50ba56a` with the working tree on:
- `register*Routes` calls and the runtimes passed to them;
- route-defining functions that nothing calls;
- UI, Electron and mobile `/api/*` calls against server routes, matching string, parameter and regex routes;
- `settingsItem` ids, settings registry keys, server sanitizer keys, store fields with their setters, and `search.ts` entries.

Each gap is either present or listed in an allowlist file. Every allowlist row names the `decisions.md` heading or OMP owner that justifies it. Orphan locale keys are out of the check (1,815 rows are inherited upstream noise). The audit's 13 P1 orphan keys are restored with their controls.

**Restorations** follow upstream `bc50ba56a`, adapted only where the OMP boundary requires it:
- `/api/small-model`'s callable-provider list resolves through OMP `modelRoles` (decision 2026-11-05).
- `/api/diagnostics/opencode-load` is retired with OpenCode.

**Tool authorization.**
- `worker-operation-authorizer.js` replaces the `toolRequests` fall-through with OMP's tier for the tool:
  - read tools are allowed after the path check;
  - write tools need the workspace write grant;
  - exec tools and `mcp__*` (for servers in the workspace policy) return `approvalRequired`.
- The worker's bash approve-then-reauthorize loop generalizes to any `approvalRequired`. Approval grants carry `{toolName, input}`, which also unblocks LSP mutations.
- The worker forwards the authorizer's reason in `block.reason`.
- The per-agent `allowedTools` closure applies only to the root session's own calls.

**MCP scopes.**
- The MCP contract gains `scope: project | user`. User scope is `~/.omp/agent/mcp.json`.
- Configure persists, then applies, and reports `applied | saved-needs-auth | saved-not-connected` with the native error code and detail. A failed apply no longer reads as installed or as a success.
- The marketplace and Settings → MCP read the same project directory (`useSettingsDirectory`).

**OMP settings ownership.**
- The service derives the setting list from OMP's registry (`orderedSettings()`); the hand-kept `OMP_SETTING_IDS` is removed.
- A placement table maps each id to a target page and section, or to `tui-only`, `engine` (the OMP page) or `owned-by <settingsItem>`.
- An `owned-by` row must name a control that actually writes the OMP key. The duplicate-owner test enforces this.
- The OMP page renders its rows from the registry descriptor:
  - type → control;
  - `options` → select, including sentinel values;
  - `condition` → visibility.
- New Tools and Memory pages hold capability toggles and `memory.backend`.
- Host tools are registered in a worker only when enabled.
- `openchamber_image` and the `memory` host tool with its store are deleted.
- The `workflow.*` actions join the host-tool protocol, so the existing workflow toggle has an agent path.
- The OpenChamber `web` tool and OMP's `browser` tool are both shown on the Tools page as separate rows with distinct descriptions. Neither is disabled by this effort.

**Suggestions.**
- The worker runs OMP's `runEphemeralTurn` with `composer-prediction-user.md` and `parseComposerPrediction` at a completed `agent_end`, or calls the small model, according to the setting `suggestion.generator: session | small | off` (default `session`).
- It publishes the result as a transient canonical event.
- The Host suggestion runtime and its 60-second timer are deleted.

**Latency.**
- The UI event pipeline flushes every 33 ms, and `useStreamingTextThrottle` no longer delays streaming text.
- The normal send path inserts a pending user message through the existing optimistic machinery.
- `POST /sessions` responds before catalog registration of the new worker; the generation guard is kept.
- The projection skips `part.updated` when tool input is unchanged, and forwards `tool_stream_update` edit previews into the tool part.
- `scripts/perf` gains a `create → run → first event` scenario and a stream-cadence scenario, each with a budget.

**Eval.** An eval presenter parses `details` (cells, status events, views, images) with Zod and renders cell boxes, a step timeline and structured output. Eval leaves the shell path. `ToolPart`'s running state is fixed for every tool.

**Usage.** A new Agent Service endpoint reads OMP statistics: `stats.db` rollups, `authStorage` usage reports and session stats. Quota fetchers stay as they are, scoped by `workspaceId`. Model pricing comes from OMP. `pricing === null` renders "—".

**Task rules.** Every task deletes what it replaces. Every UI change follows `PATTERNS.md` and `STYLING.md`. Copy goes to all locales; Chinese writes "Token". No task certifies its own UI; the gate task's reviewer compares surfaces against references.

## What it must not do

- Re-derive or reopen the nine 2026-11-13 decisions.
- Make `eval`, MCP or out-of-workspace reads bypass `ask` and `safety` modes.
- Keep a second editor, toggle, tool, suggestion pipeline or throttle beside the one this effort makes canonical.
- Add auto-compaction status, `todo_auto_clear` handling, plan-mode or slash-command mirror tests. They are real gaps from `12-tui-vs-sdk.md` but not in the maintainer's report. They go to `technical-debt.md`.
- Clean up the 1,815 unclassified orphan locale keys.
- Touch the installed app's data directories during real-path runs.

## What was considered and rejected

- **Fix the 17 reported spots one by one.** Faster to start. Rejected: the merge audit found 59 P0/P1 rows behind them, and the previous gate passed because it checked only the reported items.
- **Add `eval` and the other tools to the descriptor-free allow list.** One line. Rejected: `eval` would then bypass `ask` and `safety` (decision 2026-11-13).
- **A Usage page with a scope switcher over the session-derived report.** Smaller. Rejected by the maintainer in favor of OMP-native statistics.

## How we will know it works

- **W1 (Merge gaps closed and guarded).** `node scripts/upstream-gaps.mjs --check` runs inside `bun run check` and exits 0. Every upstream route registration, runtime dependency, UI `/api` call, settings item, registry key, sanitizer key, store setter and search entry is either present or allowlisted with a decision or OMP-owner citation. Deleting `registerNotificationChannelRoutes(...)` or the `terminalCloseOnExit` setter makes the check fail.
- **W2 (Restored Host features on the real path).** On the Web surface:
  - opening Settings → Integrations raises no error toast, and a notification channel connects;
  - a review flow starts an auto-review run;
  - a PR watch strip appears for a session with a PR;
  - a custom provider logo uploads and renders;
  - a passphrase-protected SSH key imports;
  - the diagnostics export includes local files;
  - the walkthrough model picker lists callable models.
- **W3 (Restored settings and fixes).**
  - "Close the tab when the shell exits" and per-workspace session tabs are configurable and take effect.
  - Remote instances does not list this device.
  - Quota loads for the current workspace and switches with it. A failed provider list shows one error, not one row per provider.
  - The quote highlight retry, the mobile drawer's last-tab close and the usage refresh race guard are back, each with a regression test.
- **W4 (Tool authorization).**
  - The coverage test gives every OMP 18.18.0 built-in tool a decision from the real authorizer, matching its OMP tier.
  - On the real path in `auto`, a turn using `eval`, `find`, `ast_grep` and an MCP tool completes with no denial and no card.
  - In `ask`, `eval` raises a card.
  - Reading a file in `/tmp` raises a card in `ask` and passes in `auto`.
  - Writing outside the workspace is refused, and the refusal names the reason in the transcript.
  - An LSP rename succeeds after approval.
- **W5 (MCP install).**
  - Installing an OAuth server from the marketplace, at project scope and at user scope, shows "sign-in required", never success or a bare failure.
  - Settings → MCP lists the server with its scope.
  - A second chat sees a user-scope server.
  - Reinstalling shows no false success toast.
- **W6 (Settings presentation).**
  - Every settings page shows its title and description.
  - A lint fails on a static `description=` on checkbox and field rows outside its allowlist.
  - The Sessions and Git model pickers show a loading state, then the model, with no placeholder jump.
  - No default agent control or key exists, and a project that had one sends prompts successfully.
  - The walkthrough toggle has its own label.
  - Fallback search providers form an ordered list with status and reordering.
  - Compaction thresholds show "默认" or "自动" instead of `-1`.
  - zh-CN and zh-TW contain no "词元", "詞元", or "令牌" used for LLM tokens.
- **W7 (OMP settings ownership).**
  - The setting list comes from OMP's registry; every TUI-visible id has a placement.
  - The duplicate-owner test passes, and every `owned-by` row is shown to write its OMP key.
  - The settings-effect test traces each key to a runtime consumer beyond its store; `messageStreamTransport`, `sessionWorkKeepInGroup` and `permissionPresetId` are wired or deleted.
  - The Tools and Memory pages exist.
  - An image request in chat runs OMP `generate_image`, and memory tools come from `memory.backend`.
  - A disabled host tool is absent from the model's tool list.
  - The agent can start a workflow.
  - Chat → Session recap writes OMP `recap.*`.
- **W8 (Agents and Plugins pages).**
  - The tool-permission editor lists only tools the service reports as registered, grouped, with tier chips. "Show all" never produces a profile that fails with 422.
  - The Plugins page shows installed plugins as cards with capability counts, and capabilities grouped by kind with bundled items collapsed.
  - A reviewer compares both pages with upstream's card and catalog patterns.
- **W9 (Usage dashboard).**
  - The Usage page reads the new OMP statistics endpoint.
  - It shows an all-providers comparison (tokens, cost, TTFT, tok/s, error rate) and a view per configured provider, including custom ones, with no unconfigured quota plans.
  - A model with unknown pricing shows "—".
  - Reasoning tokens are counted.
- **W10 (Suggestions).** With the generator set to `session`, a suggestion appears within 5 s of a completed turn on the real provider, and the request reuses the session model. `small` uses the small model. `off` makes no request. No Host suggestion timer remains.
- **W11 (Latency).** `scripts/perf` records before and after values:
  - the user's message renders within one frame of send;
  - `POST /sessions` is at most 400 ms at p50 (was about 1 s);
  - the first `part.delta` on a new chat, against the instant fixture, arrives within 600 ms of send (was 1.3 s);
  - the UI applies stream events every 33 ms ± 5;
  - an unchanged tool input emits no `part.updated`;
  - an edit shows its diff while its arguments stream.

  The numbers are recorded in `development.md`.
- **W12 (Eval display).** An OMP stream replay of a multi-cell `eval` shows titled cells with highlighted code, a step timeline that advances while running, and output rendered as text, table, JSON or markdown views. A failed cell marks where it stopped.
- **W13 (Reference acceptance and gate).**
  - All 17 maintainer items run as regression rows on the Web surface and the packaged Linux Electron app, with screenshots, compared against v2.7.0 (`bc50ba56a`) for OpenChamber surfaces and the OMP TUI for agent behavior. A reviewer other than any implementer accepts each row.
  - `bun run check && bun run type-check && bun run lint && VITEST_MAX_WORKERS=2 bun run test && bun run docs:validate && .workflow/bin/workflow validate` exits 0.
  - Results are recorded in `development.md`.
