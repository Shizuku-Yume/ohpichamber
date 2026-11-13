# 05: MCP install scope and honest install status

**Effort:** ux-feedback-2026-11-12
**Blocked by:** None
**Covers:** W5
**Files:** `packages/agent-contract/src/` (MCP schemas); `packages/agent-service/src/supervisor/{catalog,service}.ts`; `packages/agent-service/src/worker/mcp.ts`; `packages/agent-service/src/sessions/registry.ts`; `packages/ui/src/stores/useMcpConfigStore.ts`; `packages/ui/src/components/views/IntegrationsCatalogView.tsx`; `packages/ui/src/components/sections/mcp/{McpGrid,McpPage}.tsx` and the add/edit dialogs
**Read first:** `research/feedback-2026-11-12/02-integrations-remote.md` (item 2); `decisions.md` 2026-11-13 "MCP installs choose project or user scope"; OMP's MCP config loader for the user-scope file; skills `ui-api-decoupling`, `sync-state-invariants`, `locale-ui-patterns`, `enterprise-boundary`
**Check:** `bun test --timeout 15000 src/supervisor src/worker` in `packages/agent-service` and the touched UI tests exit 0, including tests for each install outcome and for scope round-trip. Real path (Web, isolated `HOME`): install Figma from the marketplace at project scope, then at user scope. Each shows "sign-in required", never success and never a bare failure. Settings → MCP lists the server with its scope. A second chat sees the user-scope server. A repeat install shows no success toast.

- [ ] The MCP contract gains `scope: project | user`. User scope reads and writes `~/.omp/agent/mcp.json` in OMP's format; project scope reads and writes `<project>/.omp/mcp.json`.
- [ ] The install flow (marketplace and Settings → MCP) asks for the scope, defaulting to project when a project is selected and to user otherwise.
- [ ] Configure reports `applied | saved-needs-auth | saved-not-connected`. The native error code and detail survive `Promise.allSettled` and `#stage`.
- [ ] "Installed" on the catalog detail page means applied or awaiting auth, read from runtime status. The already-installed path never toasts success.
- [ ] The catalog and Settings → MCP read the same directory (`useSettingsDirectory`).
- [ ] Deletes: the catalog's use of `currentDirectory` for MCP and the publish-on-failure path in `useMcpConfigStore`.
