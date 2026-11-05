# 08: Project TUI timeline notices, rich compaction divider, and annotated context gauge

**Effort:** m4-orchestration
**Task type:** feature
**Blocked by:** 06
**Files:** `packages/agent-contract/src/events.ts`, `packages/agent-contract/src/messages.ts`, `packages/agent-service/src/worker/projection.ts`, `packages/ui/src/sync/event-reducer.ts`, `packages/ui/src/components/chat/message/MessageBody.tsx`, `packages/ui/src/components/chat/SessionRecapSpacer.tsx`, `packages/ui/src/components/ui/ContextUsageDisplay.tsx`
**Read first:** `.workflow/specs/m4-orchestration.md`; `.workflow/research/omp-tui-parity-audit.md` (§1.3, §2)
**Covers:** W11
**Check:** `bun test packages/agent-service/src/worker/ packages/ui/src/sync/ packages/ui/src/components/chat/` and `bun run type-check` exit 0.
- **Base commit:** 570dcac925ff4fbe804ad73d2c8866d59fe6db37
- [x] Project `todo_reminder`, `ttsr_triggered`, `auto_retry_start`, `retry_fallback_applied`, `served_model_mismatch`, and `cache_invalidation` in `worker/projection.ts` and render their notice cards in the chat timeline.
- [x] Enrich `session.compacted` and the timeline compaction divider with the compaction method (`soft-compacted`, `snap-compacted`, `shaken`, `remote-compacted`), `tokensBefore → tokensAfter` reduction badge, and expandable markdown summary disclosure.
- [x] Add auto-compaction (`thresholdPercent`) and background speculation (`speculationPercent`) threshold tick marks to `ContextUsageDisplay.tsx`.

## Progress

Check before:
- Baseline checks: `node scripts/run-isolated-tests.mjs packages/agent-service/src/worker/ packages/ui/src/sync/ packages/ui/src/components/chat/` passed (299/299 test files passed).
- `bun run type-check` passed (exit 0).
- Timeline notices `todo_reminder`, `ttsr_triggered`, `auto_retry_start`, `retry_fallback_applied`, `served_model_mismatch`, and `cache_invalidation` dropped at worker projection boundary.
- `session.compacted` emitted only `tokensBefore`; compaction divider lacked method badge, reduction ratio, and expandable markdown summary disclosure.
- `ContextUsageDisplay.tsx` lacked compaction and speculation threshold tick marks.

Work:
- Modeled `NoticePartSchema` as a discriminated union on `noticeType` across all notice variants with full types.
- Added unified `persistAndPublishNotice()` in `worker/projection.ts`: emits `part.started`/`part.completed` to active target message, avoids fake runs, avoids contentIndex collisions with `partId: ${targetMessageId}:notice:${randomUUID()}`, buffers pre-message notices in `deferredNotices`, and persists every notice as native `ohpichamber.notice.v1` entry.
- Reconstructed notices on cold restore in `readHistory()` by mapping persisted notices to target messages, and reconstructed `served_model_mismatch` in `parts()` on assistant messages.
- Enriched `session.compacted` in `events.ts` and `projection.ts` with native method enum (`soft-compacted`, `snap-compacted`, `shaken`, `remote-compacted`, `handed-off`, `compacted`), `tokensBefore → tokensAfter` reduction badges, and markdown summary.
- Implemented `TimelineNoticeCard.tsx` in `MessageBody.tsx` with dedicated views for all 6 notice types.
- Implemented `CompactionDivider` in `SessionRecapSpacer.tsx` with `SimpleMarkdownRenderer`, reactive `t`, method badge, and expandable disclosure.
- Added threshold and speculation tick marks to `ContextUsageDisplay.tsx` and wired in `Header.tsx` from `ompSettings.settings`.

Check after:
- `node scripts/run-isolated-tests.mjs packages/agent-service/src/worker/ packages/ui/src/sync/ packages/ui/src/components/chat/` passed (299/299 test files passed, 0 fail).
- `bun run type-check` passed (exit 0 across 3,220 files in 5 projects).
- `bun run lint` passed (exit 0 across all workspaces).
- `bunx oxlint` passed on all changed files (exit 0).
- 6 comprehensive in-memory / disk-backed `SessionManager` integration tests in `projection-notices.test.ts` passed (pre-message notice buffer/flush, toolcall interleaving, post-turn_end reminder, disk reload cold restore, cache invalidation across disk, and real SessionManager.appendCompaction restore).
- 12 UI tests in `TimelineNoticeCard.test.tsx`, `SessionRecapSpacer.test.tsx`, `ContextUsageDisplay.test.tsx` passed.
- Evidence persisted in `/home/shizuku/Project/ohpichamber-omp-artifacts/m4-d-2026-11-05/` (`w11-smoke-receipt.json`, `w11-live-turn-verified.png`, `w11-dead-code.log`, `w11-task-check.log`).
