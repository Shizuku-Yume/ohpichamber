# 07: Restore Sessions (DefaultsSettings) and Chat Assistance (Goal Jev checker & max turns) settings

**Effort:** ux-and-omp-parity-remediation
**Task type:** feature
**Blocked by:** 03
**Covers:** W10, W11
**Files:** `packages/ui/src/components/sections/openchamber/DefaultsSettings.tsx`; `packages/ui/src/components/sections/openchamber/ChatSettings.tsx`; `packages/ui/src/components/sections/openchamber/SessionGoalCheckerField.tsx`; `packages/agent-service/src/worker/mode.ts`
**Read first:** `.workflow/specs/ux-and-omp-parity-remediation.md`; `packages/ui/src/components/sections/PATTERNS.md`; `.agents/skills/locale-ui-patterns/SKILL.md`
**Check:** `bun run --cwd packages/ui test && bun run --cwd packages/ui type-check && bun test packages/agent-service/src/worker/` → exits 0; verifies restored Sessions settings and Goal Jev/Judge completion check controls.

- [x] In `packages/ui/src/components/sections/openchamber/DefaultsSettings.tsx`, restore the full upstream `0056bf6a9` Sessions page controls and layout:
  - **Default Behavior**: Default Model selector (`default` role), Default Thinking Variant selector, Default Agent selector, Auto-apply Agent Default Model checkbox, Small Model (`smol`/`tiny` role with "Use default" toggle + model selector), Walkthrough Model (`slow` role with "Use default" toggle + model selector), and Fallback Model selector.
  - **Tool Permissions**: New Session Default Mode (`ask` / `safety` / `auto`, bound to Host permission policy) and Plan Mode Agents permission toggle.
- **Base commit:** 3f87cc64f47ef5ef3982e36e7583fb1e2583ec4b
- [x] Restore `packages/ui/src/components/sections/openchamber/SessionGoalCheckerField.tsx` (`SessionGoalCheckerField` for `Jev` vs `Small Model` and `SessionGoalMaxTurnsField` for max auto-turns 1–200) and wire both into `ChatSettings.tsx` (`AssistanceTab`), plus restore `pillSize="form"` on `SortableTabsStrip`.
- [x] Wire Goal completion checking and `sessionGoalMaxAutoTurns` into `packages/agent-service/src/worker/mode.ts` (`WorkerModeController`) using OMP's native `resolveJudge` (`judge` role / TypeSafe Jev / small model) and turn counter cap.

## Progress
- Check before: `DefaultsSettings.tsx` was 336 lines against 530 upstream — only default model/thinking, session mode, deletion dialog, warming and show-chats existed; `SessionGoalCheckerField.tsx`, `PermissionDefaultModeField.tsx` and `lib/sessionGoalTurnLimit.ts` did not exist; the UI store had no `sessionGoalChecker`, `sessionGoalMaxAutoTurns`, `permissionDefaultMode`, `autoApplyAgentModel` or `planModeAllowAgents`; `WorkerModeController` had no judge or turn cap, and the worker never saw a goal preference.
- Check after: those components and store fields exist and are bound (registry → settings snapshot → Host capture → worker enforcement). `DefaultsSettings` now has Default Behavior (model/thinking/agent/auto-apply), helper models with per-role "use default" toggles, native `retry.fallbackChains` fallback, permission default mode and the Plan-mode agents row; `ChatSettings` mounts both goal fields with `pillSize="form"`. `bun run --cwd packages/ui test` → 1028/1028 files passed. `bun run --cwd packages/ui type-check`, `bun test packages/agent-service/src/worker/` (269 pass / 10 skip / 0 fail) and `bun test packages/agent-service/src/interaction/ packages/agent-service/src/worker/native-permission-bridge.test.ts` (42 pass) exit 0, as do `bun run --cwd packages/agent-service type-check`, `build` and `bunx oxlint` on every touched file.
- Real runtime evidence (`/home/shizuku/Project/ohpichamber-omp-artifacts/ux-dispatch-2026-11-07/logs/ux-03-task07-*`): against a real Host, Agent Service child, OMP worker and provider model — a goal created with "use the goal tool to complete" reaches `status: complete`; with `sessionGoalMaxAutoTurns=1` the same infinite objective pauses after its automatic turn; a goal that reports it needs a user-side secret transitions `active` → `paused` after one completed turn; a normal prompt in an already-open session still starts after the preference toggle. Locale labels come from the ux-06 owner commit `a436c7be50` (30 files, 6 keys each) cherry-picked without hand edits.
