# 24: UI integration: hooks, API, apps

**Effort:** upstream-refresh
**Task type:** refactor
**Base commit:** <commit-sha>

**Delivers:** The UI's hooks, runtime API clients, app shells (web/desktop/mobile) and shared types adopt upstream's fixes while keeping the fork's runtime switching.

**Blocked by:** 02, 23
**Files:** Path list: `/home/shizuku/Project/ohpichamber-omp-artifacts/upstream-sync-2026-10-27/plan-paths/24.tsv` (118 paths: 75 clean/new, 37 both-side, 23 conflicts). Main locations: `packages/ui/src/{hooks,api,apps,contexts,types,lib/api}`, `App.tsx`, `main.tsx`.

**Read first:** Spec W6; `.agents/skills/ui-api-decoupling/SKILL.md`; `.agents/skills/desktop-shell/SKILL.md` (desktop app shell); `.agents/skills/sync-state-invariants/SKILL.md`.
**Covers:** W6

**Check:** `bun install --frozen-lockfile` and `bun run type-check` and `bun run lint` and `bun run test` all exit 0, the hook/API tests pass, and in the running app runtime switching, the desktop shell and the mobile shell entrypoints load the refreshed UI. Real path: switch runtimes and open the mobile web surface.

## Done when

- [ ] Runtime switching keeps its checked target and does not destroy a live tunnel.
- [ ] API hooks use `RuntimeAPIs`/`runtimeFetch`; no direct provider calls from components.
- [ ] App shells load the same UI bundle and keep their entrypoints.
