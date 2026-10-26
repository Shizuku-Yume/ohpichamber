# 06: Mode dropdown in the agent-picker slot

**Effort:** omp-native-parity
**Task type:** bugfix
**Base commit:** <commit-sha>

**Delivers:** One searchable mode dropdown (Main, Plan, Vibe, Goal) on the composer's right side, desktop and mobile, with Radix tooltips; it works in a draft and applies the mode when the session is created.

**Blocked by:** None
**Files:** `packages/ui/src/components/chat/ComposerModeSelector.tsx` (~24), `SessionGoalButton.tsx`, `ModelControls.tsx` (old `renderAgentSelector` slot; see 2f4836e839 and 30c7f58f51 for the removed picker), `MobileAgentButton.tsx` or the mobile composer, `ChatInput.tsx` draft send path, `FocusModeButton.tsx` (33-55 tooltip pattern), Agent Service `mode.ts` (~177 plan role 422).

**Read first:** spec "Mode dropdown"; `packages/ui/src/lib/theme/STYLING.md`; skills `locale-ui-patterns`, `sync-state-invariants`; `.workflow/done/omp-native-chat/` mode tasks.
**Covers:** W8

**Check:** Before: a UI test shows the mode buttons disabled without a session. After: UI tests show the dropdown in the right slot, keyboard open and type-to-filter, Radix tooltip; choosing Plan in a draft and sending calls `mode.set plan` after create and before the prompt; with no plan role Plan is disabled with a reason; real dev UI screenshot recorded.

- [ ] Old stacked buttons removed; one dropdown in the right slot.
- [ ] Draft mode held by composer and applied after create; Goal asks for objective.
- [ ] Mobile composer has the same control.
- [ ] Tooltips use Radix; strings localized.
