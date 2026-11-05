# 12: Build interactive Background Jobs Sheet, proc:// stream/stdin controls, and Job Widgets

**Effort:** m4-orchestration
**Task type:** feature
**Blocked by:** 06
**Files:** `packages/agent-contract/src/shell.ts`, `packages/agent-service/src/worker/shell.ts`, `packages/agent-service/src/worker/session.ts`, `packages/ui/src/components/chat/BackgroundShellsStrip.tsx`, `packages/ui/src/components/chat/JobsSheetDialog.tsx`, `packages/ui/src/stores/useBackgroundShellsStore.ts`
**Read first:** `.workflow/specs/m4-orchestration.md`; `.workflow/research/omp-tui-parity-audit.md` (§1.5, §2)
**Covers:** W15
**Check:** `bun test packages/agent-service/src/worker/ packages/ui/src/components/chat/` and `bun run type-check` exit 0.

- [ ] Extend `WorkerShell` (`packages/agent-service/src/worker/shell.ts`) and `shell.ts` contract to expose `AsyncJobManager` metadata, `proc://` pipe stream inspection (`proc://<id>/streams/<n>`), stdin writing to named services, `JobCaptionWriter` one-line summaries (via `widget` model role), and `JobWidgetRegistry` live metrics (sparklines, bars, meters, status grids).
- [ ] Enhance `BackgroundShellsStrip.tsx` with live job widget tiles (caption, status dot, elapsed clock, mini sparkline/progress) and an interactive `JobsSheetDialog.tsx` modal to inspect full stdout/stderr/pipe streams, send stdin, and terminate jobs.
