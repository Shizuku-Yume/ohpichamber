# 05: MCP install scope and honest install status

**Effort:** ux-feedback-2026-11-12
**Blocked by:** None
**Covers:** W5
**Files:** `packages/agent-contract/src/` (MCP schemas); `packages/agent-service/src/supervisor/{catalog,service}.ts`; `packages/agent-service/src/worker/mcp.ts`; `packages/agent-service/src/sessions/registry.ts`; `packages/ui/src/stores/useMcpConfigStore.ts`; `packages/ui/src/components/views/IntegrationsCatalogView.tsx`; `packages/ui/src/components/sections/mcp/{McpGrid,McpPage}.tsx` and the add/edit dialogs
**Read first:** `research/feedback-2026-11-12/02-integrations-remote.md` (item 2); `decisions.md` 2026-11-13 "MCP installs choose project or user scope"; OMP's MCP config loader for the user-scope file; skills `ui-api-decoupling`, `sync-state-invariants`, `locale-ui-patterns`, `enterprise-boundary`
**Check:** `bun test --timeout 15000 src/supervisor src/worker` in `packages/agent-service` and the touched UI tests exit 0, including tests for each install outcome and for scope round-trip. Real path (Web, isolated `HOME`): install Figma from the marketplace at project scope, then at user scope. Each shows "sign-in required", never success and never a bare failure. Settings → MCP lists the server with its scope. A second chat sees the user-scope server. A repeat install shows no success toast.
**Base commit:** 80e8eefd795f9bbe89ca6ac4e1fec6b433993fd5

- [x] The MCP contract gains `scope: project | user`. User scope reads and writes `~/.omp/agent/mcp.json` in OMP's format; project scope reads and writes `<project>/.omp/mcp.json`.
- [x] The install flow (marketplace and Settings -> MCP) asks for the scope, defaulting to project when a project is selected and to user otherwise.
- [x] Configure reports `applied | saved-needs-auth | saved-not-connected`. The native error code and detail survive `Promise.allSettled` and `#stage`.
- [x] "Installed" on the catalog detail page means applied or awaiting auth, read from runtime status. The already-installed path never toasts success.
- [x] The catalog and Settings -> MCP read the same directory (`useSettingsDirectory`).
- [x] Deletes: the catalog's use of `currentDirectory` for MCP and the publish-on-failure path in `useMcpConfigStore`.

## Progress

- **Check before:** Base commit 80e8eefd795f9bbe89ca6ac4e1fec6b433993fd5
- **Check after:** `bun test --timeout 15000 src/supervisor src/worker` in packages/agent-service passed (406 pass, 10 skip, 0 fail across 55 files); agent-contract passed (251 pass, 0 fail); touched UI tests passed (28 pass, 0 fail across 5 files); real path verified on port 4105: project and user scope installs both showed honest "sign-in required" toasts (never success, never bare failure), Settings -> MCP badged each server's scope, second chat saw user-scoped figma server, repeat install did not toast success; artifacts saved in `/home/shizuku/Project/ohpichamber-omp-artifacts/ux-feedback-2026-11-13/task05/`.
- **Review:** pass (base 80e8eefd795f9bbe89ca6ac4e1fec6b433993fd5)
