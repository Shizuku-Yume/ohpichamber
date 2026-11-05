# 08: Project TUI timeline notices, rich compaction divider, and annotated context gauge

**Effort:** m4-orchestration
**Task type:** feature
**Blocked by:** 06
**Files:** `packages/agent-contract/src/events.ts`, `packages/agent-contract/src/messages.ts`, `packages/agent-service/src/worker/projection.ts`, `packages/ui/src/sync/event-reducer.ts`, `packages/ui/src/components/chat/message/MessageBody.tsx`, `packages/ui/src/components/chat/SessionRecapSpacer.tsx`, `packages/ui/src/components/ui/ContextUsageDisplay.tsx`
**Read first:** `.workflow/specs/m4-orchestration.md`; `.workflow/research/omp-tui-parity-audit.md` (§1.3, §2)
**Covers:** W11
**Check:** `bun test packages/agent-service/src/worker/ packages/ui/src/sync/ packages/ui/src/components/chat/` and `bun run type-check` exit 0.

- [ ] Project `todo_reminder`, `ttsr_triggered`, `auto_retry_start`, `retry_fallback_applied`, `served_model_mismatch`, and `cache_invalidation` in `worker/projection.ts` and render their notice cards in the chat timeline.
- [ ] Enrich `session.compacted` and the timeline compaction divider with the compaction method (`soft-compacted`, `snap-compacted`, `shaken`, `remote-compacted`), `tokensBefore → tokensAfter` reduction badge, and expandable markdown summary disclosure.
- [ ] Add auto-compaction (`thresholdPercent`) and background speculation (`speculationPercent`) threshold tick marks to `ContextUsageDisplay.tsx`.
