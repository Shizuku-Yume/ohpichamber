# 10: Redesign web-search fallbacks and move the timeout to the top

**Effort:** ux-feedback-2026-11-15
**Blocked by:** 07
**Covers:** W8
**Files:** `packages/ui/src/components/sections/websearch/{WebSearchPage.tsx,WebSearchPage.test.tsx}`, `packages/ui/src/lib/i18n/messages/` (web search keys)
**Read first:** `research/feedback-2026-11-15/SettingsLayout.md` (F8, F9, fixes C and D); `.agents/skills/drag-to-reorder/SKILL.md`; `SettingsSortableList.tsx`, `SettingsSortableVisibilityList.tsx`, `ProviderAccounts.tsx`, `ChatSettings.tsx` stepper row
**Check:** `WebSearchPage.test.tsx` covers the empty state, add via menu, icon remove and reorder; `bun run --cwd packages/ui test` exits 0. Real path (1600 px): the timeout row is in the first section with the shared stepper width; with three fallbacks the list spans the row, shows warnings only for missing setup, and keyboard (Space + Arrow) and touch long-press reordering persist after reload; Settings search "timeout" highlights the row.

- [ ] The fallback list uses the full row: drag handle, ordinal, name, a warning pill only when a key or setup is missing, and an icon remove button with an aria label.
- [ ] "Add fallback" is a `DropdownMenu` from an outline button with an add icon, disabled with a helper when nothing is addable; an empty list shows one helper line.
- [ ] The timeout is a `SettingsFieldRow` in the first section with the shared stepper class, unit and reset; its bottom section is gone.
- [ ] Copy in all 15 locales.
