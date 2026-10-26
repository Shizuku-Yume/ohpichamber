# 23: UI state: sync and stores

**Effort:** upstream-refresh
**Task type:** refactor
**Base commit:** <commit-sha>

**Delivers:** The UI sync layer and stores adopt upstream's state fixes while keeping the fork's canonical OMP data model; behavior stays the same except where a feature task consumes a new field.

**Blocked by:** 02
**Files:** Path list: `/home/shizuku/Project/ohpichamber-omp-artifacts/upstream-sync-2026-10-27/plan-paths/23.tsv` (149 paths: 63 clean/new, 79 both-side, 57 conflicts). Main locations: `packages/ui/src/sync/`, `packages/ui/src/stores/`.

**Read first:** Spec W6; `.agents/skills/sync-state-invariants/SKILL.md` (canonical owner); `.agents/skills/ui-api-decoupling/SKILL.md`; `packages/ui/src/sync/DOCUMENTATION.md`; `packages/ui/src/stores/DOCUMENTATION.md`.
**Covers:** W6

**Check:** `bun install --frozen-lockfile` and `bun run type-check` and `bun run lint` and `bun run test` all exit 0, the sync/store tests pass before and after with the same behavior, and in the running app a reconnect with an unchanged snapshot, a stale generation and an optimistic send reconcile as before. Real path: kill and restart the Host while a chat is open.

## Done when

- [ ] Stale-generation rejection, auth-expiry suspension and optimistic replacement keep their invariants.
- [ ] Upstream state fields are adopted only where they have an OMP source; no OpenCode-shaped field is faked.
- [ ] Persisted selections stay narrow and versioned.
- [ ] No polling loop or cache is added beyond the documented ones.
