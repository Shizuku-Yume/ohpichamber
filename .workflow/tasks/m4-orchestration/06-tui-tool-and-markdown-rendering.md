# 06: Implement OMP TUI tool and Markdown visual parity (out://, SVG, table charts, AST diffs, read grouping, streamed args)

**Effort:** m4-orchestration
**Task type:** feature
**Blocked by:** None
**Files:** `packages/agent-contract/src/messages.ts`, `packages/agent-contract/src/events.ts`, `packages/agent-service/src/worker/session.ts`, `packages/agent-service/src/worker/projection.ts`, `packages/ui/src/lib/toolHelpers.ts`, `packages/ui/src/components/chat/message/parts/ToolPart.tsx`, `packages/ui/src/components/chat/message/parts/toolDiffUtils.ts`, `packages/ui/src/components/chat/message/MessageBody.tsx`, `packages/ui/src/components/chat/MarkdownRendererImpl.tsx`
**Read first:** `.workflow/specs/m4-orchestration.md`; `.workflow/research/omp-tui-parity-audit.md` (§1.1, §2)
**Covers:** W9
**Check:** `bun test packages/agent-service/src/worker/ packages/ui/src/components/chat/` and `bun run type-check` exit 0.

- [ ] Enable `out://` mid-turn replies in `worker/session.ts` (`out.enabled` / `tuiTranscript`) and render `write` calls targeting `out://` as borderless assistant prose blocks (`ReplyWrite`) instead of workspace file cards in `ToolPart.tsx`.
- [ ] Register a sanitized inline SVG figure renderer for ````svg```` fenced blocks in `MarkdownRendererImpl.tsx` (blocking scripts, event handlers, `<foreignObject>`, and external URLs) and render an inline numeric table chart below Markdown tables when `tui.autoGraph` is enabled.
- [ ] Update `toolDiffUtils.ts` (`getToolFileChanges`) and `toolHelpers.ts` to recognize `ast_edit` multi-file diffs and +/- line counts, and add dedicated header summaries and formatted cards for `ast_grep`, `eval`, `lsp`, `checkpoint`, `rewind`, and clickable `find` (`path:start-end`) hits.
- [ ] Group consecutive `read` tool parts within a turn into a collapsible `ReadToolGroup` tree in `MessageBody.tsx`, and project `tool_stream_update` in `worker/projection.ts` so streaming tool arguments (`write.content`, `edit.input`, `eval.code`) update incrementally while the tool call is being generated.
