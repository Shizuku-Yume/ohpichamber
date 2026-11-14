# 14: Plugins page on the shared card and catalog patterns

**Effort:** ux-feedback-2026-11-12
**Blocked by:** 06
**Covers:** W8
**Files:** `packages/ui/src/components/sections/plugins/{PluginsPage,ExtensionControlCenter,AddPluginDialog,MarketplaceSourcesDialog}.tsx`; locale keys
**Read first:** `research/feedback-2026-11-12/17-eval-permissions-plugins.md` ("#26, OMP Plugins page"); `packages/agent-contract/src/plugins.ts`; upstream `McpGrid.tsx`, `SkillsCatalogRows.tsx`, `IntegrationCatalogCard`; `PATTERNS.md`, `STYLING.md`; skill `locale-ui-patterns`
**Check:** the plugins section tests exit 0, including a test that kind labels are localized and bundled items start collapsed. Real path (Web): installed plugins show as cards with version, update and scope pills, an enable switch and capability counts; an empty state offers "Add plugin"; capabilities are tabbed by kind with counts, sources form one row of switches, bundled items collapse behind "Show N bundled", and raw triggers and paths appear only in the inspector; the marketplace has category chips. Screenshots go in the evidence directory.
**Base commit:** 024cbc63a2bcafee01157aaffc0b229b41b60382

- [x] Installed plugins as a `SettingsCard` grid with an empty state.
- [x] Restructure `ExtensionControlCenter` by kind; drop the forced uppercase; localize kind labels.
- [x] Marketplace category chips and capability counts.
- [x] Deletes: the flat capability list and per-row raw trigger chips.

## Progress

- Check before: the previous session's commit `8b1c3a6cc` already held the card grid, kind tabs, category chips and deletions; the French kind-label test failed (7 of 8 pass).
- Check after: (Bun, `packages/ui`, `bun test src/components/sections/plugins`, exit 0): 8 pass, 0 fail, 38 expects. Includes the localized kind label test (fr) and the bundled-collapsed test.
- Lint: `bunx oxlint` on ExtensionControlCenter, PluginsPage, PluginsPage.test and plugins-marketplace.i18n: exit 0, no findings.
- Dead code: `bun run dead-code` reports nothing under plugins; the non-blocking report lists pre-existing items elsewhere.
- Locale keys: all 59 `plugins-marketplace` keys present in all 15 locales (en, nl, uk, de, es, fr, ja, ko, pl, tr, ar, he, pt-BR, zh-CN, zh-TW).
- Real path (Web, port 4114, `/tmp` data dir, isolated HOME, `packages/web` build rebuilt): the empty installed state shows "Add plugin"; capability tabs read "All 26" and "Rules 26"; 26 bundled rules sit behind "Show 26 bundled" and expand to "Hide bundled"; the inspector shows the path and the trigger patterns, rows show neither. Screenshots: `task14/01-plugins-installed.png`, `task14/02-bundled-expanded.png`.
- Not exercised on the real path: installed-plugin cards (version, update and scope pills, enable switch, footer counts) and marketplace category chips. No plugin is installed and no marketplace source is configured in the isolated data dir, and marketplace refresh needs the network. These render from code and unit-tested paths only.
- Bundled detection: OMP reports its bundled rules under provider `builtin-defaults` with user scope (the `BUILTIN_DEFAULTS_PROVIDER_ID` constant in OMP's capability registry), so the UI checks the provider id as well as scope.
- Review: pass. Self-review of the diff against the base commit (no reviewer subagent is available in this run); no blocking findings.
