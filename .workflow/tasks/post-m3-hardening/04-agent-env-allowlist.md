# 04: Give the Agent Service and workers an allowlisted environment

**Effort:** post-m3-hardening
**Task type:** bugfix
**Base commit:** <commit-sha>

**Delivers:** Agent tools can no longer read Host secrets or the internal service token from their environment, and real provider prompts still work.

**Blocked by:** None
**Files:** `packages/web/server/lib/host/agent-service-supervisor.js` (spawn at lines 225-242); `packages/agent-service/src/supervisor/workers.ts` (`workerEnvironment`, lines 216-220; spawn at 277-281); the service-side reader of the internal secret

**Read first:** `.workflow/specs/post-m3-hardening.md`; `/home/shizuku/Project/ohpichamber-omp-artifacts/post-m3-review-2026-10-23/``HostReview2.md` and `AgentServiceReview.md` finding 1; `.workflow/omp-migration/architecture.md` (environment overlays, ADR-03); `.agents/skills/enterprise-boundary/SKILL.md`; `packages/web/server/lib/host/DOCUMENTATION.md` if present
**Covers:** H3

**Check:** A regression test starts the supervisor with sentinel values for `OPENCHAMBER_UI_PASSWORD`, an unrelated `*_TOKEN` and the internal secret, then reads a worker's environment and the service's `/proc/<pid>/environ` → no sentinel present. It fails before the change. Then the real path: `bun run dev`, send a chat that completes through the provider from `standards.md`.

Root cause at `842a48adc`: `childEnv = { ...process.env, ...env, [SECRET_ENV]: secret, ... }` passes the whole Host environment, and `workerEnvironment` copies `process.env` again, deleting only `OHPICHAMBER_INTERNAL_SECRET`. Same-UID workers can still read the parent's `/proc/<pid>/environ`.

## Done when

- [ ] The supervisor builds the service environment from an explicit allowlist (PATH, HOME, locale, proxy, XDG, required Bun/OMP variables and the directory-scoped overlays the architecture names) instead of `...process.env`.
- [ ] The internal secret reaches the service through a channel worker processes cannot read (IPC or a pipe), not the environment.
- [ ] Which provider credential variables workers legitimately need is decided and documented; the rest are excluded.
- [ ] The security pass (CONVENTIONS §7) runs on the spawn boundary.
