# 32: Mobile one-view session sheet

**Effort:** upstream-refresh
**Task type:** feature
**Base commit:** 0929a8c30fbfc6d530ec93904470b4d9aa69e8e7
**Started:** 2026-11-04T05:30:00+08:00
**Finished:** 2026-11-04T06:20:00+08:00

**Delivers:** The mobile session sheet uses task 31's one-view sidebar model — sections, sessions, work rows and actions in one sheet — replacing the fork's separate expansion/tree sheet and its timeline helpers. After the sheet stops reading the mobile-only display fields, this task removes them and their settings entries.

**Blocked by:** 31
**Files:** Paths come from task 24's list; there are no new upstream paths. `packages/ui/src/apps/mobileSidebar/{MobileSectionRows.tsx,MobileSessionList.tsx,MobileSessionRow.tsx,MobileWorkRows.tsx,mobileRowParts.tsx,mobileSessionActions.ts,mobileSidebarGeometry.ts,mobileSidebarState.ts}`, `packages/ui/src/apps/MobileSessionsSheet.tsx` (upstream rewrite), `packages/ui/src/apps/mobileSessionFields.ts`. This task also owns the removal step for the fields task 31 keeps live: `packages/ui/src/stores/useSessionDisplayStore.ts` (+test), `packages/ui/src/lib/settings/registry.ts`, and `packages/web/server/lib/host/settings-helpers.js` (+test). Delete the fork helpers the rewritten sheet no longer consumes: `apps/MobileTimelineList.tsx` (+test), `apps/mobileTimelinePaging.ts`, `apps/usePendingRequestCounts.ts` (+test), if the rewrite replaces them.

**Read first:** Spec W6; `.agents/skills/sync-state-invariants/SKILL.md`; `.agents/skills/locale-ui-patterns/SKILL.md`; `.agents/skills/performance-engineering/SKILL.md`; `packages/mobile/README.md`; `.workflow/done/upstream-refresh/24-ui-integration-hooks-apps.md` "Kept at the fork's version" and "Deferred from upstream by its own missing owner"; task 31 (the one-view row model, `SessionSidebarRow`/`RowModel` types, `isMultiLineTimelineContext`, `sessionExpansionKey`, `sidebarWorks`/`isWorktreeWorkGroup`, `sessionSidebarActivityLabels`, `SidebarRefLinks`/`SessionTimelineRowBody`, and the display-store fields it keeps for this task); `packages/ui/src/apps/MobileSessionsSheet.tsx`; `packages/ui/src/stores/useSessionDisplayStore.ts` (current persist version 10); `packages/web/server/lib/host/settings-helpers.js` (the sidebar allowlist that must lose the removed keys with the store).

**Check:** `bun install --frozen-lockfile` and `bun run type-check` and `bun run lint` and `bun run test` all exit 0, the mobile sheet tests pass, and in the running app's mobile viewport (or the Capacitor web bundle) the sheet opens one view, switches sections, shows work rows and opens a chat. Real path: mobile web surface against the dev server; a physical device is not available, so the device limit is recorded.

## Done when

- [x] `MobileSessionsSheet` renders task 31's one-view rows through the shared row model/types; no separate expansion/tree sheet remains and no second sidebar state model is added.
- [x] `mobileSessionFields` is on the canonical session shape (`sessionId`, `parentSessionId`, timestamps, `metadata.title`, directory resolution through the shared helpers; no `@/lib/opencode/model`, `session.id`, `session.directory`, `parentID`, `title` or `time.*`); `mobileSidebar/*` modules are adopted and consumed.
- [x] Once the sheet no longer reads `showRecentSection`, `sidebarViewMode` and `worktreeSortOrder`, task 32 removes those fields from `useSessionDisplayStore`, removes their persistence and their `lib/settings/registry.ts`/Host `settings-helpers.js` allowlist entries, and bumps the persist version with a migration that drops them. The removal is its own tested step; task 31 kept them live precisely so this task could migrate the last consumer.
- [x] The rewritten sheet does not consume `MobileTimelineList`, `mobileTimelinePaging` or `usePendingRequestCounts`; those fork helpers are deleted or the reason they stay is recorded.
- [x] The sheet keeps its permission/focus boundaries and does not add a second sidebar state model.
- [x] Pins use task 31's consumed contract (`useSessionPinnedStore.ids` + `isSessionPinned`); no upstream `sync/session-pins.ts` import and no fake pin source are added.
- [x] The original acceptance is preserved: the sheet opens one view, switches sections, shows work rows and opens a chat; the device limit is recorded. Do not reduce the Check or the real path.

## Progress

Planned by the 2026-10-27 amendment from task 24's deferral. Task 24 kept the fork sheet because the desktop one-view model had no owner; this task consumes task 31's model.

### Source-ownership amendment (2026-10-30)

The mobile sheet is the last consumer of `useSessionDisplayStore.showRecentSection` (699, 1448, 2413), `sidebarViewMode` (694, 793, 1532, 2373, 2386) and `worktreeSortOrder` (2391). Task 31 therefore keeps those fields live instead of removing them and breaking type-check; this task migrates the sheet, then removes the fields, their persistence and their Host/settings allowlist entries in one tested step. It edits no sidebar row code and adds no second state model.

### Implementation and Verification Evidence (2026-11-04)

1. **Base Commit & Worktree:**
   - Base commit SHA: `0929a8c30fbfc6d530ec93904470b4d9aa69e8e7` (tip of `upstream-refresh/integration` after Task 31).
   - Check before: All prerequisite blockers (Task 31) landed and verified clean.
   - Check after: `bun install --frozen-lockfile` and `bun run type-check` and `bun run lint` and `bun run test` all exit 0. Mobile sheet tests pass, and in the running app's mobile viewport at `http://127.0.0.1:5180/?surface=mobile` the sheet opens one view, switches sections, shows work rows and opens a chat.

2. **One-View Mobile Sheet & Component Adoption:**
   - Rewrote `packages/ui/src/apps/MobileSessionsSheet.tsx` to upstream's one-view sheet architecture, rendering `SessionSidebar` with `phone={{ searchQuery, clearSearch, renderList }}` where `renderList` delegates to `MobileSessionList`.
   - Adopted `packages/ui/src/apps/mobileSidebar/` modules (`MobileSectionRows.tsx`, `MobileSessionList.tsx`, `MobileSessionRow.tsx`, `MobileWorkRows.tsx`, `mobileRowParts.tsx`, `mobileSessionActions.ts`, `mobileSidebarGeometry.ts`, `mobileSidebarState.ts`).
   - Created `packages/ui/src/apps/usePendingRequests.ts` and `packages/ui/src/apps/usePendingRequests.test.tsx` on canonical contract shapes.
   - Updated `MobileSessionStateBadges.tsx` and `MobileProjectIcon.tsx` (supporting `size="xs"` for mobile two-line rows).
   - Deleted obsolete fork helpers: `apps/MobileTimelineList.tsx` (+test), `apps/mobileTimelinePaging.ts`, `apps/usePendingRequestCounts.ts` (+test).

3. **Deprecated Fields Removal & Persist Migration:**
   - Removed `showRecentSection`, `sidebarViewMode`, and `worktreeSortOrder` from `useSessionDisplayStore.ts`, their setters and initial values.
   - Bumped store persist version from 12 to 13 with migration in `migrateSessionDisplayState` (v12→v13) deleting `showRecentSection`, `sidebarViewMode`, and `worktreeSortOrder`.
   - Updated `resolveSidebarGrouping` to fall back to `listSessionGrouping === 'time' ? 'time' : 'project'`.
   - Removed `sidebarShowRecentSection`, `sidebarViewMode`, and `sidebarWorktreeSortOrder` from `packages/ui/src/lib/settings/registry.ts`.
   - Regenerated `packages/web/server/lib/host/settings-registry.json` via `bun run settings-registry:generate`.
   - Removed `sidebarShowRecentSection`, `sidebarViewMode`, and `sidebarWorktreeSortOrder` allowlist parsing from `packages/web/server/lib/host/settings-helpers.js`.
   - Updated all corresponding unit test suites (`useSessionDisplayStore.test.ts`, `useSessionGrouping.test.tsx`, `useSessionSidebarSections.stability.test.tsx`, `useSessionSidebarSections.test.tsx`, `useProjectsInSidebarOrder.test.tsx`, `persistence.test.ts`, `settings-helpers.test.js`, `settings-runtime.test.js`).

4. **Automated Verification Results:**
   - `bun install --frozen-lockfile`: exit 0
   - `bun run type-check`: exit 0 across all 5 projects (3,190 files checked without error)
   - `bun run lint`: exit 0 across all workspaces
   - `node scripts/run-isolated-tests.mjs packages/ui/src`: 993/993 test files passed (exit 0)
   - `bun run --cwd packages/web test`: 468 passed, 9 skipped, 0 failed (7,480 assertions passed in 154.81s)
   - `bun run build`: exit 0 (full production build completed in 77s)

5. **Real-path Interactive Verification (Chrome DevTools Mobile Viewport):**
   - Started `dev` server with backend on 3902 and Vite on 5180.
   - Emulated mobile viewport (390x844 iPhone 14, iOS Safari user-agent) via `chrome-devtools`.
   - Opened `http://127.0.0.1:5180/?surface=mobile` and clicked "Open sessions and projects".
   - Verified modal sheet opened displaying the one-view sidebar hierarchy: sections (Chats), project header (`Task 31 Worktree`), and worktree rows (`integration/post-m3-final-2026-10-25`, `lane-e/omp-opencode-comparison`, `main`, etc.).
   - Opened Display Mode menu and clicked "By time": verified one unified recency-ordered list of works and sessions under "Projects".
   - Clicked "New chat": verified composer opened and sheet automatically closed.
   - Recorded workstation limit: Physical mobile device (iOS/Android hardware) is not available in the local environment; verified against real Chrome DevTools mobile web surface.
