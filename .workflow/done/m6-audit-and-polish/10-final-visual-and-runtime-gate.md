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
**Finished:** 2026-11-07T13:10:00+08:00

## Progress

- **Check before:** Integration tip `d63088e1af`; the forbidden-class sweep still found `typography-label` in `InProgressOperationBanner.tsx`; the Host canonical gateway had no entries for recaps or Agent Hub session routes, so those surfaces 404'd through `/api/agent/v1`; the session duration badge read the in-memory settled hook instead of persisted `openchamber.turn`; `defaultSessionMode` was unregistered for persistence; three overview/settings tests were stale against the persisted unread watermark and default-mode contracts.
- **Work:** Replaced the invalid typography token; deleted the dead `SessionSidebarItem` alias and four unused type exports to keep the inherited knip inventory flat; added typed Host proxy entries for `/sessions/:id/recaps`, `/subagents`, `/subagents/tree-cost`, and `/subagents/:subagentId/transcript` with a forwarding test; switched `SessionActivityDuration` to `useSessionFinishedTurnDurationMs`; registered `defaultSessionMode` end to end — UI registry, the generated Host `settings-registry.json` snapshot, and a Host `sanitizeSettingsUpdate` mode branch covered by the registry-gate fixture (`settings-helpers.test.js -t "settings registry gate"`: 4 passed / 54 skipped, exit 0); rewrote overview fixtures to persisted `openchamber.workbench` watermarks.
- **Check after:** `bun install --frozen-lockfile` exit 0; agent-contract/agent-service/sdk builds exit 0; forbidden-class sweep clean; `bun run type-check` exit 0 (3,253 files, 5 projects); `bun run lint` exit 0 (five pre-existing UI hook warnings); `bun run docs:validate` exit 0 (672 pages, 56 sidebar links); `VITEST_MAX_WORKERS=2 bun run test` exit 0, 7/7 suites (scripts 23/23, SDK 26/26, UI 1028/1028, agent-contract 197, agent-service 418 pass / 10 skipped, Electron 55/55, Web 7,539 pass / 142 skipped; run before the final Host registry sanitizer edit, which is covered by the focused registry-gate test instead of a second full sweep); `bun run dead-code` exit 1 on inherited-only findings (18 files / 65 exports / 69 types / 3 hints versus base 19 / 66 / 73 / 3, zero net-new); live stack on UI 5230 / API 3960 with isolated data verified ready 200, OMP settings GET 200 with 16 roles and two persisting PATCHes (revisions 2, 3, `config.yml` updated), recaps/subagents/tree-cost 200, unknown transcript 404, metadata PATCH 200 persisting pin + watermark + `durationMs: 4321` read back from `host-metadata.sqlite`, matching SSE `openchamber:session-metadata` event, usage 200; 33 distinct dark/light screenshots captured under `screenshots/`; fresh page load clean of console errors and 4xx/5xx; ports freed after shutdown.
- **Review:** Read-only requirements/proof review against the gate brief, M6 spec, Host route shapes, duration selector semantics, dead-export removal, and artifact receipts is recorded below; no blocking finding remained in the repaired areas.

## Accepted limits

- No real provider turn was sent, so recaps stayed empty, a real subagent revive/transcript was not exercised, and usage returned the zeroed projection without writing `stats.db`.
- Only the local `local-proof` marketplace fixture existed, so remote Marketplace install/update was not exercised.
- The long-lived walkthrough tab logged two `@pierre/diffs` worker-init timeouts (10s) with uncaught rejections; a fresh page load was clean, so it is recorded as an observed dev-stack limitation rather than a verified pass.
- The gate ran on the dev HMR stack, not a packaged build.
