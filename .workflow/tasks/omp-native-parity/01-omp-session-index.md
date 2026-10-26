# 01: List sessions and titles from OMP storage

**Effort:** omp-native-parity
**Task type:** bugfix
**Base commit:** <commit-sha>

**Delivers:** The sidebar lists a directory's OMP sessions from OMP's own storage, including sessions created by the `omp` CLI, with OMP's titles. New chats get OMP's generated title; an app rename writes the OMP title.

**Blocked by:** None
**Files:** `packages/agent-service/src/sessions/references.ts`, `packages/agent-service/src/sessions/registry.ts` (list path), Agent Service session list route, `packages/web/server/lib/openchamber-sessions/routes.js` (list, rename), Host metadata title handling, `packages/ui/src/lib/sessionTitle.ts`, sidebar session list loading; OMP `SessionManager` (`setSessionName`, `listForPicker`) and `session-listing.ts` `listRecentSessions` in the pinned package.

**Read first:** spec "Sessions come from OMP storage"; `packages/ui/src/sync/DOCUMENTATION.md`; `.workflow/omp-migration/contracts.md` session list sections.
**Covers:** W1

**Check:** Before: with a session created by `omp -p` in a test directory (isolated OMP agent dir), the Agent Service list omits it and titles are null. After: an Agent Service test lists it with its OMP title; a Host route test shows rename writes the JSONL title line; a UI test shows OMP titles, not `generateSessionTitle` output.

- [ ] Agent Service lists from OMP storage with OMP's listing code; no worker starts.
- [ ] Reference file keeps only non-OMP facts; unreferenced JSONL still listed.
- [ ] OMP title generation runs for new app chats; UI heuristic removed if unused.
- [ ] Rename goes through OMP `setSessionName`.
