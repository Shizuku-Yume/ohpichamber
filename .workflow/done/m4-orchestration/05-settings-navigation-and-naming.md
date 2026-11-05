# 05: Clean up settings navigation group key and clarify Extensions, Plugins, and Prompt Templates naming

**Effort:** m4-orchestration
**Task type:** refactor
**Blocked by:** 03
**Files:** `packages/ui/src/components/views/SettingsView.tsx`, `packages/ui/src/components/views/SettingsView.test.tsx`, `packages/ui/src/components/sections/extensions/ExtensionsPage.tsx`, `packages/ui/src/components/sections/plugins/PluginsPage.tsx`, `packages/ui/src/components/sections/snippets/SnippetsPage.tsx`, `packages/ui/src/lib/i18n/messages/`
**Read first:** `.workflow/specs/m4-orchestration.md`; `.workflow/decisions.md` (2026-11-05 - Enable OMP LSP settings in workers, project unmanaged MCP configs read-only, and clean up settings naming); `.agents/skills/locale-ui-patterns/SKILL.md`
**Covers:** W8
**Check:** `bun test packages/ui/src/components/views/SettingsView.test.tsx` and `bun run type-check` and `bunx oxlint packages/ui/src/components/views/SettingsView.tsx` exit 0.
- **Base commit:** 05374aa35c2730872242a1be7fa14539c32e3b11

- [x] `SettingsView.tsx` renames the `'opencode'` navigation group identifier to `'agent'` and removes obsolete OpenCode comments.
- [x] Settings sidebar and page headers clearly distinguish `Guest Extensions` (`extensions`) from `OMP Plugins` (`plugins`) and rename `Snippets` to `Prompt Templates` across locales while preserving route/slug compatibility.

## Progress

- **Check before:**
  - `bun test packages/ui/src/components/views/SettingsView.test.tsx`: 1 test passed (6 expect calls, 0 failures).
  - `bun run type-check`: 0 type errors across 3,207 files in 5 projects.
  - `bunx oxlint packages/ui/src/components/views/SettingsView.tsx`: 0 errors, 0 warnings.
  - Baseline defects confirmed:
    - `SettingsView.tsx` and `metadata.ts` use legacy navigation group identifier `'opencode'` and obsolete comments.
    - Sidebar and page headers use ambiguous names: "Extensions" instead of "Guest Extensions", "Plugins" instead of "OMP Plugins", and "Snippets" instead of "Prompt Templates".
- **Work:**
  - `SettingsView.tsx`: Renamed navigation group `'opencode'` to `'agent'` in `NAV_GROUP_ORDER` and removed obsolete OpenCode comments, preserving route and slug compatibility.
  - `metadata.ts`: Updated `SettingsPageGroup` to include `'agent'`, updated group assignment for `providers`, `web-search`, `omp`, `agents`, `commands`, `mcp`, `plugins` from `'opencode'` to `'agent'`. Clarified page titles: `Guest Extensions` for extensions, `OMP Plugins` for plugins, and `Prompt Templates` for snippets.
  - `packages/ui/src/lib/i18n/messages/`:
    - Added `settings.view.nav.group.agent: "OMP"` across all 15 locale dictionaries (`ar`, `de`, `en`, `es`, `fr`, `he`, `ja`, `ko`, `nl`, `pl`, `pt-BR`, `tr`, `uk`, `zh-CN`, `zh-TW`).
    - Updated `settings.page.extensions.title` across all 15 locale dictionaries and in `extensions.settings.i18n.ts` to `Guest Extensions` (with genuine translations in every language).
    - Updated `settings.page.plugins.title` across all 15 locale dictionaries to `OMP Plugins` (with genuine translations in every language).
    - Updated `settings.page.snippets.title` and `settings.snippets.sidebar.title` across all 15 locale dictionaries to `Prompt Templates` (with genuine translations in every language).
    - Ensured key parity across all locales by distributing `subagentHudI18n` imports across all non-English dictionaries.
  - `SettingsView.test.tsx`: Added focused behavior tests asserting that `Guest Extensions`, `OMP Plugins`, and `Prompt Templates` render in settings navigation and that the old unclarified names do not appear as standalone nav items.
- **Check after:** `bun test packages/ui/src/components/views/SettingsView.test.tsx` and `bun run type-check` and `bunx oxlint packages/ui/src/components/views/SettingsView.tsx` pass (2 tests passed, 0 failures; 0 type errors across 3,207 files; 0 lint errors).
  - Static analysis: `bunx oxlint` across all Task 05 modified files passed with 0 errors.
  - Full i18n test suite: `bun test packages/ui/src/lib/i18n/` passed 59 tests across 37 files (46,456 expect calls, 0 failures).
- Independent review: Approved by director with no findings.
