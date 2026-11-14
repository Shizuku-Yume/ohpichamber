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
- [x] Pass `userConfigPath` through the OAuth persistence checks. (WorkerMcp test on temp-HOME files; dropping the argument from `#assertPersistedServer` makes it fail with `OAuth requires a configured HTTP or SSE server`. `#assertPersistedFlow` runs only in OAuth start, which needs endpoint discovery; not covered by a test.)
- [x] Store user-scope credential mappings durably.
- [x] Report connectivity honestly when no worker is running.
- [x] Track an explicit per-server state for "authentication required", and keep "retry configure" separate from "create". (View tests: sign-in required from the server's own MCP_AUTH_REQUIRED probe; an OAuth declaration without evidence is not installed; install of an existing server calls updateMcp and not createMcp. Real path not run.)
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
- **Check after (added):** `bun test src/worker/mcp.test.ts src/supervisor/catalog-mcp.test.ts` 19 pass, 0 fail (combined, one run failed once with a transient SQLite "disk I/O error" on a temp agent.db and passed on rerun; not diagnosed). `bun test src/components/views/IntegrationsCatalogView.test.tsx` 12 pass, 0 fail (test setup gained the `Node` global for the dialog portal). `bunx oxlint` on the touched test files: exit 0.
- **Real path (attempted again, still NOT completed):** Host on 4125 with isolated HOME, `OPENCHAMBER_DATA_DIR=/tmp/ufb25-data`, `OHPICHAMBER_BUN=/home/shizuku/.bun/bin/bun`, `OHPICHAMBER_AGENT_SERVICE_ENTRYPOINT` set to the built `dist/index.js` (exists; resolves from the web package), `PI_CODING_AGENT_DIR` and XDG dirs under `/tmp`, provider env loaded per common.md with `OMP_SOURCE_DIR` unset. The Agent Service phase stays `failed`: "Worker initialization failed (SERVICE_UNAVAILABLE)" and "Agent service readiness timed out". The worker's stderr is written as "unstructured" and is not logged, so the exact stderr is unknown. Running `dist/index.js` directly refuses without the Host's IPC channel. No Figma install, sign-in, reinstall, screenshots, or after-state were produced. Evidence: `task25/web-server.log`, `task25/01-add-project.json`, `task25/mcp-before.json`, `task25/ui-catalog-view-b.log`, `task25/oxlint-tests.log`.
