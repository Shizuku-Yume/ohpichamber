# 04: Give the Agent Service and workers an allowlisted environment

**Effort:** post-m3-hardening
**Task type:** bugfix
**Base commit:** f72010e3e
**Started:** 2026-10-23T12:49:03+08:00
**Status:** active

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

## Progress

Dirty at start: none.

Check before (worktree detach at `f72010e3e` with the new tests copied in):
- `bun test packages/agent-service/src/supervisor/workers.environment.test.ts` → 0 pass / 1 fail; the real worker's `env` contained `OPENCHAMBER_UI_PASSWORD=sentinel`.
- `bun run --cwd packages/web test -- server/lib/host/agent-service-supervisor.environment.test.js` → 2 tests failed; `/proc/<pid>/environ` of the real service contained the sentinels and the generated token.

Check after (this branch):
- Worker shell test → 1 pass / 0 fail / 13 expects.
- Supervisor env suite → 2 pass / 0 fail, including a real `packages/agent-service/src/index.ts` start and `/proc/<pid>/environ` inspection.
- Credential strategy: workers inherit no ambient provider credentials. The Host-authorized directory overlay and OMP `AuthStorage` are the supported sources; the overlay cannot override `OHPICHAMBER_INTERNAL_SECRET`, `OPENCHAMBER_MANAGED_PROCESS_TOKEN` or `PI_CODING_AGENT_DIR`.
- Env-only provider evidence: settings user variables and project variables are the directory overlay (`packages/web/server/lib/environment/runtime.js:124-131,246-263`), the Host passes that overlay to workspace admission (`packages/web/server/lib/host/agent-runtime.js:60-64`), and workers receive it as `input.env` (`packages/agent-service/src/supervisor/workers.ts`). The pinned SDK resolves provider credentials from env (`pi-ai` `envKeys`), so values configured through OpenPCHamber still reach workers; only ambient shell exports are intentionally not inherited.
- Standalone start contract: removed the misleading `packages/agent-service` `start` script. The service is Host-spawned only; an IPC-less start exits 1 without listening.
- Scope limit: this removes environment leakage. It is not a claim of isolation from same-UID `/proc` memory access, ptrace, or a compromised Host.
