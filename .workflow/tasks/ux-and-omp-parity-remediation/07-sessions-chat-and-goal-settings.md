# 07: Restore Sessions (DefaultsSettings) and Chat Assistance (Goal Jev checker & max turns) settings

**Effort:** ux-and-omp-parity-remediation
**Task type:** feature
**Blocked by:** 03
**Covers:** W10, W11
**Files:** `packages/ui/src/components/sections/openchamber/DefaultsSettings.tsx`; `packages/ui/src/components/sections/openchamber/ChatSettings.tsx`; `packages/ui/src/components/sections/openchamber/SessionGoalCheckerField.tsx`; `packages/agent-service/src/worker/mode.ts`
**Read first:** `.workflow/specs/ux-and-omp-parity-remediation.md`; `packages/ui/src/components/sections/PATTERNS.md`; `.agents/skills/locale-ui-patterns/SKILL.md`
**Check:** `bun run --cwd packages/ui test && bun run --cwd packages/ui type-check && bun test packages/agent-service/src/worker/` → exits 0; verifies restored Sessions settings and Goal Jev/Judge completion check controls.

- [ ] In `packages/ui/src/components/sections/openchamber/DefaultsSettings.tsx`, restore the full upstream `0056bf6a9` Sessions page controls and layout:
  - **Default Behavior**: Default Model selector (`default` role), Default Thinking Variant selector, Default Agent selector, Auto-apply Agent Default Model checkbox, Small Model (`smol`/`tiny` role with "Use default" toggle + model selector), Walkthrough Model (`slow` role with "Use default" toggle + model selector), and Fallback Model selector.
  - **Tool Permissions**: New Session Default Mode (`ask` / `safety` / `auto`, bound to Host permission policy) and Plan Mode Agents permission toggle.
- [ ] Restore `packages/ui/src/components/sections/openchamber/SessionGoalCheckerField.tsx` (`SessionGoalCheckerField` for `Jev` vs `Small Model` and `SessionGoalMaxTurnsField` for max auto-turns 1–200) and wire both into `ChatSettings.tsx` (`AssistanceTab`), plus restore `pillSize="form"` on `SortableTabsStrip`.
- [ ] Wire Goal completion checking and `sessionGoalMaxAutoTurns` into `packages/agent-service/src/worker/mode.ts` (`WorkerModeController`) using OMP's native `resolveJudge` (`judge` role / TypeSafe Jev / small model) and turn counter cap.
