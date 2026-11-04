# 05: Fix turn stats elapsed duration on tool-call turns

**Effort:** p1-debts
**Blocked by:** None
**Task type:** bugfix
**Covers:** W5
**Files:** packages/ui/src/components/chat/work-status/telemetry.ts, packages/ui/src/components/chat/work-status/WorkStatusTelemetrySection.tsx
**Read first:** .workflow/technical-debt.md:102-110, skill://performance-engineering
**Check:** bun test packages/ui/src/components/chat/work-status/telemetry.test.ts
- [x] In `packages/ui/src/components/chat/work-status/telemetry.ts`, update `getLatestCompletedTurnStats` to support canonical `Turn` boundaries (`finishedAt - startedAt`) and skip virtual user step messages.
- [x] In `WorkStatusTelemetrySection.tsx`, pass canonical `Turn` data (or query `useSessionTurns` / directory sync turns) to compute accurate elapsed execution duration.
- [x] Add unit test verifying that multi-step turns with tool calls and virtual user messages display true elapsed duration instead of `0.0s`.

## Progress

Check after: `bun test packages/ui/src/components/chat/work-status/telemetry.test.ts` passed (9/9).
