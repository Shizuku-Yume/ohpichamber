# 10: Localize OMP Settings page, replace raw JSON textareas with structured controls, and organize into OMP TUI tabs

**Effort:** ux-and-omp-parity-remediation
**Task type:** feature
**Blocked by:** 06
**Covers:** W19
**Files:** `packages/ui/src/components/sections/openchamber/OmpSettingsPage.tsx`; `packages/ui/src/lib/i18n/messages/en.ts`; `packages/ui/src/lib/i18n/messages/zh-CN.ts`; `packages/agent-service/src/worker/catalog-settings.ts`
**Read first:** `.workflow/specs/ux-and-omp-parity-remediation.md`; `packages/ui/src/components/sections/PATTERNS.md`; `.agents/skills/locale-ui-patterns/SKILL.md`
**Check:** `bun run --cwd packages/ui test && bun run --cwd packages/ui type-check` → exits 0; verifies 0 raw JSON `<Textarea>` inputs on `OmpSettingsPage.tsx` and full Chinese/English i18n coverage for all OMP settings.

- [ ] Add complete `en` and `zh-CN` (plus locale fallback) i18n keys (`settings.omp.items.<id>.label`, `settings.omp.items.<id>.description`, and tab/group headers) for all OMP settings exposed by `catalog-settings.ts`, and wire `OmpSettingsPage.tsx` to translate every label, description, and enum option label.
- [ ] Eliminate all raw JSON `<Textarea>` fallbacks in `packages/ui/src/components/sections/openchamber/OmpSettingsPage.tsx`:
  - `enabledModels`: multi-model selector / chip list with model picker.
  - `modelPresets`: structured preset editor (preset name $\to$ model + thinking effort selector).
  - `retry.fallbackChains`: structured chain editor (role/model $\to$ ordered fallback model selectors).
  - `retry.fallbackOn`: multi-select `SettingsChipGroup` of retryable failure causes.
  - `compaction.methodOrder`: reorderable chip list of compaction methods (`soft`, `remote`, `shake`, `snapcompact`, `handoff`).
  - `compaction.modelThresholds`: key-value list of model selector + numeric token threshold `NumberInput`.
- [ ] Reorganize `OmpSettingsPage.tsx` into OMP TUI's canonical category tabs (`Appearance`, `Model & Roles`, `Interaction & Composer`, `Context & Compaction`, `Memory`, `Files & Search`, `Shell & Tools`, `Tasks & Subagents`, `Providers & Retry`) using `SortableTabsStrip` with `pillSize="form"` and clean `SettingsSection` groupings.
