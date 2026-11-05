# 05: Clean up settings navigation group key and clarify Extensions, Plugins, and Prompt Templates naming

**Effort:** m4-orchestration
**Task type:** refactor
**Blocked by:** 03
**Files:** `packages/ui/src/components/views/SettingsView.tsx`, `packages/ui/src/components/views/SettingsView.test.tsx`, `packages/ui/src/components/sections/extensions/ExtensionsPage.tsx`, `packages/ui/src/components/sections/plugins/PluginsPage.tsx`, `packages/ui/src/components/sections/snippets/SnippetsPage.tsx`, `packages/ui/src/lib/i18n/messages/`
**Read first:** `.workflow/specs/m4-orchestration.md`; `.workflow/decisions.md` (2026-11-05 - Enable OMP LSP settings in workers, project unmanaged MCP configs read-only, and clean up settings naming); `.agents/skills/locale-ui-patterns/SKILL.md`
**Covers:** W8
**Check:** `bun test packages/ui/src/components/views/SettingsView.test.tsx` and `bun run type-check` and `bunx oxlint packages/ui/src/components/views/SettingsView.tsx` exit 0.

- [ ] `SettingsView.tsx` renames the `'opencode'` navigation group identifier to `'agent'` and removes obsolete OpenCode comments.
- [ ] Settings sidebar and page headers clearly distinguish `Guest Extensions` (`extensions`) from `OMP Plugins` (`plugins`) and rename `Snippets` to `Prompt Templates` across locales while preserving route/slug compatibility.
