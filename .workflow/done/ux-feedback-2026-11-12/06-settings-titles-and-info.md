# 06: Settings page titles, info-icon prose and the description lint

**Effort:** ux-feedback-2026-11-12
**Blocked by:** 03
**Covers:** W6
**Files:** `packages/ui/src/components/sections/shared/SettingsPageLayout.tsx`; the `namedBySidebar` call sites (`BehaviorPage`, `ExtensionsPage`, `GitPage`, `IntegrationsPage`, `OpenChamberPage`, `ProjectsPage`, `RemoteInstancesPage`, `SkillsCatalogPage`, `WebSearchPage`, `SettingsView`); `settings.page.*.description` keys in all locales; rows listed under items 5d and 9 in the research; `packages/ui/src/components/sections/references/layout.md`; a new lint or test under `tools/oxlint/openchamber/` or the sections tests
**Read first:** `research/feedback-2026-11-12/03-11-settings-parity.md` (items 3, 5d, 9); `decisions.md` 2026-11-13 "Settings pages show their title and description"; `packages/ui/src/components/sections/PATTERNS.md` and its `references/`; skill `locale-ui-patterns`
**Check:** the new lint fails on a static `description={t(...)}` on `SettingsCheckboxRow` or `SettingsFieldRow` outside its allowlist, and `bun run lint` and the sections tests exit 0. Real path (Web): every settings page, including Remote instances and Tunnel, shows its title and description; Git, Sessions and worktree cleanup rows show prose behind the info icon. Screenshots go in the evidence directory.
**Base commit:** 1f9b10086ba1625fc88a6802aa572ed50f8c12be

- [x] Drop `namedBySidebar` from every call site and restore the `settings.page.*.description` keys in all locales. Update `references/layout.md:22` to match.
- [x] Move static prose to `info=` on the rows the research lists: `GitSettings` commit role and four checkboxes, `DefaultsSettings` walkthrough and `...Info` checkboxes, `MergedWorktreeCleanupSettings`, `ModelRoleEditor` callers, and the fork-added Plugins rows. Conditional status, warnings and errors stay visible.
- [x] Add the lint with an allowlist for the compliant cases the research names.

## Progress

- Dropped `namedBySidebar` from `SettingsPageLayout.tsx` and all call sites (`BehaviorPage`, `ExtensionsPage`, `GitPage`, `IntegrationsPage`, `OpenChamberPage`, `ProjectsPage`, `RemoteInstancesPage`, `SkillsCatalogPage`, `WebSearchPage`, `SettingsView`).
- Restored visible page descriptions (`settings.page.*.description`) across all pages, matching upstream v2.7.0 and fork pages.
- Updated `packages/ui/src/components/sections/references/layout.md:22` and skeleton.
- Converted static prose `description=` to `info=` on `GitSettings` (commit role + 4 generation checkboxes), `DefaultsSettings` (walkthrough + planModeAllowAgentsInfo), `MergedWorktreeCleanupSettings`, `OmpSettingsPage` (ModelRoleEditor callers), and `PluginsPage` (secret definition + effective settings).
- Added oxlint rule `openchamber/no-static-row-description` under `tools/oxlint/openchamber/rules/no-static-row-description.ts`, registered in `tools/oxlint/openchamber/index.ts` and enabled in `oxlint.config.ts`.
- Added sections test `packages/ui/src/components/sections/settingsDescriptionPolicy.test.ts`.
- Server boot fix: `packages/web/server/index.js` referenced undefined `agentMemoryRuntime` and `isAgentMemoryEnabled`. Integration already carries the same fix (`002fd59fc`), so this branch takes it from integration and keeps no edit of its own.
- Review: pass. Self-review of `git diff 1f9b10086`; reviewer subagent unavailable (agent spawning disabled). The self-review reverted unrelated reindent hunks in `GitPage.tsx` and `WebSearchPage.tsx`.
- Check before: new lint and test detected all 6 active violations (`DefaultsSettings.tsx`, `GitSettings.tsx` x4, `MergedWorktreeCleanupSettings.tsx`) and exited non-zero as required.
- Check after:
  - `bun run lint:ui` / `bun run lint`: exit 0.
  - `node scripts/run-isolated-tests.mjs packages/ui/src/components/sections`: 55/55 test files passed, exit 0.
  - `bunx oxlint tools/oxlint/openchamber/index.ts tools/oxlint/openchamber/rules/no-static-row-description.ts packages/ui/src/components/sections/settingsDescriptionPolicy.test.ts`: 0 findings, exit 0.
  - `bun run dead-code`: inspected report; no dead exports introduced.
  - Real path (Web on port 4106, recorded by the first worker before its quota stop; not re-run in the landing window): drove browser across all settings pages (General, Appearance, Chat, Sessions, Shortcuts, Notifications, Voice, Tunnel, Remote instances, Git, Integrations, Extensions, Behavior, Web search, OMP, Routing, Providers, MCP, Plugins, About, Projects, Skills catalog). Pages with a `settings.page.*.description` key show it; Git identities and About have no description key and show only their title. Git, Sessions, and Worktree cleanup rows show prose behind the info icon. 25 screenshots saved in `/home/shizuku/Project/ohpichamber-omp-artifacts/ux-feedback-2026-11-13/task06/`.
- Post-merge (integration `affcadfd7` merged; its server fix taken from integration): `bun run lint` exit 0. `VITEST_MAX_WORKERS=2 node scripts/run-isolated-tests.mjs packages/ui/src/components/sections`: 54/55 files pass, exit 1. The one failure is `sections/agents/AgentsPage.test.tsx` (4 of 10 tests: "Missing tool row"), which fails identically on pre-merge integration `affcadfd7` (`bun test packages/ui/src/components/sections/agents/`: 6 pass, 4 fail there too). It belongs to task 13's permission editor, not to this task. The lint rule still fails a static `description={t(...)}` on `SettingsFieldRow` (temporary probe file, exit 1, removed). `bunx oxlint` on the three changed authored files: 0 findings, exit 0.
