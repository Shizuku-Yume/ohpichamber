# 07: Project live subagent progress HUD and add per-subagent steer and cancel controls

**Effort:** m4-orchestration
**Task type:** feature
**Blocked by:** None
**Files:** `packages/agent-contract/src/session.ts`, `packages/agent-contract/src/events.ts`, `packages/agent-service/src/protocol.ts`, `packages/agent-service/src/worker/session.ts`, `packages/agent-service/src/supervisor/service.ts`, `packages/web/server/lib/openchamber-sessions/routes.js`, `packages/ui/src/api/canonicalClient.ts`, `packages/ui/src/components/chat/work-status/WorkStatusSubagentsSection.tsx`, `packages/ui/src/components/chat/SubagentHudTray.tsx`
**Read first:** `.workflow/specs/m4-orchestration.md`; `.workflow/research/omp-tui-parity-audit.md` (§1.2, §2)
**Covers:** W10
**Check:** `bun test packages/agent-contract/src/session.test.ts packages/agent-service/src/worker/session-native.test.ts packages/ui/src/components/chat/` and `bun run type-check` exit 0.

- [ ] Subscribe `worker/session.ts` to `TASK_SUBAGENT_PROGRESS_CHANNEL` and `TASK_SUBAGENT_EVENT_CHANNEL` alongside `TASK_SUBAGENT_LIFECYCLE_CHANNEL`, projecting live active tool name, token usage, cost, turn count, retry countdown, and nested agent tree (up to 8 levels).
- [ ] Extend `SubagentSchema` in `packages/agent-contract/src/session.ts` with `'cancelled'` status and live progress fields, and add `subagent.steer` and `subagent.cancel` session control operations in `worker/session.ts` (`AgentLifecycleManager.global()`).
- [ ] Render a live `SubagentHudTray` / enhanced `WorkStatusSubagentsSection` in `packages/ui` showing active subagent progress, tokens, cost, and per-subagent Steer and Cancel buttons that do not abort the parent run.
