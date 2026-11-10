# 25: Curated OMP Settings, one role editor and concrete defaults (R2)

**Effort:** ux-v270-omp-alignment
**Blocked by:** 19, 20
**Covers:** W3
**Files:** `packages/agent-contract/src/settings.ts`; `packages/agent-service/src/worker/{catalog-settings,settings-ui}.ts`; `packages/ui/src/components/sections/openchamber/{OmpSettingsPage,DefaultsSettings,GitSettings}.tsx`; `packages/ui/src/components/sections/shared/ModelRoleEditor.tsx` (new); `packages/ui/src/components/chat/{ThinkingPill,ModelEffortMenu,ComposerModeSelector}.tsx`; the sentinel-default files listed in the review; `packages/ui/src/lib/i18n/messages/omp-settings.i18n.ts`
**Read first:** `decisions.md: 2026-11-10 - OMP TUI parity means function and display parity…`; `research/ux-v270-systemic-review.md` R2 (classification counts, TUI-only keys); `packages/ui/src/components/sections/PATTERNS.md`; skills `locale-ui-patterns`, `ui-api-decoupling`
**Check:** `bun --cwd packages/agent-contract test && bun --cwd packages/agent-service test && VITEST_MAX_WORKERS=2 bunx vitest run packages/ui/src/components/sections packages/ui/src/lib/i18n && bun run lint` → exit 0, with the surface-classification test (every `OMP_SETTING_IDS` entry classified, duplicates name an existing owner), the all-locale test and the duplicate-owner test passing; real path: the OMP Settings page shows only GUI settings in zh-CN with no raw ids, and conditional rows hide when their condition is off

- [ ] Add `surface` (`gui | tui-only | duplicate | advanced`, with `owner` for duplicates) and OMP's `condition` to the settings schema, classified by an explicit per-id table in the service.
- [ ] Render `gui` settings from a declarative row registry with `PATTERNS.md` rows; offer "open config.yml" for the rest. Every key is translated in all 15 locales.
- [ ] One `ModelRoleEditor` (catalog-driven, using task 20's selector module) serves Defaults, Git and OMP settings.
- [ ] Effort pickers default to the model's concrete level. The mode picker has no search box. Synthetic `__default__`/`__inherit__`/`__none__`/`__fallback__` entries are replaced by explicit inherit state where OMP has one.
- [ ] Add the duplicate-owner test: no settings item id claimed by two pages.
- [ ] Deletes: the generic type-switch renderer, `ModelPresetsEditor`, the 16-card role grid, the raw JSON and record inputs, TUI-only and duplicate rows, and the synthetic default entries.
