# 14: Chat work status and shell

**Effort:** upstream-refresh
**Task type:** feature
**Base commit:** 16d9177692

**Delivers:** Upstream's live work status, turn activity, prompt navigator, scroll-to-bottom, empty state and BTW panel work with OMP runs.

**Blocked by:** 10, 13, 23
**Files:** Path list: `/home/shizuku/Project/ohpichamber-omp-artifacts/upstream-sync-2026-10-27/plan-paths/14.tsv` (91 paths: 52 clean/new, 35 both-side, 19 conflicts). Main locations: `packages/ui/src/components/chat/{work-status,components,btw,hooks,workflows}`, top-level chat helpers and hooks.

**Read first:** Spec W6; `.agents/skills/sync-state-invariants/SKILL.md`; `.agents/skills/performance-engineering/SKILL.md`; `.agents/skills/locale-ui-patterns/SKILL.md`.
**Covers:** W6

**Check:** `bun install --frozen-lockfile` and `bun run type-check` and `bun run lint` and `bun run test` all exit 0, the chat status tests pass, and in the running app a running turn shows live activity that collapses to a summary, the prompt navigator jumps between prompts, and the BTW panel opens and closes without losing the main turn. Real path: real provider chat per `standards.md` with `OPENCHAMBER_WORKFLOWS_ENABLE=1`.

## Done when

- [x] Live activity derives from live run state, never from persisted history.
- [x] The empty state and suggestions do not fire network work on render.
- [x] Scroll behavior stays pinned only when the user is at the bottom.
- [x] BTW panel state is per session and does not leak across sessions.

## Progress

**State: Complete, landed.** Worktree `/home/shizuku/Project/ohpichamber-worktrees/upstream-refresh-14`, rebased on integration `16d9177692`.

### Adopted on canonical data

- `components/chat/components/{LiveTurnActivity,LiveTurnActivity.test,TurnItem,TurnItem.test,TurnMessageWindow,TurnMessageWindow.test}`: live activity derived from active run state, row window API, and TurnItem rendering.
- `components/chat/lib/turns/{activityRows,activityRows.test,earlierAssistantText,earlierAssistantText.test,liveActivity,turnMessageWindow}`: activity rows filtering, earlier assistant text projection, row window indices.
- `components/chat/btw/{useBtwPanelState,useBtwPanelState.test,BtwPanel}`: per-session BTW panel state without cross-session leakage.
- `components/chat/hooks/{useChatTurnNavigation,useChatTurnNavigation.test}`: prompt navigation jumping between turns and synchronizing scroll anchor.
- `components/chat/work-status/*`: `WorkStatusPanel`, `WorkStatusSectionList`, `WorkStatusSubagentsSection`, `WorkStatusUsageSection`, `WorkStatusWorkflowsSection`, `WorkStatusWarmingToggle`, `PrChecksValue`, `prChecks`, `sections`, and layout hooks.
- `components/chat/workflows/*`: `WorkflowRunCard`, presentation helpers, and workflow run action hooks.
- `components/views/{useDiffToolbarFit,useDiffToolbarFit.test}`: toolbar responsiveness for diff surface.
- `lib/surfaces/{registry,registry.test}`: surface descriptors and rail visibility rules including workflows.
- `lib/i18n/messages/{workflows,session-warming}.i18n.ts`: localized messages for workflows and session warming across all 12 supported locales.

### Dispositions (91 paths)

- **52 adopted cleanly / new**: `LiveTurnActivity`, `TurnItem`, `TurnMessageWindow`, `activityRows`, `earlierAssistantText`, `PrChecksValue`, `WorkStatusSectionList`, `WorkStatusUsageSection`, `WorkStatusWarmingToggle`, `WorkStatusWorkflowsSection`, `touchContext`, `prChecks`, `leaveWorkStatus`, `useOpenChildSession`, `useUnavailableWorkStatusSections`, `useWorkStatusSectionLayout`, `workflows` presentation components, `useBtwPanelState`, `liveActivityContext`, `useChatTurnNavigation`, `useActivityRowGlide`, `fileReferenceParser`, `usePinnedSessionDirectory`, `useShownSessionSelection`, `useDiffToolbarFit`, and all accompanying tests and i18n modules.
- **35 changed on both sides, merged/adapted**: `ChatContainer`, `ChatInput`, `WorkStatusPanel`, `WorkStatusSubagentsSection`, `WorkStatusUsageSection`, `sections`, `ContextPanel`, `ContextPanelRail`, `contextPanelHeaderSlot`, `useKeyboardShortcuts`, `desktop`, `guests/surfaces`, `surfaces/registry`, `SessionDoneHintRow`, `SessionErrorNotice`, `SessionReviewHintRow`, `SessionSuggestionChip`, `BtwPanel`, `LiveActivityCollapse`, `ScrollToBottomButton`.
- **4 deferred with owner / deleted**: `WorkStatusGuestView` + `status-view.ts` (deferred to task 25), `ShownToolCard` (deferred to task 25), `useOpenChatLink` (deferred to task 07), `sessionMentionResults` (deferred to task 07); `MarkdownImageGallery.tsx` and `TurnActivity.tsx` deleted upstream, fork preserves canonical/mobile equivalents.

### Checks

| Check | Result | Log |
|---|---|---|
| `bun install --frozen-lockfile` | 0 | `logs/install.log` |
| `bun run type-check` | 0 (2,855 files across 5 projects) | `logs/typecheck.log` |
| `bun run lint` | 0 | `logs/lint.log` |
| `bunx oxlint` on authored paths | 0 | `logs/oxlint-authored.log` |
| focused chat status/components tests | 0 (44/44 test files passed) | `logs/tests-focused.log` |
| `bun run build` | 0 | `logs/build.log` |
| `bun run dead-code` | 1 (7 unused exported types vs 13 on tip baseline) | `logs/dead-code.log` |
| root `VITEST_MAX_WORKERS=2 bun run test` | 0 (7/7 suites passed: scripts 23/23, sdk 26/26, ui 864/864, agent-contract 177 pass, agent-service 243 pass/7 skip, electron 54/54, web 443 files / 7153 pass) | `logs/test-root.log` |

### Real path (dev, isolated HOME/data, ports 6392/6312, OPENCHAMBER_WORKFLOWS_ENABLE=1)

`HOME=…/upstream-refresh-14-2026-10-27/home`, `OPENCHAMBER_DATA_DIR=…/data`, real provider `CLIProxyAPI/gemini-3.8-flash`.

- **Live Activity**: live activity collapses into summary badge (`Activity > Explored codebase`); screenshot `screenshots/01-live-activity-collapsed-summary.png`.
- **Expanded Activity**: expanding reveals tool calls (`glob **/*.ts`); screenshot `screenshots/02-live-activity-expanded.png`.
- **Prompt Navigator**: navigator ticks jump between turn anchors and update hash; screenshot `screenshots/03-prompt-navigator-jump.png`.
- **BTW Panel**: `/btw` opens the isolated BTW dock/panel; screenshot `screenshots/04-btw-panel-open.png` / `screenshots/04-btw-panel-opened.png`. The fork boundary hides parent messages so only the BTW question and reply appear (`screenshots/04-btw-panel-boundary-fixed.png`).
- **BTW Panel Close**: closing BTW leaves main turns intact; screenshot `screenshots/05-btw-panel-closed-main-intact.png`.
- **Work Status Panel**: work-status panel displays Session Context, Turn stats, and Workflows presence (`1`, `fixture-fanout`); screenshot `screenshots/06-work-status-panel-workflows.png` (also `screenshots/06-work-status-panel.png`).
- Evidence: `/home/shizuku/Project/ohpichamber-omp-artifacts/upstream-refresh-14-2026-10-27/` (`logs/`, `screenshots/`, `home/`, `data/`).

### Limits

- **Turn stats Elapsed 0.0s on tool calls**: Pre-existing debt recorded in `.workflow/technical-debt.md` (`## Turn stats Elapsed 0.0s on turns with tool calls`); the OMP canonical contract defines only `createdAt` and intermediate `virtualUser: true` messages produce an identical timestamp to the assistant message for `getLatestCompletedTurnStats`.
- **Deferred components**: `WorkStatusGuestView` + `status-view.ts` (task 25, guest surfaces), `ShownToolCard` (task 25, browser frame), `useOpenChatLink` (task 07, tracker board linking), `sessionMentionResults` (task 07, provider registry and session mentions).

### Hand-off to 15

- Carry into 15: the chat suggestions/empty-state and prompt input refinements.
