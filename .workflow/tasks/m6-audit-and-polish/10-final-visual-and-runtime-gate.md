# 10: Final M6 integration, live browser light/dark visual verification, and full workspace gate

**Effort:** m6-audit-and-polish
**Task type:** feature
**Blocked by:** 04, 05, 06, 07, 08, 09
**Covers:** W1, W2, W3, W4, W5, W6
**Files:** `.workflow/development.md`; `.workflow/done/m6-audit-and-polish/closeout.md`
**Read first:** `.workflow/specs/m6-audit-and-polish.md`; `.workflow/research/m6-audit-list-a-openchamber-ux.md`; `.workflow/research/m6-audit-list-b-omp-capabilities.md`; `.workflow/research/m6-audit-list-c-ui-compliance.md`; `.agents/skills/flow-verify/SKILL.md`; `.agents/skills/flow-close/SKILL.md`
**Check:** `! grep -rnE 'bg-surface-[123]|typography-label' packages/ui/src && bun install --frozen-lockfile && bun run type-check && bun run lint && bun run docs:validate && VITEST_MAX_WORKERS=2 bun run test && .workflow/bin/workflow validate` → exits 0 with live browser light/dark screenshot receipts across all Settings and Chat surfaces and 0 HTTP 404s.

- [ ] Boot the integrated Web + Agent Service stack on isolated ports and run a headless Chrome DevTools walkthrough across light and dark themes covering Chat/Composer, `AgentHubModal`, `SessionRecapSpacer`, `ProvidersPage`, `OmpSettingsPage` (verifying `/api/agent/v1/workspaces/:workspaceId/omp/settings` returns 200 and renders all 16 model roles), `WebSearchPage`, `RoutingPage`, `BehaviorPage` (verifying `default` zero-injection + `AGENTS.md` editor), `DesktopAppSettings`, `DefaultsSettings`, `PluginsPage` + `AddPluginDialog` Marketplace tab, `McpPage`, `CommandsPage`, `SkillsCatalogPage`, and `UsagePage`, saving post-fix screenshot receipts.
- [ ] Verify end-to-end runtime behavior for cross-client `session-pins`, `session-unread` watermarks + `turn-duration` badges, native `IdleMaintenance` recaps (`history.db`), `Agent Hub` subagent persistence/revive/tree-cost, Marketplace browse/update checks, and `@oh-my-pi/omp-stats` `stats.db` queries.
- [ ] Run full root workspace validation (`bun install --frozen-lockfile`, `bun run type-check`, `bun run lint`, `bun run docs:validate`, `VITEST_MAX_WORKERS=2 bun run test`, `bun run dead-code`, and `.workflow/bin/workflow validate`), record evidence in `.workflow/development.md` and `.workflow/done/m6-audit-and-polish/closeout.md`, and land `m6-audit-and-polish/integration` on `main`.
