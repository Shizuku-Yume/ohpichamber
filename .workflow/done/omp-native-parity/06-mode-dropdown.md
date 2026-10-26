# 06: Mode dropdown in the agent-picker slot

**Effort:** omp-native-parity
**Task type:** bugfix
**Base commit:** cbe1f912b3eda59858061e1dccdffa4c496cb4b9
**Started:** 2026-10-26T23:48:51+08:00
**Delivers:** One searchable mode dropdown (Main, Plan, Vibe, Goal) on the composer's right side, desktop and mobile, with Radix tooltips; it works in a draft and applies the mode when the session is created.

**Blocked by:** None
**Files:** `packages/ui/src/components/chat/composer/ui/ComposerModeSelector.tsx` (replaces the stacked selector), `composer/ui/DraftGoalDialog.tsx` (draft objective), `SessionGoalButton.tsx` (removed; active goal management stays in `SessionGoalRow`/`SessionGoalDialog`), `ChatInput.tsx` (mobile slot and draft send), `ComposerFooter.tsx` (desktop right slot), `sync/session-ui-store.ts` (draft mode/objective), `composer/DOCUMENTATION.md` (Session mode selector), `FocusModeButton.tsx` (33-55 Radix tooltip pattern), Agent Service `worker/mode.ts` (~178 plan role 422) and `worker/catalog-models.ts` (`ModelCatalog.planRoleAvailable`). Historical correction: the composer agent picker was removed by `5d1fd2a`; `2f4836e839`/`30c7f58f51` removed other agent selectors. Mobile slot reference: `5d1fd2a~1` `mobileModelRow` (right of `MobileModelButton`).

**Read first:** spec "Mode dropdown"; `packages/ui/src/lib/theme/STYLING.md`; skills `locale-ui-patterns`, `sync-state-invariants`; `.workflow/done/omp-native-chat/` mode tasks.
**Covers:** W8

**Check:** Before: a UI test shows the mode buttons disabled without a session. After: UI tests show the dropdown in the right slot, keyboard open and type-to-filter, Radix tooltip; choosing Plan in a draft and sending calls `mode.set plan` after create and before the prompt; with no plan role Plan is disabled with a reason; real dev UI screenshot recorded.

- [x] Old stacked buttons removed; one dropdown in the right slot.
- [x] Draft mode held by composer and applied after create; Goal asks for objective.
- [x] Mobile composer has the same control.
- [x] Tooltips use Radix; strings localized.


## Progress

- Dirty at start: none.
- Surfaces: Web and Electron desktop use the shared `ComposerFooter` right slot and canonical mode/goal controls; hosted mobile and Capacitor mobile use the same `ComposerModeSelector` in `ChatInput.mobileModelRow` (right of the model button) and the same canonical controls. No new native shell capability.
- State ownership: OMP remains the durable mode/goal authority; the UI reads `RuntimeSession.mode` in a session and holds `NewSessionDraftState.mode`/`goalObjective` only while the draft exists. `ModelCatalog.planRoleAvailable` is resolved by the Agent Service with OMP's role resolver; no second availability store.
- Historical correction: the composer agent picker was retired by `5d1fd2a` (`ModelControls.tsx` `renderAgentSelector`, `MobileAgentButton.tsx`); `2f4836e839`/`30c7f58f51` retired other agent selectors. Mobile slot reference: `5d1fd2a~1` `mobileModelRow`.
- Check before: worktree clean at base `cbe1f912b3`; the existing `ComposerModeSelector.test.tsx` passed 3/3 but pinned the obsolete radio buttons and only measured their disabled state. No dropdown, no draft mode, no right-slot control and no draft ordering existed; the new expectations cannot pass on the base tree.
- Check after (focused): contract `catalogs.test.ts` 65 pass; Agent Service `catalog-models.test.ts` 33 pass including missing/configured plan role, and `session-native.test.ts --test-name-pattern 'model catalog plan availability'` 1 pass proving the catalog agrees with `mode.set plan` (422 without the role, active plan with it). UI `ComposerModeSelector` 4 pass, `modePickerOptions` 4 pass (filter, disabled skip, Arrow and Ctrl+N/P mapping), `draft-mode-send` 4 pass (create→mode.set→prompt; Goal create with no prompt; failed mode creates no prompt; Main sends no mode.set), `ChatInput.keystroke` 3 pass isolated.
- Root test baseline: `bun run test` at 23:55 reached 4/7 suites; ui, agent-service and web failed. Known unrelated failures include locale key parity (`chat.btw.titleFallback`), `ModelControls.variant.behavior` High/high labels, `DefaultsSettings`, `reviewFlow`, `useConfigStore`, and web tests waiting on Agent Service readiness. The run overlapped implementation, so this is recorded as observed, not as a clean pre-change baseline.
- Real path (browser, isolatedContext `onp-d`, UI 5194/API 3924, data dir `onp-d-2026-10-26/data`): desktop draft: trigger sits after model controls; menu opens with search focused; typing `pl` filters to Plan; mouse and ArrowDown+Enter select Plan; trigger shows Plan. Sending `Reply with the single word OK.` created session `ed70d9a5…`; canonical snapshot returned `{kind:'plan', status:'active', planReference:'local://PLAN.md'}` and the first turn used plan tools (`ask` question "What work should I plan?"); model control showed the configured plan role `GPT-6.1 Sol`; trigger showed Plan and was disabled during the run. Mobile 390x844 with iPhone UA: same control appears right of `Select model` in the model row; tapping opens a bottom sheet with focused search; typing `go` filters to Goal; ArrowDown+Enter opened the Goal objective dialog ("Set Session Goal", Objective, Token budget). No-plan-role browser state was not forced because that would require editing the real `~/.omp/agent/config.yml`; the 422/disabled/reason behavior is proven by the native and pure-UI tests.
- Evidence: `/home/shizuku/Project/ohpichamber-omp-artifacts/onp-d-2026-10-26/` (`draft-plan-selected-desktop.png`, `session-plan-desktop.png`, `mobile-mode-sheet.png`, `mobile-goal-objective-dialog.png`, `mobile-session-plan.png`, `desktop-mode-tooltip.png`).
- Tooltip note: the trigger uses the shared `@/components/ui/tooltip` contract (same component as `FocusModeButton`); CDP hover/programmatic focus did not surface a tooltip node for this control or for the existing FocusMode button, so hover appearance remains for the reviewer/browser pass rather than claimed observed.
- Review boundary: Base `cbe1f912b3eda59858061e1dccdffa4c496cb4b9` + all changed paths listed in `git status --porcelain` (catalog contract/service/tests, composer/selector/draft/doc/locales/fixtures, spec/task/decisions). Round 1; Brief A and Brief B; trust boundaries: none new (existing authenticated canonical mode/goal controls; no credentials, network, listener, path or egress change). Final findings after the A.1 fix: 0 blocking / 0 nonblocking. A.1 was the stale `packages/ui/src/components/chat/composer/DOCUMENTATION.md` section describing the removed 3-mode selector and `SessionGoalButton`; the writer patch now matches the shipped desktop/mobile slots, authoritative session mode, draft `mode.set` before prompt, native Goal create without duplicate prompt, `ModelCatalog.planRoleAvailable`, and retained goal strip/dialog. Brief B pass with no findings; security pass not triggered by a new boundary. Director re-read the updated documentation and Progress.
- Doc validation after A.1 fix: read the patched `composer/DOCUMENTATION.md` §Session mode selector; grep finds no stale "Main, Plan and Vibe" selector claim; the only `SessionGoalButton` mention is the intentional retirement statement. `.workflow/bin/workflow validate` passes (147 task files).
- Archive/commit/landing: task closed and archived on this branch; commit and local integration landing follow in the same task commit.

**Finished:** 2026-10-27T00:31:39+08:00
