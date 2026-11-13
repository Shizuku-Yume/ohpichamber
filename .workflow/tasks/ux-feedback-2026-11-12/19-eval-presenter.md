# 19: Native eval presenter

**Effort:** ux-feedback-2026-11-12
**Blocked by:** 18
**Covers:** W12
**Files:** `packages/ui/src/components/chat/message/parts/` (new `EvalCellBlock`, `EvalStepList`, and the `ToolPart`/`ToolExpandedContent` selection); `packages/ui/src/lib/toolPresentation/{presentations,toolView}.ts`; locale keys
**Read first:** `research/feedback-2026-11-12/17-eval-permissions-plugins.md` (item 17, design); OMP `pi-tui/src/tools/eval.ts` and the installed eval `details` shape; skills `performance-engineering`, `locale-ui-patterns`; `STYLING.md`
**Check:** an OMP stream replay of a three-cell `eval` (js and py, one failing cell, table and JSON views, nested tool calls) renders titled cells with highlighted code, a step timeline that advances while running, structured output and a failure marker; the chat parts tests and the tool coverage test exit 0. Real path (Web, real provider): an eval turn renders the same way. Screenshots go in the evidence directory.

- [ ] Parse eval `details` with Zod in `useEvalView`; fall back to `call.input` as one pending cell before results.
- [ ] Render cells (caption, language chip, status, elapsed, uncapped highlighted code collapsed above about 40 lines), the step timeline from `statusEvents`, output views, replies, images and footer notices.
- [ ] Header summary: cells, duration and tool calls.
- [ ] Fix `ToolPart`'s running state for every tool.
- [ ] Deletes: eval's use of `isShellTool` and the raw JSON input block.
