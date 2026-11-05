# 07: Project live subagent progress HUD and add per-subagent steer and cancel controls

**Effort:** m4-orchestration
**Task type:** feature
**Blocked by:** None
**Files:** `packages/agent-contract/src/session.ts`, `packages/agent-contract/src/events.ts`, `packages/agent-service/src/protocol.ts`, `packages/agent-service/src/worker/session.ts`, `packages/agent-service/src/supervisor/service.ts`, `packages/web/server/lib/openchamber-sessions/routes.js`, `packages/ui/src/api/canonicalClient.ts`, `packages/ui/src/components/chat/work-status/WorkStatusSubagentsSection.tsx`, `packages/ui/src/components/chat/SubagentHudTray.tsx`
**Read first:** `.workflow/specs/m4-orchestration.md`; `.workflow/research/omp-tui-parity-audit.md` (§1.2, §2)
**Covers:** W10
**Check:** `bun test packages/agent-contract/src/session.test.ts packages/agent-service/src/worker/session-native.test.ts packages/ui/src/components/chat/` and `bun run type-check` exit 0.
- **Base commit:** 1e903152221e0efef535f8f45bc29458ede64ccb
- [x] Subscribe `worker/session.ts` to `TASK_SUBAGENT_PROGRESS_CHANNEL` and `TASK_SUBAGENT_EVENT_CHANNEL` alongside `TASK_SUBAGENT_LIFECYCLE_CHANNEL`, projecting live active tool name, token usage, cost, turn count, retry countdown, and nested agent tree (up to 8 levels).
- [x] Extend `SubagentSchema` in `packages/agent-contract/src/session.ts` with `'cancelled'` status and live progress fields, and add `subagent.steer` and `subagent.cancel` session control operations in `worker/session.ts` (`AgentLifecycleManager.global()`).
- [x] Render a live `SubagentHudTray` / enhanced `WorkStatusSubagentsSection` in `packages/ui` showing active subagent progress, tokens, cost, and per-subagent Steer and Cancel buttons that do not abort the parent run.

## Progress

- **Check before:**
- `bun test packages/agent-contract/src/session.test.ts`: 10 pass, 0 fail (35ms).
- `bun test packages/agent-service/src/worker/session-native.test.ts`: 45 pass, 0 fail (105s).
- `bun run type-check`: 0 errors in 3,197 files across 5 projects (3.21s).

- **Work:**
- Subscribed `worker/session.ts` to `TASK_SUBAGENT_LIFECYCLE_CHANNEL`, `TASK_SUBAGENT_PROGRESS_CHANNEL`, and `TASK_SUBAGENT_EVENT_CHANNEL`.
- Projected live active tool name (`currentTool`), token usage (`tokens`), cost (`cost`), turn count (`toolCount`/`requests`), retry countdown, and nested agent tree up to 8 levels (`depth`, `parentSubagentId`).
- Extended `SubagentSchema` in `packages/agent-contract/src/session.ts` with `'cancelled'` status and live progress fields (`activeTool`, `tokens`, `cost`, `turnCount`, `retryCountdown`, `depth`, `parentSubagentId`, `description`, `task`, `lastIntent`, `durationMs`).
- Added `subagent.steer` and `subagent.cancel` session control operations in `packages/agent-contract/src/session.ts`, `packages/agent-contract/src/events.ts`, `packages/agent-service/src/protocol.ts`, `packages/agent-service/src/sessions/registry.ts`, `packages/agent-service/src/supervisor/service.ts`, and `packages/agent-service/src/worker/session.ts` with ownership validation enforcing target subagent belongs to the calling session.
- Added `steerSubagent` and `cancelSubagent` methods to `packages/ui/src/api/canonicalClient.ts`.
- Created `useSubagentsStore` and `subagentHudI18n` with full translations across all 15 locales (`en`, `de`, `fr`, `nl`, `es`, `ja`, `pt-BR`, `uk`, `ko`, `pl`, `zh-CN`, `zh-TW`, `tr`, `ar`, `he`).
- Implemented `packages/ui/src/components/chat/SubagentHudTray.tsx` and enhanced `WorkStatusSubagentsSection.tsx` with live progress readouts and per-subagent Steer and Cancel controls without aborting the parent session. Mounted `SubagentHudTray` above composer in `ChatInput.tsx`.
- Ran real-path UI and dev server smoke in isolated browser context `m4-e` on ports 5205 and 3935.

- **Check after:**
- `bun test packages/agent-contract/src/session.test.ts packages/ui/src/components/chat/SubagentHudTray.test.tsx packages/ui/src/lib/i18n/messages/subagent-hud.i18n.test.ts`: 13 pass, 0 fail, 429 expect() calls (237ms).
- `node scripts/run-isolated-tests.mjs packages/ui/src/components/chat/work-status/`: 16/16 test files passed (1.15s).
- `bun test -t "subagent cancel and steer" packages/agent-service/src/worker/session-native.test.ts`: 1 pass, 0 fail (1.91s).
- `bun run type-check`: 0 type errors across 3,202 files across 5 projects (2.06s).
- `bunx oxlint`: 0 errors.
