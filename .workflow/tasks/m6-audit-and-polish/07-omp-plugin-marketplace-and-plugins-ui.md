# 07: Wire full-lifecycle OMP Plugin Marketplace and rebuild Plugins UI to PATTERNS.md / STYLING.md

**Effort:** m6-audit-and-polish
**Task type:** feature
**Blocked by:** 01, 02, 03
**Covers:** W4, W5, W6
**Files:** `packages/agent-contract/src/plugins.ts`; `packages/agent-service/src/worker/catalog-plugins.ts`; `packages/ui/src/components/sections/plugins/PluginsPage.tsx`; `packages/ui/src/components/sections/plugins/PluginsGrid.tsx`; `packages/ui/src/components/sections/plugins/AddPluginDialog.tsx`; `packages/ui/src/components/sections/plugins/PluginStatusBanner.tsx`
**Read first:** `.workflow/specs/m6-audit-and-polish.md`; `.workflow/research/m6-audit-list-b-omp-capabilities.md` (§4); `.workflow/research/m6-audit-list-c-ui-compliance.md` (§4.6.2 and P0-2); `packages/ui/src/components/sections/PATTERNS.md`; `packages/ui/src/lib/theme/STYLING.md`
**Check:** `bun test packages/agent-contract packages/agent-service/src/worker/catalog-plugins.test.ts && bun run --cwd packages/ui type-check && ! grep -rn 'typography-label' packages/ui/src/components/sections/plugins` → exits 0 with full Marketplace operations, Browse Marketplace tab, and zero `typography-label` violations.

- [ ] Expand `MarketplaceEntrySchema` in `packages/agent-contract/src/plugins.ts` with rich manifest metadata (`author`, `homepage`, `repository`, `license`, `keywords`, `category`, `commands`, `agents`, `mcpServers`, `lspServers`) and add schemas for `MarketplaceSourceSchema`, `PluginMarketplaceManageRequestSchema` (`add`, `remove`, `update`, `list`), `PluginUpdateCheckEntrySchema`, and `PluginUpgradeRequestSchema`.
- [ ] Wire `MarketplaceManager` methods (`addMarketplace`, `removeMarketplace`, `updateMarketplace`, `listMarketplaces`, `checkForUpdates`, `upgradeAllPlugins`, and rich `marketplaceEntries()`) in `packages/agent-service/src/worker/catalog-plugins.ts` and expose them through the Canonical API.
- [ ] Add a **Browse Marketplace** tab with search, category/keyword filtering, and 1-click install to `AddPluginDialog.tsx`, plus a Marketplace Sources management dialog (`add`/`remove`/`update` catalog sources).
- [ ] Update `PluginsGrid.tsx` and `PluginsPage.tsx` to display "Update Available" (`from` → `to`) badges, inline Update / Upgrade All actions, and a rich plugin details view.
- [ ] Remediate all Audit List C compliance issues in `PluginsPage.tsx` and `PluginStatusBanner.tsx`: replace invalid `typography-label` with `typography-ui-label`, flatten nested boxed section cards (`PATTERNS.md`), use shared `SelectTrigger` classes, and remove `!font-normal` button overrides.
