# 14: Plugins page on the shared card and catalog patterns

**Effort:** ux-feedback-2026-11-12
**Blocked by:** 06
**Covers:** W8
**Files:** `packages/ui/src/components/sections/plugins/{PluginsPage,ExtensionControlCenter,AddPluginDialog,MarketplaceSourcesDialog}.tsx`; locale keys
**Read first:** `research/feedback-2026-11-12/17-eval-permissions-plugins.md` ("#26, OMP Plugins page"); `packages/agent-contract/src/plugins.ts`; upstream `McpGrid.tsx`, `SkillsCatalogRows.tsx`, `IntegrationCatalogCard`; `PATTERNS.md`, `STYLING.md`; skill `locale-ui-patterns`
**Check:** the plugins section tests exit 0, including a test that kind labels are localized and bundled items start collapsed. Real path (Web): installed plugins show as cards with version, update and scope pills, an enable switch and capability counts; an empty state offers "Add plugin"; capabilities are tabbed by kind with counts, sources form one row of switches, bundled items collapse behind "Show N bundled", and raw triggers and paths appear only in the inspector; the marketplace has category chips. Screenshots go in the evidence directory.

- [ ] Installed plugins as a `SettingsCard` grid with an empty state.
- [ ] Restructure `ExtensionControlCenter` by kind; drop the forced uppercase; localize kind labels.
- [ ] Marketplace category chips and capability counts.
- [ ] Deletes: the flat capability list and per-row raw trigger chips.
