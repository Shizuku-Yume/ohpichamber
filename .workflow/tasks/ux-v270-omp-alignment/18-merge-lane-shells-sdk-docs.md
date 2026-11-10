# 18: Resolve the merge in Electron, mobile, SDK, extensions, docs and scripts

**Effort:** ux-v270-omp-alignment
**Blocked by:** 11
**Covers:** W1, W2
**Files:** `packages/electron/**`; `packages/mobile/**`; `packages/sdk/**`; `packages/extensions/**`; `packages/docs/**`; `scripts/**` (except `scripts/upstream-drift*`); root docs and `Dockerfile`
**Read first:** spec "How it is built" (Merge); `merge-lanes.tsv` lane 18; `packages/electron/README.md`; `packages/sdk/DOCUMENTATION.md`; skills `desktop-shell`, `openchamber-change-discipline`
**Check:** in a worktree on the scaffold branch, `bun scripts/upstream-drift.mjs --markers --lane 18` → 0; `bun --cwd packages/sdk test` and `bun --cwd packages/electron test` → exit 0; `bun run docs:validate` → exit 0

- [ ] Resolve the conflicted paths with the merge rule. The Guest SDK keeps its `v: 2` bootstrap, Electron keeps the in-process Host and Agent Service staging, and product docs take upstream content with OMP corrections only where behavior differs.
- [ ] Root `README.md`, `AGENTS.md`, `SECURITY.md`, `CONTRIBUTING.md` and `CHANGELOG.md` keep the fork's text (standing rule for fork guidance and the changelog gate).
- [ ] Deletes: docs pages for retired VS Code or OpenCode surfaces that upstream changed.
