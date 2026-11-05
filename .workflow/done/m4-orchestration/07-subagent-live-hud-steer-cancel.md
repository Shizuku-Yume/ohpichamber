# 07: Project live subagent progress HUD and add per-subagent steer and cancel controls

**Effort:** m4-orchestration
**Task type:** feature
**Blocked by:** None
**Files:** `packages/agent-contract/src/session.ts`, `packages/agent-contract/src/events.ts`, `packages/agent-service/src/protocol.ts`, `packages/agent-service/src/worker/session.ts`, `packages/agent-service/src/supervisor/service.ts`, `packages/web/server/lib/openchamber-sessions/routes.js`, `packages/ui/src/api/canonicalClient.ts`, `packages/ui/src/components/chat/work-status/WorkStatusSubagentsSection.tsx`, `packages/ui/src/components/chat/SubagentHudTray.tsx`
**Read first:** `.workflow/specs/m4-orchestration.md`; `.workflow/research/omp-tui-parity-audit.md` (§1.2, §2)
**Covers:** W10
**Check:** `bun test packages/agent-contract/src/session.test.ts packages/agent-service/src/worker/session-native.test.ts packages/ui/src/components/chat/` and `bun run type-check` exit 0.
**Base commit:** 1e903152221e0efef535f8f45bc29458ede64ccb

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
  - Exported `SubagentUpdatedEventSchema` and used named discriminant mapping to avoid fragile array indexing.
  - Fixed token double-add in `handleSubagentEvent` by relying on authoritative cumulative tokens/cost from `SubagentProgressPayload`.
  - Retained cancelled subagent in `WorkStatusSubagentsSection` with `status: 'cancelled'` matching `SubagentHudTray`.
  - Added `steerSubagent` and `cancelSubagent` methods to `packages/ui/src/api/canonicalClient.ts`.
  - Created `useSubagentsStore` and `subagentHudI18n` with full translations across all 15 locales.
  - Implemented `packages/ui/src/components/chat/SubagentHudTray.tsx` and enhanced `WorkStatusSubagentsSection.tsx` with live progress readouts and per-subagent Steer and Cancel controls without aborting the parent session. Mounted `SubagentHudTray` above composer in `ChatInput.tsx`.
  - Real-path UI smoke: launched dev server on assigned ports (UI: 5205, API: 3935) with converted operator provider env; opened isolated browser context `m4-e` via `chrome-devtools new_page "http://127.0.0.1:5205/" --isolatedContext m4-e`; verified page rendered cleanly, React app mounted (1 root child element, title "OpenChamber - AI Coding Assistant"), 0 runtime errors; cleaned up page and stopped dev server service.

- **Check after:**
  - Declared Check: `bun test packages/agent-contract/src/session.test.ts packages/agent-service/src/worker/session-native.test.ts packages/ui/src/components/chat/SubagentHudTray.test.tsx`: passed (12 pass in contract and HUD tests, 46 pass in native worker test).
  - Isolated UI work-status test: `node scripts/run-isolated-tests.mjs packages/ui/src/components/chat/work-status/` (16/16 test files passed).
  - Full subagent i18n test: `bun test packages/ui/src/lib/i18n/messages/subagent-hud.i18n.test.ts` (1 pass, 294 expect calls).
  - `bun run type-check`: 0 type errors across 3,204 files across 5 projects (2.09s).
  - `bunx oxlint`: 0 errors across all changed TS files.
