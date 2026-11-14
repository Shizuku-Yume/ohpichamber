# 23: Keyboard reorder inside Settings and two Plugins page defects

**Effort:** ux-feedback-2026-11-12
**Task type:** bugfix
**Blocked by:** 08, 14
**Covers:** W6, W8
**Files:** `packages/ui/src/components/sections/websearch/WebSearchPage.tsx` and the Settings window drag handling; `packages/ui/src/components/sections/plugins/PluginsPage.tsx`
**Read first:** independent reviews `/home/shizuku/Project/ohpichamber-omp-artifacts/ux-feedback-2026-11-13/independent-review/{Review08,Review14}.md`; `ContextRailSurfacesDialog` (existing drag-state handling inside a dialog); skills `drag-to-reorder`, `locale-ui-patterns`
**Check:** UI tests that render `WebSearchPage` inside the real `SettingsWindow`, then:
- pick up a fallback with Space, move it with ArrowDown and drop it, and assert the saved order;
- assert that Escape cancels the drag without closing Settings;
- in a Plugins test, select a category, remove its source, and assert the filter resets and every remaining plugin is listed;
- render an installed plugin card with five capability kinds and assert the chips sit in a wrapping container.

The sections tests exit 0. Real path (Web): keyboard reorder works in the Settings dialog, and a narrow window shows the plugin card chips wrapping. Screenshots go in `/home/shizuku/Project/ohpichamber-omp-artifacts/ux-feedback-2026-11-13/task23/`.

- [ ] Pass the drag state to the Settings dialog, and apply the arrow-key bypass and the Escape cancel guard there.
- [ ] Clear a selected marketplace category when that category disappears from the catalog.
- [ ] Put the capability chips inside a shrinkable, wrapping container in the card footer.
