# Full UX restoration, OMP native parity, and performance remediation (24-point review)

**Status:** in progress
**Priority:** high
**Integration branch:** ux-and-omp-parity-remediation/integration

## What this is for

Hands-on maintainer evaluation of the desktop and web application against upstream OpenChamber (2.5.2 / 2.6.1) and standalone OMP TUI identified 24 concrete product, performance, runtime, and UI regressions:
1. Multi-second delay when starting a conversation turn, plus stalls on first entry when loading the model catalog.
2. Switching session permission mode to Auto-Accept ("全部批准") crashes with a 404/parse error because `/api/permission-auto-accept` was removed on the server while the UI still calls it and `InteractionManager` ignores session permission modes.
3. Top-right session/context statistics (`ContextSidebarTab`, `Header`) show `0` tokens / `0.0%` / `- / -` due to `providerID` vs `providerId` casing mismatch, non-directory-scoped provider lookup, and stripped `reasoningTokens`.
4. Composer predictive input (`ghostPrediction`) renders a fake static string on top of the active placeholder and triggers even while a turn is running.
5. Sessions starting with a greeting (e.g. `"你好"`) remain `"未命名会话"` forever because `WorkerSession` disabled OMP `autoTitle` without implementing OMP's deferred post-reply context retitling (`#advanceDeferredTitle`).
6. Short user messages (e.g. `"你好"`) stretch to a wide rectangle instead of a compact right-aligned pill due to unconditional `line-clamp-2` (`display: -webkit-box`), `w-full` on `UserMessageBody`, and sibling `actionsBlock` width coupling.
7. Main window layout diverges from upstream OpenChamber 2.6.1 (bottom-left sidebar controls, instance switcher position, top-right terminal selector & broken `'terminal'` icon name), and latest upstream OpenChamber 2.6.1 + latest OMP (default `code` mode) updates need to be tracked.
8. Voice input / dictation bar overlaps underlying composer text and controls because `.oc-surface-floating[data-dictating]` fails to match `.oc-glass-composer`.
9. Desktop app unconditionally uses its bundled runtime instead of preferring a system-installed `omp` binary when present, and does not fully align `models.yml`/`models.json` and `config.yml` lookup chains with `~/.omp/`.
10. Sessions (`会话` / `DefaultsSettings.tsx`) settings page stripped upstream controls (Default Model, Default Thinking Variant, Auto-apply Agent Model, Small Model, Walkthrough Model, Fallback Model, Tool Permission Default Mode, Plan Mode agent permission toggle).
11. Chat Assistance (`聊天 -> 辅助` / `ChatSettings.tsx`) stripped Goal completion checker (`Jev` / `Small Model`, backed in OMP by the `judge` role / `resolveJudge`) and `sessionGoalMaxAutoTurns`.
12. HTML live preview in `FilesView` defaults to code edit mode and uses an unlocalized, mis-sized `PreviewToggleButton` without active-state styling.
13. Behavior (`行为` / `BehaviorPage.tsx`) violates `PATTERNS.md` with full-bleed textareas, `alignEnd={false}` left-shifted select, and an always-visible disabled preview textarea.
14. Usage (`用量` / `UsagePage.tsx`) deleted the upstream unconfigured-provider warning banner, `ClaudeCodeSignIn` prompt, and styled error callout container.
15. Remote Instances (`远程实例` / `RemoteInstancesPage.tsx`) lists the local machine (`OpenChamber Desktop · Linux · 本机`, `clientKind: 'desktop-local'`) inside Host Access Control's Paired Devices list.
16. Git (`GitSettings.tsx` / `GitPage.tsx`) deleted the `生成提交消息` and `用于提交消息的推理` checkboxes and lacks a Commit Message Model (`commit` role) selector.
17. Providers (`提供商` / `ProvidersPage.tsx`) displays raw lowercase hyphenated IDs (`302ai`, `abacus`, `aihubmix`) instead of `@oh-my-pi/pi-catalog` display names and dumps all 96+ unconfigured providers into the main list instead of showing only connected providers plus `+ Add Provider`.
18. Web Search (`网页搜索` / `WebSearchPage.tsx`) uses crude bespoke controls and cleartext rows instead of standard `PATTERNS.md` provider cards, password toggles, and save-state feedback.
19. OMP Settings (`OmpSettingsPage.tsx`) renders untranslated English labels/descriptions, falls back to raw JSON `<Textarea>` inputs for array/object settings, and lacks OMP TUI's 10-tab categorization.
20. Agents (`智能体` / `AgentsPage.tsx`) replaced the upstream tool toggle matrix with a manual text input and omitted OMP `AgentDefinition` fields including `thinkingLevel` (思考强度) and `spawns`.
21. Commands (`命令` / `CommandsPage.tsx`) lists only `/init` because OMP's 29 built-in slash commands (`builtinCommands`) are not projected into `CommandsSidebar` / `CommandsPage`.
22. OMP Plugins (`OMP 插件` / `PluginsPage.tsx`) only shows an empty npm installer and completely omits OMP TUI's **Extension Control Center** (21 discovery providers across `Skills`, `Rules`, `Hooks`, `Context files`, `MCP`, `SSH`, etc.).
23. Composer slash-command autocomplete (`CommandAutocomplete.tsx`) badges native OMP commands as `OPENCODE` and mislabels native `/btw` as `OPENCHAMBER`.
24. Skills Catalog (`技能目录` / `SkillCatalogPage.tsx`) crashes with `Workspace directory is unavailable` when opened without an active project.

## What it does

- **Wave 1 (Tasks 01–04 — Runtime Performance, System OMP Sync, Permissions, Stats & Titles):**
  - Eliminates redundant `reopen` round-trips on live sessions, moves MCP connection startup to non-blocking background initialization, caches `provider.use` authorization per worker/model, parallelizes read-only catalog worker operations, pre-warms the stateless catalog worker on workspace registration, and hydrates model catalog cache from `localStorage`.
  - Detects system-installed `omp` on Desktop/Host and prefers it over the bundled runtime when compatible; unifies `config.yml`, `models.yml`/`models.json`, `auth.json`, and `sessions/` resolution with `~/.omp/`; and fixes `useSkillsCatalogStore` directory fallback chain.
  - Restores `/api/permission-auto-accept` routes and bridges session permission modes (`ask`, `safety`, `auto`) to `InteractionManager` / `NativePermissionBridge` and Jev safety evaluation.
  - Fixes `findAnsweringModelKey` (`providerId`/`modelId`), `ContextSidebarTab` directory-scoped provider lookup, and `reasoningTokens` projection; implements OMP-parity deferred conversation-context title generation after opening greetings.
- **Wave 2 (Tasks 05–06 — Chat, Composer, Voice, HTML Preview & Command Badges):**
  - Removes fake overlapping `ghostPrediction` in `ChatInput.tsx`, restores compact user message bubbles (`w-fit max-w-full`, isolated `actionsBlock`, conditional `line-clamp-2`), and fixes `.oc-glass-composer[data-dictating]` CSS hiding during voice dictation.
  - Fixes HTML live preview mode & `PreviewToggleButton` styling/i18n in `FilesView.tsx`, replaces `OPENCODE` command badges with `OMP`, and reclassifies `/btw` as a native `OMP` command.
- **Wave 3 (Tasks 07–08 — OpenChamber Settings Restoration & Pattern Compliance):**
  - Restores `DefaultsSettings.tsx` ("会话" page controls bound to OMP model roles and Host permission default mode) and restores `SessionGoalCheckerField` (wired to OMP's `judge` / Jev verifier) + `SessionGoalMaxTurnsField` in `ChatSettings.tsx`.
  - Rewrites `BehaviorPage.tsx` per `PATTERNS.md`, restores `UsagePage.tsx` warning/sign-in/error callouts, filters `desktop-local` from `RemoteInstancesPage.tsx` paired devices, and restores commit message generation checkboxes + `commit` role selector in `GitSettings.tsx`.
- **Wave 4 (Tasks 09–11 — OMP Settings, Providers, Web Search, Agents, Commands & Extension Control Center):**
  - Maps official provider display names from `@oh-my-pi/pi-catalog`, filters `ProvidersPage.tsx` main list to connected providers + `+ Add Provider` modal, redesigns `WebSearchPage.tsx` with standard collapsible provider cards, and restores the tool toggle matrix + `thinkingLevel` / `spawns` controls in `AgentsPage.tsx`.
  - Adds full i18n coverage (`en`, `zh-CN`, and locale fallbacks) for OMP settings, replaces all raw JSON `<Textarea>` controls in `OmpSettingsPage.tsx` with structured selectors/chip-groups/key-value editors, and organizes settings into OMP TUI's category tabs.
  - Projects all 29 OMP built-in slash commands into `CommandsPage.tsx`, exposes OMP's 21-provider Capability Registry via `/api/agent/v1/workspaces/:id/extensions`, and builds the **Extension Control Center** in `PluginsPage.tsx`.
- **Wave 5 (Tasks 12–14 — OpenChamber Upstream Selective Sync, Latest OMP Update & Adaptation, and Full Real-Path Gate):**
  - **Task 12 (`12-openchamber-upstream-selective-sync`):** Diffs `0056bf6a9..upstream/main` (`2.6.1+`), filters out excluded areas (`packages/vscode`, OpenCode engine paths, `.github`, `changelog/`, `nix/`), three-way merges shared files from `0056bf6a9`, and adapts upstream OpenChamber changes (including the 2.6.1 main-window layout, sidebar footer instance switcher pill, top-right terminal selector & `'terminal-box'` icon fix, UI/Host/Electron/Mobile/SDK bugfixes and features) to our Canonical API and OMP runtime.
  - **Task 13 (`13-omp-upstream-update-and-adaptation`):** Updates `vendor/omp/` to the latest upstream Oh My Pi release (with verified tarballs, native leaves, and rebased SDK patch) and adapts `packages/agent-service`, `packages/agent-contract`, and `packages/ui` to all upstream OMP changes (including default `code` mode execution, updated settings/tools/commands/capabilities, and agent runtime staging).
  - **Task 14 (`14-full-24-point-verification-gate`):** Runs the full workspace static gate and real-path Web + packaged Electron verification across all 24 items (`W1`–`W26`).

## How it is built

- Preserves the Canonical API boundary (`/api/agent/v1`) and Host security invariants while eliminating unnecessary synchronous IPC/HTTP serialization on hot paths.
- Uses `@oh-my-pi/pi-catalog` (`authPolicyFor`) and `@oh-my-pi/pi-coding-agent` (`capability`, `discovery`, `judgment`, `settings-ui`) inside `packages/agent-service` so the UI consumes typed canonical schemas.
- Adheres strictly to `packages/ui/src/components/sections/PATTERNS.md` and `packages/ui/src/lib/theme/STYLING.md` across all modified settings and chat surfaces.

## What it must not do

- Reintroduce the OpenCode runtime or VS Code extension.
- Use raw JSON textareas, unlocalized English strings, or bespoke non-`PATTERNS.md` form controls in Settings pages.
- Block worker startup or first-turn prompt dispatch on slow external MCP handshakes.

## How we will know it works

- **W1 (Fast Turn Start & Instant Model Catalog).** Sending a prompt on a warm session dispatches without a redundant `/reopen` round-trip or repeated `provider.use` HTTP round-trip; cold worker boot does not block on MCP server startup; `/models` and `/providers` execute concurrently without serial lock contention and hydrate immediately from cache.
- **W2 (Permission Mode Switching & Enforcement).** Clicking the composer permission shield or calling `PUT /api/permission-auto-accept/sessions/:id` cycles `ask -> auto -> safety` with HTTP 200 and updates `InteractionManager` approval behavior without errors.
- **W3 (Accurate Session & Context Stats).** `ContextSidebarTab` and `Header` display non-zero token counts, accurate context window limit and percentage, model/provider names, and `reasoning` tokens after an assistant turn.
- **W4 (Clean Composer Suggestion & Placeholder).** Composer never overlays static fake ghost prediction text on top of the placeholder or during an active turn.
- **W5 (Automatic & Deferred Session Titles).** Starting a session with `"你好"` and receiving an assistant reply automatically generates and syncs a non-empty session title to the header and sidebar.
- **W6 (Compact User Message Bubble).** A short user message (`"你好"`) renders in a compact `w-fit` pill rather than stretching across the chat column.
- **W7 (OpenChamber Upstream 2.6.1+ Selective Sync & Adaptation).** Upstream OpenChamber changes since `0056bf6a9` (`2.6.1+`) are selectively merged and adapted to the Canonical API/OMP boundary (excluding `packages/vscode` and OpenCode-engine paths), restoring the 2.6.1 main-window layout (sidebar footer instance switcher pill, top-right terminal dropdown with valid `'terminal-box'` icon, and upstream UI/Host fixes).
- **W8 (Clean Voice Dictation Bar).** Activating voice dictation hides underlying composer text and footer controls cleanly without overlap.
- **W9 (System OMP Detection & `~/.omp` Sync).** Desktop/Host detects an installed `omp` binary on the host machine and prefers it over the bundled runtime, sharing `config.yml`, `models.yml`/`models.json`, `auth.json`, and `sessions/` with `~/.omp/`.
- **W10 (Restored Sessions Settings Page).** `DefaultsSettings.tsx` exposes Default Model, Thinking Variant, Auto-apply Agent Model, Small Model, Walkthrough Model, Fallback Model, Tool Permission Default Mode, and Plan Mode permission toggle.
- **W11 (Restored Goal Completion Checker & Turn Cap).** `ChatSettings.tsx` Assistance tab exposes Goal completion checker (`Jev` / `Small Model` backed by OMP `judge`) and `sessionGoalMaxAutoTurns`.
- **W12 (HTML Live Preview).** Opening or toggling an `.html` file in `FilesView` renders live preview with a localized, properly styled `PreviewToggleButton`.
- **W13 (Compliant Behavior Page).** `BehaviorPage.tsx` uses right-aligned `Select`, `SettingsStackedField` with capped widths, and hides the custom textarea unless the `custom` preset is active.
- **W14 (Restored Usage Page Callouts).** `UsagePage.tsx` renders the unconfigured-provider warning banner, `ClaudeCodeSignIn` card, and styled error callout container.
- **W15 (No Local Machine in Paired Devices).** `RemoteInstancesPage.tsx` Host Access Control lists only external paired devices and never shows `desktop-local`.
- **W16 (Restored Git Settings).** `GitSettings.tsx` exposes all 4 Commit Message Generation checkboxes (`generateCommitMessages`, `commitMessageReasoning`, git notes, Change-Id) and the Commit Message Model selector.
- **W17 (Official Provider Names & Connected-Only List).** `ProvidersPage.tsx` displays official provider names (`OpenAI`, `Anthropic`, `302.AI`, `AiHubMix`) and lists only connected/configured providers in the main view with `+ Add Provider` for adding new ones.
- **W18 (Redesigned Web Search Page).** `WebSearchPage.tsx` uses standard `PATTERNS.md` selects, collapsible provider cards, password visibility toggles, and save-state feedback.
- **W19 (Localized, Structured, Tabbed OMP Settings Page).** `OmpSettingsPage.tsx` is localized in Chinese/English, uses zero raw JSON textareas, and organizes settings into OMP TUI's category tabs.
- **W20 (Restored Agent Tool Matrix & Thinking Effort).** `AgentsPage.tsx` renders the tool toggle checklist/matrix and exposes `thinkingLevel` (思考强度) and `spawns` selectors persisted to agent frontmatter.
- **W21 (All Built-in OMP Commands Listed).** `CommandsPage.tsx` displays all 29 built-in OMP slash commands alongside custom commands.
- **W22 (OMP Extension Control Center).** `PluginsPage.tsx` exposes OMP's 21-provider Extension Control Center (`Skills`, `Rules`, `Hooks`, `Context files`, `MCP`, `SSH`, provider/item toggles, and inspector).
- **W23 (Accurate `OMP` Command Badges).** Slash command autocomplete shows `OMP` instead of `OPENCODE` for built-in commands and labels `/btw` as `OMP`.
- **W24 (Resilient Skills Catalog Directory Resolution).** Opening `SkillCatalogPage` without an active project resolves to the ambient/home workspace and loads catalog sources without `Workspace directory is unavailable`.
- **W25 (OMP Upstream Update & Adaptation).** `vendor/omp/` is updated to the latest upstream OMP release with verified tarballs/leaves and rebased SDK patch; `packages/agent-service`, `packages/agent-contract`, and `packages/ui` are adapted to all new OMP behaviors (including default `code` mode, updated tool/setting/command contracts), and `prepare:agent-runtime` + `verify:agent-runtime` pass.
- **W26 (Full Workspace & Real-Path Gate).** `bun run dead-code`, `bun run type-check`, `bun run lint`, `bun run docs:validate`, `VITEST_MAX_WORKERS=2 bun run test`, `.workflow/bin/workflow validate`, and live Web/Electron UI verification pass across all 24 items.
