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

- Check before: `OmpSettingsPage.tsx` rendered fallback `<Textarea>` for unknown arrays/records, only 57 legacy i18n keys existed for OMP, settings were grouped in a flat list without tabs, and literal English strings existed in error and placeholder states.
- Check after:
  - Full UI suite: `bun run --cwd packages/ui test` (`node ../../scripts/run-isolated-tests.mjs src`) → 1028/1028 test files passed.
  - Focused test suite: `bun test packages/ui/src/components/sections/openchamber/OmpSettingsPage.test.tsx packages/ui/src/lib/i18n/messages.test.ts packages/ui/src/components/chat/CommandAutocomplete.test.tsx` → 25 pass, 0 fail (4230 expect() calls).
  - Type check: `bun run --cwd packages/ui type-check` (`bun check -b`) → 0 type errors across 2,975 files.
  - Lint: `bunx oxlint packages/ui/src/components/sections/openchamber/OmpSettingsPage.tsx packages/ui/src/components/sections/openchamber/OmpSettingsPage.test.tsx packages/ui/src/lib/i18n/messages/omp-settings.i18n.ts packages/ui/src/lib/i18n/messages.test.ts` → 0 findings.
  - Dead code: `bun run dead-code` → 0 unused exports or files from changed code.
  - Workflow check: `.workflow/bin/workflow validate` → exits 0 (238 task files valid).
  - Runtime Smoke Interaction Evidence: saved to `/home/shizuku/Project/ohpichamber-omp-artifacts/ux-dispatch-2026-11-07/smoke-ux-06.json`, exercising verified browser daemon availability and temporary page lifecycle via `chrome-devtools` (`google-chrome` at `/usr/bin/google-chrome`, `chrome-devtools` at `/home/shizuku/.local/npm/bin/chrome-devtools` v1.11.0, active pages probed, launch & close verified), preview toggle click interaction (preview ↔ edit mode and aria-label updates), and all settings mutations: adding `anthropic/*` pattern to `enabledModels` yielding `['openai/*', 'anthropic/*']`, updating default role in `modelPresets.dev` to `openai/o3-mini` while preserving existing `smol` role override (`openai/gpt-4o-mini`), reordering compaction method order (swapping `snapcompact` with `remote`), in-place editing numeric threshold for `openai/gpt-4o` to `150000` while preserving native string thresholds (`80%` and `f100000`), numeric sentinel roundtrip (`compaction.thresholdPercent` from `-1` (Default) to `50` (50%) and back to `-1` (Default)), single-select enum chip selection for `retry.fallbackOn` (`'usage-limit'`), and reactive Chinese localization across all 9 tabs and triggers. Permanent test scaffold removed from repo; all consumer regressions retained in `OmpSettingsPage.test.tsx`.
- Exact line ranges for the 5 requested agent fields across all 15 locale dictionary files:
  - `packages/ui/src/lib/i18n/messages/en.settings.ts`: lines 724-728
  - `packages/ui/src/lib/i18n/messages/zh-CN.settings.ts`: lines 683-687
  - `packages/ui/src/lib/i18n/messages/zh-TW.settings.ts`: lines 680-684
  - `packages/ui/src/lib/i18n/messages/de.settings.ts`: lines 674-678
  - `packages/ui/src/lib/i18n/messages/fr.settings.ts`: lines 585-589
  - `packages/ui/src/lib/i18n/messages/es.settings.ts`: lines 683-687
  - `packages/ui/src/lib/i18n/messages/ja.settings.ts`: lines 724-728
  - `packages/ui/src/lib/i18n/messages/ko.settings.ts`: lines 683-687
  - `packages/ui/src/lib/i18n/messages/nl.settings.ts`: lines 725-729
  - `packages/ui/src/lib/i18n/messages/pl.settings.ts`: lines 119-123
  - `packages/ui/src/lib/i18n/messages/pt-BR.settings.ts`: lines 683-687
  - `packages/ui/src/lib/i18n/messages/tr.settings.ts`: lines 700-704
  - `packages/ui/src/lib/i18n/messages/uk.settings.ts`: lines 683-687
  - `packages/ui/src/lib/i18n/messages/ar.settings.ts`: lines 724-728
  - `packages/ui/src/lib/i18n/messages/he.settings.ts`: lines 724-728
- Schema & tab decisions:
  - `retry.fallbackOn`: In OMP registry (`session/settings.ts`), `retry.fallbackOn` is an enum (`'any' | 'usage-limit' | 'except-usage-limit'`), not an array. We implemented single-select `SettingsChipGroup` preserving the enum payload so writes are accepted by the backend.
  - `getSettingTab`: Honors native `descriptor.tab` from backend metadata (routing `tools.approval` and `tools.approvalMode` to `interaction`, `mcp.*` to `shellTools`), applying only explicit overrides: `retry.*` moved to `Providers & Retry` tab, and merging native `shell` and `tools` into `shellTools`. `Memory` tab provides an empty-state card since memory settings are unexposed host-side; the other 8 tabs populate all 139 exposed settings cleanly.
  - `getOptionSlug` & reactive option translation: Derived stably from `opt.value` (hyphenated lowercase alphanumeric) matching 211/211 keys in `ompSettingsI18n`. Added render function to `<SelectValue>` so both number options and enum options display their reactive localized labels in the trigger instead of raw value strings.
  - Numeric enum sentinel 'default': Stored `-1` sentinel for `compaction.thresholdPercent` and `compaction.thresholdTokens` is mapped to/from option value `'default'` so triggers display `"Default"` / `"默认"` without blank triggers or NaN serialization.
  - Structured controls: Implemented dedicated editors for `enabledModels`, `modelPresets` (supporting multiple role overrides with `AddRoleOverrideRow`, rejecting duplicate names with localized error without data loss), `retry.fallbackChains`, `retry.fallbackOn`, `compaction.methodOrder` (reorderable chips), `compaction.modelThresholds` (in-place editable numeric thresholds and preservation/editing of valid native string thresholds like percentage or fixed triggers, with localized key error checks and tokens label), plus generic string-array and record editors. Completely eliminated `<Textarea>` from `OmpSettingsPage.tsx`.
  - All user-visible literals (placeholders, units, SelectItem options, error strings) localized via `@/lib/i18n`.
