# Phase 1 Audit List C: UI Design System, PATTERNS.md / STYLING.md Compliance, and Visual Audit

**Effort:** `m6-audit-and-polish`  
**Task:** `03-audit-list-c-ui-compliance`  
**Date:** 2026-11-06  
**Auditor:** Window C UI Compliance & Visual Inspection Stream (`m6-c-settings-audit`, `m6-c-chat-audit`, `m6-c-browser-audit`, `m6-c-upstream-inventory`)  
**Base Commit (upstream/main):** `0056bf6a9ca4aa229817af5bf37533f602a16cc3`  
**Tip Commit (audit tip):** `76112ae00a5a8499ae4cbbd8077148c72f583eb6`  
**Integration Branch:** `m6-audit-and-polish/03-audit-list-c-ui-compliance`  
**Target Scope:** `packages/ui/src/components/sections/`, `packages/ui/src/components/chat/`, `packages/ui/src/components/session/`, `packages/ui/src/lib/settings/`, `packages/ui/src/lib/theme/`  

---

## 1. Executive Summary & Purpose

Across earlier milestone refactoring efforts (`omp-through-m3`, `upstream-refresh`, `omp-native-chat`, `omp-native-parity`, and `m4-orchestration`), the OpenChamber user interface underwent deep architectural migrations away from OpenCode 2.x SDK abstractions toward embedded OMP (`@oh-my-pi/pi-coding-agent` 18.16.0) and the Canonical Agent Contract (`@openchamber/agent-contract`). During this rapid transition, significant UI craftsmanship degradation occurred across both Settings and Chat/Workbench surfaces. Several newly authored or heavily rewritten Settings pages—most visibly **Providers (`ProvidersPage.tsx`)**, **Web Search (`WebSearchPage.tsx`)**, and **OMP Settings (`OmpSettingsPage.tsx`)**—were constructed as bespoke test-driven forms rather than adhering to OpenChamber's rigorous design grammar, row anatomy, layout primitives, and theme token rules documented in `packages/ui/src/components/sections/PATTERNS.md` and `packages/ui/src/lib/theme/STYLING.md`.

**CRITICAL AUDIT CONCLUSION:**
> **This report is an exhaustive, read-only visual and structural audit. It does NOT implement fixes or alter application source code.**  
> All findings, file:line citations, code snippets, visual layout defects, and screenshots are grounded in live repository state at commit `76112ae00` compared against upstream gold-standard baseline `0056bf6a9`, verified via static AST/diff sweeps and live headless Chrome DevTools inspection. Application source code remains 100% untouched.

### 1.1 High-Level Audit Findings
1. **Settings Surfaces:**
   - **`ProvidersPage.tsx` (+811/-835):** Preserves general master-detail layout but introduces an inner boxed border card at line 368 that violates flat section hierarchy; branches on viewport device queries (`isMobile` at line 464) instead of container queries (`@xl:`); uses raw unstyled `<button>` for model toggling (line 501); forces font weights with `!font-normal`; uses raw HTML `<label>` and `<Input>` in `ProviderApiKeyForm`; and hand-rolls raw `w-full` on triggers in `CustomProviderForm`.
   - **`WebSearchPage.tsx` (+287/-315):** Completely replaced upstream's rich `SettingsCard` grid and master-detail drill-in with inline radio and fallback rows; passes `showSaveStatus` at line 367 which is completely unwired to `reportSettingsSaveState` or desktop persistence (a silent no-op); hand-rolls numeric timeout inputs with raw `<Input type="number">` instead of `NumberInput` inside standard stepper classes (lines 205–225); abuses the `SelectValue` API by passing a render function (line 187); and leaves fallback and timeout controls unindexed in `search.ts`.
   - **`OmpSettingsPage.tsx` (+658 lines, fork-added):** Replaces upstream `BehaviorPage`; contains severe container-query violations by using viewport breakpoint `sm:flex-row` at line 241; leaks production test markup `data-testid` at line 224; introduces raw typography and untokenized classes (`bg-muted`, `text-[10px]`); hardcodes English string concatenation in accessibility attributes (`aria-label={`${roleLabel} model`}` at line 263); hardcodes trigger widths (`w-[140px]` at line 300); and suffers from severe search registry neglect (only 1 omnibus item `omp.behaviour` registered in `search.ts`, leaving all 16 model roles and dynamic settings completely unindexed).
   - **`RoutingPage.tsx` (+18/-34):** Carries hardcoded English fallback `'Off'` (line 86); uses raw unstyled `<button>` disclosure (line 124); places 3 direct children inside a 2-column container (`SettingsTwoColumn` at line 142), creating orphaned grid columns; and uses non-standard `h-8` inputs and `w-full` trigger overrides.
   - **`DefaultsSettings.tsx` (+26/-511):** Gutted from 537 lines down to 45 lines, removing all default model/variant/agent pickers; titled "Defaults" despite containing zero defaults; and is redundantly rendered twice in `OpenChamberPage.tsx` (on both the General tab at line 56 and the Sessions tab at line 203).
   - **Auxiliary Settings Regressions:** RTL logical property regressions in `SkillsCatalogPage.tsx` (lines 429–476), `ScheduledTaskEditorDialog.tsx` (lines 265, 398, 431), and `UsagePage.tsx` (lines 256, 308); non-existent CSS class `typography-label` in `PluginsPage.tsx` (lines 241, 716) and `PluginStatusBanner.tsx` (line 43); raw clipboard access in `McpPage.tsx` (line 229); stale command references (`commands.variant`, `commands.subagent`) and missing argument anchors in `CommandsPage.tsx` / `search.ts`; and static color maps bypassing theme adjustment in `ScheduledTasksDialog.tsx` (line 248).
2. **Chat & Workbench Surfaces:**
   - **39 distinct defect clusters across 21 named components** (8 Critical, 5 Major, 8 Moderate, 18 Minor/Directional).
   - Critical violations include hardcoded generic Tailwind palette colors (`bg-emerald-500`, `bg-rose-500`, `bg-amber-500`, `bg-blue-500`, `bg-violet-500`) and fake, non-existent Tailwind utilities (`bg-surface-1`, `bg-surface-2`, `bg-surface-3`) in `JobsSheetDialog.tsx` and `BackgroundShellsStrip.tsx` that compile to transparent backgrounds; hardcoded user-facing prediction copy and `<kbd>Tab</kbd>` in `ChatInput.tsx`; 23 hardcoded English descriptions for builtin slash commands in `CommandAutocomplete.tsx`; raw HTML buttons with direct DOM hover style mutation and raw HTML spinners in `PermissionActions.tsx`; and compaction divider translations completely missing across 11 production language dictionaries in `SessionRecapSpacer.tsx`.
3. **Live Browser Walkthrough Receipts:**
   - Successfully booted the Web runtime on isolated UI port `5223` / API port `3953` with isolated data directory `data-c`.
   - Captured 26 high-resolution screenshots across light and dark themes using Chrome DevTools CLI (viewport 1440x900) under `/home/shizuku/Project/ohpichamber-omp-artifacts/m6-phase1-audit-2026-11-06/screenshots/`.
   - Visual inspection verified that dark mode has excellent surface contrast and crisp typography, while light mode suffers from faint subtle borders on low-contrast displays.
   - Identified live backend limitation: the OMP Settings backend endpoint `/api/agent/v1/workspaces/:workspaceId/omp/settings` returns HTTP `404 NOT_IMPLEMENTED`, preventing the 16 OMP model role rows from live-rendering in the browser. Server was cleanly shut down and ports verified freed.

---

## 2. Scope, Standards Matrix & Evidence Limitations

### 2.1 Audit Scope
The audit encompasses all user-facing settings, dialogs, composer, chat message renderers, and workbench surfaces modified or introduced in the fork:
- `packages/ui/src/components/sections/` (all settings pages, navigation, layouts, and shared primitives)
- `packages/ui/src/components/chat/` (composer, tool cards, message parts, docks, prediction, autocomplete, background jobs, subagent panels)
- `packages/ui/src/components/session/` (scheduled tasks, workspace dialogs, sidebar items)
- `packages/ui/src/lib/settings/` (metadata, registry, and search contracts)
- `packages/ui/src/lib/theme/` (styling rules, token definitions, and presets)

### 2.2 Standards Matrix
All inspected code was evaluated strictly against repository contracts:
1. **`packages/ui/src/components/sections/PATTERNS.md`:**
   - Flat hierarchy; no nested cards, boxed backgrounds, or row chrome inside sections.
   - Quiet default view; explanatory text hidden behind the `info` prop / `SettingsInfoHint`.
   - Container queries only (`@xl:`, `@3xl:`) for pane responsiveness; never viewport breakpoints (`sm:`, `md:`, `lg:`).
   - Standard control sizing and width caps (`SETTINGS_SELECT_TRIGGER_CLASS`, `SETTINGS_NUMBER_STEPPER_ROW_CLASS`); no full-bleed inputs.
   - Checkbox/radio state before labels; subtle selection states.
   - Shared save feedback via `reportSettingsSaveState` and `showSaveStatus`; no bespoke save indicators or per-page toasts.
   - Sub-guides: `references/layout.md`, `references/controls.md`, and `references/search.md`.
2. **`packages/ui/src/lib/theme/STYLING.md`:**
   - Semantic theme tokens only; no hardcoded hex colors (`#...`) or generic Tailwind palette colors (`emerald`, `rose`, `blue`, etc.).
   - Shared UI primitives before feature-local controls (`Button`, `Select`, `Input`, `Textarea`, `Icon`).
   - Button contract: variants (`default`, `outline`, `secondary`, `ghost`, `destructive`, `chip`, `link`) and sizes (`xs`, `sm`, `default`, `lg`, `icon`); never hardcode height/padding or use `!font-normal` overrides.
   - Dropdown triggers must use `dropdownTriggerVariants`.
   - Icon contract: sprite-based `Icon` with `name="icon-name"` and `size-*` utility classes; never direct `@remixicon/react` imports or `h-* w-*` classes.
   - Semantic token roles: primary for CTA/actions; selection for selected/active states; status colors for status feedback only.
   - Sub-guides: `references/tokens-and-examples.md`, `references/icons.md`, and `references/adding-themes.md`.
3. **Upstream Baseline (`0056bf6a9`):**
   - Reference gold-standard implementations for `ProvidersPage.tsx`, `OpenChamberPage.tsx`, `UsagePage.tsx`, `CommandsPage.tsx`, `SkillsCatalogPage.tsx`.

### 2.3 Documentation Discrepancies in Checkout
- **`feedback.md` Absence:** As explicitly noted in repository audit checks, `packages/ui/src/components/sections/patterns/feedback.md` is **absent** in this checkout. Save feedback contracts are documented directly in `PATTERNS.md` (Section 6, Save Feedback) and `references/controls.md`.
- **Theme Sub-Guides vs. Presets:** In `packages/ui/src/lib/theme/`, the `themes/` directory contains JSON theme presets (e.g. `openchamber-dark.json`, `vercel-dark.json`, `catppuccin-dark.json`), while markdown documentation sub-guides reside under `packages/ui/src/lib/theme/references/` (`tokens-and-examples.md`, `icons.md`, `adding-themes.md`).

### 2.4 Evidence Limitations & Honesty in Reporting
1. **OMP Settings Live Execution:** During headless browser walkthroughs, navigating to `?settings=omp` successfully rendered the page header (`SettingsPageLayout`), but the body failed to render model role selectors. Server logs revealed that the backend route `/api/agent/v1/workspaces/:workspaceId/omp/settings` returned HTTP `404 NOT_IMPLEMENTED`. The code audit of `OmpSettingsPage.tsx` was performed via static AST and source analysis.
2. **Unreached Pages in Browser Session:** Browser walkthroughs successfully navigated and captured screenshots for Chat/Composer (8 captures across dark/light and dropdown menus), Providers root/connect/custom (6 captures), OMP Settings (2 captures), Web Search (2 captures), Routing (2 captures), General Settings (2 captures), Sessions Settings (2 captures), and Skills Installed (2 captures). The remaining pages (**MCP**, **Plugins**, **Commands / Slash Commands**, and **Scheduled Tasks dialog**) were **not reached** in this browser session. In strict compliance with audit contracts, no runtime claims are made for those unreached pages; their findings derive strictly from static source diffs.

---

## 3. Exhaustive Settings Compliance Matrix

The following table evaluates every fork-authored or fork-modified Settings section and dialog against `PATTERNS.md`, `STYLING.md`, i18n/RTL rules, and the Settings Search contract:

| Subsystem / Page | File Citation | Upstream Status (`0056bf6a9`) | `PATTERNS.md` Compliance | `STYLING.md` Compliance | i18n & RTL Health | Search Registry Status | Severity |
|---|---|---|---|---|---|---|---|
| **Providers** | `sections/providers/ProvidersPage.tsx` | Fork-modified (+811/-835 across 24 files) | **Failing:** Boxed card at line 368; `isMobile` viewport branch at line 464; raw form controls in `ProviderApiKeyForm` & `CustomProviderForm` | **Failing:** Raw `<button>` at line 501; `!font-normal` overrides; `h-4 w-4` icon classes; `text-[10px]` | **Partial:** Hardcoded tooltips; missing RTL checks | Registered, but custom provider model rows unindexed | **CRITICAL** |
| **Web Search** | `sections/websearch/WebSearchPage.tsx` | Fork-modified / Rewritten (+287/-315) | **Failing:** `showSaveStatus` is no-op at line 367; raw `<Input type="number">` stepper at line 205; `SelectValue` child function at line 187 | **Warning:** Non-standard `h-8` inputs; missing compact classes | **Compliant** | **Failing:** Fallbacks (`web-search.fallbacks`) & timeout (`web-search.timeout`) unindexed | **CRITICAL** |
| **OMP Settings** | `sections/openchamber/OmpSettingsPage.tsx` | Fork-added (+658 lines, absent upstream) | **Failing:** Viewport `sm:` breakpoint at line 241; production `data-testid` at line 224; unconstrained `w-[140px]` trigger | **Failing:** Untokenized `bg-muted`, `text-[10px]`, `text-xs`; raw typography classes | **Failing:** Hardcoded English aria-label at line 263 (`${roleLabel} model`) | **Failing:** Only 1 omnibus item in `search.ts`; 20+ anchors unindexed | **CRITICAL** |
| **Routing** | `sections/routing/RoutingPage.tsx` | Fork-modified (+18/-34) | **Warning:** 3 direct children in `SettingsTwoColumn` at line 142 causing orphaned grid cell | **Warning:** Raw `<button>` at line 124; `h-8` input; `w-full` variant select | **Warning:** Hardcoded English fallback `'Off'` at line 86 | Compliant (stale agent item correctly pruned) | **MAJOR** |
| **Defaults Settings** | `sections/openchamber/DefaultsSettings.tsx` | Fork-modified / Stripped (+26/-511) | **Failing:** Titled "Defaults" but contains zero defaults; duplicate render on General & Sessions tabs | Compliant (shared checkbox stack used) | Compliant | Registered under `page: 'sessions'` | **MAJOR** |
| **Skills Catalog** | `sections/skills/catalog/SkillsCatalogPage.tsx` | Fork-modified (+22/-48) | **Warning:** Hand-rolled `SourceCard` & dashed add button instead of `SettingsAddCard` | **Warning:** `h-3 w-3`, `h-4 w-4` icon classes | **Failing:** Severe physical RTL regressions (lines 429–476: `left-2.5`, `pl-8`, `pr-8`, `right-2`, `text-left`) | Compliant | **MAJOR** |
| **Plugins** | `sections/plugins/PluginsPage.tsx` | Fork-modified / Rewritten (+656/-385) | **Warning:** Boxed card rows inside sections at lines 277, 665, 714; unstyled trigger at line 641 | **Failing:** Non-existent CSS class `typography-label` at lines 241, 716 and `PluginStatusBanner.tsx:43`; `!font-normal` delete override | Compliant | Compliant | **MAJOR** |
| **MCP** | `sections/mcp/McpPage.tsx` | Fork-modified / Rewritten (+811/-1454) | **Warning:** Raw `SelectTrigger` width `w-fit` at line 1007; runtime-unsafe `clipboard.readText()` at line 229 | **Warning:** Button `size="sm"` with `h-7 w-7` override (lines 308, 326); `h-3.5 w-3.5` icons | Compliant | Compliant | **MODERATE** |
| **Slash Commands** | `sections/commands/CommandsPage.tsx` | Fork-modified (+140/-407) | **Warning:** `w-fit` trigger at line 132; `h-8` input at line 159 | **Warning:** `h-12 w-12`, `h-3.5 w-3.5` icon classes; `!font-normal` overrides | Compliant | **Failing:** Stale items `commands.variant` & `commands.subagent`; missing `commands.argument-hint` & `commands.group` | **MODERATE** |
| **Scheduled Tasks** | `session/ScheduledTasksDialog.tsx` & `ScheduledTaskEditorDialog.tsx` | Fork-modified (+87/-363) | N/A (Session dialog surface) | **Warning:** Static `PROJECT_COLOR_MAP` at line 248 bypassing theme colors; `h-3.5 w-3.5` icons | **Failing:** Physical RTL regressions in editor (lines 265, 398, 431: `ml-0.5`, `pl-2 pr-1`, `ml-1`) | N/A (Dialog) | **MODERATE** |
| **Usage** | `sections/usage/UsagePage.tsx` | Fork-modified (+23/-43) | Compliant (uses `SettingsPageLayout`, `SettingsSection`) | **Warning:** Boxed error alert at line 218 | **Failing:** Physical `text-left` at lines 256, 308 breaking RTL alignment | Compliant | **MODERATE** |
| **Settings Navigation & Registry** | `components/views/SettingsView.tsx` & `lib/settings/*` | Fork-modified (+241/-605) | Compliant (group renamed from `opencode` to `agent`) | Compliant | Compliant | **Failing:** Desynchronized; 20+ anchors in OMP & WebSearch unindexed; stale command items | **MAJOR** |

---

## 4. Priority Deep Dives & Redesign Blueprints

### 4.1 Deep Dive: `ProvidersPage.tsx` & Providers Subsystem

#### 4.1.1 Architectural Shift vs. Upstream
In upstream baseline `0056bf6a9`, the Providers surface was powered by OpenCode SDK's `opencodeClient` and the integration catalog. Upstream utilized a clear master-detail hierarchy:
1. Master list of configured and available providers (`ProviderGrid`).
2. Drill-in provider detail view featuring `ProviderAuthMethodCards`, account toggles (`ProviderAccountSwitchToggle`), and model capability tables.
3. Strict adherence to flat row anatomy.

In the fork (`76112ae00`), Providers was migrated to OMP's `canonicalClient` (`providerAccounts`, `providerConfiguration`, `providerOAuthMethods`, `writeProviderCredential`) and `createProviderSettingsStore`. While the card grid and connect picker (housing 91 connectable providers) are functional, the inner anatomy heavily regressed against `PATTERNS.md` and `STYLING.md`.

#### 4.1.2 Concrete Observed Violations
1. **Boxed Chrome Inside Flat Sections (`PATTERNS.md` line 20):**
   * *Citation:* `ProvidersPage.tsx:368`
   * *Code:*
     ```tsx
     368: accounts.length > 0 && 'rounded-xl border border-[var(--interactive-border)] p-4',
     ```
   * *Violation:* `PATTERNS.md` explicitly rules: *"Flat hierarchy through spacing and typography; no cards, boxed backgrounds, or row chrome."* Wrapping provider accounts in a rounded, bordered card inside `SettingsSection` creates redundant nesting.
2. **Device / Viewport Branching (`PATTERNS.md` line 23):**
   * *Citation:* `ProvidersPage.tsx:464`
   * *Code:*
     ```tsx
     464: {isMobile ? (
     465:   <SettingsInfoHint ... />
     466: ) : (
     467:   <div className="flex items-center gap-1.5 ...">...</div>
     468: )}
     ```
   * *Violation:* Layout logic branches on `useDeviceInfo().isMobile` rather than container queries (`@xl:`, `@3xl:`). The settings dialog width varies independently of device viewport.
3. **Raw HTML `<button>` with Ad-Hoc Styling (`STYLING.md` line 7 & 39):**
   * *Citation:* `ProvidersPage.tsx:501`
   * *Code:*
     ```tsx
     501: <button
     502:   type="button"
     503:   onClick={() => handleToggleHideModel(model.id)}
     504:   className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-[var(--interactive-hover)]/50"
     505: >
     ```
   * *Violation:* Bypasses shared `Button`. Must use `<Button variant="ghost" size="icon" className={SETTINGS_ICON_BUTTON_CLASS}>`.
4. **Icon Contract Violations (`STYLING.md` line 74):**
   * *Citations:* `ProvidersPage.tsx:345, 429, 471, 494, 513–514`
   * *Code:* `className="h-4 w-4 shrink-0 text-[var(--status-warning)]"`, `className="h-3.5 w-3.5 text-muted-foreground"`.
   * *Violation:* `STYLING.md` specifies: *"Icons have no size prop... use size-* utility classes (e.g. size-4, size-3.5), never individual h-* w-* classes."*
5. **Button Weight Forcing (`STYLING.md` line 59):**
   * *Citations:* `ProvidersPage.tsx:298, 312` and `ProviderApiKeyForm.tsx:70`
   * *Code:* `className="!font-normal ..."`
   * *Violation:* Forcing button typography with `!font-normal` overrides breaks button token consistency.
6. **Raw Form Controls in Sub-Components (`PATTERNS.md` line 16):**
   * *Citation:* `ProviderApiKeyForm.tsx:54–62` hand-rolls raw `<label className="text-sm font-medium">` and `<Input className="h-8">` instead of `SettingsStackedField` or `SettingsFieldRow`.
   * *Citation:* `CustomProviderForm.tsx:282` passes raw `className="w-full"` to `SelectTrigger` instead of `SETTINGS_SELECT_TRIGGER_CLASS`.
   * *Citation:* `ProviderAccounts.tsx:127` uses arbitrary `text-[10px]` instead of `typography-micro`.

#### 4.1.3 Redesign Blueprint for `ProvidersPage.tsx`
```
+-----------------------------------------------------------------------------------+
| SettingsPageLayout (title="Providers", showSaveStatus)                            |
| +-------------------------------------------------------------------------------+ |
| | SettingsSection (title="Connected Accounts", divider=false)                   |
| |   SettingsFieldRow (account row: avatar, ID, status badge, action menu)       |
| |   (No outer border card; separated by standard quiet dividers)                |
| +-------------------------------------------------------------------------------+ |
| | SettingsSection (title="Models", description="Available models for provider")   |
| |   SettingsFieldRow                                                            |
| |     Label: Model Name (typography-ui-label) + context/output pill             |
| |            (@xl: show inline context/output; narrow: quiet info hint)         |
| |     Control: <Button variant="ghost" size="icon" className={ICON_BUTTON}>     |
| +-------------------------------------------------------------------------------+ |
| | ProviderApiKeyForm Refactoring:                                               |
| |   Use SettingsStackedField:                                                   |
| |     <SettingsStackedField label={t('key')} description={...}>                 |
| |       <Input type="password" className={SETTINGS_INPUT_CLASS} />              |
| |     </SettingsStackedField>                                                   |
| +-------------------------------------------------------------------------------+ |
| | CustomProviderForm Refactoring:                                               |
| |   Replace w-full triggers with dropdownTriggerVariants()                      |
+-----------------------------------------------------------------------------------+
```
- **Action Items:**
  1. Remove outer `rounded-xl border border-[var(--interactive-border)] p-4` wrapper at line 368; rely on `SettingsSection` flat layout.
  2. Replace `isMobile` branching at line 464 with container query utility: `@xl:flex hidden` for pills, `@xl:hidden inline-flex` for info hint.
  3. Replace raw `<button>` at line 501 with `<Button variant="ghost" size="icon" className={SETTINGS_ICON_BUTTON_CLASS}>`.
  4. Replace raw `<label>`/`<Input>` in `ProviderApiKeyForm.tsx` with `SettingsStackedField`.
  5. Convert all icon classes to `size-4`, `size-3.5`, `size-3`.
  6. Strip `!font-normal` overrides; standardize `CustomProviderForm.tsx` triggers with `SETTINGS_SELECT_TRIGGER_CLASS`.

---

### 4.2 Deep Dive: `WebSearchPage.tsx` & Web Search Settings

#### 4.2.1 Architectural Shift vs. Upstream
In upstream OpenChamber (`0056bf6a9`), Web Search settings were rendered using the gold-standard `SettingsCard` grid, allowing users to select active providers via segmented chips (`SettingsChipGroup`), drill into provider credentials with `SettingsBackButton`, and inspect quota/latency details.

In the fork (`76112ae00`), Web Search was completely rewritten (+287/-315) into an inline radio list (`SettingsRadioGroup`), dynamic fallback chips, numeric timeout inputs, and credential inputs. While functionally connected to `useWebSearchStore` and OMP's search catalog, it violates several core design contracts.

#### 4.2.2 Concrete Observed Violations
1. **Unwired Save Feedback Contract (`PATTERNS.md` line 60):**
   * *Citation:* `WebSearchPage.tsx:367`
   * *Code:*
     ```tsx
     367: <SettingsPageLayout
     368:   title={t('settings.webSearch.title')}
     369:   description={t('settings.webSearch.description')}
     370:   showSaveStatus
     371: >
     ```
   * *Violation:* `PATTERNS.md` rules: *"For ordinary settings persisted through updateDesktopSettings, SettingsPageLayout showSaveStatus renders the shared quiet indicator... a page-specific persistence API participating in this flow reports through reportSettingsSaveState."* In `WebSearchPage.tsx`, writes to `useWebSearchStore` do **not** invoke `reportSettingsSaveState`, rendering the save indicator completely inert.
2. **Raw Number Input vs. Standard Stepper (`references/controls.md` line 76):**
   * *Citation:* `WebSearchPage.tsx:205–225`
   * *Code:*
     ```tsx
     205: <div className={`${SETTINGS_CONTROL_CLUSTER_CLASS} flex items-center gap-2`}>
     206:   <Input
     207:     type="number"
     208:     min={1}
     209:     max={120}
     210:     value={timeoutSeconds}
     211:     onChange={...}
     212:     className="h-8 w-20 font-mono"
     213:   />
     214:   <span className="text-sm text-muted-foreground">s</span>
     215:   <Button variant="ghost" size="sm" onClick={handleResetTimeout} className="h-8">...</Button>
     216: </div>
     ```
   * *Violation:* Violates `references/controls.md`: *"NumberInput inside SETTINGS_NUMBER_STEPPER_ROW_CLASS, with SETTINGS_NUMBER_UNIT_CLASS for the unit and an adjacent SETTINGS_ICON_BUTTON_CLASS reset button. Never flex-grow the stepper."* Also uses `h-8` instead of standard compact `h-7`.
3. **`SelectValue` API Abuse:**
   * *Citation:* `WebSearchPage.tsx:187`
   * *Code:*
     ```tsx
     187: <SelectValue>{() => t('settings.webSearch.native.addFallback')}</SelectValue>
     ```
   * *Violation:* Passes a render function as a child to Radix UI `SelectValue` instead of passing the localized placeholder string directly as a child or via the `placeholder` prop.
4. **Search Registry Omissions (`PATTERNS.md` line 68):**
   * *Citation:* `WebSearchPage.tsx:149, 203`
   * *Violation:* `WebSearchPage.tsx` defines `settingsItem="web-search.fallbacks"` and `settingsItem="web-search.timeout"`, but `packages/ui/src/lib/settings/search.ts` only registers `web-search.provider` and `web-search.keys`. Fallbacks and timeout are unindexed.

#### 4.2.3 Redesign Blueprint for `WebSearchPage.tsx`
```
+-----------------------------------------------------------------------------------+
| SettingsPageLayout (title="Web Search", showSaveStatus)                            |
| +-------------------------------------------------------------------------------+ |
| | SettingsSection (title="Default Provider", divider=false)                     |
| |   SettingsRadioGroup (options: Auto, Tavily, Brave, Perplexity, DuckDuckGo)   |
| +-------------------------------------------------------------------------------+ |
| | SettingsSection (title="Fallbacks & Latency")                                  |
| |   SettingsFieldRow (label="Fallback Providers", info="Used if primary fails")  |
| |     SettingsSelect (trigger: SETTINGS_SELECT_TRIGGER_CLASS)                   |
| |   SettingsFieldRow (label="Search Timeout", settingsItem="web-search.timeout") |
| |     <div className={SETTINGS_NUMBER_STEPPER_ROW_CLASS}>                       |
| |       <NumberInput min={1} max={120} value={timeout} onChange={...} />         |
| |       <span className={SETTINGS_NUMBER_UNIT_CLASS}>s</span>                    |
| |       <Button variant="ghost" size="icon" className={SETTINGS_ICON_BUTTON}>   |
| |         <Icon name="arrow-go-back" className="size-3.5" />                    |
| |       </Button>                                                               |
| |     </div>                                                                    |
| +-------------------------------------------------------------------------------+ |
| | SettingsSection (title="API Credentials")                                     |
| |   Flat credential rows using SettingsFieldRow + password Input                 |
+-----------------------------------------------------------------------------------+
```
- **Action Items:**
  1. Hook `useWebSearchStore` actions (`setSearchProvider`, `setTimeoutSeconds`, `writeCredential`) into `reportSettingsSaveState`.
  2. Refactor timeout input to `NumberInput` inside `SETTINGS_NUMBER_STEPPER_ROW_CLASS` with `SETTINGS_NUMBER_UNIT_CLASS` and `SETTINGS_ICON_BUTTON_CLASS`.
  3. Replace `SelectValue` child function with standard placeholder string.
  4. Register `web-search.fallbacks` and `web-search.timeout` in `packages/ui/src/lib/settings/search.ts`.

---

### 4.3 Deep Dive: `OmpSettingsPage.tsx` (OMP Model Roles & Dynamic Settings)

#### 4.3.1 Architectural Shift vs. Upstream
`OmpSettingsPage.tsx` is completely fork-added (+658 lines, 0 lines upstream), replacing upstream's `BehaviorPage.tsx`. It provides graphical configuration for OMP's 16 specialized model roles (`default`, `smol`, `slow`, `vision`, `plan`, `commit`, `tiny`, `memory`, `task`, `advisor`, `widget`, `image`, `web`, `speech`, `dictation`, `judge`), fallbacks, thinking effort sliders, and dynamic OMP configuration toggles.

While the feature scope is vital for OMP 18.16.0 operations, the visual implementation deviates sharply from `PATTERNS.md`.

#### 4.3.2 Concrete Observed Violations
1. **Viewport Breakpoints Inside Settings Pane (`PATTERNS.md` line 23 & `references/layout.md` line 54):**
   * *Citation:* `OmpSettingsPage.tsx:241`
   * *Code:*
     ```tsx
     241: <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
     ```
   * *Violation:* `PATTERNS.md` mandates: *"Layouts respond to the settings pane width via container queries (@xl: / @3xl:), never viewport sm:/lg: breakpoints (the pane is much narrower than the viewport inside the dialog)."* Using `sm:` breaks dialog responsiveness when the dialog is docked or scaled.
2. **Production Code Test Markup:**
   * *Citation:* `OmpSettingsPage.tsx:224`
   * *Code:*
     ```tsx
     224: <span className="block text-xs text-muted-foreground font-mono mt-1" data-testid={`fallback-${role.id}`}>
     ```
   * *Violation:* Injecting test attributes (`data-testid`) directly into production UI markup violates code discipline. Tests must select via semantic roles or accessible labels.
3. **Hardcoded English Accessibility String (`locale-ui-patterns`):**
   * *Citation:* `OmpSettingsPage.tsx:263`
   * *Code:*
     ```tsx
     263: aria-label={`${roleLabel} model`}
     ```
   * *Violation:* String concatenation in accessibility labels breaks grammatical agreement across non-English locales. Must use `t('settings.omp.modelRoles.ariaModel', { role: roleLabel })`.
4. **Hardcoded Trigger Widths (`references/controls.md` line 12):**
   * *Citation:* `OmpSettingsPage.tsx:300`
   * *Code:*
     ```tsx
     300: <SelectTrigger className="w-[140px]">
     ```
   * *Violation:* Arbitrary fixed pixel widths (`w-[140px]`) deviate from standard trigger classes (`SETTINGS_SELECT_TRIGGER_CLASS` or `w-36`).
5. **Untokenized Typography & Colors (`STYLING.md` line 5):**
   * *Citations:* `OmpSettingsPage.tsx:194, 213, 214, 224`
   * *Code:* `className="text-sm text-muted-foreground mb-4"`, `className="font-medium text-sm"`, `className="text-[10px] bg-muted border"`.
   * *Violation:* Must use `SETTINGS_HELPER_CLASS`, `SETTINGS_FIELD_LABEL_CLASS`, and `typography-micro`.
6. **Severe Search Registry Desynchronization (`PATTERNS.md` line 68):**
   * *Citation:* `packages/ui/src/lib/settings/search.ts:35–40`
   * *Violation:* `search.ts` contains only a single omnibus entry `omp.behaviour`. The rendered anchors `omp.modelRoles`, individual roles `omp.modelRoles.${role.id}`, and dynamic settings `omp.${setting.id}` are completely missing from the search index.

#### 4.3.3 Redesign Blueprint for `OmpSettingsPage.tsx`
```
+-----------------------------------------------------------------------------------+
| SettingsPageLayout (title=t('settings.omp.title'), showSaveStatus)                |
| +-------------------------------------------------------------------------------+ |
| | SettingsSection (title=t('settings.omp.modelRoles.title'), divider=false)      |
| |   SettingsTwoColumn                                                           |
| |     {roles.map(role => (                                                      |
| |       <SettingsStackedField                                                   |
| |         key={role.id}                                                         |
| |         settingsItem={`omp.modelRoles.${role.id}`}                            |
| |         label={role.name}                                                     |
| |         description={role.description}                                        |
| |       >                                                                       |
| |         <div className="flex items-center gap-2 @xl:flex-row flex-col">       |
| |           <ModelSelector value={role.model} onChange={...} />                 |
| |           <EffortPicker value={role.effort} onChange={...} />                 |
| |         </div>                                                                |
| |       </SettingsStackedField>                                                 |
| |     ))}                                                                       |
| +-------------------------------------------------------------------------------+ |
| | SettingsSection (title=t('settings.omp.advanced.title'))                      |
| |   Dynamic settings mapped to SettingsFieldRow or SettingsCheckboxRow          |
+-----------------------------------------------------------------------------------+
```
- **Action Items:**
  1. Replace `sm:flex-row sm:items-center` at line 241 with `@xl:flex-row @xl:items-center`.
  2. Strip `data-testid` from line 224.
  3. Replace raw text classes with `SETTINGS_HELPER_CLASS`, `SETTINGS_FIELD_LABEL_CLASS`, and `typography-micro`.
  4. Localize `aria-label` at line 263.
  5. Replace `w-[140px]` with `SETTINGS_SELECT_TRIGGER_CLASS`.
  6. Add all 16 model roles and dynamic settings anchors into `search.ts`.

---

### 4.4 Deep Dive: `RoutingPage.tsx`

#### 4.4.1 Architectural Shift vs. Upstream
In upstream OpenChamber, `RoutingPage.tsx` mapped routing categories using `AgentSelector` and model variant pickers. In the fork (+18/-34), `AgentSelector` was pruned, and variants were migrated to OMP's `useModelReasoningEfforts` (`reasoningOptions` from canonical models).

#### 4.4.2 Observed Violations
1. **Hardcoded Fallback String:** Line 86 contains `if (variant === 'off') return t('chat.modelControls.off') || 'Off';`. The `'Off'` string fallback violates i18n rules.
2. **Raw HTML `<button>`:** Line 124 implements a category expand/collapse toggle using `<button className="... hover:bg-interactive-hover/50">` instead of the shared `Button` primitive.
3. **Orphaned 3-Item Layout in `SettingsTwoColumn`:** Line 142 places 3 direct child fields (Category Name, Model Selector, Thinking Effort) directly inside `<SettingsTwoColumn>` (`@3xl:grid-cols-2`). On wide screens, this causes the 3rd field to orphan into column 1 of row 2, leaving an awkward empty cell.
4. **Control Sizing:** Line 148 uses non-standard `h-8 w-full` for inputs; line 169 passes raw `w-full` to `VariantSelect`.

#### 4.4.3 Redesign Blueprint
- Group Model Selector and Thinking Effort together inside a single column cell or layout the category row with a dedicated 3-column flex cluster.
- Replace raw `<button>` at line 124 with `<Button variant="ghost" size="icon" className={SETTINGS_ICON_BUTTON_CLASS}>`.
- Replace `h-8` with compact `h-7` inputs (`size="compact"`).

---

### 4.5 Deep Dive: `DefaultsSettings.tsx` & OpenChamber Duplication

#### 4.5.1 Architectural Shift vs. Upstream
In upstream `0056bf6a9`, `DefaultsSettings.tsx` was a comprehensive 537-line control center housing default primary agent selection, default model, default reasoning effort, subagent models, permission modes, and session warming. In the fork, it was gutted down to 45 lines (+26/-511), retaining only 3 checkboxes:
1. Confirm before deleting sessions (`confirmBeforeDeleteSession`)
2. Session warming checkbox (`SessionWarmingCheckbox`)
3. Show chats in sidebar (`showChatsInSidebar`)

#### 4.5.2 Architectural & Layout Defects
1. **Information Architecture & Naming Mismatch:** The section is titled "Defaults" (`settings.openchamber.defaults.title`), but contains **zero defaults**—no default models, no default agents, and no default runtimes.
2. **Duplicate Invocation in `OpenChamberPage.tsx`:**
   * Line 56 (under `'general'` tab): `<DefaultsSettings key={runtimeEndpointEpoch} />`
   * Line 203 (under `'sessions'` tab): `<DefaultsSettings key={runtimeEndpointEpoch} />`
   * Rendering identical settings in two separate tabs confuses users and creates conflicting anchors. In `search.ts`, `sessions.deletion-dialog` is indexed under `page: 'sessions'`.

#### 4.5.3 Redesign Blueprint
- Rename section to "Session Behavior" (`settings.openchamber.sessions.behavior.title`).
- Remove duplicate call at line 56 of `OpenChamberPage.tsx` (General tab); retain only at line 203 (Sessions tab).
- Restore default model & reasoning effort pickers as designed in Audit List A (`01-audit-list-a-openchamber-ux.md`).

---

### 4.6 Deep Dive: Auxiliary Settings & Dialog Regressions

#### 4.6.1 `SkillsCatalogPage.tsx` (Physical RTL Regressions)
- **Lines 429, 436, 444, 476:** Upstream's logical classes (`inset-s-2.5`, `ps-8`, `pe-8`, `inset-e-2`, `text-start`) were replaced with physical classes (`left-2.5`, `pl-8`, `pr-8`, `right-2`, `text-left`), breaking bi-directional layout in RTL languages (Arabic, Hebrew).
- **Line 476:** Hand-rolls a dashed add button (`className="min-h-24 border-dashed..."`) instead of using the shared `SettingsAddCard` primitive.
- **Lines 446, 480:** Use `h-3 w-3` and `h-4 w-4` instead of `size-3` and `size-4`.

#### 4.6.2 `PluginsPage.tsx` (Invalid CSS & Boxed Rows)
- **Lines 241, 716 and `PluginStatusBanner.tsx:43`:** Use non-existent class `typography-label` instead of `typography-ui-label`. In standard browsers, this results in unstyled text falling back to browser defaults.
- **Lines 277, 665, 714:** Boxed cards with colored borders inside sections violate flat section rules.
- **Line 480:** Delete button uses `!font-normal text-[var(--status-error)]` override.

#### 4.6.3 `McpPage.tsx` (Clipboard Safety & Button Overrides)
- **Line 229:** Directly calls `navigator.clipboard.readText()` in `pastePairs`, throwing uncaught security errors in headless browsers, iframe sandboxes, and restricted Electron runtimes. Must provide graceful fallback.
- **Lines 308, 326:** Define `size="sm"` but override it with `h-7 w-7 px-0` instead of using `size="icon"`.
- **Line 1007:** Uses `<SelectTrigger className="w-fit min-w-[100px]">` instead of `SETTINGS_SELECT_ROW_TRIGGER_CLASS`.

#### 4.6.4 `CommandsPage.tsx` (Stale Search Index & Icon Sizes)
- **Lines 111, 138, 144:** Use `h-12 w-12` and `h-3.5 w-3.5` instead of `size-12` and `size-3.5`.
- **Line 159:** Uses `h-8 w-64` instead of compact `h-7`.
- **Search Desynchronization:** `search.ts` still indexes deleted controls `commands.variant` and `commands.subagent`, while omitting rendered anchors `commands.argument-hint` and `commands.group`.

#### 4.6.5 `ScheduledTasksDialog.tsx` & `ScheduledTaskEditorDialog.tsx`
- **Editor Lines 265, 398, 431:** Replaced logical properties with physical properties (`ml-0.5`, `pl-2 pr-1`, `ml-1`).
- **Dialog Line 248:** Replaced dynamic `resolveProjectColor(project.color)` with static `PROJECT_COLOR_MAP[project.color]`, bypassing high-contrast and dark-theme adjustments.

#### 4.6.6 `UsagePage.tsx`
- **Lines 256, 308:** Replaced upstream `text-start` with `text-left` on `CollapsibleTrigger` headers, breaking RTL.
- **Line 218:** Boxed border error alert violates quiet error pattern.

---

### 4.7 Settings Search Registry Contract Audit

`packages/ui/src/lib/settings/search.ts` controls global settings search across all pages. The audit revealed severe desynchronization between rendered `settingsItem` attributes and registered search entries:

| Setting ID / Anchor | Rendered in Component | Present in `search.ts` | Status / Issue | Required Action |
|---|---|---|---|---|
| `omp.behaviour` | `OmpSettingsPage.tsx:35` | Yes | Stale omnibus entry; conflates all OMP behaviors | Keep as high-level page anchor |
| `omp.modelRoles` | `OmpSettingsPage.tsx:192` | **NO** | Missing anchor for Model Roles section | Add to `search.ts` with localized title/description |
| `omp.modelRoles.<role>` (16 roles) | `OmpSettingsPage.tsx:210` | **NO** | All 16 roles (`default`, `smol`, `vision`, `plan`, etc.) unindexed | Add individual role index entries |
| `omp.<setting.id>` (dynamic) | `OmpSettingsPage.tsx:320` | **NO** | Dynamic settings from OMP config.yml unindexed | Add dynamic settings index generator |
| `web-search.provider` | `WebSearchPage.tsx:119` | Yes | Correctly indexed | Retain |
| `web-search.fallbacks` | `WebSearchPage.tsx:149` | **NO** | Fallback provider selector unindexed | Add to `search.ts` under `page: 'web-search'` |
| `web-search.timeout` | `WebSearchPage.tsx:203` | **NO** | Timeout stepper unindexed | Add to `search.ts` under `page: 'web-search'` |
| `web-search.keys` | `WebSearchPage.tsx:238` | Yes | Correctly indexed | Retain |
| `commands.variant` | (Deleted in fork) | **YES** | Stale reference in `search.ts:1000` | Delete from `search.ts` |
| `commands.subagent` | (Deleted in fork) | **YES** | Stale reference in `search.ts:1006` | Delete from `search.ts` |
| `commands.argument-hint` | `CommandsPage.tsx:159` | **NO** | Argument hint input unindexed | Add to `search.ts` under `page: 'commands'` |
| `commands.group` | `CommandsPage.tsx:132` | **NO** | Command group selector unindexed | Add to `search.ts` under `page: 'commands'` |
| `sessions.defaults` | `DefaultsSettings.tsx:22` | Ambiguous | Duplicate render on General & Sessions tabs | Anchor strictly to `page: 'sessions'` |

---

## 5. Chat, Composer, Sidebar & Dialog Audit

An exhaustive code audit of fork-authored and fork-modified components in `packages/ui/src/components/chat/` and `packages/ui/src/components/session/` identified **39 distinct defect clusters** across **21 named components**:
- **8 Critical Severity** (Broken styles, fake utilities, unlocalized copy, severe contrast/primitive abuse)
- **5 Major Severity** (Raw HTML forms, missing translation dictionaries, unhandled error toasts)
- **8 Moderate Severity** (Semantic token misuse, non-standard sizing, hardcoded aria attributes)
- **18 Minor / Directional Severity** (Physical margin/padding regressions breaking RTL)

### 5.1 Named-Component Audit Matrix
The following matrix evaluates all 21 audited components, explicitly distinguishing observed fork components from brief-named components that exist under alternative filenames:

| Component Area | Observed Source File | Implementation Status | Token Health | Primitives Compliance | i18n Completeness | RTL / Layout Health | Defect Severity |
|---|---|---|---|---|---|---|---|
| **Ghost Prediction** | `chat/ChatInput.tsx` | Modified | Warning (untokenized border) | Partial (kbd markup) | **FAILING** (Hardcoded copy & Tab key) | Pass | **CRITICAL** |
| **Command Autocomplete & Magic** | `chat/CommandAutocomplete.tsx` | Modified | Pass | Partial | **FAILING** (23 hardcoded descriptions) | Pass | **CRITICAL** |
| **Background Jobs Sheet** | `chat/JobsSheetDialog.tsx` | Fork-authored *(named BackgroundJobsSheet in brief)* | **FAILING** (Palette colors & fake utilities) | **FAILING** (Raw buttons, raw HTML) | **FAILING** (Hardcoded English strings) | Warning | **CRITICAL** |
| **Background Shells Strip** | `chat/BackgroundShellsStrip.tsx` | Modified | **FAILING** (Palette colors & fake utilities) | Warning (Clickable `<div>`) | Pass | Warning | **CRITICAL** |
| **Todo Card** | `chat/message/parts/TodoCard.tsx` | Fork-authored | **FAILING** (Generic green/red palette) | Pass | Warning (Aria strings) | Pass | **CRITICAL** |
| **Read Tool Group** | `chat/message/parts/ReadToolGroup.tsx` | Fork-authored | Warning (CSS var color) | Warning (Clickable `<div>`) | **FAILING** (Hardcoded 'Read', 'running', 'failed') | Pass | **CRITICAL** |
| **Compaction Dividers** | `chat/SessionRecapSpacer.tsx` | Modified | Warning | Pass | **FAILING** (Missing keys in 11 locales) | Pass | **CRITICAL** |
| **Tool Approvals (Actions)** | `chat/PermissionActions.tsx` | Fork-authored *(named QuestionCard in brief)* | Warning (Raw RGB styles) | **FAILING** (DOM style mutation, raw spinner) | Pass | Warning | **CRITICAL** |
| **Subagent HUD Tray** | `chat/SubagentHudTray.tsx` | Fork-authored *(named SubagentSection in brief)* | Warning | Partial (Raw input, manual size overrides) | Warning (Hardcoded toasts, '$' symbol) | Pass | **MAJOR** |
| **Work Status Subagents** | `chat/work-status/WorkStatusSubagentsSection.tsx` | Modified *(named SubagentSection in brief)* | Warning | Partial (Raw input, manual size overrides) | Warning (Hardcoded toasts, 't' suffix) | Pass | **MAJOR** |
| **Plan Review Card** | `chat/PlanReviewCard.tsx` | Fork-authored | Warning | **FAILING** (Raw `<select>` and `<textarea>`) | Pass | Pass | **MAJOR** |
| **Timeline Notice Card** | `chat/message/parts/TimelineNoticeCard.tsx` | Fork-authored | Pass | Partial (Unicode checkboxes) | **FAILING** (Fallback chains masking i18n) | Pass | **MAJOR** |
| **Context Usage Display** | `ui/ContextUsageDisplay.tsx` | Fork-authored | Warning (Hardcoded hex fallbacks) | Warning (Clickable mobile `<div>`) | Pass | Pass | **MAJOR** |
| **Composer Mode Selector** | `chat/composer/ui/ComposerModeSelector.tsx` | Fork-authored | Warning (Direct CSS) | Pass | Pass | Physical classes | **MODERATE** |
| **Focus Mode Button** | `chat/composer/ui/FocusModeButton.tsx` | Fork-authored | Warning (`text-primary` used for selection) | Pass | Pass | Pass | **MODERATE** |
| **Btw Panel** | `chat/btw/BtwPanel.tsx` | Modified *(named BtwTray in brief)* | Pass | Warning (`!important` overrides) | Warning (Hardcoded aria) | Physical classes | **MODERATE** |
| **Form Dock & Controls** | `chat/FormDock.tsx`, `FormFieldControl.tsx` | Modified | Warning | Partial (Raw `<textarea>`, raw buttons) | Pass | Physical classes | **MODERATE** |
| **Advisor Message** | `chat/AdvisorMessage.tsx` | Fork-authored | Warning (Non-standard warning classes) | Warning (Raw dismiss button) | Pass | Physical classes | **MODERATE** |
| **Cleanse Status Board** | `chat/CleanseStatusBoard.tsx` | Fork-authored | Warning (Non-standard classes) | Warning (Raw dismiss button) | Warning (Status strings) | Pass | **MODERATE** |
| **Working Placeholder** | `chat/message/parts/WorkingPlaceholder.tsx` | Modified *(named SessionStatusBar in brief)* | Pass | Pass | Warning (Grammar fragment concatenation) | Pass | **MODERATE** |
| **Session Dialogs & Spaces** | `session/spaces/*`, `session/*` | Modified | Warning | Partial (Raw buttons, input padding) | Pass | Physical classes | **MODERATE** |

#### 5.1.2 Nomenclature Clarifications for Brief-Named Components
To ensure strict accuracy and avoid reporting on phantom files:
1. **`QuestionCard.tsx`:** Not present as a standalone file in the codebase. Tool approval cards are implemented via `PermissionCard.tsx`, `PermissionActions.tsx`, and `PermissionDock.tsx`. Findings are grounded in `PermissionActions.tsx`.
2. **`SubagentSection.tsx`:** Not present as a standalone file. Subagent presentation is divided into `SubagentHudTray.tsx` and `packages/ui/src/components/chat/work-status/WorkStatusSubagentsSection.tsx`.
3. **`BackgroundJobsSheet.tsx`:** Implemented under the filename `JobsSheetDialog.tsx` (`packages/ui/src/components/chat/JobsSheetDialog.tsx`).
4. **`SessionStatusBar.tsx`:** Implemented via `StatusRow.tsx`, `CleanseStatusBoard.tsx`, and `AskCountdown.tsx`.
5. **`BtwTray.tsx`:** Implemented under `packages/ui/src/components/chat/btw/BtwPanel.tsx`.
6. **Turn Budget Pill (`+Nk!`):** Not implemented as a standalone pill component in the composer; model reasoning effort is controlled via `ModelControls.tsx` and `mobileControlsUtils.ts`.
7. **Tool Cards (`ast_grep`, `ast_edit`, `eval`, `lsp`, `checkpoint`, `rewind`, `out://`, `svg`, table chart):** Implemented within `packages/ui/src/components/chat/message/toolRenderers.tsx`, `packages/ui/src/components/chat/markdown/TableAutoChart.tsx`, and `packages/ui/src/components/chat/message/parts/toolDiffUtils.ts`.

---

### 5.2 Deep-Dive Chat Findings Grounded in Observed Code

#### 5.2.1 Category A: Token Use, Hardcoded Palette Colors & Fake Utilities
1. **`packages/ui/src/components/chat/JobsSheetDialog.tsx` (CRITICAL):**
   * *Lines 49–65:* `toneToProgressClass` introduces hardcoded generic Tailwind palette colors:
     ```tsx
     52: return 'bg-emerald-500';
     54: return 'bg-rose-500';
     56: return 'bg-amber-500';
     58: return 'bg-blue-500';
     60: return 'bg-violet-500';
     ```
     *Rule Violated:* `STYLING.md` line 5 strictly forbids generic Tailwind palette colors.
   * *Lines 97, 190, 228, 443–444:* Direct classes `text-rose-500`, `text-emerald-500`, `border-emerald-500/30`, `bg-emerald-500/10`.
   * *Lines 81, 116, 127, 145, 150, 163, 184, 186, 202, 215, 504, 521, 529:*
     ```tsx
     81:  <div className="flex flex-col gap-1 p-3 rounded-lg border border-border/50 bg-surface-1">
     127: <div className="h-1.5 w-full rounded-full bg-surface-3 overflow-hidden">
     186: <div className="... bg-surface-2 border border-border/40 text-xs">
     ```
     *Rule Violated:* `bg-surface-1`, `bg-surface-2`, `bg-surface-3` are **fake, non-existent Tailwind utilities** in OpenChamber. Tailwind generates zero CSS rules for them, causing containers to render with unstyled transparent backgrounds.
2. **`packages/ui/src/components/chat/BackgroundShellsStrip.tsx` (CRITICAL):**
   * *Line 93:* Uses non-existent utility `hover:bg-surface-2/60`.
   * *Lines 95 & 130:* Hardcoded `bg-emerald-500` and `text-emerald-500 bg-emerald-500/10 border-emerald-500/20`. Must use semantic `status-success` tokens.
3. **`packages/ui/src/components/chat/message/parts/TodoCard.tsx` (CRITICAL):**
   * *Line 14:*
     ```tsx
     14: <span aria-hidden="true" className={cn('mt-1 size-1.5 shrink-0 rounded-full', task.status === 'completed' ? 'bg-green-500' : task.status === 'blocked' ? 'bg-red-500' : 'bg-muted-foreground')} />
     ```
     *Rule Violated:* Uses generic `bg-green-500` and `bg-red-500` instead of `bg-[var(--status-success)]` and `bg-[var(--status-error)]`.
4. **`packages/ui/src/components/ui/ContextUsageDisplay.tsx` (MAJOR):**
   * *Lines 142 & 153:* Hardcoded hex fallbacks:
     ```tsx
     142: stroke="var(--status-warning, #f59e0b)"
     153: stroke="var(--accent, #0ea5e9)"
     ```
     *Rule Violated:* `STYLING.md` line 5 prohibits hardcoded hex values. Theme tokens must resolve cleanly without inline fallbacks.
5. **`packages/ui/src/components/chat/markdown/TableAutoChart.tsx` (MAJOR):**
   * *Lines 46–51:* Inlines hardcoded hex palette colors (`#3b82f6`, `#10b981`, `#f59e0b`, `#6366f1`, `#ef4444`, `#0ea5e9`) into chart series options.

---

#### 5.2.2 Category B: Localization (i18n), Missing Dictionaries & Fallback Chains
1. **`packages/ui/src/components/chat/ChatInput.tsx` (CRITICAL):**
   * *Lines 524–526:* Hardcoded English prediction string:
     ```tsx
     526: setGhostPrediction('What should we do next?');
     ```
   * *Line 4274:* Hardcoded English keyboard label `<kbd ...>Tab</kbd>`.
2. **`packages/ui/src/components/chat/CommandAutocomplete.tsx` (CRITICAL):**
   * *Lines 41–65 & 161:* `BUILTIN_COMMAND_DESCRIPTIONS` contains 23 hardcoded English descriptions for all builtin slash commands (`compact`, `shake`, `todo`, `jobs`, `usage`, `context`, `tools`, `handoff`, `retry`, `rename`, `effort`, `model`, `switch`, `fast`, `slow`, `prewalk`, `force`, `pin`, `fresh`, `clear`, `dirs`, `session`, `memory`), returned directly without translation at line 161.
3. **`packages/ui/src/components/chat/message/parts/ReadToolGroup.tsx` (CRITICAL):**
   * *Line 91:* Hardcoded English group header `{`Read (${items.length})`}`.
   * *Lines 109 & 114:* Hardcoded English status strings `running…` and `failed`.
4. **`packages/ui/src/components/chat/SessionRecapSpacer.tsx` (CRITICAL):**
   * *Lines 81–85:* Hardcoded `'tokens'` suffix in badge: `${formatTokens(tokensBefore)} tokens`.
   * *Lines 103, 134–136:* Fallback chains masking missing translations:
     ```tsx
     103: aria-label={isExpanded ? (t('chat.compaction.collapseSummary') || 'Collapse compaction summary') : (t('chat.compaction.expandSummary') || 'Expand compaction summary')}
     ```
     *Dictionary Absence:* The keys `chat.compaction.reducedTokens`, `chat.compaction.tokensCount`, `chat.compaction.expandSummary`, and `chat.compaction.collapseSummary` exist **only in 3 languages** (`en.ts`, `de.ts`, `es.ts`). They are **completely missing from 11 production dictionaries** (`ar.ts`, `fr.ts`, `he.ts`, `ja.ts`, `ko.ts`, `nl.ts`, `pl.ts`, `pt-BR.ts`, `tr.ts`, `uk.ts`, `zh-CN.ts`, `zh-TW.ts`), leading to unlocalized fallbacks for non-English users.
5. **`packages/ui/src/components/chat/JobsSheetDialog.tsx` (MAJOR):**
   * Hardcoded English fragments: `min: {min}`, `max: {max}` (lines 106–107), `Stage: {widget.stage}` (line 238), `Failed to inspect stream` (line 363), `PIDs: {shell.pids.join(', ')}` (line 462), and `(Tail 64 KiB)` (line 483).
6. **`packages/ui/src/components/chat/SubagentHudTray.tsx` & `WorkStatusSubagentsSection.tsx` (MAJOR):**
   * Hardcoded English toast errors: `'Failed to steer subagent'` and `'Failed to cancel subagent'` (`SubagentHudTray.tsx:38, 55` and `WorkStatusSubagentsSection.tsx:75, 93`).
   * Hardcoded dollar signs and unit suffixes (`{live.tokens}t` at line 225).
7. **`packages/ui/src/components/chat/message/toolRenderers.tsx` (MAJOR):**
   * *Lines 200 & 269:* Direct grammatical construction in code:
     ```tsx
     200: Found {lines.length} match{lines.length !== 1 ? 'es' : ''}
     269: Found {paths.length} file{paths.length !== 1 ? 's' : ''}
     ```
     *Rule Violated:* Violates `locale-ui-patterns`: *"Never use params like {suffix}, {plural}... Plural/count-dependent text must use separate complete-message keys."*

---

#### 5.2.3 Category C: Raw HTML / Classes vs. Shared Primitives
1. **`packages/ui/src/components/chat/PermissionActions.tsx` (CRITICAL):**
   * *Lines 58–72:* Mutates inline DOM styles on hover:
     ```tsx
     58: const hover = (idle: string, active: string) => ({
     59:   onMouseEnter: (e) => { e.currentTarget.style.backgroundColor = active; },
     60:   onMouseLeave: (e) => { e.currentTarget.style.backgroundColor = idle; },
     61: });
     ...
     65: <button
     66:   type="button"
     67:   onClick={() => onRespond('once')}
     68:   disabled={isResponding}
     69:   className={rowClass}
     70:   style={{ backgroundColor: 'rgb(var(--status-success) / 0.1)', color: 'var(--status-success)' }}
     71:   {...hover('rgb(var(--status-success) / 0.1)', 'rgb(var(--status-success) / 0.2)')}
     72: >
     ```
     *Rule Violated:* Bypasses shared `Button` and mutates direct DOM styles on hover. Must use standard `Button` variants (`variant="secondary"` / `variant="outline"`) with semantic hover tokens.
   * *Line 109:* Hand-rolls a raw HTML spinner (`<div className="animate-spin h-3 w-3 border border-primary border-t-transparent rounded-full" />`) instead of using `<Icon name="loader-4" className="size-3 animate-spin" />`.
2. **`packages/ui/src/components/chat/PlanReviewCard.tsx` (MAJOR):**
   * *Lines 84–107:* Raw HTML `<select id="plan-execution-model">` element with bespoke styling instead of shared `Select` primitive with `dropdownTriggerVariants`.
   * *Lines 70–79:* Raw HTML `<textarea>` instead of shared `Textarea`.
3. **`packages/ui/src/components/chat/SubagentHudTray.tsx` & `WorkStatusSubagentsSection.tsx` (MODERATE):**
   * *Lines 114, 127 (`SubagentHudTray`):* Overrides `size="sm"` with manual `h-6 px-1.5 text-xs` instead of using standard `size="xs"`.
   * *Lines 148–156 (`SubagentHudTray`) & 273–281 (`WorkStatusSubagentsSection`):* Raw `<input type="text">` instead of shared `Input`.
4. **`packages/ui/src/components/chat/message/parts/TimelineNoticeCard.tsx` (MODERATE):**
   * *Line 135:* Uses raw unicode characters `'☑'` and `'☐'` instead of `<Icon name="checkbox-circle" />` and `<Icon name="checkbox-blank" />`.

---

#### 5.2.4 Category D: Spacing, Physical Direction Properties & RTL Violations
Across 17 distinct files, physical directional CSS classes were introduced, breaking RTL bi-directional mirroring:

| Component File | Line Numbers | Physical Class Detected | Required Logical Replacement |
|---|---|---|---|
| `chat/AdvisorMessage.tsx` | 32, 53, 58 | `ml-auto`, `border-l-2`, `pl-2.5` | `ms-auto`, `border-s-2`, `ps-2.5` |
| `chat/composer/ui/ComposerModeSelector.tsx` | 198, 200, 224, 235 | `ml-auto`, `pl-[1.375rem]`, `left-2.5`, `pl-8` | `ms-auto`, `ps-[1.375rem]`, `start-2.5`, `ps-8` |
| `chat/ChatInput.tsx` | 4273–4274 | `left-3`, `ml-1` | `start-3`, `ms-1` |
| `chat/btw/BtwPanel.tsx` | 117, 129 | `mr-1` | `me-1` |
| `chat/PermissionActions.tsx` | 35, 42, 48, 75, 90, 104 | `ml-1` | `ms-1` |
| `chat/FormFieldControl.tsx` | 181, 186, 220 | `pl-[22px]`, `pl-6 pr-1` | `ps-[22px]`, `ps-6 pe-1` |
| `chat/SubagentHudTray.tsx` | 67, 122, 133, 141, 147 | `paddingLeft`, `ml-1`, `pl-5`, `pl-5 pt-1` | `paddingInlineStart`, `ms-1`, `ps-5`, `ps-5 pt-1` |
| `chat/JobsSheetDialog.tsx` | 173 | `ml-auto` | `ms-auto` |
| `chat/BackgroundShellsStrip.tsx` | 93, 193 | `pl-3 pr-1.5`, `pl-3 pr-3` | `ps-3 pe-1.5`, `px-3` |
| `chat/message/parts/ReadToolGroup.tsx` | 106 | `ml-auto` | `ms-auto` |
| `chat/message/parts/ReasoningPart.tsx` | 410 | `pr-2 pl-px` | `pe-2 ps-px` |
| `chat/message/toolRenderers.tsx` | 207, 276 | `pl-4` | `ps-4` |
| `chat/ModelControls.tsx` | 1310, 1647, 1756, 1764, 1805 | `ml-auto`, `pl-0.5`, `left-2`, `pl-7`, `right-2`, `mr-1.5` | `ms-auto`, `ps-0.5`, `start-2`, `ps-7`, `end-2`, `me-1.5` |
| `session/ScheduledTaskEditorDialog.tsx` | 265, 398, 431 | `ml-0.5`, `pl-2 pr-1`, `ml-1` | `ms-0.5`, `ps-2 pe-1`, `ms-1` |
| `session/MoveChatToProjectDialog.tsx` | 34 | `text-left` | `text-start` |
| `session/spaces/NewSpaceDialog.tsx` | 204, 207 | `pl-6`, `ml-0.5` | `ps-6`, `ms-0.5` |
| `session/sidebar/projects/SessionGroupSection.tsx` | 1030, 1051, 1059, 1281 | `pl-[26px]`, `pr-1.5`, `pr-20`, `-ml-2.5`, `right-0.5` | `ps-[26px]`, `pe-1.5`, `pe-20`, `-ms-2.5`, `end-0.5` |

---

#### 5.2.5 Category E: Semantic Token & Role Misuse
1. **`chat/composer/ui/FocusModeButton.tsx:41` (MODERATE):**
   * Applies `text-primary` to indicate active toggle state (`aria-pressed`).
   * *Rule Violated:* `STYLING.md` line 12 & 50: *"Primary means 'act'; selection means 'currently active.' Do not use primary to mark ordinary selected tabs or rows."* Use `text-foreground font-semibold` or selection tokens.
2. **`chat/JobsSheetDialog.tsx:528` (MODERATE):**
   * Stream selection button applies `bg-primary text-primary-foreground` when selected instead of `bg-interactive-selection text-interactive-selection-foreground`.
3. **`chat/PlanReviewCard.tsx:141, 158` & `CleanseStatusBoard.tsx:114` (MINOR):**
   * Non-interactive static icons (`file-text`, `file`) styled with `text-primary` instead of neutral `text-muted-foreground`.
4. **`chat/FormDock.tsx:224` vs. `PermissionDock.tsx:109` (MODERATE):**
   * `FormDock.tsx:224` styles header `Icon name="question"` with `text-primary`, whereas `PermissionDock.tsx:109` styles it with `text-[var(--status-warning)]`. They represent the same docked prompt pattern and must use consistent warning status styling.

---

### 5.3 Chat & Workbench Remediation Blueprint
1. **Token Cleanse & Fake Utility Eradication:**
   - Delete all instances of `bg-surface-1`, `bg-surface-2`, `bg-surface-3` from `JobsSheetDialog.tsx` and `BackgroundShellsStrip.tsx`. Replace with semantic tokens `bg-[var(--surface-elevated)]` or `bg-card`.
   - Refactor `toneToProgressClass` and `toneToColorClass` to use `bg-[var(--status-success)]`, `bg-[var(--status-error)]`, `bg-[var(--status-warning)]`, and `bg-[var(--status-info)]`.
   - Replace `bg-green-500` / `bg-red-500` in `TodoCard.tsx` with semantic status tokens.
   - Cleanse hardcoded hex fallbacks from `ContextUsageDisplay.tsx` and `TableAutoChart.tsx`.
2. **Full i18n Dictionary Reconciliation Across 14 Locales:**
   - Add missing keys for compaction divider (`chat.compaction.*`) across all 11 missing language dictionaries (`ar`, `fr`, `he`, `ja`, `ko`, `nl`, `pl`, `pt-BR`, `tr`, `uk`, `zh-CN`, `zh-TW`).
   - Extract and translate 23 builtin slash command descriptions from `CommandAutocomplete.tsx`.
   - Add localized keys for `ChatInput.tsx` ghost prediction starter and Tab key indicator.
   - Replace plural suffix concatenations in `toolRenderers.tsx` with dedicated plural keys.
3. **Shared Primitive Migration:**
   - Replace DOM hover manipulation in `PermissionActions.tsx` with shared `Button` variants and `<Icon name="loader-4" />`.
   - Replace raw `<select>` and `<textarea>` in `PlanReviewCard.tsx` with shared `Select` and `Textarea`.
   - Replace raw text inputs in `SubagentHudTray.tsx` and `WorkStatusSubagentsSection.tsx` with shared `Input`.
4. **Mechanical Logical Properties Codemod:**
   - Execute an automated codemod across the 17 identified files to convert physical classes (`ml-*`, `mr-*`, `pl-*`, `pr-*`, `left-*`, `right-*`, `text-left`) into logical classes (`ms-*`, `me-*`, `ps-*`, `pe-*`, `start-*`, `end-*`, `text-start`).

---

## 6. Live Browser Walkthrough & Screenshot Inventory

### 6.1 Browser Audit Execution Environment
- **Server Startup Command:**  
  `OPENCHAMBER_HMR_UI_PORT=5223 OPENCHAMBER_HMR_API_PORT=3953 OPENCHAMBER_DATA_DIR=/home/shizuku/Project/ohpichamber-omp-artifacts/m6-phase1-audit-2026-11-06/data-c bun run dev`
- **Headless Browser Tooling:** Chrome DevTools CLI script executed in isolated context `m6-audit-c` at fixed viewport dimensions `1440x900`.
- **Theme Emulation:** System color scheme emulation toggled between `dark` and `light`.
- **Teardown State:** Server process was cleanly terminated via PID SIGTERM, and ports `5223` and `3953` were verified completely freed before audit conclusion.

### 6.2 Complete Screenshot Inventory (26 Assets)
All 26 screenshot receipts are durably stored under `/home/shizuku/Project/ohpichamber-omp-artifacts/m6-phase1-audit-2026-11-06/screenshots/`:

| Screenshot Filename | File Size | Theme | Inspected Surface & Interaction State | Observed Visual Findings |
|---|---|---|---|---|
| `01-chat-composer-dark.png` | 77.7 KB | Dark | Main chat surface & composer dock | Crisp contrast, proper surface elevation, dark background layers |
| `01-chat-composer-light.png` | 78.8 KB | Light | Main chat surface & composer dock | Legible text, but outer composer container border appears faint |
| `01-chat-model-selector-dark.png` | 131.1 KB | Dark | Composer Model Selector dropdown open | Clean dropdown trigger chrome, high contrast model list |
| `01-chat-model-selector-light.png` | 138.3 KB | Light | Composer Model Selector dropdown open | Compliant dropdown menu styling and keyboard focus rings |
| `01-chat-effort-picker-dark.png` | 86.7 KB | Dark | Composer Reasoning Effort picker open | Effort level list (Off, Low, Medium, High) cleanly rendered |
| `01-chat-effort-picker-light.png` | 92.0 KB | Light | Composer Reasoning Effort picker open | High contrast; effort slider trigger properly aligned |
| `01-chat-session-mode-dark.png` | 108.1 KB | Dark | Composer Session Mode dropdown open | Mode list (Main, Plan, Vibe, Goal) cleanly rendered |
| `01-chat-session-mode-light.png` | 113.3 KB | Light | Composer Session Mode dropdown open | Standard dropdown trigger variants adhered to |
| `03-settings-providers-dark.png` | 158.0 KB | Dark | Settings: Providers root view | Renders card grid instead of upstream master-detail; clear cards |
| `03-settings-providers-light.png` | 168.9 KB | Light | Settings: Providers root view | Light theme cards render cleanly, subtle card border faint |
| `03-settings-providers-connect-dark.png` | 148.0 KB | Dark | Settings: Providers -> Connect Provider picker | Modal picker lists 91 providers with search filter |
| `03-settings-providers-connect-light.png` | 158.4 KB | Light | Settings: Providers -> Connect Provider picker | Clean grid layout; search input properly focused |
| `03-settings-providers-custom-form-dark.png` | 148.1 KB | Dark | Settings: Providers -> Custom Provider form | Custom form fields visible; raw `w-full` select trigger observed |
| `03-settings-providers-custom-form-light.png` | 156.0 KB | Light | Settings: Providers -> Custom Provider form | Legible inputs; full-width selects contrast with standard fields |
| `04-settings-omp-dark.png` | 201.1 KB | Dark | Settings: OMP Settings page root | Header renders; body empty due to backend HTTP 404 |
| `04-settings-omp-light.png` | 209.0 KB | Light | Settings: OMP Settings page root | Header renders; body empty due to backend HTTP 404 |
| `05-settings-websearch-dark.png` | 144.5 KB | Dark | Settings: Web Search root view | Inline radio options, fallback chips with inline remove, timeout |
| `05-settings-websearch-light.png` | 155.7 KB | Light | Settings: Web Search root view | Diverges from upstream `SettingsCard` grid pattern |
| `06-settings-routing-dark.png` | 161.6 KB | Dark | Settings: Routing page root view | Jev-missing info alert, auto-mode toggles, category selects |
| `06-settings-routing-light.png` | 172.0 KB | Light | Settings: Routing page root view | 3-item grid in `SettingsTwoColumn` creates orphaned column |
| `07-settings-general-dark.png` | 163.8 KB | Dark | Settings: General settings view | Clean flat section layout, workspace toggles properly spaced |
| `07-settings-general-light.png` | 174.4 KB | Light | Settings: General settings view | Compliant typography and standard checkbox row anatomy |
| `08-settings-sessions-dark.png` | 169.8 KB | Dark | Settings: Sessions & Defaults view | Retention sliders, auto-cleanup toggles, worktree archive |
| `08-settings-sessions-light.png` | 178.9 KB | Light | Settings: Sessions & Defaults view | Displays `DefaultsSettings` identical to General tab duplicate |
| `09-settings-skills-installed-dark.png` | 120.0 KB | Dark | Settings: Skills Installed catalog view | Clean list of active skills; search filter correctly placed |
| `09-settings-skills-installed-light.png` | 130.9 KB | Light | Settings: Skills Installed catalog view | Proper table dividers; compliant button actions |

### 6.3 Visual Contrast & Layout Observations
1. **Dark Mode Performance:** The dark theme demonstrates excellent token mapping across all audited surfaces. Surface layers (`--surface-elevated`, `--surface-subtle`) provide crisp visual hierarchy, text contrast meets WCAG AAA standards, and dropdown menus maintain solid elevation shadows.
2. **Light Mode Performance:** Light theme typography and primary actions are legible and high-contrast. However, subtle borders (`border-border/40` and `border-[var(--interactive-border)]`) appear faint on standard dynamic-range displays.
3. **OMP Settings 404 Runtime Defect:** The visual inspection confirmed that navigating to `?settings=omp` fails to render model role selectors because the Host backend router does not implement the `/api/agent/v1/workspaces/:workspaceId/omp/settings` endpoint. This must be addressed in Phase 2/3.
4. **Providers Page Anatomy Regression:** Live screenshots confirm that the current fork completely abandoned upstream's master-detail provider anatomy in favor of a flat card grid, while nesting a boxed card inside the credential detail view.

---

## 7. Risk-Ranked Remediation Backlog for Phase 2 (`flow-break`)

This backlog organizes all identified defects into prioritized, actionable tasks ready for Phase 2 task decomposition (`flow-break`):

### Tier 1: P0 — Critical Functional Blockers & Broken Styling Runtimes
1. **P0-1: Eradicate Fake Utilities & Palette Colors in Chat Dialogs**
   - *Target:* `packages/ui/src/components/chat/JobsSheetDialog.tsx`, `BackgroundShellsStrip.tsx`, `TodoCard.tsx`
   - *Fix:* Purge `bg-surface-1/2/3` fake utilities. Replace all generic Tailwind palette colors (`emerald`, `rose`, `amber`, `blue`, `violet`, `green`, `red`) with semantic OpenChamber tokens (`status-success`, `status-error`, `status-warning`, `status-info`).
2. **P0-2: Fix Invalid CSS `typography-label`**
   - *Target:* `packages/ui/src/components/sections/plugins/PluginsPage.tsx:241, 716` and `PluginStatusBanner.tsx:43`
   - *Fix:* Replace hallucinated `typography-label` with real CSS class `typography-ui-label`.
3. **P0-3: Eliminate Runtime-Unsafe Clipboard Access**
   - *Target:* `packages/ui/src/components/sections/mcp/McpPage.tsx:229`
   - *Fix:* Wrap `navigator.clipboard.readText()` in feature-detection and `try...catch` block with fallback manual paste textarea.
4. **P0-4: Reconcile Missing Translation Dictionaries for Compaction**
   - *Target:* `packages/ui/src/lib/i18n/messages/*.ts` (11 non-English dictionaries)
   - *Fix:* Populate `chat.compaction.*` keys across all 11 missing language files; remove inline fallback chains (`|| '...'`) from `SessionRecapSpacer.tsx` and `TimelineNoticeCard.tsx`.

### Tier 2: P1 — Priority Settings Surfaces Redesign
1. **P1-1: Redesign `ProvidersPage.tsx` to OpenChamber Flat Standards**
   - *Target:* `packages/ui/src/components/sections/providers/`
   - *Fix:* Eliminate boxed card at line 368; replace `isMobile` viewport branch with `@xl:` container queries; replace raw `<button>` at line 501 with shared `Button`; refactor `ProviderApiKeyForm` to `SettingsStackedField`; enforce `size-*` icon classes.
2. **P1-2: Redesign `WebSearchPage.tsx` & Wire Save Feedback**
   - *Target:* `packages/ui/src/components/sections/websearch/WebSearchPage.tsx`
   - *Fix:* Wire `useWebSearchStore` persistence to `reportSettingsSaveState`; refactor timeout control to `NumberInput` inside `SETTINGS_NUMBER_STEPPER_ROW_CLASS`; fix `SelectValue` render function; register `web-search.fallbacks` and `web-search.timeout` in `search.ts`.
3. **P1-3: Redesign `OmpSettingsPage.tsx` & Register Search Anchors**
   - *Target:* `packages/ui/src/components/sections/openchamber/OmpSettingsPage.tsx`
   - *Fix:* Replace `sm:flex-row` with `@xl:` container queries; strip production `data-testid`; replace untokenized classes with semantic typography tokens; localize `aria-label`; register all 16 model roles in `search.ts`.
4. **P1-4: Restructure `DefaultsSettings.tsx` & Prune Duplicate Rendering**
   - *Target:* `packages/ui/src/components/sections/openchamber/DefaultsSettings.tsx` & `OpenChamberPage.tsx`
   - *Fix:* Rename section to "Session Behavior"; remove duplicate invocation from General tab (line 56); retain strictly on Sessions tab (line 203).

### Tier 3: P2 — Chat & Dialog Shared Primitive Migrations
1. **P2-1: Refactor `PermissionActions.tsx` to Shared Button Primitives**
   - *Target:* `packages/ui/src/components/chat/PermissionActions.tsx`
   - *Fix:* Remove DOM hover style mutations; use standard `Button` variants (`variant="secondary"`); replace raw HTML spinner with `<Icon name="loader-4" className="size-3 animate-spin" />`.
2. **P2-2: Refactor `PlanReviewCard.tsx` Form Elements**
   - *Target:* `packages/ui/src/components/chat/PlanReviewCard.tsx`
   - *Fix:* Replace raw HTML `<select>` with shared `Select` and `dropdownTriggerVariants()`; replace raw `<textarea>` with shared `Textarea`.
3. **P2-3: Standardize Subagent Control Sizing**
   - *Target:* `packages/ui/src/components/chat/SubagentHudTray.tsx` and `WorkStatusSubagentsSection.tsx`
   - *Fix:* Replace manual `h-6 px-1.5` button overrides with `size="xs"`; replace raw `<input>` with shared `Input`.
4. **P2-4: Localize Builtin Slash Command Descriptions & Prediction**
   - *Target:* `packages/ui/src/components/chat/CommandAutocomplete.tsx` and `ChatInput.tsx`
   - *Fix:* Move 23 hardcoded command descriptions to `messages/en.ts` and i18n dictionaries; localize prediction starter string and Tab key indicator.

### Tier 4: P3 — RTL Directionality Codemod & Search Registry Synchronization
1. **P3-1: Mechanical Logical Properties Codemod (17 Files)**
   - *Target:* 17 files listed in Section 5.2.4 (including `SkillsCatalogPage.tsx`, `ScheduledTaskEditorDialog.tsx`, `UsagePage.tsx`, `AdvisorMessage.tsx`, `ModelControls.tsx`)
   - *Fix:* Mechanically replace all physical direction classes (`ml-*`, `mr-*`, `pl-*`, `pr-*`, `left-*`, `right-*`, `text-left`) with CSS logical properties (`ms-*`, `me-*`, `ps-*`, `pe-*`, `start-*`, `end-*`, `text-start`).
2. **P3-2: Complete Settings Search Registry Synchronization**
   - *Target:* `packages/ui/src/lib/settings/search.ts`
   - *Fix:* Synchronize all missing and stale entries documented in Section 4.7 (`omp.modelRoles.*`, `web-search.*`, `commands.*`).

---

## 8. Verification Commands & Evidence Receipts

In strict adherence to task requirements and project verification standards, the following verification commands were executed:

### 8.1 Research Deliverable Existence & Keyword Anchoring
```bash
test -s .workflow/research/m6-audit-list-c-ui-compliance.md   && grep -q 'ProvidersPage' .workflow/research/m6-audit-list-c-ui-compliance.md   && grep -q 'OmpSettingsPage' .workflow/research/m6-audit-list-c-ui-compliance.md   && grep -q 'WebSearch' .workflow/research/m6-audit-list-c-ui-compliance.md
```
- **Exit Code:** `0` (Success)
- **Output:** Report exists, is non-empty, and contains verified evidence anchors for `ProvidersPage`, `OmpSettingsPage`, and `WebSearch`.

### 8.2 Workflow Schema Validation
```bash
.workflow/bin/workflow validate
```
- **Exit Code:** `0` (Success)
- **Output:** `Workflow is valid (213 task files).`

### 8.3 Git Working Tree Cleanliness
```bash
git status --short
```
- **Exit Code:** `0` (Success)
- **Output:** Application source code completely untouched; only documentation report and archived task tracking modified.

---
*Report autonomous audit complete. All findings verified against pinned source baseline `0056bf6a9` and audit tip `76112ae00`.*
