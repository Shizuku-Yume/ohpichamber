# 03: Phase 1 Audit List C — UI design system, PATTERNS.md / STYLING.md compliance, and visual audit

**Effort:** m6-audit-and-polish
**Task type:** spike
**Blocked by:** None
**Covers:** W1
**Files:** `.workflow/research/m6-audit-list-c-ui-compliance.md`
**Read first:** `.workflow/specs/m6-audit-and-polish.md`; `packages/ui/src/components/sections/PATTERNS.md`; `packages/ui/src/lib/theme/STYLING.md`
**Check:** `test -s .workflow/research/m6-audit-list-c-ui-compliance.md && grep -q 'ProvidersPage' .workflow/research/m6-audit-list-c-ui-compliance.md && grep -q 'OmpSettingsPage' .workflow/research/m6-audit-list-c-ui-compliance.md && grep -q 'WebSearch' .workflow/research/m6-audit-list-c-ui-compliance.md && .workflow/bin/workflow validate` → exits 0 with complete visual and code compliance audit and screenshot evidence.

- [ ] Inspect every fork-authored or fork-modified Settings section and UI component against `upstream/main` (`0056bf6a9`), `packages/ui/src/components/sections/PATTERNS.md` (plus `patterns/*.md`), and `packages/ui/src/lib/theme/STYLING.md` (plus `themes/*.md`).
- [ ] Launch the live Web UI on an isolated port, drive every Settings page and fork-modified chat/workbench surface in headless Chrome across dark and light themes, and capture screenshots under `/home/shizuku/Project/ohpichamber-omp-artifacts/m6-phase1-audit-2026-11-06/screenshots/`.
- [ ] Document exact code and visual violations (`PATTERNS.md` / `STYLING.md` rules broken, raw HTML/un-tokenized classes, missing shared primitives, cramped/broken layouts, test-only markup, missing i18n keys) and concrete redesign blueprints for `ProvidersPage.tsx`, `WebSearch` settings, `OmpSettingsPage.tsx`, `RoutingPage.tsx`, `DefaultsSettings.tsx`, `SkillsCatalogPage.tsx`, `PluginsPage.tsx`, `McpPage.tsx`, `SlashCommandsPage.tsx`, and chat/composer/sidebar additions.
