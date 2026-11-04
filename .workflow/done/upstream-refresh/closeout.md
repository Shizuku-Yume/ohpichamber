# Closeout: upstream-refresh

**Accepted:** 2026-11-04 by user ("可以 现在合并归档")

## Shipped

Upstream OpenChamber area refresh from adopted baseline `1f9320062` (2026-10-10) to `0056bf6a9` (v2.5.2+1, 2026-10-26, 813 non-merge upstream commits). All 35 tasks (01–35 across 9 lanes) landed and verified with fork OMP invariants preserved:

- **01 Security & lost-state fixes:** simple-git 4.0.2 update, passkey sign-in rate limiting, GitLab OAuth refresh lock, safe.directory preservation, bounded terminal replay parsing, and session link/prompt/settings/working directory/inbox/archive/search fixes.
- **02 Toolchain & root contract:** TypeScript 7 (~7.0.2), Bun 1.4.4, oxlint 1.88, Electron 44 (^44.9.3), regenerated bun.lock, fork version preserved at 3.0.0 (mobile 1.13.2).
- **03 Mobile, extensions, scripts:** Capacitor mobile asset refresh, built-in extension builds, workspace scripts test pass.
- **04 Guest SDK v2 transport:** Private MessagePort v2 transport, SDK contract version 3.0.0, SDK test pass.
- **05 Electron shell:** Native desktop shell adaptation, packaging configuration, and Linux AppImage verification.
- **06 Source-control host providers:** GitHub Enterprise, Gitea, Gerrit, Forgejo, and GitLab provider modules with checked token host guards.
- **07 Review surfaces & Board:** Board issue/PR listing, Git/Files/diff views, and multi-file diff scrolling.
- **08 Sessions & sidebar:** Session grouping, multi-run row display, and sidebar navigation.
- **09 Layout, works & worktrees:** Works view, workspace layouts, and worktree checkout views.
- **10 Design system & rebranding:** Theme tokens, brand assets, and UI components.
- **11 Settings pages:** Grouped settings navigation, provider configuration, and search settings.
- **12 Markdown & diff rendering:** Markdown preview, syntax highlighting, and unified/split diff presentation.
- **13 Chat message surface:** Message rendering, role indicators, and transcript interaction.
- **14 Chat work status:** Live status chips, step telemetry, and work indicators.
- **15 Composer attachments & permissions:** File/image attachments, permission prompts, and token management.
- **16 Project knowledge & agent tool:** Project knowledge store and agent tool integration.
- **17 Workflows:** Workflow run cards, workflow definitions, and trigger handling.
- **18 Integrations catalog:** Integration cards, provider connection flows, and directory views.
- **19 Tunnels, relay & notifications:** Relay client, tunnel management, and notification center.
- **20 i18n & RTL:** Full internationalization strings and Arabic/Hebrew RTL layout support.
- **21 Diagnostics, overview & quota:** Diagnostic telemetry, workspace overview, and quota displays.
- **22 Web host core:** Web gateway routing, API endpoints, and session management.
- **23 UI state, sync & stores:** Global session stores, sync subscriptions, and cache invalidation.
- **24 UI integration hooks & apps:** UI provider hooks and external application connectors.
- **25 UI misc surfaces:** Palette, shortcuts, dialogs, and helper components.
- **26 English product documentation:** Comprehensive English docs refresh and sidebar.config.json.
- **27 Product docs (de, es, fr, nl):** Translated product documentation for German, Spanish, French, and Dutch.
- **28 Product docs (pl, pt-br, tr, uk):** Translated product documentation for Polish, Brazilian Portuguese, Turkish, and Ukrainian.
- **29 Product docs (ja, ko, zh-cn) & assets:** Japanese, Korean, Simplified Chinese docs, and brand/animation assets.
- **30 Gate, authoritative records & history link:** Full gate verification, successor baseline record pinning 0056bf6a9, and git merge -s ours 0056bf6a9.
- **31 Desktop one-view sidebar redesign:** Unified desktop one-view sidebar model with v12 settings migration.
- **32 Mobile one-view sheet:** Mobile session sheet adaptation using one-view row model and v13 store migration.
- **33 Project repository batch routes:** Host batch repository resolution routes and space-boundary integration.
- **34 Change-Id amend route:** Change-Id generation/amend route and walkthrough invalidation wiring.
- **35 Worktree archive:** Host worktree archive/restore/delete endpoints, worker lease, supervisor restart hold, and Archive page recovery.

### W-Check Results

- **W1 (Path Coverage Reconciliation):** Pass. All 4,031 paths in `1f9320062..0056bf6a9` reconciled (2,932 adoption paths across tasks 01–25, 392 documentation paths across tasks 26–29, 707 approved exclusions across 10 categories, 0 unassigned).
- **W2 (Security & Lost-State Fixes):** Pass. Task 01 fixes verified; token host validation in Task 06 verified.
- **W3 (Toolchain Contract):** Pass. Clean frozen install, type-check, lint, and test pass with TypeScript 7, Bun 1.4.4, oxlint 1.88, Electron 44; versions 3.0.0 / 1.13.2 preserved.
- **W4 (Small Areas):** Pass. Mobile assets build, extensions build, scripts pass, Guest SDK v2 transport verified, Linux Electron packages and launches.
- **W5 (Source-Control Hosts & Review Surfaces):** Pass. Board, diff views, and host providers exercised; token security verified.
- **W6 (UI Features):** Pass. All 14 feature areas exercised with real runtime and recorded observations.
- **W7 (Documentation):** Pass. `bun run docs:validate` exits 0 (672 pages, 56 sidebar links); zero OpenCode claims.
- **W8 (Current Receipts):** Pass. Tip full gate clean: frozen install (0), type-check (0 errors across 5 projects / 3,190 files), lint (0 across all workspaces), root tests (7/7 suites: scripts 23/23, SDK 26/26, UI 993/993, agent-contract 178/178, agent-service 265 passed / 7 skipped, Electron 54/54, Web 468 files / 7,480 tests), dead-code inspected vs baseline (17 unused files, 0 new unused files vs baseline per Task 30 / Task 07; knip exit 1 as expected with 0 new dead code), docs:validate (0), electron:build (Linux AppImage packaged), packaged launch under Xvfb (`GET /api/agent/v1/ready` 200 `ready:true, engine:omp`), real-provider chat completed (`capabilities.real-provider` passed, 0 secrets exposed). Receipt stored under `/home/shizuku/Project/ohpichamber-omp-artifacts/upstream-refresh-30-2026-11-04/`.
- **W9 (History Link):** Pass. `git merge -s ours 0056bf6a9` established on integration branch (`d50d670326`); tree SHA identical to pre-merge tip (`722d7a095c`); `0056bf6a9` is an ancestor of HEAD.
- **W10 (Authoritative Records):** Pass. Authoritative successor baseline `.workflow/upstream-refresh-2026-10-27.json` created; `.workflow/upstream-baseline.json` marked historical; `upstream-review.md` and `development.md` aligned; zero documents claim upstream 2.5.2.
- **W11 (Tree Scan):** Pass. 0 `packages/vscode`, 0 `lib/opencode-trust`, 0 OpenCode engine directory, 0 fallback adapter.

## Key decisions & plan changes

### Decisions

- `2026-10-27 - Adopt the upstream-first area refresh now`: Full area refresh to 0056bf6a9 including features.
- `2026-10-27 - Do not adopt upstream folder trust`: Declined opencode-trust porting; omitted from fork.
- `2026-10-27 - Keep the fork version at 3.0.0`: Retained fork versions 3.0.0 (mobile 1.13.2).
- `2026-10-27 - Bump the toolchain before refreshing ui and web`: TypeScript 7, Bun 1.4.4, oxlint 1.88, Electron 44 adopted in task 02.
- `2026-10-27 - Refresh paths three-way from the adopted baseline`: Per-path three-way content merge from 1f9320062.
- `2026-10-27 - Plan the refresh on an integration branch`: Plan and execution on upstream-refresh/integration branch to isolate main's uncommitted work.
- `2026-10-27 - Link upstream history with an ours merge`: Merge -s ours 0056bf6a9 to enable natural merge-base on future syncs.
- `2026-10-27 - Lint with oxlint only`: Deleted eslint config; oxlint with anti-slop rules is sole linter.
- `2026-10-27 - Wire the RTL lint rule but leave it off until the RTL conversion`: Deferred no-physical-sides rule to task 20.
- `2026-10-27 - Take upstream's bun patch set and drop the dead @ark/schema entry`: Updated bun patches to match upstream dependencies.
- `2026-10-27 - Do not track a .env file`: Removed tracked .env file; kept in .gitignore.
- `2026-10-27 - Leave the source-control SDK example to task 04`: Handled SDK example in task 04 rather than task 02.
- `2026-10-30 - Invalidate branch walkthrough status on Change-Id amend`: Wired onBranchRewritten to walkthrough invalidation.

### Plan changes

- Tasks 31 and 32 added for desktop one-view sidebar redesign and mobile sheet adaptation.
- Task 33 added for Host batch repository resolution routes.
- Task 34 added for Change-Id amend route and client contract.
- Task 35 added for Host worktree archive/restore/delete service, routes, worker lease, and supervisor restart hold.
- All 35 tasks completed and archived under `.workflow/done/upstream-refresh/`.

## Remaining debt & follow-ups

- **Technical debt items recorded in `technical-debt.md`:**
  - `Session unread state has no OMP source` (deferred by task 23; needs Host-owned viewed watermark).
  - `Session pins have no OMP source` (deferred by task 23; needs Host-owned pin state).
  - `Terminal shutdown test races its own SIGTERM record` (pre-existing contention race under load).
  - `Workspace session listing failure on transient supervisor errors, in-flight commands, or removed worktrees` (needs isolated workspace listing degradation).
  - `Session create cannot set a parent link` (subagent-only parentSessionId; workflow agents created at root).
  - `Root test contention flakes under multi-suite load` (concurrency contention in capacity eviction test under multi-suite load).
  - `Turn stats Elapsed 0.0s on turns with tool calls` (telemetry uses virtual user message timestamp instead of Turn record).
  - `Host tool errors collapse to SERVICE_UNAVAILABLE` (ProblemCode mapping envelope for tool errors).
  - `Per-session warming has no Agent Service implementation` (workspace warming works; per-session control deleted).
  - `Session relocation can race worktree archive before admission` (needs dedicated concurrency boundary for pre-admission move).
- **Documented limits:**
  - `ripgrep` for `GET /api/fs/find-in-files`: optional `@vscode/ripgrep` dependency or bundled binary deferred pending maintainer decision.
  - Platform coverage: non-Linux desktop (macOS/Windows) and physical mobile devices (Pixel 8 / iPhone) remain unverified pending hardware access.
  - Live external tunnels/cloud providers without operator credentials remain unverified as planned.
