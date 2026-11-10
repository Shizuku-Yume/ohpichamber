# 17: Resolve the merge in Settings sections

**Effort:** ux-v270-omp-alignment
**Blocked by:** 11
**Covers:** W1, W2
**Files:** `packages/ui/src/components/sections/**`
**Read first:** spec "How it is built" (Merge); `merge-lanes.tsv` lane 17; `packages/ui/src/components/sections/PATTERNS.md`; `decisions.md: 2026-11-10 - OMP TUI parity means function and display parity…`; skills `locale-ui-patterns`, `enterprise-boundary`
**Check:** in a worktree on the scaffold branch, `bun scripts/upstream-drift.mjs --markers --lane 17` → 0; `bun run --cwd packages/ui type-check` reports no error in lane paths; `bun scripts/upstream-drift.mjs --check -- packages/ui/src/components/sections` → 0 `unexplained`

- [ ] Resolve the conflicted paths with the merge rule. Adopt upstream's `GeneralWorkspaceSettings` (files and editor), `ThemeAppearancePicker`/`ThemeSchematic` (retiring `ThemePicker`), `OpenChamberToolsSettings` grouped hints, `KeyboardShortcutsSettings` toolbar, `AboutReleaseNotes`, `ProviderLogoImageControl`, `WebSearchPage` (mode segment and provider cards), `SkillsPage`, `SnippetsPage`, `CompactionSettings`, `FinishedWorktreesSettings` and the settings row menus.
- [ ] Where upstream pages call OpenCode-shaped APIs, cut them over to the existing Canonical or Host owner. Keep the upstream layout and components.
- [ ] Leave the OMP-specific pages (`OmpSettingsPage`, Commands, Plugins, Agents) structurally as they are; tasks 25-26 rebuild them.
- [ ] Deletes: the fork's bespoke Web Search page, its Desktop "runtime status" row, and other unexplained rewrites in lane paths.
