# 19: Verify installable SDK identity and default auth paths

**Effort:** omp-through-m3
**Task type:** spike
**Base commit:** <commit-sha>

**Delivers:** Answer to whether the installable OMP dependency matches the pinned source used by accepted M0 probes, and where default/XDG AuthStorage resolves independently of explicit overrides.

**Blocked by:** None
**Files:** `scripts/omp-m0/`, `.workflow/omp-migration/m0/sdk-install-identity.json`, `.workflow/omp-migration/m0/auth-paths.json`

**Read first:** `.workflow/specs/omp-through-m3.md` M0; `scripts/omp-m0/envelope.mjs`; `.workflow/omp-migration/m0/source-identity.json`; `scripts/omp-m0/capabilities.mjs` auth probe; OMP `packages/utils/src/dirs.ts`
**Covers:** W1

**Check:** In an isolated temporary HOME, compare the selected published package and its dependency/native-addon resolution with the pinned source identity. Run no-argument `getAgentDbPath()` with default and XDG environments in fresh processes, then compare explicit override separately. Record hashes, package entrypoints, redacted path labels and observed behavior in sanitized artifacts. Missing or different SDK bytes mean existing probes cannot be reused for that installable dependency without resolving the difference.

- [ ] Limit the spike to one pinned dependency comparison and the default/XDG/override path cases. Do not add the application dependency here.
- [ ] Record version, source identity and relevant entrypoint/dependency differences without equating matching version numbers with matching source.
- [ ] Avoid real user AuthStorage and credentials; prove isolated default paths and database ownership.
- [ ] State whether prior M0 artifacts can cover the selected dependency, and enumerate only invalidated probes if not.
- [ ] Remove throwaway scaffolding, retaining the sanitized evidence and findings. Leave required unknowns unresolved rather than relabeling them.
