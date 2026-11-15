# 06: Collect environment values for local MCP servers at install

**Effort:** ux-feedback-2026-11-15
**Blocked by:** 04
**Covers:** W4
**Files:** `packages/ui/src/lib/integrations-catalog/{registry.ts,types.ts}`, `packages/ui/src/components/views/IntegrationsCatalogView.tsx`, `packages/ui/src/lib/i18n/messages/integrations-catalog.i18n.ts`
**Read first:** `research/feedback-2026-11-15/IntegrationOAuth.md` (F6, fix 7); `McpPage.tsx` env/header editor and `attachMcpToken` precedent
**Check:** UI test: installing `grafana` without `GRAFANA_URL` keeps Install disabled with the field marked required; with values filled, the saved server carries `envCredentialRefs` and no plaintext value in the config. Real path: install `mongodb` with a connection string at project scope; the server connects or reports its real handshake error, not "Could not install".

- [ ] Catalog local entries can declare `envInputs` (`id`, `envName`, label key, required).
- [ ] The install form renders them beside the token field and writes them through the workspace-credential path as env credential references.
- [ ] `grafana`, `mongodb`, `mcp-toolbox` and `azure-devops` declare their inputs; copy in all 15 locales.
