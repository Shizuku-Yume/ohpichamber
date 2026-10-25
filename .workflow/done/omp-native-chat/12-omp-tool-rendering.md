# 12: Render OMP tools and todos correctly

**Effort:** omp-native-chat
**Task type:** bugfix
**Base commit:** dee0c88ebd6c52810fefaa74d5848a23ecf6a0d9
**Started:** 2026-10-25T00:00:00Z
**Status:** active

**Delivers:** The status row and tool cards name OMP tools correctly (bash, task, ask, find, todo and the rest), and other tools show their own name. A `todo` call renders a checklist with phases, and the latest todo list on the active branch is pinned above the composer, also after a reload.

**Blocked by:** None
**Files:** `packages/ui/src/hooks/useAssistantStatus.ts` (OpenCode 2 buckets 89-107), `packages/ui/src/lib/toolHelpers.ts` (`NATIVE_TOOLS` 4-16), `packages/ui/src/components/chat/message/parts/ToolPart.tsx`, a new todo card and composer tray under `packages/ui/src/components/chat/`, the session sync store, i18n.

**Read first:** spec "Rendering" and W11; `research/crude-port-ledger.md` CP-06, CP-07; the pinned OMP tool registry (`packages/agent-service/node_modules/@oh-my-pi/pi-coding-agent/src/tools/`) for builtin names and the `todo` tool's input and result shape; skill `sync-state-invariants`.
**Covers:** W11

**Check:** Before: a UI test feeding a `todo` tool part and a `bash` tool part gets the generic card and no shell status. After: `bun run --cwd packages/ui test` has a table test that every builtin name from the pinned registry maps to a category, an MCP tool shows its own name, a two-phase `todo` result renders both phases and their items, and the tray shows the latest list from history after a remount.
## Progress

Dirty at start: none
Check before: observed in source: OMP `bash`/`task`/`ask`/`find` are absent from the status buckets, and no `todo` card/tray consumes todo result history; the prior OpenCode v2 test fixtures describe retired tool names. The task's before command was not run before implementation.
Root cause: the UI kept an OpenCode 2 tool registry for status and exposed no OMP todo card; todo state was not derived from the current branch's canonical message history.
Runtime surfaces: Web and PWA use this shared UI and current-session history; Electron uses the same shared UI and history; hosted mobile and Capacitor use the same shared UI and history. No runtime-specific path is added. VS Code is retired.
Check after: `bun run --cwd packages/ui test` — 810/810 test files passed. Focused tests also passed: 23 tests, 0 failures, 141 assertions. `bun run --cwd packages/ui type-check` — passed. UI lint reports only pre-existing unrelated errors in `packages/ui/src/components/onboarding/LegacyDataNotice.tsx`.
Real path: started Web with lane e ports/data dir and provider env; opened `http://127.0.0.1:5185/` in Chrome and confirmed OpenChamber loaded; `/health` returned `runtime: web`, `agentService.phase: ready`; stopped the server. A real provider chat/todo run was not completed.

- [x] OpenCode 2 names (`shell`, `subagent`, `question`, `codesearch`) and OpenCode todo priority keys are removed.
- [x] The tray reads todo state from history on the active branch, so a reload and a branch switch show the right list.
- [x] No new contract field; if one turns out to be needed, stop and amend the spec.

Review boundary: dee0c88ebd6c52810fefaa74d5848a23ecf6a0d9 + UI tool/status rendering and composer history tray; round: 1; briefs: A,B; boundaries: canonical message history to shared renderer; findings: 0 blocking / 0 nonblocking (manual review; reviewer subagents unavailable).
Review security pass: no new trust boundary; todo data is read from existing canonical session history and rendered without transport or authorization changes.
**Finished:** 2026-10-25T13:40:00Z
