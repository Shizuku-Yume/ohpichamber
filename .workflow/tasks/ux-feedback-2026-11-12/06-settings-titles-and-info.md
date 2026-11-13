# 06: Settings page titles, info-icon prose and the description lint

**Effort:** ux-feedback-2026-11-12
**Blocked by:** 03
**Covers:** W6
**Files:** `packages/ui/src/components/sections/shared/SettingsPageLayout.tsx`; the `namedBySidebar` call sites (`BehaviorPage`, `ExtensionsPage`, `GitPage`, `IntegrationsPage`, `OpenChamberPage`, `ProjectsPage`, `RemoteInstancesPage`, `SkillsCatalogPage`, `WebSearchPage`, `SettingsView`); `settings.page.*.description` keys in all locales; rows listed under items 5d and 9 in the research; `packages/ui/src/components/sections/references/layout.md`; a new lint or test under `tools/oxlint/openchamber/` or the sections tests
**Read first:** `research/feedback-2026-11-12/03-11-settings-parity.md` (items 3, 5d, 9); `decisions.md` 2026-11-13 "Settings pages show their title and description"; `packages/ui/src/components/sections/PATTERNS.md` and its `references/`; skill `locale-ui-patterns`
**Check:** the new lint fails on a static `description={t(...)}` on `SettingsCheckboxRow` or `SettingsFieldRow` outside its allowlist, and `bun run lint` and the sections tests exit 0. Real path (Web): every settings page, including Remote instances and Tunnel, shows its title and description; Git, Sessions and worktree cleanup rows show prose behind the info icon. Screenshots go in the evidence directory.

- [ ] Drop `namedBySidebar` from every call site and restore the `settings.page.*.description` keys in all locales. Update `references/layout.md:22` to match.
- [ ] Move static prose to `info=` on the rows the research lists: `GitSettings` commit role and four checkboxes, `DefaultsSettings` walkthrough and `...Info` checkboxes, `MergedWorktreeCleanupSettings`, `ModelRoleEditor` callers, and the fork-added Plugins rows. Conditional status, warnings and errors stay visible.
- [ ] Add the lint with an allowlist for the compliant cases the research names.
