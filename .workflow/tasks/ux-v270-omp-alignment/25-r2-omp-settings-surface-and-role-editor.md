# 25: Curated OMP Settings, one role editor and concrete defaults (R2)

**Effort:** ux-v270-omp-alignment
**Blocked by:** 19, 20
**Covers:** W3
**Files:** `packages/agent-contract/src/settings.ts`; `packages/agent-service/src/worker/{catalog-settings,settings-ui}.ts`; `packages/ui/src/components/sections/openchamber/{OmpSettingsPage,DefaultsSettings,GitSettings}.tsx`; `packages/ui/src/components/sections/shared/ModelRoleEditor.tsx` (new); `packages/ui/src/components/chat/{ThinkingPill,ModelEffortMenu,ComposerModeSelector}.tsx`; the sentinel-default files listed in the review; `packages/ui/src/lib/i18n/messages/omp-settings.i18n.ts`
**Read first:** `decisions.md: 2026-11-10 - OMP TUI parity means function and display parity…`; `research/ux-v270-systemic-review.md` R2 (classification counts, TUI-only keys); `packages/ui/src/components/sections/PATTERNS.md`; skills `locale-ui-patterns`, `ui-api-decoupling`
**Check:** `bun --cwd packages/agent-contract test && bun --cwd packages/agent-service test && VITEST_MAX_WORKERS=2 bunx vitest run packages/ui/src/components/sections packages/ui/src/lib/i18n && bun run lint` → exit 0, with the surface-classification test (every `OMP_SETTING_IDS` entry classified, duplicates name an existing owner), the all-locale test and the duplicate-owner test passing; real path: the OMP Settings page shows only GUI settings in zh-CN with no raw ids, and conditional rows hide when their condition is off
**Base commit:** eb91091a02185997762b6e5ccdc69b6dbe5fe0a0
**Status:** active

- [x] Add `surface` (`gui | tui-only | duplicate | advanced`, with `owner` for duplicates) and OMP's `condition` to the settings schema, classified by an explicit per-id table in the service.
- [x] Render `gui` settings from a declarative row registry with `PATTERNS.md` rows; offer "open config.yml" for the rest. Every key is translated in all 15 locales.
- [x] One `ModelRoleEditor` (catalog-driven, using task 20's selector module) serves Defaults, Git and OMP settings.
- [x] Effort pickers default to the model's concrete level. The mode picker has no search box. Synthetic `__default__`/`__inherit__`/`__none__`/`__fallback__` entries are replaced by explicit inherit state where OMP has one.
- [x] Add the duplicate-owner test: no settings item id claimed by two pages.
- [x] Deletes: the generic type-switch renderer, `ModelPresetsEditor`, the 16-card role grid, the raw JSON and record inputs, TUI-only and duplicate rows, and the synthetic default entries.

## Progress

UI Check leg, substituted: the task's `VITEST_MAX_WORKERS=2 bunx vitest run packages/ui/src/components/sections
packages/ui/src/lib/i18n` cannot run on this tree — `packages/ui` suites are `bun:test` files, and vitest dies
with `Cannot find package 'bun:test'` at baseline too. Task 20 recorded the same finding and used the package's
own isolated runner, so the leg here is
`VITEST_MAX_WORKERS=2 bun --cwd packages/ui test src/components/sections src/lib/i18n`. The substitution is
recorded in `.workflow/decisions.md`.

Contract and service (commits `905c0be`, `eb2a8bf`, `6a28700`):
- `OmpSettingSchema` carries `surface` (required), `owner` (exactly on a `duplicate`), `condition` (from the
  pinned definition) and `conditionActive`; `OmpSettingsStateSchema` carries the optional `configPath`.
- `packages/agent-service/src/worker/settings-ui.ts` owns one explicit per-id table (30 `gui`, 13 `tui-only`,
  7 `duplicate` with owners, 107 `advanced`) and re-evaluates OMP's four settings-derived conditions against
  the worker's own `Settings` handle. An unknown condition name keeps the row visible rather than hiding it.
  OMP's own `plan.autosave` is gated on `planModeEnabled` in the pinned package; `planAutosaveEnabled` gates
  `plan.autosaveDir`, which the allowlist does not expose, so the table records what the package declares.
- `Model` gained `defaultReasoningEffort` (OMP's per-model `thinking.defaultLevel`), so an effort picker can
  name the level that actually runs. The host JS fixture `canonical-settings-routes.test.js` gained `surface`
  in the same commit.
- `surface-classification` test: every `OMP_SETTING_IDS` entry placed exactly once, duplicates name an owner,
  all four surfaces populated, conditions evaluated both ways, unknown condition degrades to visible.

UI (commit `c492c01`, `8582dd0`):
- `packages/ui/src/components/sections/shared/ModelRoleEditor.tsx` (components) and
  `modelRoleSelectors.ts` (grammar/effort helpers) serve Defaults, Git and OMP. It shows the model's concrete
  effort, has no synthetic `__default__` row, and clears the role with `''` (OMP's explicit inherit state).
- The OMP page is a declarative registry (`OMP_SECTIONS`/`OMP_ROWS`) over `PATTERNS.md` primitives: sections,
  checkbox rows, number steppers, chip groups, a two-column role grid and an "Other OMP settings" section with
  the real `config.yml` path and an "Open config.yml" action wired to `files.revealPath`.
- Deleted: the generic type-switch renderer, `SettingItemRenderer`, `EnabledModelsEditor`,
  `ModelPresetsEditor`, `RetryFallbackChainsEditor`, `RetryFallbackOnChipGroup`, `CompactionMethodOrderEditor`,
  `CompactionModelThresholdsEditor`, `StringArrayField`, `StringRecordField`, `AddRoleOverrideRow`, the
  16-card `ModelRolesSection`, the nine-tab `SortableTabsStrip`, `getSettingTab`/`getSettingGroup`/
  `getOptionSlug`/`getModelThresholdKeyError`, `OMP_MODEL_ROLES`/`ROLE_I18N`, and `filterModeOptions` with its
  composer search field.
- Duplicate anchors: `sessions.deletion-dialog` had two owners (`DefaultsSettings` and
  `SessionRetentionSettings`); Defaults now leaves deletion confirmation to the retention section, and its
  test dropped the moved assertions.
- `settingsItemOwnership.test.ts`: no literal `settingsItem` id is claimed by two pages, with a documented
  `SAME_PAGE_CLAIMS` allowlist for the four same-page dialog/form pairs.
- i18n: `omp-settings.i18n.ts` was regenerated from one curated vocabulary — 133 keys × 15 locales.
  `messages.test.ts` gained an explicit all-locale OMP test (key present, prose translated, placeholders
  preserved) in place of the old `settings.omp.*` exemption.

Check before: `bun --cwd packages/agent-contract test` exit 0 (246 tests) and `bun run lint` exit 0 at
`eb91091a0`. The vitest leg cannot run at baseline (see the substitution above).
