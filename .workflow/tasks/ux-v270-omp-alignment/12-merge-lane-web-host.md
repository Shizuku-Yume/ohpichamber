# 12: Resolve the merge in the Web Host and CLI

**Effort:** ux-v270-omp-alignment
**Blocked by:** 11
**Covers:** W1, W2
**Files:** `packages/web/**`
**Read first:** spec "How it is built" (Merge); `merge-lanes.tsv` lane 12; `packages/web/server/lib/host/DOCUMENTATION.md`; `packages/web/server/lib/opencode/RUNTIME_NOTES.md`; skills `ui-api-decoupling`, `enterprise-boundary`, `openchamber-change-discipline`
**Check:** in a worktree on the scaffold branch, `bun scripts/upstream-drift.mjs --markers --lane 12` → 0; `VITEST_MAX_WORKERS=2 bunx vitest run packages/web/server packages/web/bin` → exit 0; `bun scripts/upstream-drift.mjs --check -- packages/web` → 0 `unexplained`

- [ ] Resolve the 263 conflicted paths. Upstream wins unless the fork delta is OMP-boundary or recorded in a decision. Upstream changes to host-owned modules the fork relocated from `server/lib/opencode/` to `server/lib/host/` are applied to the relocated files. Changes to OpenCode-engine paths stay excluded.
- [ ] In auto-merged lane files, cut over any reintroduced OpenCode SDK or engine call to the Canonical API or Host owner.
- [ ] Every remaining fork-differs path in lane 12 is classed `omp-boundary` or has an `upstream-deltas.tsv` row; nothing stays `unexplained`.
- [ ] Deletes: fork copies of host modules that upstream now provides unchanged, and fork-only server code an upstream replacement supersedes.
