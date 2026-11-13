# Settings UI parity vs upstream v2.7.0 — items 3, 4, 5, 9, 10, 11

Read-only. Where code was not run I say so; screenshot #8 did not render for me, so it is [INFERENCE].

## Table

| Item | Component file:line | Upstream file (bc50ba56a) | Cause | Fix |
|---|---|---|---|---|
| 3 title missing | `openchamber/OpenChamberPage.tsx:86-90`, `remote-instances/RemoteInstancesPage.tsx:1580` and 8 more `namedBySidebar` call sites | same files, plus `shared/SettingsPageLayout.tsx` | **Not a dropped merge hunk.** Upstream commit `f2d8615b4` (2026-11-09) added `namedBySidebar`, which hides title and description. That commit is after the `v2.7.0` tag (`651a05648`, 11-08) but inside bc50ba56a. The fork merged it faithfully. | Maintainer decision (below). |
| 4 missing option | `openchamber/GeneralWorkspaceSettings.tsx` terminal block, about lines 267-270 | same file, lines 277-284 | Merge dropped the "Close the tab when the shell exits" checkbox (`terminalCloseOnExit`). | Restore the setting end to end. |
| 5a selector loading and jump | `openchamber/DefaultsSettings.tsx:354` (`ModelRoleEditor`), `shared/ModelRoleEditor.tsx:140`, `agents/ModelSelector.tsx:136,192,233` | `openchamber/DefaultsSettings.tsx:389-391` | Upstream returned `null` until its settings load. The fork renders at once while the OMP snapshot (`resolveWorkspace` then `getOmpSettings`, `DefaultsSettings.tsx:72-92`) is still in flight. | Gate the pickers on `ompState`. |
| 5b default agent | `DefaultsSettings.tsx:411-428` | `DefaultsSettings.tsx:419-428` | Control writes an OpenChamber setting. OMP has no root agent. | Remove the control. |
| 5c two small-model controls | `DefaultsSettings.tsx:430-476` | `DefaultsSettings.tsx:435-487` | Walkthrough row reuses the small-model checkbox label. | Rename the walkthrough label. |
| 5d/9 description overflow | Inventory below | `PATTERNS.md:53-59` | Fork-added rows use `description=` where upstream uses `info=`. | `description` → `info`. |
| 10 fallback search providers | `websearch/WebSearchPage.tsx:177-241` | no counterpart (no fallback concept upstream) | Fork-native, plain list plus a select. | Redesign (below). |
| 11 词元 and -1 | `openchamber/OmpSettingsPage.tsx:112,115,221-236`; `omp-settings.i18n.ts` zh-CN 1913,1944-45 | none (`CompactionSettings` was OpenCode-only and deleted) | Generic number renderer ignores `setting.options` and shows the raw sentinel. | Render Default/Auto; change locale wording. |

## Item 3 — page titles
- **Observed:** #5/#6 show Remote instances and the tunnel page with no heading. #7, the v2.7.0 release build, shows "外部隧道" plus the description "通过远程隧道公开此实例".
- **Cause (verified):** `SettingsPageLayout.tsx:94` with `namedBySidebar` renders only an `sr-only` `<h1>`. Fork call sites: `BehaviorPage:306`, `ExtensionsPage:1164`, `GitPage:118`, `IntegrationsPage:53`, `OpenChamberPage:88` (covers General, Appearance, Chat, Sessions, Shortcuts, Git, Notifications, Voice and Tunnel), `ProjectsPage:83`, `RemoteInstancesPage:1580`, `SkillsCatalogPage:387`, `WebSearchPage:443`, `SettingsView:664`.
- **Inconsistency:** the fork's own pages (MCP, Plugins, Providers, Routing, OMP) still show title and description, so the settings pane is mixed.
- **Why the build differs:** the maintainer compared against the v2.7.0 tag, but the fork is merged at a later upstream main. The `bc50ba56a` build would show no title either.
- **Decision:**
  - (a) Keep `namedBySidebar`; matches upstream main.
  - (b) Drop `namedBySidebar` and restore the `settings.page.*.description` keys on those pages, matching v2.7.0 and the fork's own pages.
  - (c) Change the `SettingsPageLayout` default; broader than needed.
  - **Recommend (b).** The maintainer is explicitly asking for titles. It also needs a `references/layout.md:22` edit.

## Item 4 — missing option
- **Observed:** #9 (fork) shows only Terminal Shell, "作为登录 Shell 启动" and "终端快捷键". The upstream row "Shell 退出时关闭标签页" is absent. #8 is the screenshot I could not read; I assume it is the upstream counterpart [INFERENCE].
- **Cause (verified):**
  - Introduced in upstream `e6312a9b4` and contained in v2.7.0.
  - Commit `c3c4b1510` (task 15, sync/stores lane) removed `terminalCloseOnExit` from `useUIStore`: the field, the setter, the initial value and the persist line.
  - `registry.ts` has no `terminalCloseOnExit` entry, and `settings-helpers.js` / `settings-registry.json` no longer sanitise it.
  - `TerminalView.tsx:432-455` lacks the `closesOnExit()` branch.
  - The `search.ts` entry is gone, and `GeneralWorkspaceSettings` has no row.
  - The decision at `decisions.md:942` and `done/ux-v270-omp-alignment/31-repair-settings-sections.md:56` rationalised this as "the fork lacks a store key", but the merge itself deleted the key.
  - The locale keys `settings.openchamber.visual.field.terminalCloseOnExit(Info)` are still present in all locales. `views/DOCUMENTATION.md:461` still documents the setting.
- **Same pattern, also dropped:**
  - `sessionTabsPerWorkspace`: the store key and registry entry exist and `SessionTabsStrip.tsx:308` and `lib/sessionTabs.ts:75` read it, but the setter is gone and the control was removed from `PanelsAndLinksSection`. Verified.
  - `serverUpdateChannel`: control dropped. The fork has `lib/updateChannel.ts`; I did not trace it.
  - `settingsDefaultVariant` is listed in the same decision.
- **Fix:**
  - Restore the store key, setter and persist line.
  - Restore the `registry.ts` entry (copy the upstream line at `registry.ts:512`, using the fork's `setUi`).
  - Restore the server sanitiser and registry JSON.
  - Restore the `TerminalView` exit branch, adapted to the fork's `lib/terminalTabClose.ts`, whose signature differs from upstream.
  - Restore the checkbox row with `settingsItem="appearance.terminal-close-on-exit"` and the `search.ts` entry.
  - Restore the `sessionTabsPerWorkspace` row.
  - No design choice needed; this is a straight restore.

## Item 5 — Sessions page

### 5a. Loading state and jump
- **Observed:** upstream #10 shows a spinner and "加载中" trigger. The fork shows a placeholder, then jumps.
- **Cause (verified):** the fork's `ModelSelector` already has the loading UI (`agents/ModelSelector.tsx:192-196,233-239`). The trigger reads `displayReady = isReady || Boolean(selectedModel)` at line 136.
  - `isReady` comes from the models catalog (`useCatalogReadiness`), and `useSettingsModels` often already has it loaded.
  - `selectedModel` is null while `ompState` is null, because `roles` is `{}` and the provider/model id is empty.
  - The picker therefore draws "inherit/not selected" first, then the real model when the async snapshot lands. That is the jump.
- **Fix:** add `loading?: boolean` to `ModelRoleEditor` and `ModelSelector`, forcing the spinner state. `DefaultsSettings` passes `loading={!ompState}`. The effort picker already returns null when there is no model. Alternatively, return `null` for the model sections until `ompState` is non-null, as upstream does. The prop is more faithful to "show the loading state".
- **Same class:** `GitSettings.tsx:203-214` (`ModelRoleEditor` for commit) has the same placeholder-then-model jump.

### 5b. Default agent
- **Observed:** #11 shows a "默认智能体" selector on Sessions.
- **Which owner it writes to:** OpenChamber setting `defaultAgent`, not OMP `modelRoles`. All of these are verified:
  - UI write: `DefaultsSettings.tsx:416-425` calls `setSettingsDefaultAgent` and `updateDesktopSettings({defaultAgent})`.
  - Registry and server: `registry.ts:583`, `settings-helpers.js:635`, `settings-normalization-runtime.js:233`.
  - Consumers: `ModelControls.tsx:1050` (composer fallback), `lib/defaultSendSelection.ts:13`, `lib/guests/start-session.ts:138`, and the `PermissionDefaultModeField` `agentName` prop.
- **Why it is wrong:**
  - Decision "2026-10-25 Replace root agent selection with session modes" (`decisions.md:283`) says OMP has no root agent.
  - `message-queue/prompt-admission.js:7` rejects any non-null root `agentId`.
  - Task 03 removed this control; the merge of upstream's `DefaultsSettings` reintroduced it. This is the "bad hunk survives merge" pattern.
  - `ProjectGeneralTab.tsx:57-60` and `useProjectIdentityForm.ts` carry the same per-project default agent, so it is not a one-off.
- **Open point [INFERENCE]:** whether `ModelControls.tsx:1050` still sends a non-null agent id. Admission would reject it, but `ROOT_SELECTION_AGENT` may be a sentinel mapped to null; I did not trace it.
- **Single correct owner:** none. Remove the Sessions "默认智能体" field, the `defaultAgent` registry and server key, `settingsDefaultAgent`, and the project-level default agent. Session mode (`defaultSessionMode`) is the real knob and already sits on the same page. Agent profiles stay editable on the Agents page as `task` subagent definitions.
- **Decision:** (1) remove everything, recommended; (2) remove only the Sessions control and keep the project default. Option 2 leaves a dead setting.

### 5c. Two "small model" controls
- **Cause (verified):** `DefaultsSettings.tsx:430-476` has two checkboxes labelled `settings.openchamber.defaults.smallModel.useDefault` ("使用默认小模型"):
  - lines 436-448: the real small-model toggle, `smol` role;
  - lines 466-476: the walkthrough toggle, `slow` role, reusing the small-model label key.
  - Plus a "小模型" `ModelRoleEditor` at lines 450-460. That is two "use default small model" checkboxes in one section.
- **Owners:**
  - `smol` is an OMP `modelRoles` entry (OMP "Fast"). Small-model requests resolve through it (`lib/smallModelRequest.ts:61`).
  - `slow` is the walkthrough role (`web/server/lib/walkthrough/index.js:228`). Upstream's OpenChamber `smallModel*` and `walkthroughModel*` keys are gone from `registry.ts` and the server.
  - `modelRoles` is therefore the single correct owner, and the OMP page excludes `smol` and `slow` (`OmpSettingsPage.tsx:46-47`). No true duplicate write exists, only a duplicate label.
- **Fix:** give the walkthrough toggle its own keys ("改动导读使用默认模型", or the walkthrough label without a toggle), and drop the `sessions.walkthrough-use-default` label overlap. `settingsItemOwnership.test.ts:30` already whitelists `sessions.small-model` as same-page.

## Items 5d and 9 — description overflow
- **Observed:** #16 (Git page) shows visible grey descriptions under the commit model row and all four commit-generation checkboxes.
- **Upstream rule** (`PATTERNS.md:53-59`):
  - Prose goes behind the info icon (`info=`).
  - A visible description is allowed only for a title plus description plus checkbox/radio group, where the labels alone cannot explain the choice.
  - Warnings, dynamic status, validation errors and wizard instructions stay visible.
  - `controls.md` says a checkbox row's visible `description` is "only for text that must stay visible".
- **Inventory of fork rows rendering inline `description=` (scan of sections/views; `up` = upstream had one):**
  - `openchamber/GitSettings.tsx:212` (commit role, via `ModelRoleEditor`)
  - `GitSettings.tsx:257,265,273,281` (four checkboxes) — **fix**
  - `DefaultsSettings.tsx:489` (walkthrough), `509`, `520` (checkboxes whose keys are literally `...Info`) — **fix**
  - `MergedWorktreeCleanupSettings.tsx:31` (upstream's equivalent used the section `info=`) — **fix**
  - `shared/ModelRoleEditor.tsx:163,177` passes `description` through. Callers at `OmpSettingsPage.tsx:481` (12 role rows) and `GitSettings.tsx:212` should pass `info`.
  - `OmpSettingsPage.tsx:462,494` (section descriptions) and `436,445,456` (page description)
  - `plugins/PluginsPage.tsx:278,311,713` (fork-added; 278 and 311 are likely info candidates)
  - `providers/CustomProviderForm.tsx:374` (secret hint)
  - Page-level descriptions on fork-owned grids: `McpGrid.tsx:137`, `PluginsPage.tsx:621,789`, `ProviderGrid.tsx:125`, `RoutingPage.tsx:346`. These are item 3, not overflow.
- **Compliant (leave):** the conditional status and error descriptions (`GitHubSettings`, `GitLabSettings`, `AddPluginDialog`, `SessionWarmingCheckbox.tsx:96`, `VoiceSettings`, `ProviderInstanceAccounts`, `Desktop*` shortcut-conflict text) and everything that matches upstream (`up` equal).
- **Fix:** mechanical swap of `description=` to `info=` on the rows above. `SettingsCheckboxRow` and `SettingsFieldRow` both accept `info`. Add a test that fails on a static `description={t(...)}` on `SettingsCheckboxRow`/`SettingsFieldRow` outside an allowlist, so this does not regress.

## Item 10 — fallback search providers
- **Observed (verified from code, no screenshot):** `WebSearchPage.tsx:177-241` is a section titled "备用提供商" with:
  - a plain list of names, each with a "Remove" button (lines 193-215);
  - an "add" `Select` whose trigger always reads "添加备用提供商" (the `SelectValue` child is a constant) and whose first item repeats that sentinel (lines 216-240).
- **Problems:**
  - The chain is ordered (`fallbackProviderIds` in `agent-contract/websearch.ts`) but there is no reorder and no numbering.
  - Providers appear twice: once in the card grid above (`ProviderCard`, 139-174, which carries "needs key / needs setup / in use" state) and again here with none.
  - Unusable providers (no key, not configured) can be chosen as fallbacks without any warning.
- **Upstream** has no fallback UI (`bc50ba56a` `WebSearchPage.tsx` has no "fallback" hits), so there is no parity target; this is fork UX.
- **Fix options:**
  - (1) An ordered, numbered list of fallback rows with provider name, status pill, drag handle or up/down buttons and remove. Reuse `SettingsSortableVisibilityList.tsx` or `ListSortableRow` (drag-to-reorder skill). Add the provider via a `Select` that lists only configured, unused providers and resets after pick.
  - (2) Make the provider cards themselves carry the chain: a "备用 #n" pill plus an "Add as fallback" card action. This removes the duplicate list but is harder to reorder.
  - **Recommend (1).** `fallbackProviderIds` and its primary-not-in-fallback rule already exist in the contract, so only the page changes.

## Item 11 — 词元 and -1
- **Observed:** #17 shows "词元数触发压缩 / -1 / 词元" and idle threshold "200000 词元".
- **Cause (verified):** `OmpSettingsPage.tsx:221-236` renders every `kind: 'number'` row with a raw `NumberInput` and the `unit` suffix.
  - OMP declares `compaction.thresholdPercent` and `compaction.thresholdTokens` with `default: -1`, meaning "Default / use the other threshold". `context-settings.ts` gives them option presets, including `{value:'default', label:'Default'}` and 25K-500K.
  - The contract carries `options` (`catalog-settings.ts:46`), but the page ignores them for number rows. The user sees the sentinel.
  - The upstream `CompactionSettings` handled this with a select plus a "default" item. It was deleted by the 2026-11-11 decision, which pointed to the OMP page, and the OMP page never reimplemented the default state.
- **Fix:**
  - For number rows whose descriptor has a `default`-valued option, render a `Select` from `setting.options` (values: 默认/自动, then the preset steps), mapping `default` to -1, plus a custom-value path only if needed. The smaller alternative is `value === -1 → undefined` with `emptyLabel` set to a localized "默认".
  - Add `settings.omp.value.default` (default/auto) to the `ompSettingsI18n` locales.
  - Apply the same treatment to `thresholdPercent`.
- **词元 locations (all verified):**
  - `omp-settings.i18n.ts` zh-CN: line 1913 (`unit.tokens`), 1944 (`thresholdTokens.label` "词元数触发压缩"), 1945.
  - `usage-stats.i18n.ts:729` (zh-CN); zh-TW is `詞元` at line 793.
  - `zh-CN.settings.ts`: 1809, 2405, 2406.
  - `zh-TW.settings.ts`: 1687, 2283, 2284.
  - `extensions.settings.i18n.ts:1734`.
- **Wording:** `zh-CN.ts` already uses a mixed convention: "令牌" (goal budget, goal usage), "Token" (`contextUsage.*`, `chat.workStatus.telemetry.tokens`). Decision: use "Token" for LLM tokens, as the context and telemetry strings already do. "令牌" also means credentials (`访问令牌`), which would be ambiguous. Apply to zh-CN and zh-TW alike.

## Shared patterns (root causes)
1. **Merge kept or dropped by file ownership, not behavior.** Item 4 is a dropped feature justified as a missing key; item 5b is a dead control the merge reintroduced. A merge audit should diff each upstream `settingsItem` and `settings.*` key against the fork's after resolution.
2. **Description policy is not enforced.** Add a test or lint for static `description=` on checkbox and field rows (items 5d and 9).
3. **Generic OMP row registry loses descriptor information.** `OmpSettingsPage` ignores `options` and sentinels for number rows (item 11).
4. **Async OMP-owned state has no loading affordance.** `ModelRoleEditor` renders placeholders before the snapshot (item 5a).
5. **Upstream reference drift.** Parity checks against the `v2.7.0` tag differ from merged `bc50ba56a`; `namedBySidebar` is the first confirmed case. The maintainer should say which is canonical.

Nothing was edited and no checks were run.