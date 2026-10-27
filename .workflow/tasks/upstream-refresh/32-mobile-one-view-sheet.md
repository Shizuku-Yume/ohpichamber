# 32: Mobile one-view session sheet

**Effort:** upstream-refresh
**Task type:** feature
**Base commit:** <commit-sha>

**Delivers:** The mobile session sheet uses the one-view sidebar model from task 31 — sections, sessions, work rows and actions in one sheet — replacing the fork's separate expansion/tree sheet and its timeline helpers.

**Blocked by:** 31
**Files:** Paths come from task 24's list; there are no new upstream paths. `packages/ui/src/apps/mobileSidebar/{MobileSectionRows.tsx,MobileSessionList.tsx,MobileSessionRow.tsx,MobileWorkRows.tsx,mobileRowParts.tsx,mobileSessionActions.ts,mobileSidebarGeometry.ts,mobileSidebarState.ts}`, `packages/ui/src/apps/MobileSessionsSheet.tsx` (upstream rewrite), `packages/ui/src/apps/mobileSessionFields.ts`. Delete the fork helpers the rewritten sheet no longer consumes: `apps/MobileTimelineList.tsx` (+test), `apps/mobileTimelinePaging.ts`, `apps/usePendingRequestCounts.ts` (+test), if the rewrite replaces them.

**Read first:** Spec W6; `.agents/skills/sync-state-invariants/SKILL.md`; `.agents/skills/locale-ui-patterns/SKILL.md`; `.agents/skills/performance-engineering/SKILL.md`; `packages/mobile/README.md`; `.workflow/done/upstream-refresh/24-ui-integration-hooks-apps.md` "Kept at the fork's version" and "Deferred from upstream by its own missing owner"; task 31.
**Covers:** W6

**Check:** `bun install --frozen-lockfile` and `bun run type-check` and `bun run lint` and `bun run test` all exit 0, the mobile sheet tests pass, and in the running app's mobile viewport (or the Capacitor web bundle) the sheet opens one view, switches sections, shows work rows and opens a chat. Real path: mobile web surface against the dev server; a physical device is not available, so the device limit is recorded.

## Done when

- [ ] `MobileSessionsSheet` renders the task 31 one-view rows; no separate expansion/tree sheet remains.
- [ ] `mobileSessionFields` is on the canonical session shape (no `@/lib/opencode/model`); `mobileSidebar/*` modules are adopted and consumed.
- [ ] The rewritten sheet does not consume `MobileTimelineList`, `mobileTimelinePaging` or `usePendingRequestCounts`; those fork helpers are deleted or the reason they stay is recorded.
- [ ] The sheet keeps its permission/focus boundaries and does not add a second sidebar state model.
- [ ] Session pins stay on task 25's deferred contract; no fake pin source is added.

## Progress

Planned by the 2026-10-27 amendment from task 24's deferral. Task 24 kept the fork sheet because the desktop one-view model had no owner; this task consumes task 31's model.
