# 25: MCP scopes keep the user's existing configuration and credentials

**Effort:** ux-feedback-2026-11-12
**Task type:** bugfix
**Blocked by:** 05
**Covers:** W5
**Files:** `packages/agent-service/src/worker/mcp.ts`; `packages/agent-service/src/supervisor/catalog.ts`; `packages/ui/src/stores/useMcpConfigStore.ts`; `packages/ui/src/components/views/IntegrationsCatalogView.tsx`
**Read first:** independent review `/home/shizuku/Project/ohpichamber-omp-artifacts/ux-feedback-2026-11-13/independent-review/Review05.md` (all seven findings); `.workflow/done/ux-feedback-2026-11-12/05-*.md`; OMP's MCP config loader in the pinned package; skills `enterprise-boundary`, `sync-state-invariants`, `ui-api-decoupling`
**Check:** the agent-service MCP tests run against real files in a temp `HOME`. They must show that:
**Base commit:** 81e48cd715c2525dad96b3bd360a370063ac5f67
**Status:** active

- Saving a project server leaves a pre-existing user `mcp.json` byte-identical, except for the entry being edited. This includes native `env`, `headers`, `auth`, `oauth` and enable overrides, and a global server shadowed by a project server.
- OAuth status and authorization work for a user-scoped server.
- User-scope credential references survive a reread and are visible from a second session.
- A save with no live worker reports a saved-but-untested state, or probes through the stateless MCP path.

The UI tests must show that a `saved-not-connected` result refreshes the mutation baseline, so the next edit is not rejected with `CATALOG_CONFLICT`, and that an unread Settings directory shows no other workspace's servers. All tests exit 0.

Real path (Web, isolated `HOME` pre-seeded with a user `mcp.json` containing headers and env):
- install Figma at user scope;
- complete sign-in, or reach "sign-in required";
- reinstall, and confirm there is no false success and no create error;
- confirm the pre-seeded entries are unchanged.

Save screenshots and the before/after `mcp.json` in `/home/shizuku/Project/ohpichamber-omp-artifacts/ux-feedback-2026-11-13/task25/`.

- [x] Use a scope-specific, locked read-modify-write that preserves untouched native entries and fields.
- [ ] Pass `userConfigPath` through the OAuth persistence checks. (Code done; no test at WorkerMcp level; not run on the real path.)
- [x] Store user-scope credential mappings durably.
- [x] Report connectivity honestly when no worker is running.
- [ ] Track an explicit per-server state for "authentication required", and keep "retry configure" separate from "create". (Code done; no DOM test of the install branch; not run on the real path.)
- [x] Restore the stable empty fallback for directories that have not been read yet.

## Progress

- **Check before:** Review05 findings 1-7 open on base; worker/catalog/store/view code as on base.
- **Check after:**
  - `bun test src/worker/mcp.test.ts src/supervisor/catalog-mcp.test.ts` (agent-service): 18 pass, 0 fail. Temp-HOME tests prove a project save leaves the seeded user `mcp.json` byte-identical, a shadowed global server survives a user edit with env/headers/enabledServers kept, and user credential refs survive reread and a second read.
  - `bun test src/stores/useMcpConfigStore.test.ts` (ui): 8 pass, 0 fail. Covers the saved-not-connected baseline refresh (no CATALOG_CONFLICT on the next edit) and the unread-directory isolation.
  - `bun test src/components/views/IntegrationsCatalogView.test.tsx` (ui): 9 pass, 0 fail.
  - Combined UI MCP batch: 37 pass, 8 fail. The same 8 fail on base 81e48cd (cross-file leakage when run in one process), so they are not new. Logs in artifacts `task25/`.
  - `bunx oxlint` on changed TS files: exit 0, no findings.
  - `bun run --cwd packages/agent-service build`: exit 0.
  - Real path: NOT completed. The Web host on 4125 starts, and `GET /auth/session` plus `POST /api/openchamber/directory` work. The Agent Service phase stays `failed` ("readiness timed out", worker "initialization failed (SERVICE_UNAVAILABLE)") under the isolated HOME, even with `OHPICHAMBER_BUN` and an explicit `OHPICHAMBER_AGENT_SERVICE_ENTRYPOINT`. The worker stderr is not logged, so the cause is unknown. No Figma install, sign-in, or reinstall was observed. Evidence: `task25/web-server.log`, `task25/01-add-project.json`, `task25/mcp-before.json` (seeded file).
- **Review:** not run (per director instruction: no self-review; independent review not performed in this run).
