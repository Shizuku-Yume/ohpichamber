# 27: Write a reproducible OMP vendor upgrade runbook

**Effort:** post-m3-hardening
**Task type:** feature
**Base commit:** <commit-sha>

**Delivers:** A runbook that reproduces the current `vendor/omp/c9de2b02` pin (tarball hashes, patches, dependency owners, root overrides) from its source revision, and describes how to bump it.

**Blocked by:** None
**Files:** `vendor/omp/c9de2b02/README.md`; `copy-manifest.json`; `dependency-owners.json`; `patches/`; root `package.json` overrides and `patchedDependencies`

**Read first:** `.workflow/specs/post-m3-hardening.md`; `.workflow/omp-migration/m0/source-install.json`; `.workflow/development.md` "OMP source preparation" and the patched-dependency paragraph
**Covers:** H15

**Check:** Following the runbook from the pinned source archive regenerates tarballs whose hashes match `copy-manifest.json`, and `bun install --frozen-lockfile` passes. If the source archive is not reachable without network, the runbook is checked step by step against the existing inputs and that limit is stated.

## Done when

- [ ] The bump procedure names which checks must be rerun (agent-service suite, gate, packaged smoke).
- [ ] Network use needs the maintainer's permission.
