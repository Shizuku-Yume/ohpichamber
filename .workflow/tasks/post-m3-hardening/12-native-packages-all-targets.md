# 12: Find a native-package source for every release target

**Effort:** post-m3-hardening
**Task type:** spike
**Base commit:** <commit-sha>

**Delivers:** Answer to: how does each release target (macOS arm64/x64, Windows x64/arm64, Linux arm64) get an OMP native package that matches the pinned source? Includes a recommendation and the drafted vendoring task.

**Blocked by:** None
**Files:** `vendor/omp/c9de2b02/` (`README.md`, `copy-manifest.json`, `dependency-owners.json`, tarballs); root `package.json` lines 173-186; `packages/electron/scripts/prepare-agent-runtime.mjs` (93-118)

**Read first:** `.workflow/specs/post-m3-hardening.md`; `.workflow/omp-migration/m0/source-install.json`; `.workflow/omp-migration/m0/sdk-install-identity.json`; `.workflow/development.md` "Guest Shell and installable SDK evidence"; `.workflow/spike-tasks.md`
**Covers:** H8

**Check:** `## Findings` states, per target, the proposed source (registry prebuilt pinned by integrity, or a build from pinned Rust source), how identity is proven, and what was not verifiable here; the follow-up vendoring task is drafted after the maintainer answers spec open question 5.

## Done when

- [ ] Network access to fetch registry metadata or binaries is used only with the maintainer's permission; otherwise the finding says what it would need.
- [ ] Time box: one pass over the vendored inputs plus one identity comparison per target that can be reached.
