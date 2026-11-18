# Maintainer feedback 2026-11-15: tool tiers, MCP sign-in, chat rendering and the Settings pages

**Status:** in progress
**Priority:** high
**Integration branch:** ux-feedback-2026-11-15/integration

## What this is for

The maintainer used the packaged build of `main` (`1fc6270437`) and reported seven items. Most are about the Settings pages. Each item's cause is traced in [research/feedback-2026-11-15](../research/feedback-2026-11-15/README.md), which also holds the feedback verbatim.

- **Vibe mode cannot run at all.** It leaves the director with only the `vibe_*` tools. The Host authorizer classifies tools by a hard-coded name list and ends in a final deny (`worker-operation-authorizer.js:259`), and the five `vibe_*` tools are not on the list. The maintainer's session `d5d901e5` shows `vibe_spawn` and `vibe_list` denied with "The workspace policy does not allow this tool request". Approval modes only answer cards, so `auto` cannot help. The coverage test only walks `BUILTIN_TOOL_NAMES`, so it cannot see these tools, extension tools or plugin tools.
- **Chat rendering.**
  - A todo result with no tasks draws an empty bordered box (`TodoCard`, `TodoTray` check the phase count, not the task count).
  - A finished plan keeps its `N/N` row forever.
  - `cleanReasoningText` deletes every blank line, and GFM renders a single newline as a space, so reasoning collapses into one paragraph.
- **MCP sign-in from the Integrations store reports an error.**
  - With no live worker, the post-install probe only recognizes the exact code `MCP_AUTH_REQUIRED`. Anything else throws `MCP_APPLY_FAILED`, and the UI says "Could not install" even though the server was saved.
  - Installing never starts the sign-in, and nothing polls for completion.
  - Non-`NativeMcpError` failures are replaced by a generic sentence, which hides Figma's rejected client registration.
  - The redirect lands on the Agent Service loopback (port 3000), which a remote or mobile browser cannot reach.
- **Settings use half their width.**
  - `OmpRowControl` renders every number, string and enum as a stacked field capped at 24 rem, on nine pages.
  - `SettingsFieldRow`'s trailing alignment is inert (`@xl:w-fit @xl:flex-none`).
  - Selects hug their value, so right edges are ragged.
  - Pages wrap sections in their own `space-y-6`.
  - The page is otherwise sound: its 840 px cap matches upstream.
- **The OMP page is a 93-row wall** in OMP's declaration order. Its first section is a one-row "Notifications", option chips show raw English values, units are missing, and 85 rows are not searchable. Seven rows are terminal-only or egress (`dev.autoqa`, `spotlight.experiment.enabled`).
- **Routing.** A new category carries an empty description, which the server rejects. The draft then never saves; the maintainer's `routing.json` has never held a category. The category list is a hand-rolled accordion.
- **Web search.** The fallback list is squeezed into 24 rem. Every row carries a success pill and a text "Remove" button, and a `Select` is used as an "add" action. The timeout sits alone in its own section at the bottom.
- **Providers.**
  - Env-var providers are already built-in entries, but the variable name never reaches the UI, and the connect picker hides them.
  - The provider-ID regex is OpenCode-era and stricter than OMP.
  - Fetch-models imports ids only, and nothing fills capabilities.

## What it does

- **Tools.** Any OMP tool, including vibe, extension and plugin tools, is authorized by the tier the tool declares.
  - Read tools run after the path check, write tools after the workspace check.
  - Exec tools and unknown tools ask for approval, which `auto` answers.
  - Hard denials remain only for writes outside the workspace, explicit deny rows, enterprise mode, unconfigured MCP servers and isolated delegation.
  - A denial names the tool and the rule.
  - The permission mode chosen per session survives a Host restart.
- **Chat.**
  - A todo result with no tasks shows only its text.
  - The composer tray shows only while a task is open.
  - Reasoning keeps its paragraphs, and a single newline inside reasoning renders as a line break.
- **MCP sign-in.**
  - Installing a server that needs sign-in saves it and says "sign in to finish". It immediately starts the sign-in, opens the authorization page, and turns connected on its own when the browser flow completes.
  - The provider's own failure reason is shown. A server whose client registration is closed (Figma) shows a client-ID field.
  - Local servers that need environment values collect them in the install form.
  - Enterprise mode refuses MCP sign-in.
- **Settings layout.**
  - Every settings row uses the label-left, control-right pattern, with controls aligned to the trailing edge.
  - One set of control widths: select, number stepper, short text and long text.
  - One vertical rhythm: sections, rows inside a section, and checkbox lists.
  - No page adds its own spacing or widths.
- **OMP page.**
  - Four tabs: 常用 (Common), 编辑与读取 (Editing & reading), 执行与工具 (Execution & tools), 高级 (Advanced). Within a tab, rows run impact-first.
  - Every row has plain-language copy in all 15 locales, its unit, and localized option labels.
  - The four read-summary thresholds get one preset (关闭 Off / 平衡 Balanced / 激进 Aggressive / 自定义 Custom); the knobs stay editable in 高级.
  - Every row is searchable, and search opens the right tab.
  - Terminal-only and egress rows leave the page.
- **Routing.** Categories are a flat disclosure list with a checkbox each. Adding a category needs a name and a description before it saves, and the draft never gets stuck.
- **Web search.**
  - The fallback list is full width: drag handle, number, name, a warning only when something is missing, and an icon remove button. An "add fallback" menu button sits below it.
  - The timeout is a normal row at the top.
- **Providers.**
  - An env-backed built-in provider shows its variable, for example "From $OPENAI_API_KEY", and offers a key field. A saved key wins over the variable, and the badge stays visible.
  - Provider IDs accept letters, digits, `.`, `_` and `-`, are unique regardless of case, and refuse `/ # @ :`, whitespace and prototype names.
  - Custom base URLs may carry a query string.
  - MCP names accept OMP's pattern.
- **Models dialog.**
  - Filter chips, per-model add and remove, "添加全部模型" (add all models) and "清理失效模型" (remove models the endpoint no longer returns, after a confirmation that lists them).
  - "尝试自动填写模型信息" (try to fill in model info) fills context window, max output, input modalities, tool support, reasoning and pricing from OMP's bundled catalog, then from OpenRouter for models the catalog misses. It never overwrites a value the user typed.

## How it is built

**Tool tiers.** The worker resolves each tool's declared `approval` tier, including the per-args form, from the live session registry. It sends that tier on the existing `policy.request` as `declaredTier`; an unresolvable tool sends `exec`. The Host authorizer drops its read and write name arrays. It keeps the special cases that read arguments (`edit` effective mode, `context_notes`, `retain`, `learn`, `bash`, `task`, MCP, `provider.use`) and classifies everything else by `declaredTier`. The final deny goes away.

`interaction.requestNativeGrant` no longer requires an open turn, so bash inside an async vibe worker is not refused after OMP's own gate allowed it. `permissionAutoAccept` becomes a `profile` registry key, so the sanitizer stops dropping it.

The coverage test boots a worker and enumerates `getAllToolNames()` in main, plan and vibe modes, plus one MCP tool and one extension tool.

**Chat.**
- Todos: `todoProgress.ts` gains `hasTodoTasks` and `hasOpenTodo`.
  - `TodoCard` renders nothing without tasks.
  - `TodoTray` shows only with an open task; the test that pins `3/3` flips.
- Reasoning: `cleanReasoningText` keeps empty lines, maps invisible-only lines to empty, collapses runs of blank lines, and drops `<!-- -->` sentinels outside code fences. `JustificationBlock` shares the function.
- An in-repo remark plugin turns in-paragraph newlines into breaks for the `reasoning` variant only. There is no new dependency, and the policy cache is keyed by the flag.

**MCP sign-in.**
- One auth classifier serves both apply paths: `MCP_AUTH_REQUIRED`, `AUTH_REQUIRED`, `MCP_CREDENTIAL_UNAVAILABLE`, and `401`/`403`/`unauthorized`/`insufficient_scope` in the detail.
- `MCPApplyResult.outcome` becomes required for MCP applies.
- `#runOAuthFlow` resolves endpoints with OMP's `resolveMcpOAuthEndpointsFromServer`, which runs the anonymous probe and challenge discovery, and passes the original error through.
- The catalog view treats `saved-needs-auth` as success-with-action and mounts `McpOAuthSignIn` with auto-start. On `pending` it opens the authorization URL once and polls `GET …/mcp/servers/:id/oauth` every 1.5 s, within the flow's 5-minute budget. It cancels the flow on unmount.
- Redirects:
  - A local desktop runtime keeps the Agent Service loopback, on a fixed dedicated port with a pinned `redirectUri`.
  - Remote Web, mobile, and a desktop connected to a remote Host use a public Host route, `GET /api/agent/v1/mcp/oauth/callback`. It validates `state` against a Host-held pending map and hands the code to the `complete` action.
- The route and the `mcp-oauth` authorizer branch return `403 enterprise_mode` in enterprise mode, and `enterprise-mode.js`, its tests and the security docs list the gate.
- Catalog entries for local servers gain `envInputs`, written through the existing workspace-credential path.

**Settings layout.**
- `SettingsSection.tsx` owns the fix:
  - `SettingsFieldRow`'s control column grows and aligns to the trailing edge.
  - A small set of named width classes (select, stepper, short input, long input) and spacing classes (section, row stack, checkbox stack) replaces page-local values.
  - `OmpRowControl` renders number, string and enum rows as field rows; booleans stay checkbox rows.
- Pages drop their `space-y-6` wrappers, ad-hoc widths (`w-48`, `w-64`, `max-w-md`, `h-7 w-44`), the `GitPage` padding override, and viewport breakpoints inside the pane (`RemoteInstancesPage`, `NotificationSettings`).
- `PATTERNS.md` and `references/layout.md` record the classes. A lint rule or test rejects raw width or spacing utilities on controls in `components/sections`, so the drift cannot return.

**OMP page.** A declarative layout table (`ompSettingsLayout.ts`, tab → group → ordered ids) replaces grouping by OMP's `group`. A test asserts the table covers every exposed engine id exactly once.
- Placements:
  - `read.renderMarkdown`, `read.toolResultPreview`, `mcp.renderMarkdownResults`, `async.printWake` and `extensionRenderers.assistantText` become `tui-only`.
  - `dev.autoqa` and `spotlight.experiment.enabled` become `boundary`.
  - `CONDITIONS` gains `autoThinkingActive`.
- Controls:
  - `inferUnit` covers `Ms`, `Bytes` (as KB), `Lines` and `Columns`.
  - Option labels and descriptions get `settings.omp.items.<id>.options.<slug>` copy.
  - `-1` stops meaning "Default" where it means "unlimited".
- The read-summary preset writes its four keys in one `PATCH`, and shows 自定义 (Custom) when the stored tuple matches no preset.
- The config.yml footer moves to the end of 高级 under its own key, and its count names its three reasons separately.
- Search entries are generated from the layout table, and a deep link opens the tab.

**Routing.** A `SettingsDisclosure` primitive goes into `SettingsSection.tsx`. `CategoryRow` wraps it, and enable becomes a `SettingsCheckboxRow`. The debounced save runs only for a valid draft; an invalid one shows an inline helper and keeps the save state idle. The add row fills its line, and removed built-ins are restored inline.

**Web search.** The fallback list uses `SettingsSortableList` at full width, with a `DropdownMenu` add button and an empty state. The timeout moves into the first section as a `SettingsFieldRow` with the shared stepper class.

**Providers.**
- `ProviderAuthState` gains `environment: { variable, active }`, a variable name only and never a value. It is computed from OMP's `getEnvApiKeyName` and the key cascade.
- The grid pill and detail line name the variable, and env-backed cards offer the key form.
- One exported provider-ID validator replaces the two regexes. `configureProvider` rejects `/` with 422.
- `PublicEndpointSchema` allows a query string for custom providers. The MCP name rule follows OMP's `^[A-Za-z0-9_.-]{1,100}$`. Audio and embedding modality chips appear only for a native kind that supports them.
- The OpenCode wording in `settings.providers.grid.description` and the stale `DOCUMENTATION.md` paragraph go away.

**Models dialog.**
- Discovery results gain an optional `catalog` block. A new operation, `catalog.provider.models.enrich`, reads the bundled `@oh-my-pi/pi-catalog` through `resolveModelReference`, offline.
- Models it misses go to OpenRouter's public models API through the Host. That request is refused with `403 enterprise_mode` in enterprise mode, and the UI then reports the catalog-only result.
- `CustomProviderModelsDialog` replaces `CustomProviderModelDiscovery`. Grouping by family appears only when every row has a family.

**Task rules.**
- Every task deletes what it replaces.
- UI follows `PATTERNS.md`, `STYLING.md` and `references/layout.md`.
- Copy goes to all 15 locales; Chinese writes "Token".
- Every task gets an independent reviewer and runs its real path through the production composition, as the 2026-11-14 amendment of the previous effort required.

## What it must not do

- Hand prompt decisions to OMP's `tools.approvalMode`, or drop the Host's workspace, enterprise or MCP-configuration denials.
- Add dependencies (`remark-breaks` included).
- Raise the settings page width cap. The cap is revisited only after the maintainer has looked at the fixed rows.
- Move rows that Sessions, Agents, Memory, Chat, Tools or Behavior already own into the OMP page.
- Send conversation content or keys to OpenRouter. Auto-fill sends model ids only, and enterprise mode sends nothing.
- Ship a first-party Figma client ID.

## What was considered and rejected

- **OMP's approval mode as the decider.** It is the literal answer to "use OMP's system". But OMP cannot express the workspace boundary, and under `ask` our card would stop covering `eval` and MCP.
- **Naming the `vibe_*` tools in the list.** It is the smallest diff, and the denial returns with the next tool.
- **Keeping the finished plan for 60 s, like the TUI.** That is parity, but the maintainer asked for the tray to leave when nothing is in progress.
- **A "Sign in" button instead of auto-start.** It means fewer surprises, but the install copy already promises the browser sign-in, and it adds a click to every install.
- **OpenRouter only for auto-fill.** It covers more ids, but it is a second authority that can disagree with OMP at runtime.
- **A card grid for routing categories.** It would be consistent with Providers and MCP, but it adds a navigation step to a four-row list with long descriptions.

## How we will know it works

- **W1 (Tool tiers).**
  - The registry coverage test enumerates live tool names in main, plan and vibe modes, plus an MCP and an extension tool. Every result is allowed, needs approval, or names a boundary. It fails on `1fc6270437` for `vibe_spawn`.
  - On the real path, in `auto`, a vibe turn spawns a worker that writes a file in the workspace and returns. The session JSONL contains no "The workspace policy does not allow this tool request".
  - In `ask`, `vibe_spawn` raises one card.
  - A write outside the workspace is still denied, with that reason.
  - After a Host restart, the session's permission mode is unchanged.
- **W2 (Todo).** Unit cases cover `phases: []`, an empty phase, mixed phases, a branch switch and a cold read. On the real path, a session ending in "Todo list cleared." shows no tray and no empty box, and a session whose plan is all completed shows no tray.
- **W3 (Reasoning).** `A\n\nB` renders two paragraphs, and `A\nB` renders a `<br>`, with streaming and settled equal. On the real path, the maintainer's session `e8195e49` shows its roughly twelve reasoning paragraphs separated, and a new reasoning turn stays separated while it streams.
- **W4 (MCP sign-in).**
  - Installing Linear at user scope gives "saved, sign in to finish", never "Could not install". The browser opens Linear's authorize page, and after consent the server turns connected with no further click. `~/.omp/agent/mcp.json` lists it with no token values.
  - Installing Figma shows the registration refusal and a client-ID field.
  - From a second machine against a `0.0.0.0` Host, the redirect is the Host callback and the flow completes.
  - In enterprise mode, sign-in returns `403 enterprise_mode`.
- **W5 (Layout and controls).**
  - At 1600 px, on the OMP, Tools, Memory, Chat, Sessions, Agents and Behavior pages, each row's control ends within 2 px of the row's trailing edge, and every select in a section shares one right edge.
  - The guard test rejects a raw width or spacing utility on a control in `components/sections`.
  - Screenshots of every settings page are reviewed against `PATTERNS.md` by a reviewer that implemented nothing.
- **W6 (OMP page).**
  - The layout test shows every exposed engine id exactly once.
  - Every tab, group and option key exists in 15 locales.
  - On the real path, zh-CN shows no English chip and no unitless timeout.
  - The 激进 (Aggressive) preset writes four keys to `config.yml`.
  - Search "超时" (timeout) lands on the right tab and row.
  - `dev.autoqa` is absent from state and refused on write.
- **W7 (Routing).** On the real path, adding a category named "Docs" with a description saves, and `routing.json` gains `categories.docs`. Adding one without a description shows the helper and does not call save.
- **W8 (Web search).** The timeout row sits in the first section. With three fallbacks, the list is full width with icon remove buttons and no success pills. Keyboard and touch reordering persist.
- **W9 (Providers).**
  - With `OPENAI_API_KEY` exported, the card shows "From $OPENAI_API_KEY". Saving a key shows connected plus the badge.
  - The ID `Campus.2` saves, and `a/b` and `A`-vs-`a` duplicates are refused.
  - An Azure base URL with `?api-version=` saves.
- **W10 (Models dialog).**
  - Against the maintainer's CLIProxyAPI endpoint: 添加全部模型 adds every returned id, and 清理失效模型 lists and removes `gpt-5.5`-style ids the endpoint no longer returns.
  - Auto-fill writes `input`, `contextWindow`, `maxTokens` and `cost` into `models.yml` for catalogued ids, and fills an uncatalogued id from OpenRouter.
  - In enterprise mode, the OpenRouter step is refused and reported.
- **W11 (Acceptance).** On the packaged Linux AppImage, a reviewer that implemented nothing walks all seven items plus the two planning additions against the maintainer's screenshots and records PASS or FAIL per item. The full gate passes: `bun run check`, `type-check`, `lint`, all test suites, `docs:validate` and `workflow validate`.

## 2026-11-18 follow-up amendment (Tasks 14–19)

After Task 13 built and walked the `4f9a7c7f39` candidate, the maintainer reviewed the Settings surfaces and reported five follow-up defects (screenshots archived at `/home/shizuku/Project/ohpichamber-omp-artifacts/feedback-2026-11-18/1..6-*.png`):

1. **Row select width, floating option subtext, and untranslated page-placed options (`14-select-width-and-option-subtext.md`).**
   - `SETTINGS_WIDTH_SELECT_CLASS = 'w-full @xl:w-56'` (224 px) stretches short values (`默认`, `500 行`, `Low`, `Default`) into wide empty bars with the chevron pushed far right, clashing with hug-width `ModelSelector` triggers right beside them. `SETTINGS_WIDTH_SELECT_CLASS` returns to hug-with-cap sizing (`'w-fit min-w-[8ch] max-w-[28ch]'`), keeping trailing right-edge alignment via `@xl:justify-end`.
   - `OmpRowControl` passed `controlClassName="flex-col items-end"` and rendered `<p className={cn(SETTINGS_HELPER_CLASS, 'w-full')}>{selected.description}</p>` inside `SettingsFieldRow`'s `flex-1` control column, leaving the helper text floating in the middle of the row. Selected option descriptions move into `SettingsFieldRow`'s built-in `description` prop directly beneath the left label, and the control stays vertically centered.
   - `settings-ui.test.ts` skipped `placement.type === 'page'` settings when checking option localization, leaving Sampling options (`temperature`, `topP`, `topK`, `minP`, `presencePenalty`, `repetitionPenalty`, `textVerbosity`) in raw English. Option labels and descriptions for every `OmpRowControl`-rendered setting (`engine` and `page`) are localized in all 15 locales.
2. **OMP Advanced `config.yml` footer small print (`15-omp-config-footer-cleanup.md`).**
   - The four small-print lines under `仍需在 config.yml 中修改` (three placement-count sentences + raw `state.configPath`) are removed. Only the clean row/header and `打开 config.yml` button remain (`AGENTS.md` requires the action, not the audit counts). Unused `placementCounts` and `configFile.{terminal,elsewhere,egress}` keys are deleted cleanly.
3. **Routing category creation flow (`16-routing-add-category-dialog.md`).**
   - The bottom `新类别 [input] [添加]` row inserted an incomplete category with empty `description` directly into `draft.categories`, immediately triggering both the yellow `invalidDraft` warning banner and the red `descriptionRequired` error before the user could type a description. It is replaced by an outline `+ 添加类别` button opening a creation `Dialog` with Name, Model, Thinking and Description fields; validation runs on submit, and only complete valid categories enter `draft.categories` and save immediately.
4. **Web Search fallback list surface (`17-websearch-fallback-tiles.md`).**
   - `FallbacksSection` rendered naked borderless/backgroundless rows below the `oc-tile` provider cards. `SettingsSortableList` gains optional `listClassName` / `rowClassName` props so `WebSearchPage` renders each fallback inside a cohesive `oc-tile oc-tile-hover rounded-xl` row (`gap-2` stack) with drag handle, `oc-tile-inset` priority badge, provider icon, title, actionable setup pill/link when unconfigured, and trailing remove icon button.
5. **Agents page tool permissions rewrite (`18-agents-tool-permissions-redesign.md`).**
   - `AgentPermissionsEditor.tsx` violated `PATTERNS.md` and `STYLING.md` with boxed group cards, tinted headers, `divide-y` chrome, hardcoded emerald/amber/rose `TierChip` soup, all 7 groups expanded into 30+ multi-line rows, nested `div[role="button"]` `stopPropagation` hacks, redundant `SettingsStackedField` wrapper, and misleading `"Show all"` / `"Hide all"` labels. It is rewritten directly under `SettingsSection` with an accurate 3-way `SettingsChipGroup` (`Default` / `All available` / `None`), a flat default-collapsed `SettingsDisclosure` list with tri-state `accessory` checkboxes and quiet `selected / total` counts, and crisp single-line `SettingsCheckboxRow` items inside expanded groups with descriptions behind `info` (`SettingsInfoHint`).

### Additional W checks (Tasks 14–19)

- **W12 (Selects & option subtext).** Row `<SelectTrigger>`s hug their value (`w-fit min-w-[8ch] max-w-[28ch]`) aligned to the row's trailing edge; `OmpRowControl` renders selected option descriptions under the left field label via `SettingsFieldRow`'s `description` prop; `zh-CN` Sampling and OMP pages show zero raw English option labels or option descriptions; `settings-ui.test.ts` enforces option copy for both `engine` and `page` placements.
- **W13 (OMP `config.yml` row).** On OMP → 高级, `omp.configFile` renders only its title and the working `打开 config.yml` button, with zero count breakdown lines and zero raw file path small print.
- **W14 (Routing category creation).** Clicking `+ 添加类别` opens a complete creation dialog (Name, Model, Thinking, Description) with zero pre-existing error banners; submitting empty Name or Description validates inside the dialog without mutating or saving `routing.json`; submitting valid fields closes the dialog and persists immediately.
- **W15 (Web search fallback tiles).** Each fallback row renders as a rounded `oc-tile` surface with drag handle, priority index, provider icon, name, setup indicator/action when unconfigured, and icon remove button; drag/keyboard reorder persists.
- **W16 (Agents tool permissions).** `AgentPermissionsEditor` uses flat default-collapsed `SettingsDisclosure` groups + `SettingsCheckboxRow` items + semantic tokens only (zero boxed cards, zero `divide-y`, zero Tailwind palette colors), passes `settingsLayoutGuard.test.ts`, and preserves `null` / `[]` / `string[]` `allowedTools` semantics.
- **W17 (Round-2 acceptance & full gate).** On Web at 1600 px and a rebuilt Linux AppImage, an independent reviewer that implemented none of Tasks 14–18 walks W12–W16 side-by-side against `feedback-2026-11-18/1..6-*.png` and records PASS/FAIL; `bun run check`, `type-check`, `lint` (0 warnings), all test suites, `docs:validate` and `workflow validate` exit 0.
