# 05: Add host health and one-time credential handoff

**Effort:** omp-through-m3
**Task type:** feature
**Base commit:** <commit-sha>

**Delivers:** The Host Gateway reports canonical agent readiness/capabilities and exposes a user-triggered, provider-specific credential handoff result without returning secrets or reading legacy configuration at startup.

**Blocked by:** 04
**Files:** `packages/web/server/index.js`, `packages/web/server/lib/host/`, `packages/web/server/lib/ui-auth/`, host route tests and documentation

**Read first:** `.workflow/specs/omp-through-m3.md` M1/W2; `contracts.md` health/errors and architecture credential boundary; existing auth route and server startup patterns; host module docs
**Covers:** W2

**Check:** `bun test packages/web/server/lib/host packages/web/server/lib/ui-auth` → authenticated health/capability responses omit secrets and absolute paths; importer results distinguish imported, unsupported and re-auth-required providers.

- [ ] Add host-owned health/readiness/capability composition with explicit unavailable agent state.
- [ ] Keep external authentication and internal service authentication as separate checks.
- [ ] Implement only the explicit user-triggered importer fields verified by M0.
- [ ] Return per-provider results and fail unsupported formats into re-authentication.
- [ ] Ensure startup does not scan legacy configuration or silently import credentials.
