# 13: Replace Web/Electron agent data access with the Canonical Client

**Effort:** omp-through-m3
**Task type:** refactor
**Base commit:** <commit-sha>

**Delivers:** Web and Electron UI agent data access uses one Canonical Client/Host Gateway boundary with shared sync bootstrap, reconnect and runtime switching; no new UI path imports OpenCode SDK/schema clients.

**Blocked by:** 23
**Files:** `packages/ui/src/`, `packages/web/`, `packages/electron/`, canonical client package and sync documentation/tests

**Read first:** `.workflow/specs/omp-through-m3.md` M3/W7/W8; UI API and sync-state skills; `packages/ui/src/sync/DOCUMENTATION.md`; `packages/ui/src/stores/DOCUMENTATION.md`; `packages/ui/src/sync/sync-context.tsx`; `packages/ui/src/lib/opencode/client.ts`; contracts and Host Gateway architecture
**Covers:** W7, W8

**Check:** `node scripts/run-isolated-tests.mjs packages/ui/src/sync` plus focused Canonical Client tests and a temporary connected client/service scenario → bootstrap/reconnect/runtime switching handles snapshot/cursor and stale responses correctly; fetch failure preserves prior authoritative state. Run changed-source oxlint and owner type-check once at integration. Do not use a full UI run that cannot compile until the dependent record consumers land.

- [ ] Implement one transport-facing Canonical Client for Web and Electron consumers.
- [ ] Migrate sync context, client helpers, session stores/actions and global state without an OpenCode-shaped adapter.
- [ ] Preserve host-owned RuntimeAPIs, runtimeFetch and realtime transport where they are not agent data access.
- [ ] Define cursor bootstrap/reconnect and runtime-switch reset behavior in the owning sync module.
- [ ] Remove obsolete agent client exports/imports after all callers move.
