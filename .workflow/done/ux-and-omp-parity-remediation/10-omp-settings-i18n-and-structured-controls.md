# 10: Localize OMP Settings page, replace raw JSON textareas with structured controls, and organize into OMP TUI tabs

**Effort:** ux-and-omp-parity-remediation
**Task type:** feature
**Blocked by:** 06
**Covers:** W19
**Files:** `packages/ui/src/components/sections/openchamber/OmpSettingsPage.tsx`; `packages/ui/src/lib/i18n/messages/en.ts`; `packages/ui/src/lib/i18n/messages/zh-CN.ts`; `packages/agent-service/src/worker/catalog-settings.ts`
**Read first:** `.workflow/specs/ux-and-omp-parity-remediation.md`; `packages/ui/src/components/sections/PATTERNS.md`; `.agents/skills/locale-ui-patterns/SKILL.md`
**Check:** `bun run --cwd packages/ui test && bun run --cwd packages/ui type-check` → exits 0; verifies 0 raw JSON `<Textarea>` inputs on `OmpSettingsPage.tsx` and full Chinese/English i18n coverage for all OMP settings.
- **Base commit:** d3d6cc25ef837c4d2feb2cfacb1c79f7989bde59

- [x] Add complete `en` and `zh-CN` (plus locale fallback) i18n keys (`settings.omp.items.<id>.label`, `settings.omp.items.<id>.description`, and tab/group headers) for all OMP settings exposed by `catalog-settings.ts`, and wire `OmpSettingsPage.tsx` to translate every label, description, and enum option label.
- [x] Eliminate all raw JSON `<Textarea>` fallbacks in `packages/ui/src/components/sections/openchamber/OmpSettingsPage.tsx`:
  - `enabledModels`: multi-model selector / chip list with model picker.
  - `modelPresets`: structured preset editor (preset name $\to$ model + thinking effort selector).
  - `retry.fallbackChains`: structured chain editor (role/model $\to$ ordered fallback model selectors).
  - `retry.fallbackOn`: multi-select `SettingsChipGroup` of retryable failure causes.
  - `compaction.methodOrder`: reorderable chip list of compaction methods (`soft`, `remote`, `shake`, `snapcompact`, `handoff`).
  - `compaction.modelThresholds`: key-value list of model selector + numeric token threshold `NumberInput`.
- [x] Reorganize `OmpSettingsPage.tsx` into OMP TUI's canonical category tabs (`Appearance`, `Model & Roles`, `Interaction & Composer`, `Context & Compaction`, `Memory`, `Files & Search`, `Shell & Tools`, `Tasks & Subagents`, `Providers & Retry`) using `SortableTabsStrip` with `pillSize="form"` and clean `SettingsSection` groupings.

## Progress

- Check before: `OmpSettingsPage.tsx` rendered fallback `<Textarea>` for unknown arrays/records, only 57 legacy i18n keys existed for OMP, and settings were grouped in a flat list without tabs.
- Check after: `bun test packages/ui/src/components/sections/openchamber/OmpSettingsPage.test.tsx packages/ui/src/lib/i18n/messages.test.ts packages/ui/src/components/chat/CommandAutocomplete.test.tsx && bun run --cwd packages/ui type-check` exits 0 (21 pass, 0 fail; 0 type errors across 2,974 files; 0 oxlint findings).
- Schema & tab decisions:
  - `retry.fallbackOn`: In OMP registry (`session/settings.ts`), `retry.fallbackOn` is an enum (`'any' | 'usage-limit' | 'except-usage-limit'`), not an array. We implemented single-select `SettingsChipGroup` preserving the enum payload so writes are accepted by the backend.
  - Category tabs: Reorganized into all 9 canonical tabs using `SortableTabsStrip` with `pillSize="form"`. `Retry & Fallback` group moved to `Providers & Retry` tab; `Memory` tab provides an empty-state card since memory settings are unexposed host-side; other 7 tabs populate all 139 settings.
  - Structured controls: Implemented dedicated editors for `enabledModels`, `modelPresets` (preserving non-default roles), `retry.fallbackChains`, `retry.fallbackOn`, `compaction.methodOrder` (reorderable chips), `compaction.modelThresholds` (positive integer validation + model selector pattern checks), plus generic string-array and record editors. Completely eliminated `<Textarea>` from `OmpSettingsPage.tsx`.
  - Cross-window coordination: Added the 5 requested `settings.agents.page.field.*` keys with authentic translations across all 15 `*.settings.ts` files.
