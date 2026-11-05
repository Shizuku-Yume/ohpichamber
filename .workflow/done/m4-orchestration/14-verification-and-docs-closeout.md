# 14: Run end-to-end M4 & OMP TUI parity verification and remove unverified M4 product doc banners

**Effort:** m4-orchestration
**Task type:** feature
**Blocked by:** 01, 02, 03, 04, 05, 06, 07, 08, 09, 10, 11, 12, 13
**Files:** `packages/docs/content/docs/`, `.workflow/omp-migration/scope.md`, `.workflow/omp-migration/implementation-plan.md`, `.workflow/omp-migration/architecture.md`, `.workflow/omp-migration/contracts.md`, `.workflow/omp-migration/README.md`, `AGENTS.md`, `.workflow/development.md`
**Read first:** `.workflow/specs/m4-orchestration.md`; `.workflow/standards.md`; `.workflow/done/post-m3-hardening/24-docs-truth-pass.md`
**Covers:** W17, W18
**Check:** `bun run docs:validate`, `.workflow/bin/workflow validate`, `bun run type-check`, `bun run lint`, and root `bun run test` exit 0; real-provider verification receipt and screenshots recorded under `/home/shizuku/Project/ohpichamber-omp-artifacts/m4-verification-<date>/`.
- **Base commit:** b3fcef1a9257ee7064b388a8816654e15dbddae2

- [x] Execute focused automated suites and a real-provider smoke run across all M4 orchestration features (`Workflows`, `Routing`, `Scheduled Tasks` with `goalEnabled`, `Multi-run` & `Fusion`, `Session Assist`, `AI Git Commit/PR`, `Walkthrough`, `Guest generate`, `Notifications` & `Linear`, `Browser Control`, `Quota`/`UsageStatsView`) and OMP TUI parity features (`out://`, inline SVG/table charts, `ast_edit` diffs, `ReadToolGroup`, Subagent HUD + steer/cancel, timeline notices & compaction divider, 16 `modelRoles` selectors, extended slash commands & magic keywords, `checkpoint`/`rewind` & `branchFromBtw`, Jobs Sheet, `/loop`/`/omfg`/`/cleanse`/`/tan`/`/seance` & Advisor).
- [x] Remove the unverified M4 warning banners and retired root-agent instructions from `auto-model-routing.mdx`, `scheduled-tasks.mdx`, `multi-run.mdx`, `notifications.mdx`, `sessions-in-work.mdx`, and `notes-todos-plans.mdx` across English and all 11 translated locales.
- [x] Synchronize `.workflow/development.md` and migration design documents (`scope.md`, `implementation-plan.md`, `architecture.md`, `contracts.md`, `README.md`, `AGENTS.md`) and pass the full root gate.

## Progress

Check before:
- Product documentation across all 12 locales contained unverified warning banners labeling M4 orchestration features as unverified on the OMP runtime.
- `packages/docs/README.md` described M4 features as intended behavior rather than verified runtime behavior.
- Full root gate verification required across all 13 landed M4 feature areas.

Work:
- Removed unverified warning banners across all 12 locales in `packages/docs/content/docs/` (72 localized `.mdx` files: `auto-model-routing.mdx`, `scheduled-tasks.mdx`, `multi-run.mdx`, `notifications.mdx`, `notes-todos-plans.mdx`, `sessions-in-work.mdx`).
- Updated `packages/docs/README.md` to state that M4 orchestration and OMP TUI parity features are verified on the OMP runtime.
- Hardened `WorkerShell` and `WorkerSession` against broker unavailability and validated capacity and eviction lifecycle suites.
- Remediation passes: synchronized 40 missing i18n keys across all 14 locales in `m4-lane-d.i18n.ts`; eliminated infinite `animate-pulse` animations; fixed `WorkerSession.listServices` to throw typed `ProjectionError(503, 'SERVICE_UNAVAILABLE')` on broker failure instead of returning `[]` empty success; aligned supervisor `ShellCoordinator` stream and stdin identity-sensitivity and caller session scoping; bounded stream UTF-8 slicing to safe code point boundaries; and updated `JobsSheetDialog.tsx` to preserve last valid logs in `<pre>` under `[role="alert"]` fetch error overlays.
- Synchronized `.workflow/development.md` with Task 14 closeout entries and verified migration design documents.
- Executed real-provider browser smoke and captured artifacts under `/home/shizuku/Project/ohpichamber-omp-artifacts/m4-verification-2026-11-05/`.

Check after:
- `bun run docs:validate` passed (672 pages, 56 sidebar links).
- `.workflow/bin/workflow validate` passed (213 task files).
- `bun run type-check` passed (clean across 3,225 files in 5 projects, 0 errors).
- `bun run lint` passed (clean across all workspaces, 0 errors).
- `bunx oxlint` passed across all modified source files (0 findings).
- Root gate `bun run test` (running `node scripts/run-isolated-tests.mjs --suites`): 7/7 workspace suites passed (scripts: 23/23, sdk: 26/26, ui: 1016/1016, agent-contract: 192/192, agent-service: 391 pass across 56 files [311.47s], electron: 54/54, web: 465 passed [7475 passed]). External log recorded at `/home/shizuku/Project/ohpichamber-omp-artifacts/m4-verification-2026-11-05/root-bun-test.log`.
- Targeted suites: `bun test packages/ui/src/components/chat/JobsSheetDialog.test.tsx packages/ui/src/components/chat/BackgroundShellsStrip.test.tsx` passed (8/8 pass, 45 assertions); `bun test packages/agent-service/src/worker/shell.test.ts` passed (3/3 pass, 32 assertions); `bun test packages/ui/src/lib/i18n/messages.test.ts` passed (10/10 pass, 4045 assertions across 14 locales); `bun test packages/ui/src/lib/infiniteAnimations.test.ts` passed (2/2 pass, 5 assertions).
- Real-provider verification receipt: `/home/shizuku/Project/ohpichamber-omp-artifacts/m4-verification-2026-11-05/m4-verification-receipt.json`.
- W15 verification receipt: `/home/shizuku/Project/ohpichamber-omp-artifacts/m4-d-2026-11-05/w15-smoke-receipt.json`.
- Real-provider browser screenshots: `/home/shizuku/Project/ohpichamber-omp-artifacts/m4-verification-2026-11-05/m4-closeout-verified.png`, `/home/shizuku/Project/ohpichamber-omp-artifacts/m4-verification-2026-11-05/w15-genuine-smoke-verified.png`, and `/home/shizuku/Project/ohpichamber-omp-artifacts/m4-d-2026-11-05/w15-jobs-sheet-verified.png`.
