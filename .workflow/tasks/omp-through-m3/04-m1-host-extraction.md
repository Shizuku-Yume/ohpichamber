# 04: Extract host-owned runtime modules

**Effort:** omp-through-m3
**Task type:** refactor
**Base commit:** <commit-sha>

**Delivers:** Host settings, themes, project/network/tunnel, startup/static serving and managed-process ownership live outside the OpenCode integration directory while retained behavior stays unchanged.

**Blocked by:** 03
**Files:** `packages/web/server/index.js`, `packages/web/server/lib/opencode/`, `packages/web/server/lib/host/`, related host tests and module documentation

**Read first:** `.workflow/specs/omp-through-m3.md` M1/W2; `.workflow/omp-migration/scope.md` host extraction list; `packages/web/server/lib/opencode/DOCUMENTATION.md`; `packages/web/README.md`; server composition imports
**Covers:** W2

**Check:** `bun run --cwd packages/web test && bun run type-check:web` → retained host tests and web types pass, and no retained host module imports its old OpenCode path through an alias or re-export.

- [ ] Move only host-owned modules named by the migration scope and update every retained caller.
- [ ] Preserve settings, themes, PWA, project directory, network, login shell, startup/static routes and process cleanup behavior.
- [ ] Keep filesystem, Git, PTY, environment, guest and source-control owners in their existing modules unless their boundary changes.
- [ ] Update nearest module documentation to describe the new owner.
- [ ] Remove dead host path aliases rather than adding compatibility re-exports.
