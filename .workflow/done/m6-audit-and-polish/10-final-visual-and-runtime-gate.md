# 10: Final M6 integration, live browser light/dark visual verification, and full workspace gate

**Effort:** m6-audit-and-polish
**Task type:** feature
**Blocked by:** 04, 05, 06, 07, 08, 09
**Covers:** W1, W2, W3, W4, W5, W6
**Files:** `.workflow/development.md`; `.workflow/done/m6-audit-and-polish/closeout.md`
**Read first:** `.workflow/specs/m6-audit-and-polish.md`; `.workflow/research/m6-audit-list-a-openchamber-ux.md`; `.workflow/research/m6-audit-list-b-omp-capabilities.md`; `.workflow/research/m6-audit-list-c-ui-compliance.md`; `.agents/skills/flow-verify/SKILL.md`; `.agents/skills/flow-close/SKILL.md`
**Check:** `! grep -rnE 'bg-surface-[123]|typography-label' packages/ui/src && bun install --frozen-lockfile && bun run type-check && bun run lint && bun run docs:validate && VITEST_MAX_WORKERS=2 bun run test && .workflow/bin/workflow validate` → exits 0 with live browser light/dark screenshot receipts across all Settings and Chat surfaces and 0 HTTP 404s.

- [x] Boot the integrated Web + Agent Service stack on isolated ports and run a headless Chrome DevTools walkthrough across light and dark themes covering Chat/Composer, `AgentHubModal`, `SessionRecapSpacer`, `ProvidersPage`, `OmpSettingsPage` (verifying `/api/agent/v1/workspaces/:workspaceId/omp/settings` returns 200 and renders all 16 model roles), `WebSearchPage`, `RoutingPage`, `BehaviorPage` (verifying `default` zero-injection + `AGENTS.md` editor), `DesktopAppSettings`, `DefaultsSettings`, `PluginsPage` + `AddPluginDialog` Marketplace tab, `McpPage`, `CommandsPage`, `SkillsCatalogPage`, and `UsagePage`, saving post-fix screenshot receipts.
- [x] Verify end-to-end runtime behavior for cross-client `session-pins`, `session-unread` watermarks + `turn-duration` badges, native `IdleMaintenance` recaps (`history.db`), `Agent Hub` subagent persistence/revive/tree-cost, Marketplace browse/update checks, and `@oh-my-pi/omp-stats` `stats.db` queries.
- [x] Run full root workspace validation (`bun install --frozen-lockfile`, `bun run type-check`, `bun run lint`, `bun run docs:validate`, `VITEST_MAX_WORKERS=2 bun run test`, `bun run dead-code`, and `.workflow/bin/workflow validate`), record evidence in `.workflow/development.md` and `.workflow/done/m6-audit-and-polish/closeout.md`, and land `m6-audit-and-polish/integration` on `main`.

**Base commit:** 876a08f538d3b791d762a1295ee8ba6c9002d573
**Started:** 2026-11-07T12:00:00+08:00
**Finished:** 2026-11-07T12:35:17+08:00

## Progress

- **Check before:** Integration tip `d63088e1af`; frozen install/build/type-check/lint/docs gates were available, but the forbidden-class sweep found `typography-label` in `InProgressOperationBanner.tsx`; Host canonical session-surface proxy entries were absent; duration badge selected the in-memory settled hook; three overview/settings tests were stale against persisted unread/default-mode contracts.
- **Work:** Replaced the invalid typography token; removed the dead M6 sidebar alias and unused type exports to preserve the inherited 18-file/66-export/69-type knip baseline; added typed Host proxy entries for recaps, subagent roster/tree-cost/transcript; switched `SessionActivityDuration` to `useSessionFinishedTurnDurationMs`; registered `defaultSessionMode`; updated overview fixtures to persisted workbench watermarks; added focused Host route forwarding coverage.
- **Check after:** Static gates passed; focused Host/session route tests passed (28 tests); UI overview/settings regression packet passed (32 tests, 821 expects); live API/browser receipts and screenshots are recorded in `development.md`; full-suite final counts and merge SHAs are recorded there before archive.
- **Review:** Fresh read-only requirements/proof review covered the gate brief, M6 spec, task requirements, changed Host routes, persisted duration selector, and artifact receipts; no blocking issue remained after the route and duration repairs.
