# 25: MCP scopes keep the user's existing configuration and credentials

**Effort:** ux-feedback-2026-11-12
**Task type:** bugfix
**Blocked by:** 05
**Covers:** W5
**Files:** `packages/agent-service/src/worker/mcp.ts`; `packages/agent-service/src/supervisor/catalog.ts`; `packages/ui/src/stores/useMcpConfigStore.ts`; `packages/ui/src/components/views/IntegrationsCatalogView.tsx`
**Read first:** independent review `/home/shizuku/Project/ohpichamber-omp-artifacts/ux-feedback-2026-11-13/independent-review/Review05.md` (all seven findings); `.workflow/done/ux-feedback-2026-11-12/05-*.md`; OMP's MCP config loader in the pinned package; skills `enterprise-boundary`, `sync-state-invariants`, `ui-api-decoupling`
**Check:** the agent-service MCP tests run against real files in a temp `HOME`. They must show that:
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

- [ ] Use a scope-specific, locked read-modify-write that preserves untouched native entries and fields.
- [ ] Pass `userConfigPath` through the OAuth persistence checks.
- [ ] Store user-scope credential mappings durably.
- [ ] Report connectivity honestly when no worker is running.
- [ ] Track an explicit per-server state for "authentication required", and keep "retry configure" separate from "create".
- [ ] Restore the stable empty fallback for directories that have not been read yet.
