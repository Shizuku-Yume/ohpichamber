# 08: Vibe mode

**Effort:** omp-native-chat
**Task type:** feature
**Base commit:** <commit-sha>

**Delivers:** The mode switcher offers Vibe. Switching to it activates OMP's vibe tools until the user switches back to Main, which restores the previous tools. The mode survives a reload and an Agent Service restart.

**Blocked by:** 05
**Files:** the worker mode controller from task 05, `packages/agent-contract/src/session.ts` (`SessionMode` already has `vibe`), the composer mode switcher, i18n.

**Read first:** spec "Session mode" and W6; OMP 18.8.9 `modes/interactive-mode.ts` `#enterVibeMode` (5998) and `#exitVibeMode` (6062), and `VibeSessionRegistry` use near 4595 and 4824-4860; `session/agent-session.ts` `activateVibeTools` (6347), `deactivateVibeTools` (6352), `setVibeModeState` (6755). Re-read line numbers first.
**Covers:** W6

**Check:** Before: `control { type: 'mode.set', mode: 'vibe' }` returns 400. After: `bun run --cwd packages/agent-service test` has a native test where `mode.set vibe` reports `{kind:'vibe'}`, the enabled tools equal OMP's vibe set, a reopened worker reports vibe, and `mode.set main` restores the previous tools; plan to vibe goes through plan exit first, as OMP does. UI test shows Vibe in the switcher.

- [ ] Vibe enter and exit follow OMP's steps, including vibe worker cleanup on exit.
- [ ] Plan, vibe and goal stay mutually exclusive.
- [ ] Switcher label and description added in every locale.
