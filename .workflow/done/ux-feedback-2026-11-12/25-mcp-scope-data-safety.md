# 25: MCP scopes keep the user's existing configuration and credentials

**Effort:** ux-feedback-2026-11-12
**Task type:** bugfix
**Blocked by:** 05
**Covers:** W5
**Files:** `packages/agent-service/src/worker/mcp.ts`; `packages/agent-service/src/supervisor/catalog.ts`; `packages/ui/src/stores/useMcpConfigStore.ts`; `packages/ui/src/components/views/IntegrationsCatalogView.tsx`
**Read first:** independent review `/home/shizuku/Project/ohpichamber-omp-artifacts/ux-feedback-2026-11-13/independent-review/Review05.md` (all seven findings); `.workflow/done/ux-feedback-2026-11-12/05-*.md`; OMP's MCP config loader in the pinned package; skills `enterprise-boundary`, `sync-state-invariants`, `ui-api-decoupling`
**Check:** the agent-service MCP tests run against real files in a temp `HOME`. They must show that:
**Base commit:** 81e48cd715c2525dad96b3bd360a370063ac5f67

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
- [x] Track an explicit per-server state for "authentication required", and keep "retry configure" separate from "create". (View tests: sign-in required from the server's own MCP_AUTH_REQUIRED probe; an OAuth declaration without evidence is not installed; install of an existing server calls updateMcp and not createMcp. Real path verified on port 4125.)
- [x] Restore the stable empty fallback for directories that have not been read yet.

## Progress

- **Check before:** Review05 findings 1-7 open on base; worker/catalog/store/view code as on base.
- **Check after:**
  - `bun test src/worker/mcp.test.ts src/supervisor/catalog-mcp.test.ts` (agent-service): 20 pass, 0 fail. Temp-HOME tests prove a project save leaves the seeded user `mcp.json` byte-identical, adding a shadowing project server leaves global user entries intact, a shadowed global server survives a user edit with env/headers/enabledServers kept, and user credential refs survive reread and a second read.
  - `bun test src/stores/useMcpConfigStore.test.ts` (ui): 8 pass, 0 fail. Covers the saved-not-connected baseline refresh (no CATALOG_CONFLICT on the next edit) and the unread-directory isolation.
  - `bun test src/components/views/IntegrationsCatalogView.test.tsx` (ui): 12 pass, 0 fail.
  - `bunx oxlint` on changed TS files: exit 0, no findings.
  - `bun run --cwd packages/agent-service build`: exit 0.
  - **Real path (completed):** Host on 4125 with isolated `HOME=/tmp/ufb25-home`, `OPENCHAMBER_DATA_DIR=/tmp/ufb25-data`, `OHPICHAMBER_BUN=/home/shizuku/.bun/bin/bun`, built `dist/index.js`, provider env loaded per common.md with `OMP_SOURCE_DIR` unset. The Agent Service reported ready (`{"ready":true,"engine":"omp","version":"1.0.0"}`). Installed Figma at user scope from Integrations catalog; reached "needs auth" / sign-in required state; Authorize button triggers OAuth start; reinstallation attempts cleanly called updateMcp without false success toast or create conflict; seeded entries (`seeded-http` with headers and `seeded-stdio` with env) remained byte-for-byte intact in `/tmp/ufb25-home/.omp/agent/mcp.json`. Evidence saved in `task25/`: `10-scope-dialog-user.png`, `11-after-user-install.png`, `mcp-before.json`, `mcp-after.json`.
- Review: pass (Task25Reviewer passed on round 2; round 1 identified shadowed-global preservation in mcp.ts, fixed and verified).
