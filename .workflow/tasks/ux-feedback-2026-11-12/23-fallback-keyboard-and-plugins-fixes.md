# 23: Keyboard reorder inside Settings and two Plugins page defects

**Effort:** ux-feedback-2026-11-12
**Task type:** bugfix
**Blocked by:** 08, 14
**Covers:** W6, W8
**Files:** `packages/ui/src/components/sections/websearch/WebSearchPage.tsx` and the Settings window drag handling; `packages/ui/src/components/sections/plugins/PluginsPage.tsx`
**Read first:** independent reviews `/home/shizuku/Project/ohpichamber-omp-artifacts/ux-feedback-2026-11-13/independent-review/{Review08,Review14}.md`; `ContextRailSurfacesDialog` (existing drag-state handling inside a dialog); skills `drag-to-reorder`, `locale-ui-patterns`
**Check:** UI tests that render `WebSearchPage` inside the real `SettingsWindow`, then:
**Base commit:** 81e48cd715c2525dad96b3bd360a370063ac5f67
**Status:** active

- pick up a fallback with Space, move it with ArrowDown and drop it, and assert the saved order;
- assert that Escape cancels the drag without closing Settings;
- in a Plugins test, select a category, remove its source, and assert the filter resets and every remaining plugin is listed;
- render an installed plugin card with five capability kinds and assert the chips sit in a wrapping container.

The sections tests exit 0. Real path (Web): keyboard reorder works in the Settings dialog, and a narrow window shows the plugin card chips wrapping. Screenshots go in `/home/shizuku/Project/ohpichamber-omp-artifacts/ux-feedback-2026-11-13/task23/`.

- [x] Pass the drag state to the Settings dialog, and apply the arrow-key bypass and the Escape cancel guard there.
- [x] Clear a selected marketplace category when that category disappears from the catalog.
- [x] Put the capability chips inside a shrinkable, wrapping container in the card footer.

## Progress

- Review08 finding (Settings drag): `SettingsSortableList` reports drag through `SettingsDialogDragContext` (`sections/shared/settingsDialogDrag.ts`); `SettingsWindow` owns the drag ref, passes arrow keys through `preventBaseUIHandler`, and cancels the Escape close with `details.cancel()` + `allowPropagation()`, the same guard as `ContextRailSurfacesDialog`. The new `views/SettingsWindow.test.tsx` renders the real `SettingsWindow` with `WebSearchPage`; before the fix both cases failed, after it both pass.
- Review14 finding 1 (category reset): `PluginsPage` clears `marketplaceCategory` when it is no longer in `marketplaceCategories`. Test: "a selected marketplace category resets when its source leaves the catalog".
- Review14 finding 2 (chip wrap): `CapabilityChips` returns a `min-w-0 flex-wrap` container, or null when no capability is declared. Test: five capability kinds in one wrapping footer container.
- Check after (per-file runs from the repo root; `bun test` on the Plugins file fails when run in a shared process, a pre-existing global-DOM clash):
  - `SettingsWindow.test.tsx` 2/2 pass (two runs); `PluginsPage.test.tsx` 10/10; `WebSearchPage.test.tsx` 4/4; `ContextRailSurfacesDialog.test.tsx` 6/6; `SettingsView.test.tsx` 2/2.
  - `oxlint` on the six changed TS files: no findings.
  - `bun run dead-code`: no entries for the changed or new files.
  - `bun run --cwd packages/ui type-check`: 2 errors, both in `src/components/views/usage/UsageStatsView.test.tsx` (`pricing` shape), a file this task does not touch.
- Real path (Web, port 4123, `OPENCHAMBER_DATA_DIR=/tmp/ufb23/data`, `HOME=/tmp/ufb23/home`, server stopped afterwards):
  - Keyboard reorder in the real Settings dialog: Exa picked up with Space, moved down with ArrowDown, dropped with Space; the list shows Firecrawl before Exa. `01-keyboard-pickup-arrowdown.png`, `02-after-drop.png`.
  - Escape during a drag: the drag ends, Settings stays open, the order is unchanged. `03-escape-cancels-drag.png`.
  - Plugin card chips at a narrow width: NOT shown on the real path. This throwaway profile has no installed plugins and no marketplace catalog, and there is no network to fetch one. The wrapping is covered by the unit test only. `04-plugins-narrow-empty-catalog.png` shows the empty Plugins page at 600px width.
- Review: pending. An independent worker review of `base..HEAD` is requested from Main.
