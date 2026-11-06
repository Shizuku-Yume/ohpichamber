# 03: Phase 1 Audit List C — UI design system, PATTERNS.md / STYLING.md compliance, and visual audit

**Effort:** m6-audit-and-polish
**Task type:** spike
**Base commit:** 76112ae00a5a8499ae4cbbd8077148c72f583eb6
**Started:** 2026-11-06
**Finished:** 2026-11-06
**Blocked by:** None
**Covers:** W1
**Files:** `.workflow/research/m6-audit-list-c-ui-compliance.md`
**Read first:** `.workflow/specs/m6-audit-and-polish.md`; `packages/ui/src/components/sections/PATTERNS.md`; `packages/ui/src/lib/theme/STYLING.md`
**Check:** `test -s .workflow/research/m6-audit-list-c-ui-compliance.md && grep -q 'ProvidersPage' .workflow/research/m6-audit-list-c-ui-compliance.md && grep -q 'OmpSettingsPage' .workflow/research/m6-audit-list-c-ui-compliance.md && grep -q 'WebSearch' .workflow/research/m6-audit-list-c-ui-compliance.md && .workflow/bin/workflow validate` → exits 0 with complete visual and code compliance audit and screenshot evidence.

- [x] Inspect every fork-authored or fork-modified Settings section and UI component against `upstream/main` (`0056bf6a9`), `packages/ui/src/components/sections/PATTERNS.md` (plus `patterns/*.md`), and `packages/ui/src/lib/theme/STYLING.md` (plus `themes/*.md`).
- [x] Launch the live Web UI on an isolated port, drive every Settings page and fork-modified chat/workbench surface in headless Chrome across dark and light themes, and capture screenshots under `/home/shizuku/Project/ohpichamber-omp-artifacts/m6-phase1-audit-2026-11-06/screenshots/`.
- [x] Document exact code and visual violations (`PATTERNS.md` / `STYLING.md` rules broken, raw HTML/un-tokenized classes, missing shared primitives, cramped/broken layouts, test-only markup, missing i18n keys) and concrete redesign blueprints for `ProvidersPage.tsx`, `WebSearch` settings, `OmpSettingsPage.tsx`, `RoutingPage.tsx`, `DefaultsSettings.tsx`, `SkillsCatalogPage.tsx`, `PluginsPage.tsx`, `McpPage.tsx`, `SlashCommandsPage.tsx`, and chat/composer/sidebar additions.

## Findings

Exhaustive visual and code compliance audit completed and documented at `.workflow/research/m6-audit-list-c-ui-compliance.md` (74 KB).

Key findings:
1. **ProvidersPage (+811/-835):** Inner auth card uses rounded border box at line 368 violating flat section patterns; device `isMobile` branch at line 464 instead of container queries (`@xl:`); raw `<button>` for model hide/show at line 501; `h-4 w-4` icon classes and `!font-normal` overrides; raw label/input in `ProviderApiKeyForm`; raw `w-full` trigger in `CustomProviderForm`. Redesign blueprint restores flat section, shared Button icon, `SettingsStackedField`, `size-*` classes, and standard trigger.
2. **WebSearchPage (+287/-315):** Rewritten into inline radio/fallback/timeout rows vs upstream `SettingsCard` grid and master-detail; `showSaveStatus` at line 367 is not wired to `reportSettingsSaveState`; raw number input at lines 205-225 instead of `NumberInput` inside standard stepper row; non-standard `h-8` controls; `SelectValue` child render function at line 187; search items `web-search.fallbacks` and `web-search.timeout` unindexed.
3. **OmpSettingsPage (+658 fork-added):** Uses viewport `sm:` breakpoint at line 241 instead of container queries (`@xl:`); production `data-testid` attribute at line 224; raw typography, `bg-muted`, `text-[10px]`; hardcoded English aria label at line 263; fixed `w-[140px]` trigger width at line 300; rendered model role and dynamic settings anchors omitted from `search.ts` (only 1 omnibus `omp.behaviour` entry).
4. **RoutingPage (+18/-34):** Hardcoded `'Off'` fallback at line 86; raw `<button>` at line 124; 3 direct children in `SettingsTwoColumn` at line 142 causing orphaned grid cell; `h-8` inputs and `w-full` variant select.
5. **DefaultsSettings (+26/-511):** Stripped down to 45 lines with zero defaults remaining; rendered redundantly in `OpenChamberPage.tsx` on both General tab (line 56) and Sessions tab (line 203). Blueprint renames to "Session Behavior" and prunes duplicate General tab invocation.
6. **Auxiliary Settings Defects:** Physical RTL regressions in `SkillsCatalogPage.tsx` (lines 429-476), `ScheduledTaskEditorDialog.tsx` (lines 265, 398, 431), and `UsagePage.tsx` (lines 256, 308); invalid CSS class `typography-label` in `PluginsPage.tsx` (lines 241, 716) and `PluginStatusBanner.tsx` (line 43); raw clipboard access in `McpPage.tsx` (line 229); stale command references (`commands.variant`, `commands.subagent`) and missing argument anchors in `CommandsPage.tsx` / `search.ts`; static color map in `ScheduledTasksDialog.tsx` (line 248).
7. **Chat & Workbench Defects (39 clusters across 21 named components):** 8 critical, 5 major, 8 moderate, 18 minor/directional. Critical issues include generic Tailwind palette colors (`emerald`, `rose`, `amber`, `blue`, `violet`, `green`, `red`) and fake non-existent utilities (`bg-surface-1`, `bg-surface-2`, `bg-surface-3`) in `JobsSheetDialog.tsx` and `BackgroundShellsStrip.tsx`; hardcoded prediction starter copy and Tab key in `ChatInput.tsx`; 23 hardcoded English descriptions for builtin slash commands in `CommandAutocomplete.tsx`; raw HTML buttons with direct DOM hover style mutation and raw HTML spinners in `PermissionActions.tsx`; compaction divider translations completely missing across 11 production dictionaries in `SessionRecapSpacer.tsx`.
8. **Live Headless Browser Walkthrough:** Executed via Chrome DevTools CLI on port 5223 (API 3953) with isolated context `m6-audit-c` at 1440x900 across dark and light themes. 26 screenshots captured under `/home/shizuku/Project/ohpichamber-omp-artifacts/m6-phase1-audit-2026-11-06/screenshots/`. Observed dark theme has high contrast, while light theme subtle borders appear faint. Identified live runtime limitation: OMP Settings backend endpoint `/api/agent/v1/workspaces/:workspaceId/omp/settings` returned HTTP 404 `NOT_IMPLEMENTED`. Unreached pages (MCP, Plugins, Commands, Scheduled Tasks dialog) honestly noted. Server cleanly terminated and ports freed.

## Progress

- [x] Read assigned brief, `common.md`, task file, `m6-audit-and-polish.md` spec, `PATTERNS.md`, and `STYLING.md`.
- [x] Conducted static code inspection and diff sweeps against upstream baseline `0056bf6a9` across all fork-authored/modified Settings and Chat/Workbench components.
- [x] Executed live Web server on isolated ports (`5223` / `3953`), navigated reachable surfaces in headless Chrome, and verified 26 dark/light screenshots in `/home/shizuku/Project/ohpichamber-omp-artifacts/m6-phase1-audit-2026-11-06/screenshots/`.
- [x] Authored authoritative comprehensive audit report `.workflow/research/m6-audit-list-c-ui-compliance.md`.
- [x] Copied deliverable byte-for-byte to `/home/shizuku/Project/ohpichamber-omp-artifacts/m6-phase1-audit-2026-11-06/m6-audit-list-c-ui-compliance.md`.
- [x] Verified Check command and `.workflow/bin/workflow validate` pass with exit code 0.
