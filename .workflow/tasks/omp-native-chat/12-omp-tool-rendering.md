# 12: Render OMP tools and todos correctly

**Effort:** omp-native-chat
**Task type:** bugfix
**Base commit:** <commit-sha>

**Delivers:** The status row and tool cards name OMP tools correctly (bash, task, ask, find, todo and the rest), and other tools show their own name. A `todo` call renders a checklist with phases, and the latest todo list on the active branch is pinned above the composer, also after a reload.

**Blocked by:** None
**Files:** `packages/ui/src/hooks/useAssistantStatus.ts` (OpenCode 2 buckets 89-107), `packages/ui/src/lib/toolHelpers.ts` (`NATIVE_TOOLS` 4-16), `packages/ui/src/components/chat/message/parts/ToolPart.tsx`, a new todo card and composer tray under `packages/ui/src/components/chat/`, the session sync store, i18n.

**Read first:** spec "Rendering" and W11; `research/crude-port-ledger.md` CP-06, CP-07; the pinned OMP tool registry (`packages/agent-service/node_modules/@oh-my-pi/pi-coding-agent/src/tools/`) for builtin names and the `todo` tool's input and result shape; skill `sync-state-invariants`.
**Covers:** W11

**Check:** Before: a UI test feeding a `todo` tool part and a `bash` tool part gets the generic card and no shell status. After: `bun run --cwd packages/ui test` has a table test that every builtin name from the pinned registry maps to a category, an MCP tool shows its own name, a two-phase `todo` result renders both phases and their items, and the tray shows the latest list from history after a remount.

- [ ] OpenCode 2 names (`shell`, `subagent`, `question`, `codesearch`) and OpenCode todo priority keys are removed.
- [ ] The tray reads todo state from history on the active branch, so a reload and a branch switch show the right list.
- [ ] No new contract field; if one turns out to be needed, stop and amend the spec.
