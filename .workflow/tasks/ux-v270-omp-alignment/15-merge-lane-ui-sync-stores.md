# 15: Resolve the merge in sync, stores and the UI API layer

**Effort:** ux-v270-omp-alignment
**Blocked by:** 11
**Covers:** W1, W2
**Files:** `packages/ui/src/sync/**`; `packages/ui/src/stores/**`; `packages/ui/src/api/**`
**Read first:** spec "How it is built" (Merge); `merge-lanes.tsv` lane 15; `packages/ui/src/sync/DOCUMENTATION.md`; `packages/ui/src/stores/DOCUMENTATION.md`; skills `sync-state-invariants`, `ui-api-decoupling`
**Check:** in a worktree on the scaffold branch, `bun scripts/upstream-drift.mjs --markers --lane 15` → 0; `bun run --cwd packages/ui type-check` reports no error in lane paths; `bun scripts/upstream-drift.mjs --check -- packages/ui/src/sync packages/ui/src/stores` → 0 `unexplained`

- [ ] Resolve the conflicted paths with the merge rule. The Canonical Client event model and Host session authority stay; upstream's store fields, settings-search ids, queue and eviction fixes are adopted onto it.
- [ ] Where upstream changes event translation the fork replaced (`lib/opencode/events.ts` era), record the fork's canonical replacement in `upstream-deltas.tsv` with the decision that retired it.
- [ ] Do not change hydration or reducer semantics here; task 22 owns that cutover.
- [ ] Deletes: fork store fields that upstream removed and no fork caller still needs.
