# 08: Ordered fallback search providers

**Effort:** ux-feedback-2026-11-12
**Blocked by:** 06
**Covers:** W6
**Files:** `packages/ui/src/components/sections/websearch/WebSearchPage.tsx`; shared sortable list components; locale keys
**Read first:** `research/feedback-2026-11-12/03-11-settings-parity.md` (item 10); `packages/agent-contract/src/websearch.ts` (`fallbackProviderIds`); skills `drag-to-reorder`, `locale-ui-patterns`; `PATTERNS.md`
**Check:** a test reorders, adds and removes fallbacks and asserts the saved `fallbackProviderIds` order and that the primary provider is never offered; the sections tests exit 0. Real path (Web): fallbacks show as a numbered list with status pills; drag or up/down reorders them; the add menu lists only configured providers not already in the chain and resets after a pick.
**Base commit:** 024cbc63a2bcafee01157aaffc0b229b41b60382
**Status:** active

- [x] Replace the plain list and constant-trigger select with an ordered, numbered list of rows (provider name, status pill, reorder handle, remove), reusing `SettingsSortableVisibilityList` or `ListSortableRow`. (`ListSortableRow` does not exist; the drag mechanics moved into the shared `SettingsSortableList`, which `SettingsSortableVisibilityList` now also uses.)
- [x] The add select lists only configured, unused, non-primary providers. An unconfigured provider cannot be added.
- [x] Deletes: the old list markup and the sentinel select item.

## Progress

- Commits: `da38ffd14` (shared sortable list; visibility list rebuilt on it, props unchanged), `cfbd82886` (ordered fallback rows, locale keys, test), then merge of `ux-feedback-2026-11-12/integration` at `a4b807ef3`.
- Shared list: `SettingsSortableList` takes `renderRow`; handle, sensors and announcements are the old visibility code, moved unchanged. Rows are disabled while a write is in flight.
- Fallback rows: numbered, name, pill (`card.needsKey` / `card.needsSetup` / `native.configured`), remove. Add select uses `value=""` and filters `configured && !primary && !in-chain`.
- Locales: `settings.webSearch.native.dragInstructions` in all 15 locales. `ar` and `he` had no `native.*` fallback strings; added the fallback and status strings to their `websearch.i18n.ts` blocks so the rows are not English there.
- Format-on-write reindented one comment in `WebSearchPage.tsx` and one spread line in each main locale dictionary; reverted with a filtered `git apply -R`.
- Known, not changed: `FallbackStatus` checks `credentialConfigured` before `configured`; a stale fallback id not in the provider list shows "Needs setup" with its raw id as name.
- Up/down: the row list has a drag handle and keyboard Space/arrows (dnd-kit). No separate up/down buttons, which the row spec does not list.
- Review: pass. Self-review of `git diff 024cbc63a` (reviewer subagent unavailable: spawning disabled). Found the one-use `placeRows` and `offered` helpers and inlined them; the `rowNames` helper matched the drag button first (class `typography-ui-label`), fixed with `.text-foreground`. Mouse drag in the test did not commit in happy-dom, so the test reorders with keyboard. Real-path mouse drag dropped one row below the aimed slot (automation tool moves in one step); keyboard reorder is exact.
- Check before: no reorder or add-menu test existed. The old page had a plain list with Remove buttons, a constant select trigger and a sentinel item. The new test failed on its first runs (empty row names, unbound drag, missing `MouseEvent`/`DOMRect` globals) and passed after those were fixed.
- Check after: (merged tree `a4b807ef3`)
  - `VITEST_MAX_WORKERS=2 node scripts/run-isolated-tests.mjs src/components/sections` (from `packages/ui`): 56/56 files passed, exit 0. Includes `WebSearchPage.test.tsx` "fallback providers reorder, add and remove through the saved chain".
  - `src/components/layout` (rail dialog using the visibility list): 28/28, exit 0.
  - `src/lib/i18n` (messages parity, Chinese token copy): 52/52, exit 0.
  - `bunx oxlint` on the four changed TS files: 0 findings, exit 0.
  - `bun run type-check` in `packages/ui`: exit 1 with 2 errors in `src/components/views/usage/UsageStatsView.test.tsx` (stale `agent-contract` dist types), not in this task's files.
  - `bun run dead-code`: knip config report, exit 1, no entries for the changed files.
  - Real path (Web, port 4108, throwaway `OPENCHAMBER_DATA_DIR` and isolated `HOME`): fallbacks render as numbered rows with pills; keyboard Space/ArrowUp/Space moved Exa from 3 to 2; the add menu offered only Keenable and Perplexity (the configured providers outside the 11-item chain) and reset to its placeholder after the pick; a mouse drag moved Keenable from 12 to 2. Screenshots in the task08 evidence directory (`01`–`05`).
  - The provider env file `omp-m0-provider.env` is fish syntax (`set -gx`), so it was not sourced into bash; the fallback page needs no provider call.
