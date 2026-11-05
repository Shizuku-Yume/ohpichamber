# 14: Run end-to-end M4 & OMP TUI parity verification and remove unverified M4 product doc banners

**Status:** active
**Effort:** m4-orchestration
**Task type:** feature
**Blocked by:** 01, 02, 03, 04, 05, 06, 07, 08, 09, 10, 11, 12, 13
**Files:** `packages/docs/content/docs/`, `.workflow/omp-migration/scope.md`, `.workflow/omp-migration/implementation-plan.md`, `.workflow/omp-migration/architecture.md`, `.workflow/omp-migration/contracts.md`, `.workflow/omp-migration/README.md`, `AGENTS.md`, `.workflow/development.md`
**Read first:** `.workflow/specs/m4-orchestration.md`; `.workflow/standards.md`; `.workflow/done/post-m3-hardening/24-docs-truth-pass.md`
**Covers:** W17, W18
**Check:** `bun run docs:validate`, `.workflow/bin/workflow validate`, `bun run type-check`, `bun run lint`, and root `bun run test` exit 0; real-provider verification receipt and screenshots recorded under `/home/shizuku/Project/ohpichamber-omp-artifacts/m4-verification-<date>/`.
- **Base commit:** b3fcef1a9257ee7064b388a8816654e15dbddae2

- [ ] Execute real-provider smoke run across remaining unverified subsystems (Scheduled Tasks, Multi-run/Fusion, Session Assist, AI Git Commit/PR, Walkthrough, Guest generate, Notifications/Linear, Browser Control, Quota/Usage, Autonomous Loops).
- [x] Update product documentation to accurately delineate runtime-verified core capabilities from automated-only subsystem coverage (retaining runtime note banners across all 12 locales on scheduled-tasks, multi-run, notifications, sessions-in-work; verified removals on auto-model-routing and notes-todos-plans).
- [x] Synchronize `.workflow/development.md` and migration design documents (`scope.md`, `implementation-plan.md`, `architecture.md`, `contracts.md`, `README.md`, `AGENTS.md`) and pass the full root gate.

## Progress

Check before:
- Product documentation across all 12 locales contained unverified warning banners labeling M4 orchestration features as unverified on the OMP runtime.
- `packages/docs/README.md` described M4 features as intended behavior rather than verified runtime behavior.
- Full root gate verification required across all 13 landed M4 feature areas.

Work:
- Verified documentation truth: removed warning banners for live-verified capabilities (`auto-model-routing.mdx` verified via Task 02 real path, `notes-todos-plans.mdx` verified via Task 11 real run); retained unverified runtime note banners across all 12 locales for subsystems lacking live real-provider smoke runs (`scheduled-tasks.mdx`, `multi-run.mdx`, `notifications.mdx`, `sessions-in-work.mdx`). Updated `packages/docs/README.md` to accurately delineate verified core orchestration from automated-only subsystem coverage.
- Hardened `WorkerShell` and `WorkerSession` against broker unavailability and validated capacity and eviction lifecycle suites.
- Remediation passes: synchronized 40 missing i18n keys across all 14 locales in `m4-lane-d.i18n.ts`; eliminated infinite `animate-pulse` animations; fixed `WorkerSession.listServices` to throw typed `ProjectionError(503, 'SERVICE_UNAVAILABLE')` on broker failure instead of returning `[]` empty success; aligned supervisor `ShellCoordinator` stream and stdin identity-sensitivity and caller session scoping; bounded stream UTF-8 slicing to safe code point boundaries; and updated `JobsSheetDialog.tsx` to preserve last valid logs in `<pre>` under `[role="alert"]` fetch error overlays.
- Synchronized `.workflow/development.md` with Task 14 closeout entries and verified migration design documents.
- Executed real-provider browser smoke and captured artifacts under `/home/shizuku/Project/ohpichamber-omp-artifacts/m4-verification-2026-11-05/`.

### Evidence Matrix

| Capability / Subsystem | Owning Task | Automated Producer Test (Root Gate) | Real-Provider / Live Observable Artifact | Exact Verified Level vs Current Gap |
|---|---|---|---|---|
| Workflows (`parentSessionId`, `agentId: null`) | Task 01 | `packages/web/server/lib/workflows/runtime.test.js`, `agent-session.test.js` (63 pass) | `/home/shizuku/Project/ohpichamber-omp-artifacts/m4-a-2026-11-05/real-provider-workflow-run.json` (`w1-reviewer-flow`) | **VERIFIED LIVE REAL-PROVIDER**: End-to-end workflow execution with live provider |
| Auto Model Routing & Model Roles | Task 02 | `packages/web/server/lib/routing/runtime.test.js`, `RoutingPage.test.tsx`, `smallModelRequest.test.ts` (142 pass) | `/home/shizuku/Project/ohpichamber-omp-artifacts/m4-a-2026-11-05/real-path-task02.json`, `routing-page.png`, `defaults-settings.png` | **VERIFIED LIVE REAL-PATH**: Resolved 16 model roles via `GET /workspaces/:id/settings` |
| Walkthrough Panel | Task 02 | `packages/web/server/lib/walkthrough/` (11 pass) | `/home/shizuku/Project/ohpichamber-omp-artifacts/m4-verification-2026-11-05/task02-walkthrough-panel-verified.png` | **UI SURFACE VERIFIED**: Panel surface rendered in live UI; helper prompt in `w17-live-provider-execution.json` |
| AI Git Commit / PR | Task 02 / gitApi | `small-model/client.test.js`, `smallModelRequest.test.ts` (12 pass) | Canonical `POST /api/agent/v1/workspaces/:id/completions` structured JSON commit completion (`CLIProxyAPI/gemini-3.8-flash`, HTTP 200 OK) | **CANONICAL ROUTE & PROVIDER VERIFIED**: Prompt completion verified; UI commit button workflow automated-only |
| Session Assist | Task 02 / session-assist | `packages/web/server/lib/session-assist/` (9 pass) | `w17-live-provider-execution.json` (role `smol` prompt completion) | **MODEL ROLE PROMPT RUN ONLY**: Live completion output verified; background assist turn automated-only |
| Retire Behavior & Dual Permissions | Task 03 | `SettingsView.test.tsx`, `worker-operation-authorizer.test.js` (125 pass) | `SettingsView.test.tsx` (behavior removed; OMP/Agents/MCP present); canonical `GET /sessions/:id/approvals` (HTTP 200 OK) | **AUTOMATED ROOT TEST & CANONICAL APPROVALS ROUTE**: Host auto-accept retired; OMP approval authority active |
| Tolerant MCP & Branch Revert | Task 04 | `packages/agent-service/src/worker/mcp.test.ts`, `session-native.test.ts` (119 pass) | `/home/shizuku/Project/ohpichamber-omp-artifacts/m4-verification-2026-11-05/task04-unmanaged-mcp-verified.png`, `POST /api/agent/v1/sessions/:id/branch` -> HTTP 409 `SESSION_BRANCH_CONFLICT` | **LIVE PROJECTION & CONFLICT VERIFIED**: Unmanaged `.omp/mcp.json` projected read-only (`managed: false`, secrets redacted) in Work Status UI; branch conflict handled without worker death |
| Settings Navigation & Naming | Task 05 | `SettingsView.test.tsx`, `packages/ui/src/lib/i18n/` (61 pass) | `/home/shizuku/Project/ohpichamber-omp-artifacts/m4-verification-2026-11-05/task05-settings-verified.png` | **LIVE UI NAVIGATION VERIFIED**: Settings window rendered with OMP, Agents, Commands, MCP, Providers |
| TUI Visuals (`out://`, SVG, tables, ast_edit diffs) | Task 06 | `packages/agent-service/src/worker/`, `packages/ui/src/components/chat/` (216 files pass) | `/home/shizuku/Project/ohpichamber-omp-artifacts/m4-d-2026-11-05/w9-smoke-receipt.json`, `w9-live-turn-verified.png`, `w9-read-group-smoke.png` | **VERIFIED LIVE REAL-PROVIDER**: Markdown SVG, data tables, and tool card rendering verified live |
| Subagent Live HUD, Steer & Cancel | Task 07 | `SubagentHudTray.test.tsx`, `session-native.test.ts`, `work-status/` (58 pass across 17 files) | Canonical `GET /api/agent/v1/subagents` (HTTP 200 OK `[]`), `POST /sessions/:id/control` `subagent.cancel` (HTTP 200 OK, `cancelled: false`), `subagent.steer` (HTTP 404 `SESSION_NOT_FOUND`) | **CANONICAL ROUTES & CONTROLS VERIFIED**: Endpoints active with strict owner validation; no live child subagent run |
| Timeline Notices & Compaction Divider | Task 08 | `projection-notices.test.ts`, `TimelineNoticeCard.test.tsx`, `SessionRecapSpacer.test.tsx` (18 pass) | `/home/shizuku/Project/ohpichamber-omp-artifacts/m4-d-2026-11-05/w11-smoke-receipt.json`, `w11-live-turn-verified.png` | **VERIFIED LIVE REAL-PROVIDER**: Timeline notices and compaction dividers rendered in live turn |
| 16 Model Roles & TUI Settings | Task 09 | `settings.test.ts`, `catalog-settings.test.ts`, `OmpSettingsPage.test.tsx` (14 pass) | `defaults-settings.png`, `routing-page.png`, `GET /workspaces/:id/settings` (HTTP 200 OK) | **VERIFIED LIVE REAL-SETTINGS**: Visual selectors and OMP modelRoles dictionary verified |
| Slash Commands, Magic Keywords & Ghost-text | Task 10 | `session-native.test.ts`, `slashCommands.test.ts`, `triggers.test.ts`, `tokenize.test.ts` (83 pass) | `/home/shizuku/Project/ohpichamber-omp-artifacts/m4-verification-2026-11-05/task10-slash-commands-verified.png`, `task10-magic-keywords-verified.png` | **LIVE UI COMPOSER VERIFIED**: Slash command autocomplete popup and magic keywords/turn budget rendered in live composer |
| Checkpoints, Rewind, /btw Promotion & Plan Autosave | Task 11 | `session-native.test.ts`, `PlanReviewCard.test.tsx`, `useBtwPanelState.test.ts` (99 pass) | `/home/shizuku/Project/ohpichamber-omp-artifacts/m4-c-2026-11-05/task11-smoke-receipt.json` | **VERIFIED REAL RUN**: 4 scenarios: checkpoint rewind, btw inject, `branchFromBtw`, `plan.autosave` |
| Background Jobs Sheet, proc:// & Job Widgets | Task 12 | `shell.test.ts` (3 pass), `JobsSheetDialog.test.tsx` + `BackgroundShellsStrip.test.tsx` (8 pass) | `/home/shizuku/Project/ohpichamber-omp-artifacts/m4-d-2026-11-05/w15-smoke-receipt.json`, `w15-jobs-sheet-verified.png`, `smoke-task12-real-sdk.mjs` | **VERIFIED REAL RUN & CANONICAL ROUTES**: Session-owned daemons, proc streams, stdin, widgets, and modal UI |
| Autonomous Loops, /omfg, /cleanse, Advisor | Task 13 | `session-native.test.ts` (49 pass, 309 expects) | Session control `POST /api/agent/v1/sessions/:id/control` with `{ type: 'loop.stop' }` returned `{ type: 'loop.stop', stopped: true }` (HTTP 200 OK) | **SESSION CONTROL ROUTE VERIFIED**: Loop stop control active; autonomous multi-turn loop execution automated-only |
| Core Turn Loop & Approval | Task 14 turn smoke | `node scripts/run-isolated-tests.mjs --suites` (7/7 suites pass) | `/home/shizuku/Project/ohpichamber-omp-artifacts/m4-verification-2026-11-05/w15-genuine-smoke-verified.png` | **VERIFIED LIVE REAL-PROVIDER**: Gemini 3.8 Flash session 9f0795c7, tool approval, sleep 5 background tool, proc read |
| Quota / UsageStatsView | Task 14 checklist | `usage.test.ts`, `canonical-usage-routes.test.js` | Canonical `GET /api/agent/v1/usage` and `GET /api/agent/v1/usage/tools` (HTTP 200 OK, 47,022 tokens, cost $0.0039067), `/home/shizuku/Project/ohpichamber-omp-artifacts/m4-verification-2026-11-05/task14-usage-view-verified.png` | **CANONICAL ROUTES & UI VIEW VERIFIED**: SQLite DB metrics queried via canonical routes and rendered in Settings Usage view |
| Scheduled Tasks (`goalEnabled`) | Task 14 checklist / runtime.js | `packages/web/server/lib/scheduled-tasks/runtime.test.js`, `ScheduledTasksDialog.test.tsx` | Canonical `GET /api/openchamber/scheduled-tasks/status` (HTTP 200 OK), `/home/shizuku/Project/ohpichamber-omp-artifacts/m4-verification-2026-11-05/scheduled-tasks-view-verified.png` | **STATUS ROUTE & UI VIEW VERIFIED**: Scheduled tasks view and status route active; background schedule execution loop automated-only |
| Multi-run & Fusion | Task 14 checklist / fusion.ts | `ParallelComposerStrip.test.tsx`, `packages/ui/src/lib/multirun/fusion.test.ts` | `w17-live-provider-execution.json` (helper prompt consensus output) | **AUTOMATED ROOT TEST ONLY (NO LIVE RUN)**: UI composer mode present; live multi-lane execution turn automated-only |
| Guest Generate | routes.js / small-model | `packages/web/server/lib/guests/` | `w17-live-provider-execution.json` (role `smol` prompt output) | **MODEL ROLE PROMPT RUN ONLY**: Live prompt output verified; live guest generation turn automated-only |
| Browser Control | Task 14 checklist / shared-daemon | `packages/agent-service/test/tools/browser-*.test.ts` | `/home/shizuku/Project/ohpichamber-omp-artifacts/m4-verification-2026-11-05/task14-browser-panel-verified.png`, `POST /api/browser-control/claim` -> `{ granted: false }` | **UI PANEL & CLAIM ROUTE VERIFIED**: Browser panel rendered in UI; on-demand daemon attached=false; no live browser driver session |
| Linear & Work-Item Notifications | Task 14 checklist / linear | `packages/web/server/lib/notifications/`, `packages/web/server/lib/linear/` | `GET /api/linear/auth/status` -> `{ connected: false }` | **BLOCKED: EXTERNAL LINEAR OAUTH ACCOUNT NOT CONFIGURED** |

Check after:
- `bun run docs:validate` passed (672 pages, 56 sidebar links).
- `.workflow/bin/workflow validate` passed (213 task files).
- `bun run type-check` passed (clean across 3,225 files in 5 projects, 0 errors).
- `bun run lint` passed (clean across all workspaces, 0 errors).
- `bunx oxlint` passed across all modified source files (0 findings).
- Root gate `bun run test` (running `node scripts/run-isolated-tests.mjs --suites`): 7/7 workspace suites passed (scripts: 23/23, sdk: 26/26, ui: 1016/1016, agent-contract: 192/192, agent-service: 391 pass across 56 files [311.47s], electron: 54/54, web: 465 passed [7475 passed]). External log recorded at `/home/shizuku/Project/ohpichamber-omp-artifacts/m4-verification-2026-11-05/root-bun-test.log`.
- Targeted suites: `bun test packages/ui/src/components/chat/JobsSheetDialog.test.tsx packages/ui/src/components/chat/BackgroundShellsStrip.test.tsx` passed (8/8 pass, 45 assertions); `bun test packages/agent-service/src/worker/shell.test.ts` passed (3/3 pass, 32 assertions); `bun test packages/ui/src/lib/i18n/messages.test.ts` passed (10/10 pass, 4045 assertions across 14 locales); `bun test packages/ui/src/lib/infiniteAnimations.test.ts` passed (2/2 pass, 5 assertions).
- Real-provider verification receipt: `/home/shizuku/Project/ohpichamber-omp-artifacts/m4-verification-2026-11-05/m4-verification-receipt.json` (reflects exact verified levels: core real-provider turn + full root gate passed; UI/canonical routes verified where observed; remaining execution gaps automated-only; Linear OAuth blocked).
- W15 verification receipt: `/home/shizuku/Project/ohpichamber-omp-artifacts/m4-d-2026-11-05/w15-smoke-receipt.json`.
- Verified browser screenshots:
  - `/home/shizuku/Project/ohpichamber-omp-artifacts/m4-verification-2026-11-05/w15-genuine-smoke-verified.png`
  - `/home/shizuku/Project/ohpichamber-omp-artifacts/m4-d-2026-11-05/w15-jobs-sheet-verified.png`
  - `/home/shizuku/Project/ohpichamber-omp-artifacts/m4-verification-2026-11-05/task05-settings-verified.png`
  - `/home/shizuku/Project/ohpichamber-omp-artifacts/m4-verification-2026-11-05/task10-slash-commands-verified.png`
  - `/home/shizuku/Project/ohpichamber-omp-artifacts/m4-verification-2026-11-05/task10-magic-keywords-verified.png`
  - `/home/shizuku/Project/ohpichamber-omp-artifacts/m4-verification-2026-11-05/task02-walkthrough-panel-verified.png`
  - `/home/shizuku/Project/ohpichamber-omp-artifacts/m4-verification-2026-11-05/task14-browser-panel-verified.png`
  - `/home/shizuku/Project/ohpichamber-omp-artifacts/m4-verification-2026-11-05/task14-usage-view-verified.png`
  - `/home/shizuku/Project/ohpichamber-omp-artifacts/m4-verification-2026-11-05/scheduled-tasks-view-verified.png`
  - `/home/shizuku/Project/ohpichamber-omp-artifacts/m4-verification-2026-11-05/task04-unmanaged-mcp-verified.png`
