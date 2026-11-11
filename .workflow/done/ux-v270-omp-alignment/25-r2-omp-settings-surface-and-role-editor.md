# 25: Curated OMP Settings, one role editor and concrete defaults (R2)

**Effort:** ux-v270-omp-alignment
**Blocked by:** 19, 20
**Covers:** W3
**Files:** `packages/agent-contract/src/settings.ts`; `packages/agent-service/src/worker/{catalog-settings,settings-ui}.ts`; `packages/ui/src/components/sections/openchamber/{OmpSettingsPage,DefaultsSettings,GitSettings}.tsx`; `packages/ui/src/components/sections/shared/ModelRoleEditor.tsx` (new); `packages/ui/src/components/chat/{ThinkingPill,ModelEffortMenu,ComposerModeSelector}.tsx`; the sentinel-default files listed in the review; `packages/ui/src/lib/i18n/messages/omp-settings.i18n.ts`
**Read first:** `decisions.md: 2026-11-10 - OMP TUI parity means function and display parity…`; `research/ux-v270-systemic-review.md` R2 (classification counts, TUI-only keys); `packages/ui/src/components/sections/PATTERNS.md`; skills `locale-ui-patterns`, `ui-api-decoupling`
**Check:** `bun --cwd packages/agent-contract test && bun --cwd packages/agent-service test && VITEST_MAX_WORKERS=2 bunx vitest run packages/ui/src/components/sections packages/ui/src/lib/i18n && bun run lint` → exit 0, with the surface-classification test (every `OMP_SETTING_IDS` entry classified, duplicates name an existing owner), the all-locale test and the duplicate-owner test passing; real path: the OMP Settings page shows only GUI settings in zh-CN with no raw ids, and conditional rows hide when their condition is off
**Base commit:** eb91091a02185997762b6e5ccdc69b6dbe5fe0a0

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
- i18n: `omp-settings.i18n.ts` was regenerated from one curated vocabulary — 134 keys × 15 locales, including
  the five section headings the page addresses. `messages.test.ts` gained an explicit all-locale OMP test
  (key present, prose translated, placeholders preserved) in place of the old `settings.omp.*` exemption.
  The page title stays `OMP` in every locale: the product name is not prose.

Check before: `bun --cwd packages/agent-contract test` exit 0 (246 tests) and `bun run lint` exit 0 at
`eb91091a0`. The vitest leg cannot run at baseline (see the substitution above).

Check after: re-run on the merged tree `9dbde2a68` (`ux-v270-omp-alignment/integration` merged in) —
`bun --cwd packages/agent-contract test` 249 pass / 0 fail; `bun --cwd packages/agent-service test`
486 tests / 0 fail (67 files, 10 skip); `VITEST_MAX_WORKERS=2 bun --cwd packages/ui test
src/components/sections src/lib/i18n` 1332/1332 files passed; `bun run lint` exit 0;
`bunx tsc --noEmit -p packages/ui/tsconfig.json` clean.

Check after: pre-merge, on the branch before `9dbde2a68` —
- `bun --cwd packages/agent-contract test` → exit 0, 246 pass, 0 fail (26 files).
- `bun --cwd packages/agent-service test` → exit 0, 475 pass, 10 skip, 0 fail (485 tests / 67 files),
  including `settings-ui.test.ts` (classification coverage, owner uniqueness, live descriptor read,
  condition flips after a write, unknown-condition fallback) and `catalog-settings.test.ts`.
- `VITEST_MAX_WORKERS=2 bun --cwd packages/ui test src/components/sections src/lib/i18n` → exit 0,
  1331/1331 test files passed. The sections leg includes `OmpSettingsPage.test.tsx`,
  `DefaultsSettings.test.tsx`, `settingsItemOwnership.test.ts` and `messages.test.ts`.
- `bun run lint` → exit 0 (pre-existing warnings only).
- `bunx tsc --noEmit -p packages/ui/tsconfig.json` and `-p packages/agent-service/tsconfig.json` → clean.
- `bunx oxlint <changed files>` → exit 0.
- `bun run dead-code` → exit 1, pre-existing findings only; nothing in the files this task adds or
  rewrites (the previously reported `OMP_CATALOG_SETTING_IDS` export and the four non-exported helper
  types are gone; `ompSettingsI18n.ts` is a stale duplicate of the regenerated `omp-settings.i18n.ts`
  that predates this task).

Real path (built `packages/web/dist` served on 127.0.0.1:4125, headless Chrome, zh-CN, worktree
registered as a project so `workspaces/resolve` authorizes it):
- The OMP Settings page renders 46 `omp.*` anchors and no `settings.omp.*` key reaches the screen.
- Only `gui` rows draw: retry (9), compaction (7), LSP (2), subagents (3), modes (4), skills (2),
  integrations (1) plus the 12 model roles. `tui.maxFps`, `cycleOrder`, `tools.artifactTailLines`,
  `enabledModels`, `recap.enabled` are absent.
- OMP's conditions hold: `retry.usageReservePct`/`usageReservePolicy` are hidden with
  `usageAwareFallbackEnabled` off, `plan.defaultOnStartup` is drawn with `planModeEnabled` on.
- Effort labels are prose (`高`, `最高`), not the bare catalog ids.
- "Other OMP settings" shows the real `/home/shizuku/.omp/agent/config.yml` path and the
  "打开 config.yml" action.
Live payload cross-check (`GET /api/agent/v1/workspaces/<id>/settings`): 30 `gui`, 13 `tui-only`,
7 `duplicate`, 107 `advanced`, and `configPath` set.

Review: pass (base eb91091a0). Round 1 raised five blocking findings; all five are fixed in
`25f5300c` and re-checked on the final tree: `bun --cwd packages/agent-contract test` 246 pass /
0 fail, `bun --cwd packages/agent-service test` 485 tests / 0 fail, the UI leg 1331/1331 files,
`bun run lint` exit 0, `tsc --noEmit` and `oxlint` clean on the touched files.

1. One user action wrote two updates at the same revision (role record and
   `defaultThinkingLevel`), so the second conflicted and the level did not persist. Both changes
   now travel in one `updateOmpSettings`, including the 409 retry.
2. `ModelRoleEditor` passed `directory={undefined}` to `ModelSelector`, so the pickers read the
   active project's catalog rather than the project the Settings selector names. The settings
   directory now flows through Defaults, Git and the OMP page.
3. An unset effort resolved to `off` while OMP falls back to the session-wide
   `defaultThinkingLevel`. `concreteEffort` now resolves in OMP's order (explicit, model default,
   session default, `off`) and the picker keeps that level selectable.
4. The multirun effort menu labelled an unset selection with the first variant's effort, which is
   ordering rather than a default; it reads only published model and global defaults now.
5. `settingsItemOwnership.test.ts` read only literal `settingsItem="..."` attributes, so the
   dynamic `omp.modelRoles.<role>` anchors were invisible to the invariant it enforces. Template
   anchors are now namespace claims that collide with any id beneath them.

Also added while closing: `publicModel` coverage for when a model publishes
`defaultReasoningEffort` (advertised level only, absent otherwise), and heading coverage for the
five section keys, which had rendered as raw keys before.
