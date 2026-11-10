# 26: Commands, Plugins, Agents and Usage pages serve GUI users (R2)

**Effort:** ux-v270-omp-alignment
**Blocked by:** 25
**Covers:** W3
**Files:** `packages/ui/src/components/sections/commands/{CommandsPage,CommandsSidebar}.tsx`; `packages/ui/src/components/sections/plugins/{PluginsPage,ExtensionControlCenter}.tsx`; `packages/ui/src/components/sections/agents/{AgentsPage,AgentsSidebar}.tsx`; `packages/ui/src/components/sections/usage/UsagePage.tsx`; `packages/ui/src/components/views/usage/UsageStatsView.tsx`; `packages/web/server/lib/quota/`; related i18n modules
**Read first:** `decisions.md: 2026-11-10 - OMP TUI parity…`; `research/ux-v270-systemic-review.md` R2; upstream v2.7.0 counterparts (`git show bc50ba56a:<path>`); `packages/ui/src/components/sections/PATTERNS.md`; skills `locale-ui-patterns`, `enterprise-boundary`
**Check:** `VITEST_MAX_WORKERS=2 bunx vitest run packages/ui/src/components/sections packages/web/server/lib/quota && bun run lint` → exit 0, with the duplicate-owner test passing; real path: the Commands page creates and edits a prompt template while chat autocomplete still offers OMP built-ins; a plugin installs from the marketplace; an agent's tools are edited in one control; Usage shows token analytics plus quotas for providers configured in OMP

- [ ] The Commands page manages prompt templates (`.omp/commands/*.md`, `~/.omp/agent/commands/*.md`); built-in OMP commands appear only in chat autocomplete.
- [ ] The Plugins page follows the Skills catalog layout (installed, marketplace with working install/uninstall). Capability sources are listed only when they have items, and raw worker ids and engine diagnostics are hidden from the main view.
- [ ] The Agents page has one tool-permission editor.
- [ ] Usage combines upstream's token analytics with quota cards whose credentials come from OMP's auth store, showing only configured providers.
- [ ] Deletes: the CLI command list and its CRUD shell, the 21-pill provider wall and raw inspector, the duplicate tool `<ul>` list and text input, and the unconfigured-provider loop on Usage.
