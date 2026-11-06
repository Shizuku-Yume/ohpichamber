# 07: Wire full-lifecycle OMP Plugin Marketplace and rebuild Plugins UI to PATTERNS.md / STYLING.md

**Effort:** m6-audit-and-polish
**Task type:** feature
**Blocked by:** 01, 02, 03
**Covers:** W4, W5, W6
**Files:** `packages/agent-contract/src/plugins.ts`; `packages/agent-service/src/worker/catalog-plugins.ts`; `packages/ui/src/components/sections/plugins/PluginsPage.tsx`; `packages/ui/src/components/sections/plugins/PluginsGrid.tsx`; `packages/ui/src/components/sections/plugins/AddPluginDialog.tsx`; `packages/ui/src/components/sections/plugins/PluginStatusBanner.tsx`
**Read first:** `.workflow/specs/m6-audit-and-polish.md`; `.workflow/research/m6-audit-list-b-omp-capabilities.md` (§4); `.workflow/research/m6-audit-list-c-ui-compliance.md` (§4.6.2 and P0-2); `packages/ui/src/components/sections/PATTERNS.md`; `packages/ui/src/lib/theme/STYLING.md`
**Check:** `bun test packages/agent-contract packages/agent-service/src/worker/catalog-plugins.test.ts && bun run --cwd packages/ui type-check && ! grep -rn 'typography-label' packages/ui/src/components/sections/plugins` → exits 0 with full Marketplace operations, Browse Marketplace tab, and zero `typography-label` violations.

- [x] Expand `MarketplaceEntrySchema` in `packages/agent-contract/src/plugins.ts` with rich manifest metadata (`author`, `homepage`, `repository`, `license`, `keywords`, `category`, `commands`, `agents`, `mcpServers`, `lspServers`) and add schemas for `MarketplaceSourceSchema`, `PluginMarketplaceManageRequestSchema` (`add`, `remove`, `update`, `list`), `PluginUpdateCheckEntrySchema`, and `PluginUpgradeRequestSchema`.
- [x] Wire `MarketplaceManager` methods (`addMarketplace`, `removeMarketplace`, `updateMarketplace`, `listMarketplaces`, `checkForUpdates`, `upgradeAllPlugins`, and rich `marketplaceEntries()`) in `packages/agent-service/src/worker/catalog-plugins.ts` and expose them through the Canonical API.
- [x] Add a **Browse Marketplace** tab with search, category/keyword filtering, and 1-click install to `AddPluginDialog.tsx`, plus a Marketplace Sources management dialog (`add`/`remove`/`update` catalog sources).
- [x] Update `PluginsGrid.tsx` and `PluginsPage.tsx` to display "Update Available" (`from` → `to`) badges, inline Update / Upgrade All actions, and a rich plugin details view.
- [x] Remediate all Audit List C compliance issues in `PluginsPage.tsx` and `PluginStatusBanner.tsx`: replace invalid `typography-label` with `typography-ui-label`, flatten nested boxed section cards (`PATTERNS.md`), use shared `SelectTrigger` classes, and remove `!font-normal` button overrides.

**Base commit:** 876a08f538
**Started:** 2026-11-07T02:05:00Z
**Finished:** 2026-11-07T03:20:00Z

## Progress

- **Check before:** `bun test packages/agent-contract packages/agent-service/src/worker/catalog-plugins.test.ts` passed on base; `grep -rn typography-label packages/ui/src/components/sections/plugins` matched 3 violations; marketplace sources, checkUpdates, upgradeAll and previewUpgrade were absent from the contract, worker and Canonical routes.
- **Work:** expanded `MarketplaceEntrySchema` with `details` (`MarketplacePluginDetailsSchema`), added `MarketplaceSourceSchema`, `PluginUpdateCheckEntrySchema`, `PluginUpgradePreviewEntrySchema`, `PluginUpdateCheckResultSchema`, `PluginUpgradePreviewResultSchema`, `PluginMarketplaceManageRequestSchema`, `PluginPreviewUpgradeRequestSchema`, `PluginUpgradeAllRequestSchema`, `PluginUpgradeRequestSchema`, and backwards-compatible `marketplaceSources`/`availableUpdates` defaults on `PluginCatalogStateSchema`. Wired `plugins.marketplace.manage`, `.checkUpdates`, `.previewUpgrade`, `.upgradeAll` and cached-read marketplace state through `catalog-plugins.ts`, private envelopes, the Agent Service workspace routes, the Host canonical routes, the UI canonical client and the plugins store. Rebuilt `AddPluginDialog` with a Browse Marketplace tab, live search, category/keyword badges, author and repository links, one-click install and marketplace source management; added `MarketplaceSourcesDialog`; `PluginsGrid` renders `from → to` update badges plus inline Update and Upgrade All; the plugin detail screen shows marketplace details (author, license, homepage, repository, category, keywords, commands/agents/hooks/MCP/LSP/DAP). Fixed all Audit List C items: `typography-ui-label`, flat `divide-y` rows instead of boxed border cards, `SETTINGS_SELECT_TRIGGER_CLASS`, and removal of `!font-normal`. Added all new strings to 15 locales with real translations and new worker/UI tests.
- **Check after:** `bun test packages/agent-contract packages/agent-service/src/worker/catalog-plugins.test.ts && bun run --cwd packages/ui type-check && ! grep -rn 'typography-label' packages/ui/src/components/sections/plugins` exits 0 (194 pass, 10 skipped, 0 fail; type-check clean). `bunx oxlint` on every modified TS/TSX file exits 0.
