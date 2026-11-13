# 08: Ordered fallback search providers

**Effort:** ux-feedback-2026-11-12
**Blocked by:** 06
**Covers:** W6
**Files:** `packages/ui/src/components/sections/websearch/WebSearchPage.tsx`; shared sortable list components; locale keys
**Read first:** `research/feedback-2026-11-12/03-11-settings-parity.md` (item 10); `packages/agent-contract/src/websearch.ts` (`fallbackProviderIds`); skills `drag-to-reorder`, `locale-ui-patterns`; `PATTERNS.md`
**Check:** a test reorders, adds and removes fallbacks and asserts the saved `fallbackProviderIds` order and that the primary provider is never offered; the sections tests exit 0. Real path (Web): fallbacks show as a numbered list with status pills; drag or up/down reorders them; the add menu lists only configured providers not already in the chain and resets after a pick.

- [ ] Replace the plain list and constant-trigger select with an ordered, numbered list of rows (provider name, status pill, reorder handle, remove), reusing `SettingsSortableVisibilityList` or `ListSortableRow`.
- [ ] The add select lists only configured, unused, non-primary providers. An unconfigured provider cannot be added.
- [ ] Deletes: the old list markup and the sentinel select item.
