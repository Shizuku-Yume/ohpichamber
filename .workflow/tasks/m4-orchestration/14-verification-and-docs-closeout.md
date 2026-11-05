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

| Capability / Subsystem | Owning Task | Automated Producer Test (Root Gate) | Real-Provider / Live Observable Artifact | Status |
|---|---|---|---|---|
| Workflows (`parentSessionId`, `agentId: null`) | Task 01 | `packages/web/server/lib/workflows/runtime.test.js`, `agent-session.test.js` (63 pass) | `/home/shizuku/Project/ohpichamber-omp-artifacts/m4-a-2026-11-05/real-provider-workflow-run.json` (`w1-reviewer-flow`) | **VERIFIED LIVE** |
| Auto Model Routing & Model Roles | Task 02 | `packages/web/server/lib/routing/runtime.test.js`, `RoutingPage.test.tsx`, `smallModelRequest.test.ts` (142 pass) | `/home/shizuku/Project/ohpichamber-omp-artifacts/m4-a-2026-11-05/real-path-task02.json`, `routing-page.png`, `defaults-settings.png` | **VERIFIED LIVE** |
| Retire Behavior & Dual Permissions | Task 03 | `SettingsView.test.tsx`, `worker-operation-authorizer.test.js` (125 pass) | `SettingsView.test.tsx` (behavior removed; OMP/Agents/MCP present) | **AUTOMATED ONLY** |
| LSP, Tolerant MCP & Branch Revert | Task 04 | `packages/agent-service/src/worker/mcp.test.ts`, `session-native.test.ts` (119 pass) | `mcp.test.ts` (unmanaged `.omp/mcp.json` read-only CAS refusal) | **AUTOMATED ONLY** |
| Settings Navigation & Naming | Task 05 | `SettingsView.test.tsx`, `packages/ui/src/lib/i18n/` (61 pass) | `SettingsView.test.tsx` | **AUTOMATED ONLY** |
| TUI Visuals (`out://`, SVG, tables, ast_edit diffs) | Task 06 | `packages/agent-service/src/worker/`, `packages/ui/src/components/chat/` (216 files pass) | `/home/shizuku/Project/ohpichamber-omp-artifacts/m4-d-2026-11-05/w9-smoke-receipt.json`, `w9-live-turn-verified.png`, `w9-read-group-smoke.png` | **VERIFIED LIVE** |
| Subagent Live HUD, Steer & Cancel | Task 07 | `SubagentHudTray.test.tsx`, `session-native.test.ts`, `work-status/` (58 pass across 17 files) | `SubagentHudTray.test.tsx` + dev server mount check (`m4-e`) | **AUTOMATED ONLY** |
| Timeline Notices & Compaction Divider | Task 08 | `projection-notices.test.ts`, `TimelineNoticeCard.test.tsx`, `SessionRecapSpacer.test.tsx` (18 pass) | `/home/shizuku/Project/ohpichamber-omp-artifacts/m4-d-2026-11-05/w11-smoke-receipt.json`, `w11-live-turn-verified.png` | **VERIFIED LIVE** |
| 16 Model Roles & TUI Settings | Task 09 | `settings.test.ts`, `catalog-settings.test.ts`, `OmpSettingsPage.test.tsx` (14 pass) | `/home/shizuku/Project/ohpichamber-omp-artifacts/m4-a-2026-11-05/defaults-settings.png`, `routing-page.png` | **VERIFIED LIVE** |
| Slash Commands, Magic Keywords & Ghost-text | Task 10 | `session-native.test.ts`, `slashCommands.test.ts`, `triggers.test.ts`, `tokenize.test.ts` (83 pass) | Isolated unit tests across 194 chat files | **AUTOMATED ONLY** |
| Checkpoints, Rewind, /btw Promotion & Plan Autosave | Task 11 | `session-native.test.ts`, `PlanReviewCard.test.tsx`, `useBtwPanelState.test.ts` (99 pass) | `/home/shizuku/Project/ohpichamber-omp-artifacts/m4-c-2026-11-05/task11-smoke-receipt.json` (4 scenarios: checkpoint rewind, btw inject, `branchFromBtw`, `plan.autosave`) | **VERIFIED REAL RUN** |
| Background Jobs Sheet, proc:// & Job Widgets | Task 12 | `shell.test.ts` (3 pass), `JobsSheetDialog.test.tsx` + `BackgroundShellsStrip.test.tsx` (8 pass) | `/home/shizuku/Project/ohpichamber-omp-artifacts/m4-d-2026-11-05/w15-smoke-receipt.json`, `/home/shizuku/Project/ohpichamber-verification-2026-11-05/w15-genuine-smoke-verified.png`, `smoke-task12-real-sdk.mjs` | **VERIFIED REAL RUN** |
| Autonomous Loops (`/loop`, `/omfg`, `/cleanse`, `/tan`, `/seance`, Advisor) | Task 13 | `session-native.test.ts` (49 pass, 309 expects) | Unit tests in `session-native.test.ts`; dev server `/health` status check | **AUTOMATED ONLY** |
| Scheduled Tasks (`goalEnabled`) | Task 14 checklist | `packages/web/server/lib/scheduled-tasks/runtime.test.js`, `ScheduledTasksDialog.test.tsx` | None in artifacts directory | **AUTOMATED ROOT TEST ONLY** |
| Multi-run & Fusion | Task 14 checklist | `ParallelComposerStrip.test.tsx`, `packages/web/server/lib/multirun/` | None in artifacts directory | **AUTOMATED ROOT TEST ONLY** |
| Session Assist | Task 14 checklist | `packages/web/server/lib/session-assist/` | None in artifacts directory | **AUTOMATED ROOT TEST ONLY** |
| AI Git Commit / PR | Task 14 checklist | `small-model/client.test.js`, `smallModelRequest.test.ts` | None in artifacts directory | **AUTOMATED ROOT TEST ONLY** |
| Walkthrough | Task 14 checklist | `packages/web/server/lib/walkthrough/` | None in artifacts directory | **AUTOMATED ROOT TEST ONLY** |
| Guest Generate | Task 14 checklist | `packages/web/server/lib/guests/` | None in artifacts directory | **AUTOMATED ROOT TEST ONLY** |
| Notifications & Linear | Task 14 checklist | `packages/web/server/lib/notifications/`, `packages/web/server/lib/linear/` | None in artifacts directory | **AUTOMATED ROOT TEST ONLY** |
| Browser Control | Task 14 checklist | `packages/agent-service/test/tools/browser-*.test.ts` | None in artifacts directory | **AUTOMATED ROOT TEST ONLY** |
| Quota / UsageStatsView | Task 14 checklist | `usage.test.ts`, `canonical-usage-routes.test.js` | None in artifacts directory | **AUTOMATED ROOT TEST ONLY** |

Check after:
- `bun run docs:validate` passed (672 pages, 56 sidebar links).
- `.workflow/bin/workflow validate` passed (213 task files).
- `bun run type-check` passed (clean across 3,225 files in 5 projects, 0 errors).
- `bun run lint` passed (clean across all workspaces, 0 errors).
- `bunx oxlint` passed across all modified source files (0 findings).
- Root gate `bun run test` (running `node scripts/run-isolated-tests.mjs --suites`): 7/7 workspace suites passed (scripts: 23/23, sdk: 26/26, ui: 1016/1016, agent-contract: 192/192, agent-service: 391 pass across 56 files [311.47s], electron: 54/54, web: 465 passed [7475 passed]). External log recorded at `/home/shizuku/Project/ohpichamber-omp-artifacts/m4-verification-2026-11-05/root-bun-test.log`.
- Targeted suites: `bun test packages/ui/src/components/chat/JobsSheetDialog.test.tsx packages/ui/src/components/chat/BackgroundShellsStrip.test.tsx` passed (8/8 pass, 45 assertions); `bun test packages/agent-service/src/worker/shell.test.ts` passed (3/3 pass, 32 assertions); `bun test packages/ui/src/lib/i18n/messages.test.ts` passed (10/10 pass, 4045 assertions across 14 locales); `bun test packages/ui/src/lib/infiniteAnimations.test.ts` passed (2/2 pass, 5 assertions).
- Real-provider verification receipt: `/home/shizuku/Project/ohpichamber-omp-artifacts/m4-verification-2026-11-05/m4-verification-receipt.json` (reflects partial verification: core real-provider turn + full root gate passed; remaining 10 subsystems automated-only).
- W15 verification receipt: `/home/shizuku/Project/ohpichamber-omp-artifacts/m4-d-2026-11-05/w15-smoke-receipt.json`.
- Real-provider browser screenshots: `/home/shizuku/Project/ohpichamber-omp-artifacts/m4-verification-2026-11-05/m4-closeout-verified.png`, `/home/shizuku/Project/ohpichamber-omp-artifacts/m4-verification-2026-11-05/w15-genuine-smoke-verified.png`, and `/home/shizuku/Project/ohpichamber-omp-artifacts/m4-d-2026-11-05/w15-jobs-sheet-verified.png`.
