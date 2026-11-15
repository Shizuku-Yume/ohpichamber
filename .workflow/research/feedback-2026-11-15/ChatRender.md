# fb15 — ChatRender: empty todo panel (A) + reasoning without line breaks (B)

## 1. Findings

### A1 — A zero-task todo snapshot renders as a blank card, on two surfaces. **High confidence.**

`todo` tool results carry `details.phases`; the UI parses them and renders `TodoCard` wherever phases exist, without ever asking whether any *task* exists.

- Parser: `packages/ui/src/components/chat/todoData.ts:10-31` — returns `[]` for `phases: []`, and returns `[{ name, tasks: [] }]` for a phase whose task list was emptied. Neither is treated as "no plan".
- Composer row visibility: `packages/ui/src/components/chat/TodoTray.tsx:28`
  `return phases && phases.length > 0 ? <div className="border-b border-border/60 px-3 py-2" data-testid="todo-tray"><TodoCard phases={phases} /></div> : null;`
  Condition is *phase count*, not *task count*. A phase left with `tasks: []` yields a full-width bordered strip with an empty label and `0/0`.
- Chat card: `packages/ui/src/components/chat/message/parts/ToolPart.tsx:1444-1447`
  ```tsx
  {isTodoTool(toolName) && result && !result.isError ? (() => {
      const phases = extractTodoPhases(resultContent.details);
      return phases ? <TodoCard phases={phases} defaultExpanded /> : null;
  })() : null}
  ```
  `[]` is truthy, so the card renders; `defaultExpanded` opens it. Inside `TodoCard` the expanded body is `packages/ui/src/components/chat/message/parts/TodoCard.tsx:76-77`:
  `<div className="mt-1 rounded-lg border border-border/60 bg-muted/10 px-3 py-2">` then `phases.map(...)`. With `phases: []` this is a **bordered, padded, entirely empty box** — the screenshot's blank box. With `[{name, tasks: []}]` it is a bordered box holding only a phase heading.
- Header row when there is no active task: `TodoCard.tsx:56-67` renders `<span className="min-w-0 flex-1" />` (empty label) plus `0/0`, so even folded it reads as a blank bar. `activeTodoTask` (`packages/ui/src/components/chat/todoProgress.ts:28-38`) returns `null` for zero tasks and never falls back to a placeholder.

Real data producing exactly these shapes (read-only, from `~/.omp/agent`):

- `sessions/-tmp/2026-09-14T15-16-31-491Z_01a0a07d-…jsonl:1003`
  `"content":[{"type":"text","text":"Todo list cleared."}],"details":{"op":"rm","phases":[{"name":"间距修正","tasks":[]}]…`
  → phase survives, tasks emptied, i.e. the tray strip case (`0/0` blank row).
- `sessions/-Project-ohpichamber-worktrees-onp-c/…jsonl:756` and six sibling worktree sessions:
  `"content":[{"type":"text","text":"Todo list is empty."}],"details":{"op":"view","phases":[]}`
  → `phases: []`, i.e. the empty bordered box case.
- `-Project-ohpichamber-worktrees-onp-a/…jsonl:10`, `-onp-b:23`, `-onp-d:14`, `-onp-e:16`, `-onp-f:14`, `-onc-lane-c:15`, plus `-Project-ohpichamber/2026-10-11T06-22-57-223Z…:39`:
  `"Todo list cleared.","details":{"op":"init","phases":[]}` — the same shape, produced by `todo init` on an empty list and by `/todo rm` (`commitTodoPhases([])`).

Why OMP produces zero-task snapshots and why the TUI never shows them:

- `packages/coding-agent/src/tools/todo.ts:381-396` (`removeTasks`) — `rm` without a target sets `phase.tasks = []` and **keeps the phase**; `init` with an empty list legitimately returns `phases: []`.
- OMP's TUI never renders that: pinned tarball `@oh-my-pi/pi-coding-agent@18.18.0` `src/modes/interactive-mode.ts:5303`
  `const phases = this.todoPhases.filter(phase => phase.tasks.length > 0);` … `if (phases.length === 0) return;`
  The GUI is missing this filter. (Repo source checkout `/home/shizuku/Project/oh-my-pi` is 18.8.9; the installed runtime is 18.18.0 — line numbers for OMP cited above are from the pinned 18.18.0 tarball.)

### A2 — "No task in progress" never hides the tray; a finished plan stays forever. **High confidence.**

`TodoTray` has no notion of "closed". `todoProgress.ts:4` defines `isClosedTodo` (completed **or** abandoned) but no caller gates on it for visibility. So after the last task closes the composer keeps a `N/N` row for the rest of the session, on every reload (the state is transcript-derived, so it is stable and permanent).

OMP handles this in the TUI, in two layers:

1. Auto-clear timer: `interactive-mode.ts:5163-5202` — when every task is closed it waits `tasks.todoClearDelay` (default 60 s, `tools/settings.ts:442-446`) and then persists a `todo_hud_state` (`"dismissed"`) custom entry and hides the HUD.
2. Render filter (`:5302-5303`) — `#todoHudHidden` or no non-empty phase ⇒ draw nothing.

The GUI reads neither: `grep 'todo_hud_state|user_todo_edit|TODO_HUD' packages/` → **no matches**. Two consequences:

- A list the TUI user dismissed is still shown in the GUI.
- A `/todo done|drop|rm|append|import` run from the composer (`packages/agent-service/src/worker/session.ts:1981` → pinned `slash-commands/helpers/todo.ts:96` → `commitTodoPhases` → pinned `agent-session.ts:11071-11076`, which writes **only** a `user_todo_edit` custom entry and mutates live state) never reaches the UI, because the GUI derives todos solely from `todo` **tool results** (`packages/ui/src/components/chat/todoHistory.ts:7-16`). The tray therefore keeps the pre-slash-command list — stale, and potentially showing an in-progress task that is already done. `[INFERENCE on how visible this is in the maintainer's exact repro; the plumbing gap is certain.]`

The current test suite *pins* the finished-plan behaviour, so a fix must update it deliberately: `packages/ui/src/components/chat/TodoTray.test.tsx:190-194` asserts `3/3` remains after every task closes, commented "Every task closed: the folded row still names the plan and its progress."

### A3 — Cold read / session switch: correct but costly. **Medium confidence on cost, high on correctness.**

`TodoTray` searches the loaded tail for a `tool_result` (`todoHistory.ts:12`, newest-first). If the tail has no todo result it forces one full-history walk: `TodoTray.tsx:20-27` (`loader.loadComplete(...)` guarded by the `loadKey` ref). Consequences: opening any older session whose tail lacks a todo result does one extra full branch fetch; `phases !== null` short-circuits later. No stale cross-session leak — `useSessionMessages(sessionId, directory)` is keyed by session, and `latestTodoPhases` is recomputed in a `useMemo` on `[messages, sessionId]`.

Canonical cold-read path is faithful: `packages/agent-service/src/worker/projection.ts:169-177` (`toolResultOutput` keeps `{content, details}` verbatim) and `:1105-1203` (`readHistory` reconstructs parts from the branch). So a cold-read todo result keeps `details.phases` — the bug is purely the missing emptiness filter.

### B — Reasoning paragraphs are destroyed by `cleanReasoningText`, then markdown soft-breaks flatten what's left. **High confidence.**

Data flow, all verbatim until the last UI step:

1. OMP folds provider reasoning-summary parts with `"\n\n"` separators: `/home/shizuku/Project/oh-my-pi/packages/ai/src/providers/openai-shared.ts:2963-2964` (`lastPart.text += "\n\n"; stream.push({type:"thinking_delta", delta:"\n\n"…})`).
2. Agent Service: `packages/agent-service/src/worker/projection.ts:272-275` persists `{type:'reasoning', content: item.thinking}` unchanged, and `:539-556` + `:780-783` re-emit deltas through `publicDelta`, which only redacts private path roots (`publicText`, `:404-417`) — newlines untouched.
3. UI store: `packages/ui/src/sync/event-reducer.ts:580-583` concatenates `part.content + event.delta`; `packages/ui/src/sync/materialization.ts:56-69` only prefers a longer local prefix. No trimming, no line joining.
4. UI normalization — **this is the defect**: `packages/ui/src/components/chat/message/parts/ReasoningPart.tsx:27-38`
   ```ts
   return text
       .split('\n')
       .map((line) => line.replace(/^>\s?/, '').trimEnd())
       .filter((line) => !isInvisibleText(line))   // ← blank lines are "invisible" and get deleted
       .join('\n')
       .trim();
   ```
   `isInvisibleText('')` is `true` (`packages/ui/src/lib/invisibleText.ts:8`, `/^[\s\p{Default_Ignorable_Code_Point}]*$/u`), so **every blank line separating paragraphs is removed**. `A\n\nB\n\nC` becomes `A\nB\nC` — one paragraph with soft breaks.
5. Render: `ReasoningPart.tsx:379-390` → `MarkdownRenderer variant="reasoning"` → `packages/ui/src/components/chat/MarkdownRendererImpl.tsx:513` (`markdown-reasoning` class) → the remark pipeline in `packages/ui/src/components/chat/markdown/streamdownPlugins.ts:109-121`, which contains **no breaks plugin** (`grep 'remark-breaks' packages/` → no matches; `streamdown@2.7.1` does not depend on it — checked `node_modules/.bun/streamdown@2.7.1+…/node_modules/streamdown/package.json`). GFM alone treats a single `\n` as a soft break → rendered as a space. Result: all reasoning collapses into one running paragraph. That is exactly the screenshot.
6. Same filter in the justification wrapper: `packages/ui/src/components/chat/message/parts/JustificationBlock.tsx:5-18`.

Evidence from the maintainer's real transcripts:

- `~/.omp/agent/sessions/-.local-share-ohpichamber-iso-chats-2026-11-15-session-e8195e49-…/2026-11-15T14-34-19-941Z_01a1dfa1-….jsonl:12` — one `thinking` block with ~12 `\n\n`-separated paragraphs (`"…background scrolling.\n\nStill writing the SVG geometry...\n\nNow I'm working out the pelican's body…"`), `"proseOnly"`-style Claude summary text from `claude-sonnet-5-5` via `CLIProxyAPI`, runtime 18.18.0.
- `…session-151b6640-…jsonl:21`, `…session-d5d901e5-…jsonl:13,21,31` — same paragraph structure.

Cross-checks that rule out the other two hypotheses:

- Not the Agent Service: deltas/persisted thinking carry `\n\n` intact (step 2 above).
- Not the store: verbatim concatenation (step 3).
- Not CSS `white-space`: no `white-space` rule targets `.markdown-reasoning` (only `nowrap`/`pre` on file-tree, table and code rules; `packages/ui/src/index.css` grep). `.markdown-reasoning p { --oc-block-margin-end: 0px; margin-bottom: 0 }` (`index.css:1802-1806`) only affects paragraph *spacing*, and with blank lines restored the `[data-oc-markdown-block] > *` rule still gives each paragraph `0.65rem` top margin (`index.css:1729-1734`, `--markdown-paragraph-spacing: 0.65rem` at `packages/ui/src/styles/design-system.css:1050`), so paragraphs would separate correctly.
- Not the collapsed header: its `\s+ → ' '` flattening (`ReasoningPart.tsx:73`) is a one-line preview and is correct there.

Streaming vs settled: both branches run through the same `cleanReasoningText` (`ReasoningPart.tsx:525`; `throttledText` at `:529-536`, then `:545-552`), so streaming and settled render identically wrong. Side effect worth noting: in streaming mode `MarkdownRendererImpl` splits into per-block components (`:548-556`, `mode='streaming'`), so preserving blank lines also restores one-arrival-block-per-paragraph instead of one giant growing block.

Comparison with upstream `/home/shizuku/Project/openchamber`: upstream `message/parts/ReasoningPart.tsx:23-33` has the same blank-line-dropping `cleanReasoningText` (and even `filter(line => line.trim().length > 0)`), so this is inherited, not a fork regression — but OMP's reasoning is paragraph-structured (provider-folded summaries), so the inherited bug is now user-visible. Upstream also has no breaks plugin (`grep 'remark-breaks' …/openchamber/packages/ui` → none). The fork already has the *correct* pattern for the same problem in user messages: `packages/ui/src/components/chat/message/parts/userTextPartContent.ts:96-101,143` (`applyHardLineBreaks`, "Preserve user newlines (markdown soft breaks would otherwise collapse to spaces)"), with a unit test at `UserTextPart.test.ts:41-57`.

Adjacent defect, same function: OMP/OpenAI-style reasoning summaries pad every part with an empty `<!-- -->` sentinel. The TUI strips those (`/home/shizuku/Project/oh-my-pi/packages/tui/src/chat/thinking-display.ts:187-195,317`), and the GUI strips them only in the *header* summary (`stripMarkdown`, `ReasoningPart.tsx:47`), never in the body — so a gpt-5.x-style block can still carry invisible comment nodes into the body markdown. Not the reported symptom, but the same normalization step should handle it. `[INFERENCE: no `<!-- -->` in the three Claude transcripts I checked; the code path exists.]`

---

## 2. Proposed fix

### A — one emptiness rule, applied at every todo surface

Owner modules: `todoData.ts` / `todoHistory.ts` (data), `TodoCard.tsx` (shared card), `TodoTray.tsx` (composer), `ToolPart.tsx` (tool body).

1. `packages/ui/src/components/chat/todoProgress.ts` — add the single predicate both surfaces share, next to `isClosedTodo`:
   ```ts
   export const hasTodoTasks = (phases: readonly TodoPhase[]): boolean =>
       phases.some(phase => phase.tasks.length > 0);
   export const hasOpenTodo = (phases: readonly TodoPhase[]): boolean =>
       phases.some(phase => phase.tasks.some(task => !isClosedTodo(task)));
   ```
2. `TodoCard.tsx:30-36` — return `null` when `!hasTodoTasks(phases)`. This alone kills the bordered blank box (`:76-77`) for **both** call sites and cannot be bypassed by a future caller. Do not change the header/`0/0` markup.
3. `TodoTray.tsx:28` — visibility becomes `phases && hasTodoTasks(phases) && hasOpenTodo(phases)`. Keep the strip's border class, since with the rule it only renders alongside real work.
4. `ToolPart.tsx:1446` — `return phases && hasTodoTasks(phases) ? <TodoCard …/> : null;`. The cleared/empty tool result then shows only its own text (`"Todo list cleared."` / `"Todo list is empty."`) through the existing `ToolExpandedContent`, which is meaningful and is exactly what OMP prints.
5. Do **not** filter empty phases inside `extractTodoPhases`/`latestTodoPhases`: keep the data faithful (mirrors OMP's `canonicalTodoPhases`, pinned `tools/todo.ts:185-232`); the display rule belongs in the components.
6. Update the pinned expectation: `TodoTray.test.tsx:190-194` ("every task closed → `3/3` stays") must flip to "every task closed → tray disappears", matching the maintainer's expectation and the TUI.

Edge cases to cover in tests: `phases: []`; `[{name, tasks: []}]`; mixed `[{A, []}, {B, [completed]}]`; branch switch A(todos) → B(none) → back to A; cold read where the tail has no todo result (the `loadComplete` path at `TodoTray.tsx:20-27` must still hide, not flash a card).

**Check (runnable, real path)**
- Unit: `node scripts/run-isolated-tests.mjs packages/ui/src/components/chat/TodoTray.test.tsx packages/ui/src/components/chat/message/parts/TodoCard.test.tsx packages/ui/src/components/chat/ompStreamReplay.test.tsx`
- Real path: with the packaged app, open a session whose branch ends in a zero-task snapshot — e.g. the one recorded at `~/.omp/agent/sessions/-Project-ohpichamber-worktrees-onp-c/2026-10-26T15-36-17-665Z_01a178da-…jsonl` (line 713/756) — and confirm (a) no todo strip above the composer, (b) expanding the `todo` tool row shows only `Todo list is empty.`/`Todo list cleared.` with no border box. Repeat in a session that ends with all tasks completed (`-Project-ohpichamber-worktrees-m6-gate/…jsonl:354` has a `todo_hud_state` dismissed after an all-completed plan) and confirm the strip is gone.

### B — preserve reasoning structure at the one place it is destroyed

Owner module: `packages/ui/src/components/chat/message/parts/ReasoningPart.tsx` (normalization) + a small plugin for the markdown pipeline.

1. Rewrite `cleanReasoningText` (`ReasoningPart.tsx:27-38`) so paragraph structure survives:
   - normalize an invisible-only line (ZWSP/BOM/bidi etc.) to an empty line instead of deleting it — keeps the #5215 anti-blank-line intent without joining paragraphs;
   - **keep** genuinely empty lines;
   - collapse runs of 3+ blank lines to one empty line;
   - drop `<!-- -->` / dangling `<!--` sentinel lines **only outside fenced code** (port `isCommentNoise` from `thinking-display.ts:187-195`);
   - strip leading `> ` (unchanged) and `trim()` the ends.
   Same change in `JustificationBlock.tsx:5-18` (or better: export the one function and use it in both).
2. Single newlines inside a paragraph still need to be visible ("one item per line"). Add an in-repo remark plugin (no new dependency) that turns `\n` inside a text node under a paragraph into a `break` node — this is what `remark-breaks` does, ~15 lines. Wire it **only for the reasoning variant**:
   - `streamdownPlugins.ts:109-121` — `createOptions(allowRawHtml, singleTilde, lineBreaks)`; push the plugin last in `remarkPlugins` when `lineBreaks` is true.
   - `:136-143` — add a `policy` cache keyed by `lineBreaks` too (the current 4-entry `policies` object must not alias ).
   - `MarkdownRendererImpl.tsx:422-428` — `getMarkdownProcessingOptions(allowRawHtml, singleTilde, variant === 'reasoning')`, with `variant` added to the `useMemo` deps. Assistant text and user text are untouched (user text already hard-breaks via `userTextPartContent.ts:100-101`).
3. Leave paragraph spacing as is: `.markdown-reasoning p` keeps its zero bottom margin (`index.css:1802-1806`) and non-zero top margin, so restored paragraphs read as separate blocks without extra air.
4. Docs: update `packages/ui/src/components/chat/message/parts/DOCUMENTATION.md:199-201` to state that reasoning preserves paragraph breaks and renders single newlines as line breaks (reasoning only), and that blank-line suppression is no longer done.
5. Tests: `packages/ui/src/components/chat/message/parts/ReasoningPart.test.tsx` — add (a) `A\n\nB` renders two `<p>`s, (b) `A\nB` renders one `<p>` containing a `<br>`, (c) a fenced block keeps its internal blank lines and its literal line breaks, (d) `<!-- -->` sentinel lines produce no visible text, (e) streaming and settled produce the same paragraph count. Currently `LONG_REASONING` (`ReasoningPart.test.tsx:142-145`) uses a single `\n`, which after the fix must still not collapse.

**Check (runnable, real path)**
- Unit: `node scripts/run-isolated-tests.mjs packages/ui/src/components/chat/message/parts/ReasoningPart.test.tsx packages/ui/src/components/chat/MarkdownRendererImpl.test.ts`
- Real path: open `~/.omp/agent/sessions/-.local-share-ohpichamber-iso-chats-2026-11-15-session-e8195e49-0f31-4558-9d49-1d86980d0ab2/2026-11-15T14-34-19-941Z_01a1dfa1-…jsonl:12` in the packaged app (thinking block with 12 `\n\n` paragraphs, `claude-sonnet-5-5` via CLIProxyAPI). Expand the thinking block and confirm ≈12 visually separated paragraphs; then start a fresh turn with a reasoning model and confirm the lines stay separated **while streaming** as well as after it settles.

---

## 3. Open choices for the maintainer

**1. When should a *finished* plan leave the composer?**
(a) Immediately once every task is closed (`hasOpenTodo`). Simple, no timers, but a user cannot read the final checklist in the composer.
(b) After the same delay the TUI uses (`tasks.todoClearDelay`, default 60 s) — matches OMP exactly; needs a timer in `TodoTray` and a visibility rule that survives remounts without persisting anything.
(c) Keep showing `N/N` forever (today's behaviour, pinned by `TodoTray.test.tsx:190-194`).
*Recommend (a)* if the maintainer wants the panel gone when nothing is in progress (the reported expectation), *(b)* if TUI parity matters more. Either way, (c) contradicts "shown even when no task is in progress".

**2. Should the composer tray read OMP's canonical todo state instead of the transcript?**
(a) Keep transcript derivation, add the emptiness/closed filters (small, no contract change, stays stale after `/todo …` slash commands).
(b) Project the canonical todo phases into the canonical session snapshot (`packages/agent-contract`, Agent Service `session.ts`/`projection.ts`) and have the tray read that; also surface `todo_hud_state` dismissal. Fixes staleness and TUI parity, but is a contract + service change and a new snapshot field every consumer must ignore.
*Recommend (a) now, (b) as its own task* — (a) removes the reported symptom; (b) is the honest fix for slash-command drift.

**3. Reasoning line breaks: plugin or CSS?**
(a) In-repo remark line-break plugin for the reasoning variant (recommended: correct mdast transform, no new dependency, streaming-safe, testable).
(b) CSS only — `white-space: pre-wrap` on `.markdown-reasoning p` plus preserving blank lines in `cleanReasoningText`. Zero new code in the pipeline, but it makes markdown source line wrapping literal (a paragraph the model hard-wrapped mid-sentence keeps that break) and cannot be scoped per-block.
(c) Add the `remark-breaks` dependency (needs explicit dependency approval; the repo has none today).
*Recommend (a)*; (b) is the fallback if pipeline churn is unwelcome.
