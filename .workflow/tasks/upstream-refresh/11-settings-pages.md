# 11: Settings pages

**Effort:** upstream-refresh
**Task type:** feature
**Base commit:** <commit-sha>

**Delivers:** Upstream's regrouped Settings pages (agents, behavior, classification, extensions, integrations, MCP, providers, projects, plugins, remote instances, routing, skills, snippets, usage, websearch) render, save and deep-link.

**Blocked by:** 10, 23
**Files:** Path list: `/home/shizuku/Project/ohpichamber-omp-artifacts/upstream-sync-2026-10-27/plan-paths/11.tsv` (147 paths: 71 clean/new, 65 both-side, 42 conflicts). Main locations: `packages/ui/src/components/sections/`, `packages/ui/src/components/views/{SettingsView,SettingsWindow}.tsx`.

**Read first:** Spec W6; `packages/ui/src/components/sections/PATTERNS.md`; `.agents/skills/locale-ui-patterns/SKILL.md`; `.agents/skills/sync-state-invariants/SKILL.md`; `.agents/skills/ui-api-decoupling/SKILL.md`.
**Covers:** W6

**Check:** `bun install --frozen-lockfile` and `bun run type-check` and `bun run lint` and `bun run test` all exit 0, the settings tests pass, and in the running app every Settings page opens, search finds its sections, and a setting is changed, saved and visible after reload. Real path: change one OMP setting and one provider setting.

## Done when

- [ ] Every upstream section has a home; no page is left reachable only by URL.
- [ ] Search indexes the regrouped pages and their labels.
- [ ] Save feedback, dirty state and error handling follow the fork's patterns.
- [ ] No OpenCode-only setting is exposed as if it applied to OMP.
