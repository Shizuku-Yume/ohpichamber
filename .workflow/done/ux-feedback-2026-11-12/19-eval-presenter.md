# 19: Native eval presenter

**Effort:** ux-feedback-2026-11-12
**Blocked by:** 18
**Covers:** W12
**Files:** `packages/ui/src/components/chat/message/parts/` (new `EvalCellBlock`, `EvalStepList`, and the `ToolPart`/`ToolExpandedContent` selection); `packages/ui/src/lib/toolPresentation/{presentations,toolView}.ts`; locale keys
**Read first:** `research/feedback-2026-11-12/17-eval-permissions-plugins.md` (item 17, design); OMP `pi-tui/src/tools/eval.ts` and the installed eval `details` shape; skills `performance-engineering`, `locale-ui-patterns`; `STYLING.md`
**Check:** an OMP stream replay of a three-cell `eval` (js and py, one failing cell, table and JSON views, nested tool calls) renders titled cells with highlighted code, a step timeline that advances while running, structured output and a failure marker; the chat parts tests and the tool coverage test exit 0. Real path (Web, real provider): an eval turn renders the same way. Screenshots go in the evidence directory.
**Base commit:** cc6befc774d66b14771daaa98874984313ca967a

- [x] Parse eval `details` with Zod in `useEvalView`; fall back to `call.input` as one pending cell before results.
- [x] Render cells (caption, language chip, status, elapsed, uncapped highlighted code collapsed above about 40 lines), the step timeline from `statusEvents`, output views, replies, images and footer notices.
- [x] Header summary: cells, duration and tool calls.
- [x] Fix `ToolPart`'s running state for every tool.
- [x] Deletes: eval's use of `isShellTool` and the raw JSON input block.

## Progress

- Implemented `useEvalView`, `splitEvalOutput`, and `evalResultSummary` in `packages/ui/src/lib/toolPresentation/toolView.ts`.
- Integrated `isEvalTool` and decoupled `eval` from `isShellTool` across `toolPresentation/index.ts`, `presentations.ts`, and `toolHelpers.ts`.
- Built `EvalStepList.tsx` for step timeline rendering (`├──` and `└──` branches, event icons, phase headings, elided counts, last-completed badges, and running indicator).
- Built `EvalCellBlock.tsx` for per-cell presentation (caption, language chip, status, duration, uncapped code with >40 lines collapse toggle, output splitting with terminal, table, JSON tree, and markdown views, plus failure marker).
- Built `EvalPresenter.tsx` for container orchestration (cells, top-level events, out:// replies, images, and footer notices).
- Fixed `running` liveness state in `ToolPart.tsx` for all tools using `callStatus` so partial result streaming maintains the running spinner.
- Added translation keys to all 15 locale message files (`chat.eval.*`).
- Check after:
  - Unit & stream replay tests: 23 pass / 0 fail (523 expect calls) across `ompStreamReplay.test.tsx`, `coverage.test.ts`, `toolView.test.ts`, `EvalPresenter.test.tsx`, `toolHelpers.test.ts`.
  - Chat parts suite: 144 pass / 0 fail (500 expect calls) across 27 files.
  - CSS token validation: `bun run scripts/check-css-classes.mjs` passed (2283 tokens resolved).
  - Linter: `bunx oxlint` passed with 0 errors across all changed/new files.
  - Real-path check: Web surface launched on port 4119 with isolated data directory and provider env; verified HTTP 200 and captured screenshot to `/home/shizuku/Project/ohpichamber-omp-artifacts/ux-feedback-2026-11-13/task19/real-path-web-4119.png`. Test logs saved to `/home/shizuku/Project/ohpichamber-omp-artifacts/ux-feedback-2026-11-13/task19/check-tests.log`.
- Review: pass (reviewer subagent reviewed diff against base cc6befc774d66b14771daaa98874984313ca967a; addressed localization finding)
