# 05: Mirror OMP auto-compaction and todo clearing, and test the plan-mode and command mirrors against the pinned OMP

**Effort:** tech-debt-sweep
**Blocked by:** None
**Covers:** W5
**Files:** `packages/agent-service/src/worker/{projection,mode,builtin-commands}.ts` and tests; `packages/agent-contract/src/events.ts` when a new event shape is needed; `packages/ui/src/components/chat/todoData.ts` and the todo tray; the compaction divider/notice components; `packages/ui/src/lib/i18n/messages/*` (15 locales) for new copy
**Read first:** `.workflow/specs/tech-debt-sweep.md` (item 3, TUI entry); `.workflow/technical-debt.md` "OMP TUI-owned behaviors have no GUI mirror or drift test"; `.workflow/research/feedback-2026-11-12/12-tui-vs-sdk.md`; the pinned OMP package under `node_modules/@oh-my-pi/` (event names, `getTodoPhases`, plan-mode and slash command sources); `.agents/skills/sync-state-invariants/SKILL.md`; `.agents/skills/locale-ui-patterns/SKILL.md`; `AGENTS.md` OMP TUI parity rules
**Check:** `bun test packages/agent-service/src/worker && bun run --cwd packages/agent-contract test && VITEST_MAX_WORKERS=2 bun run --cwd packages/ui test` → exit 0; the drift tests fail when fed a modified copy of OMP's command list or plan-mode steps (show the failing run in the evidence) and pass on the pinned package. Real path on the Web surface with the real provider: a session pushed past its auto-compaction threshold shows the compaction state live before it completes; a todo list OMP auto-clears leaves the tray.

- [ ] `auto_compaction_start` (and its end) is projected into the canonical stream and rendered with the existing compaction UI; no second compaction UI.
- [ ] `todo_auto_clear` clears the tray; the tray reads OMP's todo state (`session.getTodoPhases()` or its projection) instead of parsing transcript tool details, and the transcript parser it replaces is deleted.
- [ ] Upgrade-time drift tests compare the fork's plan-mode mirror and `ALLOWED_BUILTIN_COMMANDS` with what the pinned OMP exports or ships; every OMP command is either allowed or listed as deliberately excluded with a reason.
- [ ] Delete the technical-debt entry in the same commit as the last fix.
