# Closeout: ux-feedback-2026-11-15

**Accepted:** 2026-11-18 by maintainer

## Shipped

Resolved all seven maintainer feedback items from the `main` (`1fc6270437`) packaged-build review (Round 1, Tasks 01–13, W1–W11) and all five Round-2 Settings follow-up defects reported against the Round-1 candidate (Round 2, Tasks 14–19, W12–W17) on `ux-feedback-2026-11-15/integration` (tip `fcbb129bdf` / `57564bf232`).

### Round 1 (Tasks 01–13, W1–W11)

- **Tool tier authorization & Vibe mode (Task 01, W1):** Worker resolves each tool's declared `approval` tier from the live session registry and sends `declaredTier` on `policy.request`. Host authorizer classifies tools by `declaredTier` after argument-aware checks, removing the hard-coded read/write name arrays and fall-through deny; `requestNativeGrant` no longer requires an open turn; `permissionAutoAccept` is persisted as a `profile` registry key; registry coverage test boots a worker and enumerates `getAllToolNames()` across `main`, `plan`, and `vibe` modes plus MCP and extension probes.
- **Todo visibility (Task 02, W2):** Added `hasTodoTasks` and `hasOpenTodo` in `todoProgress.ts`. `TodoCard` returns `null` when a todo result has no tasks; `TodoTray` renders only while an open task exists and clears when a plan completes or is cleared.
- **Reasoning paragraphs & line breaks (Task 03, W3):** `cleanReasoningText` preserves blank lines, collapses runs, and strips `<!-- -->` sentinels outside code fences; an in-repo remark plugin (`remarkLineBreaks.ts`) renders in-paragraph single newlines as `<br>` for the `reasoning` variant only, with streaming and settled parity.
- **MCP sign-in on install, runtime OAuth redirects & catalog env inputs (Tasks 04–06, W4):** Unified auth classifier returns `saved-needs-auth` and mounts `McpOAuthSignIn` with auto-start and 1.5 s polling; `#runOAuthFlow` uses `resolveMcpOAuthEndpointsFromServer` and surfaces provider refusals (including Figma closed DCR with client-ID input); local desktop uses pinned loopback `http://localhost:38471/callback` while remote/mobile runtimes route through `GET /api/agent/v1/mcp/oauth/callback` with Host-held `state` validation and `403 enterprise_mode` gating; local catalog servers declare `envInputs` stored via `envCredentialRefs` at project scope.
- **Settings row pattern, control sizes & spacing scale (Task 07, W5):** `SettingsSection.tsx` aligns trailing controls on `SettingsFieldRow` and defines shared width and spacing classes; `OmpRowControl` renders numbers, strings, and enums as field rows; page-local `space-y-6` wrappers, ad-hoc widths, and pane viewport breakpoints were removed and enforced by `settingsLayoutGuard.test.ts`.
- **OMP settings tabs, presets & 15-locale copy (Task 08, W6):** Replaced declaration-order grouping with `ompSettingsLayout.ts` across four impact-ordered tabs (`常用`, `编辑与读取`, `执行与工具`, `高级`), localized labels/descriptions/options/units across 15 locales, added the four-key `read.summarize.*` preset, generated per-row search anchors with tab deep-linking, and marked 5 terminal-only (`tui-only`) and 2 egress (`boundary`) rows off the page.
- **Routing categories & Web search fallbacks (Tasks 09–10, W7–W8):** Added `SettingsDisclosure` and rewrote Routing categories as flat disclosures with valid-draft-only saves; moved Web search timeout to the first section with the shared stepper class and replaced the narrow fallback list with full-width `SettingsSortableList` rows and a `DropdownMenu` add action.
- **Providers & Models dialog (Tasks 11–12, W9–W10):** `ProviderAuthState` exposes `environment: { variable, active }` (name only) for env-backed built-in cards alongside key entry; unified `isValidProviderID`, relaxed custom base URLs for query strings (`?api-version=`), and aligned MCP server IDs with OMP's rule; replaced `CustomProviderModelDiscovery` with `CustomProviderModelsDialog` supporting `Add all`, `Remove stale`, and `Try to fill in model info` (bundled `@oh-my-pi/pi-catalog` offline, then OpenRouter ids-only via Host with `403 enterprise_mode` gating).
- **Round-1 acceptance & fix wave (Task 13, W11):** Fixed walker-discovered defects across 4 AppImage rounds and Web 1600 px (`34e7f9ba87`–`0986f1f815`), including restoring `MessageBody` slice consumption dropped in an earlier merge (`1d8d191ab3`, `b6a5ca3f47`), 28 px vs 32 px dialog icon button separation (`9aaf5d00fa`), `CLIProxyAPI` discovery credential cascade (`fd3d0dd10f`), cold-start directory binding (`ea3feade34`), and English tab-strip intrinsic sizing (`0986f1f815`).

### Round 2 (Tasks 14–19, W12–W17)

- **Select width, left-column option subtext & page-placed option i18n (Task 14, W12):** Restored hug-with-cap sizing (`w-fit min-w-[8ch] max-w-[28ch]`) on `SETTINGS_WIDTH_SELECT_CLASS`, moved `OmpRowControl` selected-option descriptions under the left field label via `SettingsFieldRow`'s `description` prop, and localized all `page`-placed Sampling/OMP option labels and descriptions across 15 locales.
- **OMP `config.yml` footer cleanup (Task 15, W13):** Removed the `placementCounts` audit sentences and raw `configPath` small print from the Advanced tab's `omp.configFile` footer, retaining the `打开 config.yml` action, and removed unused `placementCounts` schema fields and locale keys.
- **Routing category creation dialog (Task 16, W14):** Replaced the inline empty-description category stub with an outline `+ 添加类别` button and `CreateRoutingCategoryDialog` (Name, Model, Thinking, Description) that validates before mutating or saving `routing.json`.
- **Web search fallback tiles (Task 17, W15):** Added `listClassName` / `rowClassName` to `SettingsSortableList` and styled fallback items as rounded `oc-tile` rows with drag handles, priority badges, actionable unconfigured setup links, and icon remove buttons.
- **Agents tool permissions redesign (Task 18, W16):** Rewrote `AgentPermissionsEditor` using a 3-way `SettingsChipGroup` (`Default` / `All available` / `None`), default-collapsed flat `SettingsDisclosure` groups with tri-state `accessory` checkboxes and `selected / total` counts, and single-line `SettingsCheckboxRow` items with `SettingsInfoHint` descriptions, preserving `null` / `[]` / `string[]` `allowedTools` semantics.
- **Round-2 acceptance & gate (Task 19, W17):** Verified W12–W17 on both Web (`1600×1000`, `zh-CN` and `en`) and a rebuilt Linux AppImage (`openchamber-ui://app/index.html`) with independent read-only code review and walkers.

## Key decisions & plan changes

- **Tier-based authorization over static name lists:** Host authorizes OMP tools using the live registry's `declaredTier` after argument-aware path/workspace/MCP/bash checks, rather than enumerating `vibe_*` or delegating boundary enforcement to OMP's `approvalMode`.
- **Dual MCP OAuth redirect strategy:** Local desktop keeps the pinned Agent Service loopback port (`38471`), while remote Web, mobile, and remote-Host desktop route through the Host callback `/api/agent/v1/mcp/oauth/callback`, gated by `403 enterprise_mode`.
- **Local catalog env installs scoped to project:** Catalog MCP servers declaring `envInputs` install at project scope only and store secrets as `envCredentialRefs` rather than plaintext in `.omp/mcp.json`.
- **Round-2 amendment (Tasks 14–19):** Reopened the effort after Task 13 on maintainer review of the packaged build (`feedback-2026-11-18/1..6-*.png`) to fix the five remaining Settings UI/UX defects before closing.

## Verification

- **Full gate on Round-2 integration tip (`57564bf232`, `/home/shizuku/Project/ohpichamber-omp-artifacts/ux-feedback-2026-11-18-r2/task19/gate/FINAL-SUMMARY.txt`):**
  - `bun run check`: exit 0 (5/5 steps: `tsc -b` 3,880 files / 5 projects, `upstream-drift` clean, `error-cause` 0, `css-classes` 2,260 tokens, `upstream-gaps` 662/662 allowlisted).
  - `bun run type-check`: exit 0 (root + electron + agent-contract + agent-service + mobile).
  - `bun run lint` + `oxlint` on all 51 changed files: exit 0 across 7 workspaces (0 errors; 0 warnings in changed files; 12 pre-existing untouched UI `react-hooks/exhaustive-deps` warnings).
  - `VITEST_MAX_WORKERS=2 bun run test`: exit 0 (7/7 suites passed — scripts 32/32, sdk 32/32, ui 1,247/1,247, agent-contract 265/0 across 27 files, agent-service 577 pass / 10 skip / 0 fail across 75 files, electron 71/71, web 527 pass / 9 skip files with 8,614 pass / 142 skip tests).
  - `bun run docs:validate`: exit 0 (696 pages, 58 sidebar links); `.workflow/bin/workflow validate`: exit 0 (309 task files).
  - `bun run dead-code`: exit 1 non-blocking on inherited backlog only (43 unused files / 166 unused exports / 115 unused exported types / 7 hints; 0 net-new findings).
- **Independent acceptance & code review:**
  - Round 1 (`/home/shizuku/Project/ohpichamber-omp-artifacts/ux-feedback-2026-11-16/task13/ACCEPTANCE.md`): 10 `PASS`, 2 `PARTIAL` (row 3 MCP sign-in, row 6c Models dialog enterprise decision), 30/30 settings pages `PASS` at 1600 px on AppImage and Web; `reviewer-fixes-1` issued `APPROVE` on `0986f1f815`.
  - Round 2 (`/home/shizuku/Project/ohpichamber-omp-artifacts/ux-feedback-2026-11-18-r2/task19/ACCEPTANCE-ROUND2.md`): W12–W17 all `PASS` on AppImage (`1cc3d175b2de…`) and Web (`1600×1000`, `zh-CN` & `en`, 43 screenshots); `independent-code-reviewer` audited `4f9a7c7f39..57564bf232` (63 files) and issued `APPROVE` (0 blocking, `settingsLayoutGuard.test.ts` 12/12).

## Waived checks & skipped reviews

None. Every task 01–19 completed its automated checks, real-path verification, and independent read-only review.

## Remaining debt & follow-ups

- **Maintainer-only manual verification items from Task 13 (`ACCEPTANCE.md`, left open for live external accounts/hardware rather than marked PASS by automated walkers):**
  - `M1`: Real-account Linear OAuth consent in the packaged AppImage.
  - `M2`: Second-machine and phone browser OAuth flow against a `0.0.0.0` Host.
  - `M3`: Real-account Figma OAuth flow with a manually registered client ID (or explicit waiver).
  - `M4`: Physical touch-screen long-press drag reorder on Web search fallbacks (CDP touch emulation passed).
  - `M6`: Maintainer policy confirmation on enterprise-mode UI removal + banner + `403` route refusal vs in-dialog refusal prompt for W10.
- **Non-blocking owner notes from Task 13 (`ACCEPTANCE.md`):** Minor pre-existing polish items outside the effort's scope (36 px header CTAs outside `[data-settings-page]`, `SortableTabsStrip` edge-fade token and `references/layout.md` doc entry, `skills.catalog.search` `mb-5` margin, `OMP Plugins` empty inspector vertical rule, proper-noun dialect labels in `tools.format`, and English `snapcompact.systemPrompt` label truncation at 12 px inside `@xl:w-56`).
