# 10: OMP setting list derived from OMP's registry, rendered from its descriptors

**Effort:** ux-feedback-2026-11-12
**Blocked by:** 03
**Covers:** W6, W7
**Files:** `packages/agent-service/src/worker/{settings-ui,catalog-settings,context-settings}.ts`; `packages/agent-contract/src/settings.ts` (or the OMP settings schema module); `packages/ui/src/components/sections/omp/OmpSettingsPage.tsx` and its row registry; `omp-settings.i18n.ts`
**Read first:** `research/feedback-2026-11-12/12-omp-settings-and-shells.md` (a) and "Two IA proposals"; `03-11-settings-parity.md` (item 11, `-1`); `decisions.md` 2026-11-13 "OMP settings live on the page that owns the concept"; OMP `config/all-settings` `orderedSettings()`; skills `ui-api-decoupling`, `locale-ui-patterns`; `PATTERNS.md`
**Check:** a service test loads OMP's registry and asserts every TUI-visible id has a placement and that no hand-kept id list remains; a UI test renders a number setting with a `default` option as a select showing "默认"/"Default" for `-1`; `bun test --timeout 15000 src/worker` in `packages/agent-service` and the OMP settings UI tests exit 0. Real path (Web): the OMP page shows compaction thresholds as "默认"/"自动" and lists every `engine` setting with label and description.

- [ ] Derive the setting list from `orderedSettings()`. Replace `OMP_SETTING_IDS` and the `surface` table with a placement table: `page:section`, `engine`, `tui-only` or `owned-by <settingsItem>`. Every TUI-visible id is placed; untabbed ids default to hidden.
- [ ] Fix the known misclassifications: `followUpMode` is not `chat.follow-up-behavior`; `recap.*` is owned by Chat → Session recap only once task 11 makes that control write it.
- [ ] Render OMP page rows from the descriptor: type to control, `options` to select including sentinel values, `condition` to visibility, OMP label and description with locale overrides.
- [ ] The "kept out" count reports the real number of settings not shown.
- [ ] Deletes: `OMP_SETTING_IDS`, the hand-kept allowlist and the raw number rendering of sentinels.
