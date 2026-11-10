# 24: One OMP tool presentation registry, OMP status line and OMP streaming cadence (R3, UI side)

**Effort:** ux-v270-omp-alignment
**Blocked by:** 23
**Covers:** W4
**Files:** `packages/ui/src/lib/toolPresentation/` (new); `packages/ui/src/lib/toolHelpers.ts`; `packages/ui/src/hooks/{useAssistantStatus,useAgentStatusLabel}.ts`; `packages/ui/src/lib/agentStatus.ts`; `packages/ui/src/components/chat/message/parts/{ToolPart,ProgressiveGroup,ReasoningPart,WorkingPlaceholder,assistantTextVisibility}.tsx`; `packages/ui/src/components/chat/lib/{streamTextCommit,toolDiffUtils}.ts`; `packages/ui/src/components/chat/lib/turns/liveActivitySummary.ts`; `packages/ui/src/components/chat/hooks/useStreamingTextThrottle.ts`; `packages/ui/src/components/chat/TodoTray.tsx`; `packages/ui/src/lib/i18n/messages/agent-status.i18n.ts`
**Read first:** `research/ux-v270-systemic-review.md` R3 (tool coverage table, holds inventory); OMP `pi-tui` tool renderers, `event-controller` status, `components/markdown.ts`; skills `performance-engineering`, `locale-ui-patterns`
**Check:** `VITEST_MAX_WORKERS=2 bunx vitest run packages/ui/src/lib/toolPresentation packages/ui/src/components/chat && bun run lint` → exit 0, with the coverage test resolving every OMP 18.18.0 model-facing and host tool and the replay test passing (status = `input.i` intent, first prose token visible within one 100 ms frame, todo tray collapsed to active item + progress); real path: the same scripted prompts in OMP TUI and the app show matching status, intents and tool summaries

- [ ] Build one OMP-keyed registry: per tool `label`, `icon`, `describeCall(input)` including `input.i`, `describeResult(details)` (match/file counts, line ranges, diff stats, exit status, todo progress), and grouping class. Cover all OMP tools, hidden tools, `vibe_*`, `advise` and host tools.
- [ ] Status shows OMP's `Working…`, the thinking state, or the active call's intent. Retry, cooldown and permission-wait come from live state.
- [ ] Streaming holds only what OMP holds (an unfinished table row). Thinking streams live when expanded, and the status dwell does not delay intent changes.
- [ ] The todo tray defaults to collapsed, showing the active item (or next pending) with progress, and expands to all phases.
- [ ] Parse OMP's `ask` result format.
- [ ] Add guardrails: a coverage test over OMP's tool name lists, an OMP stream replay test, and a lint rule against tool-name literal comparisons outside the registry.
- [ ] Deletes: `NATIVE_TOOLS` (and its invented `fetch`), `toolDescription`, `TOOL_BUCKETS`, `WORKING_PHRASES` and the hash phrase picker, literal-name branches in `ToolPart`/`ProgressiveGroup`, the 1500/320-character holds, the `out://` reply-write convention, and OpenCode-only status keys.
