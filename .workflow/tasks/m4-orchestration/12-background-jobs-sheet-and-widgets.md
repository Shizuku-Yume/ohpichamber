# 12: Build interactive Background Jobs Sheet, proc:// stream/stdin controls, and Job Widgets

**Effort:** m4-orchestration
**Task type:** feature
**Blocked by:** 08
**Files:** `packages/agent-contract/src/shell.ts`, `packages/agent-service/src/worker/shell.ts`, `packages/agent-service/src/worker/session.ts`, `packages/ui/src/components/chat/BackgroundShellsStrip.tsx`, `packages/ui/src/components/chat/JobsSheetDialog.tsx`, `packages/ui/src/sync/background-shells.ts`
**Read first:** `.workflow/specs/m4-orchestration.md`; `.workflow/research/omp-tui-parity-audit.md` (§1.5, §2)
**Covers:** W15
**Check:** `bun test packages/agent-service/src/worker/ packages/ui/src/components/chat/` and `bun run type-check` exit 0.
- **Base commit:** ee11f664b7e32cb25da1645fd8ae6b75af9bf94f
- **Status:** active

- [x] Extend `WorkerShell` (`packages/agent-service/src/worker/shell.ts`) and `shell.ts` contract to expose `AsyncJobManager` metadata, `proc://` pipe stream inspection (`proc://<id>/streams/<n>`), stdin writing to named services, `JobCaptionWriter` one-line summaries (via `widget` model role), and `JobWidgetRegistry` live metrics (sparklines, bars, meters, status grids).
- [x] Enhance `BackgroundShellsStrip.tsx` with live job widget tiles (caption, status dot, elapsed clock, mini sparkline/progress) and an interactive `JobsSheetDialog.tsx` modal to inspect full stdout/stderr/pipe streams, send stdin, and terminate jobs.

## Progress
- Check before: tests failing or absent for new shell stream inspection, stdin routing to named services, JobWidget rendering, and JobsSheetDialog.
- Implemented contracts in `packages/agent-contract/src/shell.ts`: `JobWidgetView`, `JobWidgetBlock`, `PipeStreamSummary`, `ShellStreamRequest`, `ShellStreamResponse`, `ShellStdinRequest`, `ShellStdinResult`.
- Enhanced `WorkerShell` (`packages/agent-service/src/worker/shell.ts`) with `AsyncJobManager`, pipe stream inspection with bounded 64 KiB chunks, safe UTF-8 boundaries, and stdin routing exclusively to named services (`sendService`) while verifying session isolation, resync protection, and daemon terminal state on stop.
- Bound `JobWidgets` registry to `cfgAsyncWidgets` setting in `packages/agent-service/src/worker/session.ts`.
- Built full JobWidget block renderers (sparkline, bars, meter, grid, stat, text) and interactive `JobsSheetDialog.tsx` with live polling tail terminal, pipe stream viewers, and service stdin controls.
- Added `BackgroundShellsStrip.tsx` live tiles with mini widget summaries and click-through to `JobsSheetDialog.tsx`.
- Verified live in Chrome DevTools with real session, injected background shell, full modal snapshot, and screenshot at `/home/shizuku/Project/ohpichamber-omp-artifacts/m4-d-2026-11-05/w15-jobs-sheet-verified.png`.
- Verification: `node scripts/run-isolated-tests.mjs packages/agent-service/src/worker/ packages/ui/src/components/chat/` passed (227/227 test files passed).
- Verification: `bun run type-check` exit 0 (checked 3,222 files across 5 projects).
- Verification: `bun run lint` exit 0.
- Verification: `bunx oxlint` exit 0 on all changed files.
- Evidence: `/home/shizuku/Project/ohpichamber-omp-artifacts/m4-d-2026-11-05/w15-smoke-receipt.json`.
