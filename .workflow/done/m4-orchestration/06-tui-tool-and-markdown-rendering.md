# 06: Implement OMP TUI tool and Markdown visual parity (out://, SVG, table charts, AST diffs, read grouping, streamed args)

**Effort:** m4-orchestration
**Task type:** feature
**Blocked by:** None
**Files:** `packages/agent-contract/src/messages.ts`, `packages/agent-contract/src/events.ts`, `packages/agent-service/src/worker/session.ts`, `packages/agent-service/src/worker/projection.ts`, `packages/ui/src/lib/toolHelpers.ts`, `packages/ui/src/components/chat/message/parts/ToolPart.tsx`, `packages/ui/src/components/chat/message/parts/toolDiffUtils.ts`, `packages/ui/src/components/chat/message/MessageBody.tsx`, `packages/ui/src/components/chat/MarkdownRendererImpl.tsx`
**Read first:** `.workflow/specs/m4-orchestration.md`; `.workflow/research/omp-tui-parity-audit.md` (§1.1, §2)
**Covers:** W9
**Check:** `bun test packages/agent-service/src/worker/ packages/ui/src/components/chat/` and `bun run type-check` exit 0.
- **Base commit:** 1e903152221e0efef535f8f45bc29458ede64ccb

- [x] Enable `out://` mid-turn replies in `worker/session.ts` (`out.enabled` / `tuiTranscript`) and render `write` calls targeting `out://` as borderless assistant prose blocks (`ReplyWrite`) instead of workspace file cards in `ToolPart.tsx`.
- [x] Register a sanitized inline SVG figure renderer for ````svg```` fenced blocks in `MarkdownRendererImpl.tsx` (blocking scripts, event handlers, `<foreignObject>`, and external URLs) and render an inline numeric table chart below Markdown tables when `tui.autoGraph` is enabled.
- [x] Update `toolDiffUtils.ts` (`getToolFileChanges`) and `toolHelpers.ts` to recognize `ast_edit` multi-file diffs and +/- line counts, and add dedicated header summaries and formatted cards for `ast_grep`, `eval`, `lsp`, `checkpoint`, `rewind`, and clickable `find` (`path:start-end`) hits.
- [x] Group consecutive `read` tool parts within a turn into a collapsible `ReadToolGroup` tree in `MessageBody.tsx`, and project `tool_stream_update` in `worker/projection.ts` so streaming tool arguments (`write.content`, `edit.input`, `eval.code`) update incrementally while the tool call is being generated.

## Progress

Check before:
- `bun test packages/agent-service/src/worker/` passed (218 pass, 0 fail).
- `bun run type-check` passed (exit 0).
- `out://` mid-turn replies unset/disabled (`tuiTranscript` unset in `worker/session.ts`); `write` to `out://` renders as workspace file card.
- ````svg```` fences render as raw XML code blocks; numeric Markdown tables render without auto-charts.
- `toolDiffUtils.ts` drops `ast_edit` diffs (`toolName !== 'edit'`); `ast_grep`, `eval`, `lsp`, `checkpoint`, `rewind` have no dedicated summaries/cards; consecutive `read` calls flood timeline without grouping; `tool_stream_update` dropped.

Work:
- Enabled native `tuiTranscript: true` in `worker/session.ts` for `out://` mid-turn replies while respecting `out.enabled` overrides.
- Rendered `write("out://")` calls as borderless prose markdown (`ReplyWrite`) in `ToolPart.tsx` with error fallbacks.
- Added `MarkdownSvg.tsx` and `sanitizeSvg.ts` to strictly sanitize inline ````svg```` fences against XSS/escapes while scoping IDs.
- Added `TableAutoChart.tsx` under `MarkdownTable.tsx` with unit-compatibility partitioning to chart numeric comparisons when `tui.autoGraph` is true.
- Added AST edit multi-file diff parsing to `toolDiffUtils.ts` and card/header summaries for `ast_grep`, `eval`, `lsp`, `checkpoint`, `rewind`, and `find` chips in `toolHelpers.ts` and `ToolPart.tsx`.
- Grouped consecutive read calls into `ReadToolGroup.tsx` in `MessageBody.tsx`.
- Projected `tool_stream_update` incremental argument streaming in `worker/projection.ts`.
- Fixed `native-policy-snapshot.ts` to include custom model `baseUrl` in authorized provider policy snapshot.

Check after:
- `node scripts/run-isolated-tests.mjs packages/agent-service/src/worker/ packages/ui/src/components/chat/` passed (216/216 test files passed, 0 fail).
- `bun run type-check` passed (exit 0, 3,205 files across 5 projects).
- `bun run lint` passed (exit 0).
- `bunx oxlint` passed on all changed files (exit 0).
- Real provider chat smoke run (`task05-real-provider` / `gemini-3.5-flash-lite`) verified pass: real tokens (11.1K in / 235 out, 2.7s elapsed, $0.004 cost), auto-title update, Markdown table with negative deltas, unit-filtered `TableAutoChart`, and sanitized `MarkdownSvg` inline figure (`w9-live-turn-verified.png`).
- Browser smoke verification of `out://` `ReplyWrite` borderless prose, collapsible `ReadToolGroup` tree with error handling (`w9-read-group-smoke.png`), `find` clickable chips, and `ast_edit` multi-file diff cards (`w9-toolpart-smoke.png`).
- Evidence receipt persisted: `/home/shizuku/Project/ohpichamber-omp-artifacts/m4-d-2026-11-05/w9-smoke-receipt.json`.
