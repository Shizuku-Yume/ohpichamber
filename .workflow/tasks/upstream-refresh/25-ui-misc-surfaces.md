# 25: UI misc: guests, browser, terminal, multi-run

**Effort:** upstream-refresh
**Task type:** feature
**Base commit:** <commit-sha>

**Delivers:** Remaining UI surfaces match upstream: Guest panels, browser and terminal views, multi-run, settings helpers, model picker and the small auxiliary components.

**Blocked by:** 10, 23, 24
**Files:** Path list: `/home/shizuku/Project/ohpichamber-omp-artifacts/upstream-sync-2026-10-27/plan-paths/25.tsv` (247 paths: 160 clean/new, 81 both-side, 45 conflicts). Main locations: `packages/ui/src/lib/{guests,browser,settings,multirun,ghostty,...}`, `packages/ui/src/components/{browser,terminal,model-picker,mcp,dictation,auth,code,diagram,desktop,...}`, `packages/ui/tsconfig.json`. Deferred from task 10: `components/ui/{CommandPalette.tsx,commandPaletteMessages.tsx,commandPaletteFilesState.ts,HelpDialog.tsx,MatchHighlight.tsx,commandPaletteMatches.ts,commandPaletteMatches.test.ts}` (need this task's `lib/search/subsequenceSearch`, `lib/search/matchSegments`, `lib/settings/pageTitle`, `lib/projectActions.resolveProjectActionIconName`; `sync/session-pins`/`lib/sessionPins` stay deferred; overview state comes from task 21). From task 23: `sync/session-turn-duration.ts` (needs `lib/sessionTurnMetadata`), `stores/useUIStore.ts` rework (needs `lib/browser/liveTabs`, `lib/mobileWorkspaceTabs`, `lib/workspace/zones`), `sync/workflow-activity.ts` and the four `sync/{session-folders,session-drafts,session-warming,permission-mode}-sync.ts` control-stream subscribers (need this task's `lib/openchamberEvents` variants), and the `useUpdateStore` desktop-host branches once task 22 produces the states.

**Read first:** Spec W6; task 31 owns `packages/ui/src/components/session/**` and `stores/useSessionDisplayStore.ts` — do not edit them; `.agents/skills/ui-api-decoupling/SKILL.md`; `.agents/skills/drag-to-reorder/SKILL.md`; `.agents/skills/locale-ui-patterns/SKILL.md`; `.agents/skills/performance-engineering/SKILL.md`.
**Covers:** W6

**Check:** `bun install --frozen-lockfile` and `bun run type-check` and `bun run lint` and `bun run test` all exit 0, and in the running app a Guest extension panel opens, the browser panel navigates, the terminal opens a shell and multi-run shows its runs. Real path: drive each surface once and capture the result.

## Done when

- [ ] Guest panels keep the v2 transport from task 04; no second envelope.
- [ ] Browser and terminal panels keep their permission and focus boundaries.
- [ ] Multi-run state is per project and survives reload.
- [ ] No unused upstream component is left unexported or unreachable.
- [ ] The CommandPalette group and HelpDialog adopt upstream; search/highlighting use this task's match modules, and `lib/jsonTreeUtils` stays exported for task 07's JsonTreeViewer.
- [ ] `session-turn-duration` and `useUIStore` are reworked and consumed; `useUpdateStore` maps task 22's desktop-host states and no VS Code-only kind.
- [ ] `sync/workflow-activity.ts` and the four `*-sync` subscribers land with the control-stream event types and are consumed (workflow activity through task 17).
- [ ] Session pins remain deferred to the technical-debt entry `Session pins have no OMP source`; no fake pin store is added.

## Progress

### Handoffs from landed tasks

- **Task 17 (workflows)** delivers the workflow store as the only run-state source and the
  panel data layer. This task's `sync/workflow-activity.ts` must derive the running-session
  ids from `packages/ui/src/lib/workflows/store.ts` (runs with state `running` / an agent
  running) and call `setWorkflowRunningSessions`; the tip's `SessionActivityIndicator` gains
  the workflow state here. Task 23 deferred the file because it needed both this task's
  indicator state and task 17's feed; no stand-in indicator exists on the tip.
