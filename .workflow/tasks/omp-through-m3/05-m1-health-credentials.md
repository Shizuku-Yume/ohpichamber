# 05: Add host health and explicit credential-handoff preflight

**Effort:** omp-through-m3
**Task type:** feature
**Base commit:** <commit-sha>

**Delivers:** Host canonical health/capabilities and authenticated explicit user intent/provider-specific credential preflight. Absent real Agent Service is unavailable, not imported; actual SDK handoff acceptance remains task 22 before M2 gate 23.

**Blocked by:** 04
**Files:** `packages/web/server/index.js`, `packages/web/server/lib/host/`, `packages/web/server/lib/ui-auth/`, host route tests and documentation

**Read first:** `.workflow/specs/omp-through-m3.md` M1/W2; `contracts.md` health/errors and architecture credential boundary; existing auth route and server startup patterns; host module docs
**Covers:** W2

**Check:** `bun test packages/web/server/lib/host packages/web/server/lib/ui-auth` → authenticated health/capabilities omit secrets/absolute paths; explicit preflight distinguishes unsupported/re-auth-required/unavailable providers, refuses absent service without reading/staging secrets and never reports imported. Actual imported/write/read-reload outcomes are preserved in task 22, not waived.

- [ ] Add host-owned health/readiness/capability composition with explicit unavailable agent state.
- [ ] Keep external authentication and internal service authentication as separate checks.
- [ ] Implement authenticated explicit user intent and only the provider-specific preflight fields verified by M0; no Node SDK AuthStorage writes or ad-hoc migration worker.
- [ ] Return truthful unsupported/re-auth-required/unavailable preflight results. With service absent, do not fetch/stage credential secrets or claim imported; actual handoff belongs to task 22 and gate 23.
- [ ] Ensure startup never scans/imports legacy credentials and preflight persists no secret staging records.
