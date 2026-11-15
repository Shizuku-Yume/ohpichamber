# fb15 — OmpSettingsIA (OMP settings information architecture)

Read at repo `1fc6270437`, OMP package **18.18.0** (`packages/agent-service/node_modules/@oh-my-pi/pi-coding-agent`), OMP checkout `/home/shizuku/Project/oh-my-pi` = **18.8.9** (older — all registry facts below come from the **18.18.0 installed tarball**).

## 1. Findings

### 1.1 The page is a 93-row flat wall ordered by OMP's declaration order (high confidence)

- `packages/ui/src/components/sections/openchamber/OmpSettingsPage.tsx:274-300` filters `placement.type === 'engine'` and groups by `setting.group`, creating sections **in first-seen order of `orderedSettings()`** (OMP domain order, then declaration order). `resolveSectionInfo` (`:130-141`) uses the OMP `group` and falls back to the id head for ungrouped rows.
- Result on the real snapshot: **93 rows in 20 sections**, whose on-screen order is *not* the OMP TUI tab order — it interleaves unrelated areas because OMP's domain list is `configModel → modes → session → telemetry → advisor → context → … → tools → lsp → exec → eval → task → …` (`@oh-my-pi/pi-coding-agent/src/config/all-settings.ts:52-90`). First-seen order for engine rows is therefore: **Notifications, Thinking, Agent, Experimental, Rules (TTSR), Editing, Reading, Read Summaries, Output Limits, Execution, Discovery & MCP, Developer, LSP, Bash, Eval & Runtimes, Subagents, Commands & Skills, Extensions**. "Rules (TTSR)" (6 rows of jargon) lands *before* Editing; "Notifications" (a single Ask-timeout row) is **first on the page**.
- Evidence of the mismatch: `ask.timeout` carries `tab: interaction, group: Notifications` (`modes/settings.ts:1430-1448`) but nothing else in that section exists on the page, so it renders as a one-row section titled "Notifications" above "Thinking".
- The page has **no tab strip**. Longest page in Settings by row count by a wide margin (next: Sessions' Defaults page ≈ 60 rows spread over 11 sections, each concept-named).

### 1.2 OMP has no notion of "advanced"; nothing marks complexity (high)

`UiBase` in `packages/agent-service/node_modules/@oh-my-pi/pi-tui/src/overlays/settings-defs.ts:114-127` exposes only `label, description, group, tab, warning, condition, options, secret, ordered, editor`. There is no `advanced` flag, and the TUI's own grouping (`TAB_GROUPS`, same file `:78-96`) is coarse: 10 tabs (`appearance…providers`) with 4-11 groups each. So the GUI cannot inherit an "advanced" classification from OMP; it must own one.

### 1.3 Seven engine rows are not engine rows at all (high confidence)

Verified by consumer search in OMP 18.18.0 — no GUI code path reads them:

| id | Only consumer | Verdict |
|---|---|---|
| `read.renderMarkdown` | sets `details.contentType` (`tools/read-format.ts:728-731`, `tools/read-archive.ts:287`, `tools/read.ts:2453`) which only pi-tui renderers read; zero `contentType` consumers in `packages/ui` | `tui-only` |
| `read.toolResultPreview` | `modes/settings.ts:855`, `modes/controllers/event-controller.ts:651`, `modes/utils/ui-helpers.ts:702,716,836` — all TUI transcript | `tui-only` |
| `mcp.renderMarkdownResults` | `effect(... setMcpRenderMarkdownResults)` = pi-tui renderer switch (`mcp/settings.ts:44`) | `tui-only` |
| `async.printWake` | `modes/print-mode.ts:499` and `main.ts:2052` (`--wait-async`) — the fork never runs print mode | `tui-only` |
| `extensionRenderers.assistantText` | `extensions/runner.ts:1539-1542`, `modes/interactive-mode.ts:524`, `modes/controllers/extension-ui-controller.ts:158-161`; **no fork consumer** of `getAssistantTextRenderers`/`getLinkSchemes` | `tui-only` |
| `dev.autoqa` | posts to `https://qa.omp.sh/v1/grievances` (`tools/settings.ts:1100-1110`, `tools/report-tool-issue.ts:425-426`); consent handler is never registered by the fork (grep: no `setAutoQaConsentHandler` outside OMP) | `boundary` (egress) |
| `spotlight.experiment.enabled` | ships tool output to `https://cloud.stencil.so/v1/spotlight` (`spotlight/types.ts:20`, `spotlight/client.ts:96-119`) with a Stencil credential | `boundary` (egress) |

Note the 2026-11-14 boundary decision lists "dev autoqa push" but only placed `dev.autoqaPush.endpoint` as `boundary`; the **toggle** `dev.autoqa` stayed `engine`, and `spotlight.experiment.enabled` was never classified. The maintainer's own `~/.omp/agent/config.yml` already has `dev: {autoqa: false}` — the GUI currently lets anyone flip a silent egress switch back on with no consent dialog (`report-tool-issue.ts:16-30`: without a registered consent handler consent resolves `false`, so the toggle looks harmless but re-arms recording; `dev.autoqaConsent` stays `unset`).
`tools.xdevNotices` stays `engine`: it emits a notice the fork does render (`projection.ts:508`, `TimelineNoticeCard`), so it is live in the GUI.

### 1.4 One condition is lost, so a row shows when it should not (medium-high)

`providers.autoThinkingMaxEffort` declares `condition: "autoThinkingActive"` (`session/settings.ts:1100`). The fork's `CONDITIONS` map (`packages/agent-service/src/worker/settings-ui.ts:607-613`) only knows `advisorEnabled, composerPredictionsEnabled, usageAwareFallbackEnabled, planModeEnabled, planAutosaveEnabled`, and `presentOmpSetting` (`:624-638`) returns `conditionActive: true` for unknown names. So the "Auto thinking ceiling" row is always visible, even when `defaultThinkingLevel` is `high` (the maintainer's config), where it has no effect. Also missing in the map: `macOS`, `hasImageProtocol`, `nativeRendering`, `vimModeEnabled`, `hindsightActive`, `mnemopiActive`, `autolearnActive`, `perCallModelAllowNotProject`, `contextFilesExtraNotProject` (the memory ones are masked by MemoryPage's own backend switch, so only `autoThinkingActive` is a live defect).

### 1.5 Number controls lose their unit and their option copy is English-only (high)

- `packages/ui/src/components/sections/shared/ompRowHelpers.ts:1-8` `inferUnit` only matches `Percent|Pct|Seconds|Sec|Tokens`. So `mcp.startupTimeoutMs` (default **250**), `mcp.notificationDebounceMs` (500), `bash.direnvLoadTimeoutMs` (30000), `extensionHandlers.toolCallTimeoutMs` (30000) and `images.questionTimeoutMs` render a bare number input with **no unit chip**; `tools.artifactSpillThreshold`/`TailBytes`/`HeadBytes`/`MaxBytes` are in KB/MB but `inferUnit` returns `undefined` — a user typing `50` cannot tell KB from bytes from tokens.
- Number rows that carry `options` render a `Select` whose items print **OMP's raw English label** (`OmpRowControl.tsx:77` `opt.label`): "50 KB", "Default; ~12.5K tokens", "Very aggressive", "Near context limit", "1 minute". No i18n key exists for number options; the test at `settings-ui.test.ts:203-260` only requires `.label`/`.description`, not `.options.<slug>`.
- Enum rows fall back to `choice.label` = the raw enum value (`OmpRowControl.tsx:123-133`). Verified no `.options.*` copy exists for `edit.mode`, `ttsr.judge`, `ttsr.interruptMode`, `snapcompact.systemPrompt`, `tools.xdevDocs`, `python.kernelMode`, `tools.format` (grep `items\.(ttsr\.judge|tools\.format|...)\.options` → 0 hits). So in the zh-CN UI the user sees chips labelled `always`, `prose-only`, `tool-only`, `never`, `apply_patch`, `hashline`, `sloppy`, `catalog`, `per-call`, and **13 dialect names** for `tools.format`. Only `retry.fallbackOn`, `retry.usageReservePolicy`, `retry.fallbackRevertPolicy` have translated options (i18n `:92-107`).

### 1.6 Jargon rows whose OMP description is written for OMP's maintainers (high)

Directly cites internals in the description string shown to the user: `edit.mode` ("Select the edit tool variant (replace, patch, hashline, or apply_patch)"), `lsp.shared` ("per-project daemon broker… released server stays warm"), `bash.allowCompoundCommands` ("Evaluate literal && chains per command; unmatched commands use normal bash approval policy and mode"), `tools.format` ("GLM owned dialect…"), `tools.xdev` ("Mount rarely-used (discoverable) tools under xd:// device URLs… device-only write transport"), `tools.xdevDocs`, `enabledModels`-class rows, `ttsr.judge` ("Ask the judge model role each `question` rule"), `model.loopGuard.toolCallReminder` ("Gemini reasoning stream emits many consecutive planning headers"), `async.printWake` ("In print mode (-p, --mode json)…"), `tools.speculativeExecution.enabled` ("discard-safe first slice: validated local reads"), `spotlight.experiment.enabled` ("Stencil Spotlight"), `extensionHandlers.toolCallTimeoutMs` ("Positive finite active-work timeout for extension tool_call handlers"), `mcp.startupTimeoutMs` ("Wait this many milliseconds for initial MCP tool discovery; 0 waits until connections settle"), `task.maxRecursionDepth` ("How many levels deep subagents can spawn their own subagents" — fine, but `0` also *removes the task tool* via `cfgBuiltinToolGates`, see `tools/settings.ts:1130-1145`), `task.maxConcurrency` default 32, `edit.fuzzyThreshold` "0.95 is default".
The current zh copy is a faithful translation of that jargon (e.g. `settings.omp.items.bash.allowCompoundCommands.description` = "对字面 && 串联中的每条命令分别检查。"), so translating more locales does not fix it — the English source itself needs rewriting.

### 1.7 Loop-guard, extension, and subagent rows sit in unrelated sections (medium-high)

Because grouping is by OMP `group` alone: `model.loopGuard.*` → "Thinking" (fine), but `extensionHandlers.*`/`extensionRenderers.assistantText` → "Extensions" while `tools.xdev*` → "Discovery & MCP" and `mcp.*` also → "Discovery & MCP"; `task.maxConcurrency` → "Subagents", `skills.enableSkillCommands` → "Commands & Skills", `providers.autoThinkingMaxEffort` → "Thinking". Three of these groups (Subagents, Commands & Skills, Thinking) have **1-5 rows on the OMP page while their concept owner page renders the real section** — e.g. `task.*` mostly lives on Agents → Subagents (`AgentsPage.tsx:95-98`), and skills live on Commands. So the OMP page duplicates a concept heading with a fragment of the concept.

### 1.8 Section-labelling and footer defects (medium)

- `SECTION_METADATA['Discovery & MCP']` maps to `settings.omp.section.integrations.title` = **集成** (`omp-settings.i18n.ts:55-58`, zh `:8761`), while an unused, correctly-named pair `settings.omp.section.discovery_mcp.title/.description` exists in all 15 locales (`:158-159`). The MCP/Discovery section therefore shows the wrong title.
- `hiddenCount = totalCount - shownEngineCount` (`OmpSettingsPage.tsx:295`) counts every row the *OMP page* does not draw, including rows drawn on Sessions/Chat/Tools/Memory/Agents and `tui-only`/`boundary` rows. The footer text ("N settings are kept out of this page: terminal presentation, OMP's internal tuning, and values this app already configures on another page", key `settings.omp.advancedDescription`, zh `:8704`) is therefore arithmetically misleading and conflates three different reasons.
- That footer's title key is `settings.omp.advanced` = **其他 OMP 设置** (`:8703`) and it is also the *fallback section title* for any ungrouped row (`OmpSettingsPage.tsx:341`). A new 高级设置 tab must not share this string.
- Settings search only has static entries for 47 OMP anchors (`packages/ui/src/lib/settings/search.ts:43-336`): `modelRoles*`, the Sessions-page rows, `lsp.enabled`, `lsp.formatOnWrite`, `skills.enableSkillCommands`, `mcp.enableProjectConfig`. **None of the other 85 engine rows is searchable** — so today, "Advanced" content is unreachable by search. `scripts/lib/upstream-gaps/audit-settings.mjs:257-330` already computes the exposed set from the placement table; the IA change must extend the search table (or generate it).

### 1.9 Localization reality: the 15-locale policy is already implemented, the decision text is stale (high)

`.workflow/decisions.md:1193-1197` ("Engine rows without a locale override show OMP's own label and description… The 131 engine rows are not mass-translated") is **superseded by the current code**: `packages/agent-service/src/worker/settings-ui.test.ts:203-260` (`every exposed OMP row has a label and description in all fifteen locales`) requires `.label` **and** `.description` for every exposed non-`owned-by` id in `ar, de, en, es, fr, he, ja, ko, nl, pl, pt-BR, tr, uk, zh-CN, zh-TW`, and fails when a non-en description equals the English one. `omp-settings.i18n.ts:1-9` states the same ("A key that appears here appears in all fifteen locales"). The English fallback in `OmpRowControl.tsx:31-36` is unreachable for exposed rows. 15 locales is what `locale-ui-patterns` requires ("Add the same key — fully translated — to every non-English dictionary"). **Only `.options.<slug>` keys are not covered by any test.**

### 1.10 Other pages' complex rows (medium; for the "never render twice" question)

`OMP_SETTING_EXPOSED_IDS` (`settings-ui.ts:574-598`) exposes page rows only for `GUI_WRITTEN_PAGES = {sessions, chat, behavior, agents, tools, memory}` (`:536-543`). So the 60+ `providers:*`, `voice:*`, `web-search:*`, `notifications:*`, `git:*`, `general:*`, `commands:*`, `usage:*` page placements are **omitted from state entirely** — e.g. `stt.enabled`/`stt.submitTrigger` (`voice:stt`), `completion.notify`/`error.notify`/`ask.notify` (`notifications:events`), `tier.*` (`providers:tiers`), `commands.enableClaude*` (`commands:catalog`) are config.yml-only in practice even though the Voice/Notifications/Providers/Commands pages exist. That is consistent with the 2026-11-14 decisions but means "the page that owns the concept" is only true for six pages. Complex rows on the six written pages (candidates for a second wave, **not** for this effort): Sessions → `compaction.*` (20 rows, incl. the `thresholdPercent`/`thresholdTokens` pair where tokens overrides percent), `retry.usageReservePct/usageReservePolicy/fallbackRevertPolicy`, `topK/minP/presencePenalty/repetitionPenalty/textVerbosity`, `isolation/worktree` (5), `title.refreshAfterPrompts`; Agents → 8 `advisor.*`, 5 `prewalk.*`; Memory → 14 `mnemopi.*`, 10 `hindsight.*`; Tools → `github.cache.*`, `ida.*`, `computer.*`. Recommendation in §3.

## 2. Proposed fix

### 2.1 Ownership split

| Concern | Owner | Change |
|---|---|---|
| Which rows exist for the GUI | `packages/agent-service/src/worker/settings-ui.ts` (placement table) | 7 re-placements (§1.3) + add `autoThinkingActive` to `CONDITIONS` |
| Which tab/group/section a row renders in | **new** `packages/ui/src/components/sections/openchamber/ompSettingsLayout.ts` | declarative layout: `tab → group → ordered ids`; the page consumes it instead of OMP's `group` |
| Row rendering | `packages/ui/src/components/sections/shared/OmpRowControl.tsx` + `ompRowHelpers.ts` | unit inference by suffix (incl. `Ms`, `Bytes`, `Lines`, `Columns`), localized option labels, optional `preset` control |
| Copy | `packages/ui/src/lib/i18n/messages/omp-settings.i18n.ts` | new tab/group/option keys + rewritten descriptions, 15 locales |
| Search | `packages/ui/src/lib/settings/search.ts` | one entry per exposed OMP id, derived from the layout table; tab routing like `chatSettingsTabs.ts:75-84` |

Keep the placement contract untouched in shape (`OmpSettingPlacement` in `packages/agent-contract/src/settings.ts:84-93`): engine rows keep `{type:'engine'}`, and the *tab* is a UI concern, not a new placement type. Rationale: the tab is presentational, reversible, and needs no revision-CAS round-trip; a new placement field would force a schema change plus tests in `agent-contract`, `catalog-settings`, and the audit script for no behavioural gain.

### 2.2 Tab set (4 tabs, mirroring Chat's `SortableTabsStrip` idiom, `ChatSettings.tsx:874-893`)

`常用` / `编辑与读取` / `执行与工具` / `高级` — plus, *inside* 高级, a closing section `仍需在 config.yml 修改` holding the current footer content (Open config.yml button + a corrected count that separates *terminal-only*, *already on another page*, *egress-only*) under a **new** key `settings.omp.advanced.configFile` so `settings.omp.group.*` stays free for real group titles.

Layout rules:
1. Row order inside a group is **impact-first**, not declaration order: a boolean that turns a whole capability on/off comes before the knobs that tune it (`bash.enabled` before `bash.allowCompoundCommands`).
2. Rows are addressed by id in the layout table, so OMP adding a row does not silently reorder the page. A test asserts the layout is **total and injective** over `OMP_SETTING_EXPOSED_IDS` engine rows.
3. A row appears **once**: the layout test also asserts an id is absent from every other tab, which is the "never render twice" invariant applied inside the page.

### 2.3 Simplifications (only where faithful and reversible)

1. **Read summaries preset** (`read.summarize.minBodyLines/minCommentLines/unfoldUntil/unfoldLimit`, defaults 4/6/50/100). Map: `关闭`→{enabled:false} · `平衡`→{4,6,50,100} (exactly OMP's defaults) · `激进`→{3,4,30,60} · `自定义` when the stored tuple matches no preset. Reversible because the preset writes all four keys in one `PATCH` (the contract already accepts multiple changes: `OmpSettingsUpdateSettingsRequestSchema...changes: z.array().min(1)`), and `自定义` is what the user sees the moment any key differs. Keep the four knobs visible under 高级 with the preset row in 常用 → 读取. Do **not** hide the knobs: a preset that cannot be inspected is the thing the maintainer dislikes.
2. **`tools.format`** (13 dialect chips) → a single `Select` in 高级 labelled `工具调用方式`, options `自动（推荐）/ 原生 / GLM / Hermes / Kimi / XML / Anthropic / DeepSeek / Harmony / Qwen3 / Gemini / Gemma / MiniMax`, with the per-option explanation kept as the option `description` (already present in the contract via `OmpSettingOption.description`, currently unrendered — render it under the select as helper text).
3. **`edit.mode`** → `Select` with plain names: `hashline（默认）/ replace / patch / apply_patch / sloppy / 关闭编辑工具`. Description must state the coupling: "关闭会移除编辑工具并强制启用 bash".
4. **Number rows that carry OMP `options`** → keep the Select but with localized option labels (`settings.omp.items.<id>.options.<slug>`), falling back to `opt.label`; and render `opt.description` as the helper line ("默认" · "激进" · "接近上下文上限").
5. **No preset for compaction/retry/output-limits.** Their keys are not independent (tokens overrides percent; `tools.artifactHeadBytes` 0 disables head elision) — a preset would silently change two behaviours at once. They stay verbatim knobs with unit chips, in 常用/Sessions (compaction/retry) and 高级 (output limits details).
6. **Units**: extend `inferUnit` → `Ms → 毫秒`, `Bytes → KB` (the four `artifact*Bytes` are KB despite the id), `Lines → 行`, `Columns → 列`, `Percent|Pct → %`, `Seconds|Sec → 秒`, `Tokens → Token`. Add `settings.omp.unit.milliseconds|kilobytes|lines|columns` in all 15 locales.

### 2.4 Edge cases to handle in the implementation

- `lsp.requestTimeout` etc. carry option values as **strings** (`"10"`), while stored values are numbers; the current sentinel logic (`isSentinelOption`, `-1`/`default`) must keep working — a preset/label refactor must not turn `-1` into a literal.
- `task.maxRecursionDepth` accepts `-1` (unlimited) as an *option*, which collides with `isSentinelOption('-1')`. Today `-1` renders as **默认** (wrong: it means unlimited). Fix in the same change: sentinel `default` only, `-1` gets its own `无限` option.
- Conditions: adding `autoThinkingActive` means the row can disappear when the user switches `defaultThinkingLevel` off `auto`; the page must not jump scroll position (rows are keyed by id already).
- A moved row (`dev.autoqa`, `spotlight.*` → `boundary`) is refused on write with 400 by `OMP_SETTING_EXPOSED_IDS`; the 高级 tab must not render a disabled control for it — it is config.yml content, so it appears only in the closing section's prose, not as a row.
- Search entries for engine rows must be generated from the layout table; a hand-kept list will drift exactly as it did here (47 of 132).

### 2.5 Verification (runnable Checks)

1. `bun test packages/agent-service/src/worker/settings-ui.test.ts packages/agent-service/src/worker/catalog-settings.test.ts` — exposure set, owner anchors, all-15-locale copy, condition projection.
2. New `packages/ui/src/components/sections/openchamber/OmpSettingsPage.ia.test.tsx`:
   - every exposed engine id appears exactly once across the four tabs;
   - every tab/group key resolves to a real i18n key in all 15 dictionaries;
   - every number row with `options` has `.options.<slug>` copy;
   - `providers.autoThinkingMaxEffort` is hidden when `defaultThinkingLevel !== 'auto'`;
   - the search table has one entry per exposed id (fails if 85 rows are unsearchable).
3. Real path: `bun run dev` → Settings → OMP → each tab; change `read.summarize` preset to 激进 and confirm four keys land in `~/.omp/agent/config.yml`; confirm `asks.timeout` select writes `ask: {timeout: 60}`; open a new session and confirm the change applies; check zh-CN for zero English chips.
4. `bun run type-check:ui`, `bun run --cwd packages/agent-service type-check`, `bunx oxlint <changed paths>`, `bun run dead-code` (new module + moves).

## 3. Open choices for the maintainer

**C1. Tab count.** (a) 4 tabs as proposed (常用 18 / 编辑与读取 19 / 执行与工具 23 / 高级 26). (b) 3 tabs, folding 编辑与读取 into 常用 (37 rows, one long tab — matches Chat's 3-tab shape but long). (c) 5 tabs, splitting 高级 into `高级` + `实验性`. **Recommend (a)**; (c) only if OMP's experimental rows keep growing.

**C2. Do other pages' complex rows move into 高级?** (a) Not now — the effort stays on the OMP page; Sessions/Agents/Memory keep their clusters, and the only dedupe is merging Sessions' `compaction.thresholdTokens` into the existing "Compact at" select. (b) Move a fixed list of ~20 (sampling exotica, retry reserve, compaction internals, advisor review internals, mnemopi recall internals) to 高级, which makes the OMP page the single advanced surface but fragments five pages and requires 20 `page→engine` re-placements. (c) Move only *egress/internals* (zero user-facing toggles). **Recommend (a)** — the maintainer's complaint is about the OMP page, and moving rows off concept pages is the bigger regression risk (each move also has to delete a search entry and a section row).

**C3. `dev.autoqa` and `spotlight.experiment.enabled`.** (a) Re-place both `boundary` (config.yml only, never rendered/written), per the 2026-11-14 boundary decision — autoqa push already is `boundary`, so this closes an inconsistency. (b) Keep `dev.autoqa` on the page with a warning badge and add a real consent dialog before enabling (new worker→UI consent round-trip). **Recommend (a)**; (b) only if you want the QA loop reachable from the GUI at all.

**C4. Copy policy.** (a) Keep the current all-15-locales requirement and extend it to option labels (adds ~40 keys × 15). (b) Restrict to `en`+`zh-CN`+`zh-TW` for OMP rows and relax the test. **Recommend (a)** — the test already exists and `locale-ui-patterns` forbids English placeholders in other locales; the added work is mechanical, and (b) would visibly regress 12 locales.

**C5. Persistent tab memory.** (a) Remember the last tab per user (zustand store like `chatSettingsTabs.ts`), and let Settings search open the right tab. (b) Always open 常用. **Recommend (a)** for search only, default 常用 — this is what makes 高级 content discoverable at all (§1.8).

## Appendix A — current engine rows on the OMP page (93)

Type/legend: B=boolean, N=number, N*=number with `options` (renders as Select), E=enum (chips), S=string. "OMP tab/group" from 18.18.0 `ui`. zh = current zh-CN label (`omp-settings.i18n.ts`).

| # | id | Type | OMP tab / group | Current en label | Current zh label |
|---|---|---|---|---|---|
|1|`ask.timeout`|N*|interaction / Notifications|Ask Timeout|询问超时|
|2|`features.unexpectedStopDetection`|E|interaction / Agent|Unexpected Stops|从静默停止中恢复|
|3|`snapcompact.systemPrompt`|E|context / Experimental|Snapcompact System Prompt|系统提示转为图片（实验性）|
|4|`snapcompact.toolResults`|B|context / Experimental|Snapcompact Tool Results|大工具结果转为图片（实验性）|
|5|`tools.format`|E(13)|context / Experimental|Tool Calling Mode|工具调用方式|
|6|`ttsr.enabled`|B|context / Rules (TTSR)|TTSR|中断规则（TTSR）|
|7|`ttsr.judge`|E|context / Rules (TTSR)|Judged Rules|判定规则|
|8|`ttsr.contextMode`|E|context / Rules (TTSR)|TTSR Context Mode|中断时保留的输出|
|9|`ttsr.interruptMode`|E|context / Rules (TTSR)|TTSR Interrupt Mode|中断时机|
|10|`ttsr.repeatMode`|E|context / Rules (TTSR)|TTSR Repeat Mode|规则重复|
|11|`ttsr.repeatGap`|N*|context / Rules (TTSR)|TTSR Repeat Gap|重复间隔|
|12|`ttsr.builtinRules`|B|context / Rules (TTSR)|Built-in Rules|内置规则|
|13|`edit.mode`|E|files / Editing|Edit Mode|编辑工具形式|
|14|`edit.fuzzyMatch`|B|files / Editing|Fuzzy Match|模糊匹配|
|15|`edit.fuzzyThreshold`|N*|files / Editing|Fuzzy Match Threshold|匹配严格度|
|16|`edit.streamingAbort`|B|files / Editing|Abort on Failed Preview|预览失败即中止|
|17|`edit.recoverInlineEdits`|B|files / Editing|Recover Inline Edit Payloads|恢复内联编辑|
|18|`edit.blockAutoGenerated`|B|files / Editing|Block Auto-Generated Files|保护生成的文件|
|19|`edit.enforceSeenLines`|B|files / Editing|Enforce Seen-Line Guard|仅限已见行|
|20|`edit.blackbox.enabled`|B|files / Editing|Record Parse Regressions|记录解析回归|
|21|`edit.autoRepair.enabled`|B|files / Editing|Auto-Repair Parse Regressions|自动修复解析错误|
|22|`readLineNumbers`|B|files / Reading|Line Numbers|行号|
|23|`read.defaultLimit`|N*|files / Reading|Default Read Limit|默认读取行数|
|24|`read.renderMarkdown`|B|files / Reading|Markdown Previews|Markdown 预览|
|25|`read.toolResultPreview`|B|files / Reading|Inline Read Previews|内联读取预览|
|26|`read.summarize.enabled`|B|files / Read Summaries|Read Summaries|结构化读取摘要|
|27|`read.summarize.prose`|B|files / Read Summaries|Prose Summaries|摘要文本读取|
|28|`read.summarize.minBodyLines`|N|files / Read Summaries|Read Summary Body Lines|摘要正文阈值|
|29|`read.summarize.minCommentLines`|N|files / Read Summaries|Read Summary Comment Lines|摘要注释阈值|
|30|`read.summarize.minTotalLines`|N|files / Read Summaries|Read Summary Minimum File Length|短文件读全文|
|31|`read.summarize.unfoldUntil`|N|files / Read Summaries|Read Summary Unfold Target|摘要最小行数|
|32|`read.summarize.unfoldLimit`|N|files / Read Summaries|Read Summary Unfold Ceiling|摘要行数上限|
|33|`lsp.enabled`|B|files / LSP|LSP|语言服务器|
|34|`lsp.lazy`|B|files / LSP|Lazy LSP Startup|按需启动语言服务器|
|35|`lsp.shared`|B|files / LSP|Shared Language Servers|共享语言服务器|
|36|`lsp.formatOnWrite`|B|files / LSP|Format on Write|写入时格式化|
|37|`lsp.diagnosticsOnWrite`|B|files / LSP|Diagnostics on Write|写入后诊断|
|38|`lsp.diagnosticsOnEdit`|B|files / LSP|Diagnostics on Edit|编辑后诊断|
|39|`lsp.diagnosticsDeduplicate`|B|files / LSP|Deduplicate Diagnostics|隐藏重复诊断|
|40|`lsp.requestTimeout`|N*|files / LSP|Request Timeout|语言服务器超时|
|41|`bash.enabled`|B|shell / Bash|Bash|Bash 工具|
|42|`bash.allowCompoundCommands`|B|shell / Bash|Allow Compound Commands|允许命令串联|
|43|`bash.autoBackground.enabled`|B|shell / Bash|Bash Auto-Background|长命令转后台|
|44|`bash.gitGuard`|B|shell / Bash|Git Guard|保护共享 git 工作|
|45|`bashInterceptor.enabled`|B|shell / Bash|Bash Interceptor|优先用专用工具|
|46|`bash.direnv`|E(auto/off)|shell / Bash|direnv Auto-Load|加载 direnv|
|47|`bash.direnvLoadTimeoutMs`|N|shell / Bash|direnv Load Timeout (ms)|direnv 加载超时|
|48|`shellMinimizer.enabled`|B|shell / Bash|Shell Minimizer|压缩 shell 输出|
|49|`shellMinimizer.sourceOutlineLevel`|E|shell / Bash|Shell Minimizer Source Outline|源码骨架强度|
|50|`eval.py`|B|shell / Eval & Runtimes|Python Eval Backend|Python 执行|
|51|`eval.js`|B|shell / Eval & Runtimes|JavaScript Eval Backend|JavaScript 执行|
|52|`eval.autoProvision`|B|shell / Eval & Runtimes|Eval Environment Provisioning|自动准备执行环境|
|53|`eval.tools.enabled`|B|shell / Eval & Runtimes|Eval-Defined Tools|eval 单元定义工具|
|54|`eval.workpool.freshAgents`|B|shell / Eval & Runtimes|Fresh Workpool Agents|每个工作项新开智能体|
|55|`eval.autoBackground.enabled`|B|shell / Eval & Runtimes|Eval Auto-Background|长 eval 单元转后台|
|56|`python.kernelMode`|E|shell / Eval & Runtimes|Python Kernel Mode|Python 内核复用|
|57|`model.loopGuard.enabled`|B|model / Thinking|Loop Guard|循环防护|
|58|`model.loopGuard.checkAssistantContent`|B|model / Thinking|Loop Guard Scan Prose|也检查正文|
|59|`model.loopGuard.toolCallReminder`|B|model / Thinking|Loop Guard Tool-Call Reminder|规划循环提醒|
|60|`model.toolCallLoopGuard.enabled`|B|model / Thinking|Tool-Call Loop Guard|工具调用循环防护|
|61|`model.toolCallLoopGuard.threshold`|N|model / Thinking|Tool-Call Loop Threshold|重复阈值|
|62|`providers.autoThinkingMaxEffort`|E(xhigh/max)|model / Thinking|Auto Thinking Ceiling|自动思考上限|
|63|`task.maxConcurrency`|N*|tasks / Subagents|Max Concurrent Tasks|子智能体并发|
|64|`task.maxRecursionDepth`|N*|tasks / Subagents|Max Task Recursion|子智能体深度|
|65|`skills.enableSkillCommands`|B|tasks / Commands & Skills|Skill Commands|技能命令|
|66|`tools.artifactSpillThreshold`|N*(KB)|tools / Output Limits|Artifact Spill Threshold (KB)|大输出存成文件|
|67|`tools.artifactTailBytes`|N*(KB)|tools / Output Limits|Artifact Tail Size (KB)|保留的尾部大小|
|68|`tools.artifactHeadBytes`|N*(KB)|tools / Output Limits|Artifact Head Size (KB)|保留的头部大小|
|69|`tools.outputMaxColumns`|N*(cols)|tools / Output Limits|Output Column Cap|输出行宽上限|
|70|`tools.artifactTailLines`|N*(lines)|tools / Output Limits|Artifact Tail Lines|保留尾部行数|
|71|`tools.artifactMaxBytes`|N*(MB)|tools / Output Limits|Artifact File Cap (MB)|附件文件上限|
|72|`images.questionTimeoutMs`|N*(ms)|tools / Execution|Image Question Timeout|图片问答超时|
|73|`tools.intentTracing`|B|tools / Execution|Intent Tracing|说明工具意图|
|74|`tools.abortOnFabricatedResult`|B|tools / Execution|Abort On Fabricated Tool Result|拦截编造结果|
|75|`tools.speculativeExecution.enabled`|B|tools / Execution|Experimental Speculative Execution|预读本地文件|
|76|`tools.speculativeExecution.maxInFlight`|N*|tools / Execution|Speculative Execution Concurrency|并发预读数|
|77|`tools.maxTimeout`|N*(s)|tools / Execution|Max Tool Timeout|工具最长超时|
|78|`async.enabled`|B|tools / Execution|Async Execution|后台作业|
|79|`async.printWake`|B|tools / Execution|Wake Print Mode on Job Results|为后台作业保持运行|
|80|`async.widgets`|B|tools / Execution|Live Job Widgets|作业实时视图|
|81|`tools.xdev`|B|tools / Discovery & MCP|xd:// Tools|xd:// 工具|
|82|`tools.xdevDocs`|E|tools / Discovery & MCP|xd:// Prompt Docs|xd:// 提示文档|
|83|`tools.xdevNotices`|B|tools / Discovery & MCP|xd:// Mount Notices|xd:// 挂载提示|
|84|`dev.autoqa`|B|tools / Developer|Auto QA|自动质量报告|
|85|`spotlight.experiment.enabled`|B|tools / Developer|Spotlight Experiment|Spotlight 实验|
|86|`extensionHandlers.toolCallTimeoutMs`|N|tools / Extensions|Tool Call Handler Timeout (ms)|扩展处理超时|
|87|`extensionHandlers.modeControl`|B|tools / Extensions|Extension Mode Control|扩展可切换模式|
|88|`extensionRenderers.assistantText`|B|tools / Extensions|Extension Reply Renderers|扩展自定义回复样式|
|89|`mcp.enableProjectConfig`|B|tools / Discovery & MCP|MCP Project Config|项目 MCP 配置|
|90|`mcp.startupTimeoutMs`|N|tools / Discovery & MCP|MCP Startup Window|MCP 启动等待|
|91|`mcp.renderMarkdownResults`|B|tools / Discovery & MCP|MCP Markdown Results|MCP 文本按 Markdown 显示|
|92|`mcp.notifications`|B|tools / Discovery & MCP|MCP Update Injection|MCP 资源更新|
|93|`mcp.notificationDebounceMs`|N|tools / Discovery & MCP|MCP Notification Debounce|MCP 更新合并|

Defaults worth knowing while arranging (18.18.0): `ask.timeout` 0 (disabled) · `features.unexpectedStopDetection` mechanical · `tools.format` auto · `edit.mode` **hashline** · `edit.fuzzyThreshold` 0.95 · `lsp.requestTimeout` 10 s · `bash.allowCompoundCommands` false · `bash.gitGuard` false · `bashInterceptor.enabled` false · `shellMinimizer.sourceOutlineLevel` default · `eval.autoBackground.enabled` false · `python.kernelMode` session · `task.maxConcurrency` 32 · `task.maxRecursionDepth` 2 · `tools.artifactSpillThreshold` 50 KB · `tools.outputMaxColumns` 768 · `tools.artifactMaxBytes` 16 MB · `images.questionTimeoutMs` 300000 · `tools.maxTimeout` 0 · `async.widgets` true · `mcp.startupTimeoutMs` 250 · `mcp.notificationDebounceMs` 500 · `extensionHandlers.toolCallTimeoutMs` 30000 · `dev.autoqa` true · `spotlight.experiment.enabled` false.

## Appendix B — proposed IA (4 tabs, 86 rows after 7 re-placements)

Legend: `B` checkbox · `E` chip group · `E→Select` proposed conversion · `N*` select of numbers · `N` number + unit chip · `Preset` new composite control.

### Tab `常用` (18)

| # | Group | id | Proposed zh label | Proposed zh one-line description | Control |
|---|---|---|---|---|---|
|1|会话行为|`features.unexpectedStopDetection`|静默停止恢复|助手没输出任何内容就停下时自动继续；「智能」还会让小模型判断纯文本停止。|E→Select（关闭/机械恢复/智能判断）|
|2|会话行为|`ask.timeout`|询问超时|多少秒后自动选中推荐答案；0 表示一直等你回答。|N*（关闭/15 秒/30 秒/60 秒/120 秒）|
|3|会话行为|`model.loopGuard.enabled`|重复输出防护|模型开始反复输出同样内容时，中断这一轮。|B|
|4|会话行为|`model.toolCallLoopGuard.enabled`|重复调用防护|反复发起完全相同的工具调用时，提醒模型换个做法。|B|
|5|会话行为|`ttsr.enabled`|规则中断|输出命中预设规则时立即中断并给出提示；细则在「高级」。|B|
|6|会话行为|`skills.enableSkillCommands`|技能命令|把每个技能注册为 `/skill:名称` 命令。|B|
|7|Shell 与工具|`bash.enabled`|Bash 工具|允许智能体执行 shell 命令。|B|
|8|Shell 与工具|`bash.gitGuard`|保护共享 git 工作|拒绝在主工作副本里丢弃或移动工作的 git 命令（stash、reset --hard 等）。|B|
|9|Shell 与工具|`bashInterceptor.enabled`|优先用专用工具|拦截已有专用工具可以完成的 shell 命令（cat、grep、sed -i…）。|B|
|10|Shell 与工具|`shellMinimizer.enabled`|压缩 shell 输出|在智能体读取前精简 git、npm、cargo 的冗长输出。|B|
|11|Shell 与工具|`tools.intentTracing`|说明工具意图|每次调用工具前先说明为什么这么做。|B|
|12|Shell 与工具|`tools.abortOnFabricatedResult`|拦截编造的工具结果|模型凭空写出「工具返回」时立即停止。|B|
|13|Shell 与工具|`async.enabled`|后台作业|允许启动在回合结束后仍继续运行的作业。|B|
|14|工具与模型|`tools.xdev`|按需加载不常用工具|不常用工具改为按需读取，缩短每次请求的提示长度。|B|
|15|工具与模型|`mcp.enableProjectConfig`|读取项目 MCP 配置|从项目根目录的 `.mcp.json` / `mcp.json` 加载 MCP 服务器。|B|
|16|工具与模型|`providers.autoThinkingMaxEffort`|自动思考上限|「自动」档最高能到哪级；选「更高」才会用到顶级档位（更贵）。|Select（xhigh / 更高）|
|17|工具与模型|`task.maxConcurrency`|子智能体并发数|同时运行的子智能体数量。|N*（不限制/1/2/4/8/16/32/64）|
|18|工具与模型|`extensionHandlers.modeControl`|允许扩展切换模式|允许扩展进入和退出计划、目标、循环模式。|B|

### Tab `编辑与读取` (19)

| # | Group | id | Proposed zh label | Proposed zh one-line description | Control |
|---|---|---|---|---|---|
|1|编辑|`edit.mode`|编辑工具形式|选择编辑的实现方式；默认 hashline，选「关闭」会移除编辑工具并强制启用 bash。|E→Select|
|2|编辑|`edit.fuzzyMatch`|容忍空白差异|仅空白不同时仍视为匹配。|B|
|3|编辑|`edit.enforceSeenLines`|只改已看到的行|拒绝修改从未完整显示过的行。|B|
|4|编辑|`edit.blockAutoGenerated`|保护自动生成文件|拒绝修改 protoc、swagger 等自动生成的文件。|B|
|5|编辑|`edit.recoverInlineEdits`|救回纯文本编辑|模型把编辑内容当普通文本输出时，转成真正的编辑操作。|B|
|6|编辑|`edit.autoRepair.enabled`|自动修复语法破坏|编辑导致文件解析失败时，请小模型修补坏掉的片段。|B|
|7|读取|`readLineNumbers`|读取结果带行号|读取结果每行前加行号。|B|
|8|读取|`read.defaultLimit`|默认读取行数|调用 read 未指定行数时读取多少行。|N*（200/300/500/1000/5000 行）|
|9|读取|`read.summarize.enabled`|读取摘要|读取大文件时返回代码骨架，而不是整份文件。|B|
|10|读取|`read.summarize.prose`|文本文件也摘要|Markdown 与纯文本同样折叠成摘要。|B|
|11|读取|`read.summarize.minTotalLines`|短文件读全文|少于该行数的文件不做摘要。|N|
|12|读取|*(`minBodyLines`,`minCommentLines`,`unfoldUntil`,`unfoldLimit`)*|摘要强度|一次决定四个折叠阈值；细则可在「高级」逐项调整。|**Preset**（关闭/平衡/激进/自定义）|
|13|语言服务器|`lsp.enabled`|语言服务器|启用 lsp 工具：定义跳转、引用、诊断、重命名。|B|
|14|语言服务器|`lsp.lazy`|按需启动|第一次用到时才启动，而不是会话开始就启动。|B|
|15|语言服务器|`lsp.shared`|跨实例复用服务器|同一项目的多个实例共用一个中转进程，减少冷启动。|B|
|16|语言服务器|`lsp.formatOnWrite`|写入后格式化|写入文件后自动格式化。|B|
|17|语言服务器|`lsp.diagnosticsOnWrite`|写入后返回诊断|写完代码后把语言诊断交给智能体。|B|
|18|语言服务器|`lsp.diagnosticsOnEdit`|编辑后返回诊断|改完代码后把语言诊断交给智能体。|B|
|19|语言服务器|`lsp.diagnosticsDeduplicate`|只报新问题|编辑后只返回新增或变化的诊断。|B|

(Group 语言服务器 also holds `lsp.requestTimeout` as row 20 if the 4-tab budget allows; otherwise it goes to 高级 with the other timeouts. Recommendation: keep it here — N* seconds.)

### Tab `执行与工具` (23)

| # | Group | id | Proposed zh label | Proposed zh one-line description | Control |
|---|---|---|---|---|---|
|1|Bash 细节|`bash.allowCompoundCommands`|逐条检查 && 命令|把 `a && b` 拆成两条分别审批，而不是整串一起。|B|
|2|Bash 细节|`bash.autoBackground.enabled`|长命令自动转后台|耗时命令自动转为后台作业，稍后取回结果。|B|
|3|Bash 细节|`bash.direnv`|自动加载 direnv|读取仓库的 `.envrc`，让 devenv 工具与变量就绪（仍遵守 `direnv allow`）。|E（自动/关闭）|
|4|Bash 细节|`bash.direnvLoadTimeoutMs`|direnv 载入超时|等待首次 `direnv export` 的毫秒数，超时就不带 direnv 运行。|N（毫秒）|
|5|Bash 细节|`shellMinimizer.sourceOutlineLevel`|源码精简强度|把源码压成骨架的力度：默认或激进。|E（默认/激进）|
|6|Eval 与运行时|`eval.py`|Python 执行|允许 eval 在 IPython 内核中执行 Python 代码。|B|
|7|Eval 与运行时|`eval.js`|JavaScript 执行|允许 eval 在进程内运行时中执行 JavaScript 代码。|B|
|8|Eval 与运行时|`eval.autoProvision`|自动准备执行环境|首次使用时自动创建受管的 JavaScript 包环境。|B|
|9|Eval 与运行时|`eval.tools.enabled`|eval 里定义工具|允许 eval 代码注册子智能体可调用的工具。|B|
|10|Eval 与运行时|`eval.workpool.freshAgents`|每个工作项新开智能体|workpool 的每一项都新开子智能体，而不是复用。|B|
|11|Eval 与运行时|`eval.autoBackground.enabled`|长 eval 转后台|耗时 eval 代码转为后台作业，稍后取回结果。|B|
|12|Eval 与运行时|`python.kernelMode`|Python 内核复用|多次 eval 共用一个内核，还是每次重启。|E（会话内复用/每次新建）|
|13|后台与工具执行|`async.widgets`|作业实时视图|为每个运行中的作业绘制实时图表，并给长命令加一行说明。|B|
|14|后台与工具执行|`tools.speculativeExecution.enabled`|提前预读本地文件|在回合真正请求前先做安全的本地读取（实验性）。|B|
|15|后台与工具执行|`tools.speculativeExecution.maxInFlight`|并发预读数|正常调度前允许同时进行的预读数量。|N*（1–4）|
|16|后台与工具执行|`tools.maxTimeout`|工具等待上限|智能体可以给单个工具设置的最长超时；0 表示不限。|N*（不限/30 秒/…/10 分钟）|
|17|后台与工具执行|`images.questionTimeoutMs`|图片问答超时|询问视觉模型关于图片的问题时最多等多久。|N*（关闭/1/2/3/5 分钟）|
|18|工具发现|`tools.xdevDocs`|按需工具的提示量|有多少按需工具的说明会写进系统提示：全部/仅内置/仅目录。|E→Select|
|19|工具发现|`tools.xdevNotices`|按需工具加载提示|工具挂载或卸载时在会话里提示一条。|B|
|20|MCP|`mcp.startupTimeoutMs`|MCP 工具启动等待|等待 MCP 工具出现的最长毫秒数；0 表示等到连接结束。|N（毫秒）|
|21|MCP|`mcp.notifications`|MCP 资源更新|把 MCP 资源变化传入对话。|B|
|22|MCP|`mcp.notificationDebounceMs`|MCP 更新合并窗口|把短时间内的多次资源更新合并后再传入对话的毫秒数。|N（毫秒）|
|23|输出|`tools.artifactSpillThreshold`|大输出转存为文件|超过此大小的工具输出存成附件文件，正文只保留尾部。|N*（1 KB…1 MB）|

### Tab `高级` (26)

| # | Group | id | Proposed zh label | Proposed zh one-line description | Control |
|---|---|---|---|---|---|
|1|上下文与实验|`tools.format`|工具调用方式|工具如何提供给模型；一般保持「自动」，跟随模型选择内置方式。|Select（自动/原生/GLM/Hermes/Kimi/XML/Anthropic/DeepSeek/Harmony/Qwen3/Gemini/Gemma/MiniMax，选中项下方显示该方式说明）|
|2|上下文与实验|`snapcompact.systemPrompt`|系统提示转图片（实验性）|把部分系统提示渲染成图片以省 Token；仅视觉模型，且会失去这段提示的缓存。|E（不转/仅 AGENTS.md/全部）|
|3|上下文与实验|`snapcompact.toolResults`|大工具结果转图片（实验性）|把大工具结果渲染成图片以省 Token；仅视觉模型。|B|
|4|规则（TTSR）|`ttsr.judge`|规则判定|对「提问式」规则，先问判定模型再决定是否提示。|E→Select（自动/总是/关闭）|
|5|规则（TTSR）|`ttsr.contextMode`|中断后保留输出|规则触发时，已经生成的内容保留还是丢弃。|E（丢弃/保留）|
|6|规则（TTSR）|`ttsr.interruptMode`|中断时机|在正文、思考或工具参数命中时中断，或等回答结束再提示。|E→Select（总是/仅正文/仅工具/从不）|
|7|规则（TTSR）|`ttsr.repeatMode`|规则能否重复触发|同一会话只触发一次，还是隔一段消息后可再触发。|E（一次/间隔后）|
|8|规则（TTSR）|`ttsr.repeatGap`|重复间隔消息数|规则再次触发前需要经过多少条消息。|N*（5/10/15/20/30 条）|
|9|规则（TTSR）|`ttsr.builtinRules`|内置规则|加载随智能体提供的默认规则。|B|
|10|编辑与读取阈值|`edit.fuzzyThreshold`|模糊匹配严格度|相似度门槛（0–1），越高越严格；默认 0.95。|N*（0.85 宽松/0.90/0.95 默认/0.98 严格）|
|11|编辑与读取阈值|`edit.streamingAbort`|预览失败即中止|流式编辑的补丁预览失败时，中止这次编辑。|B|
|12|编辑与读取阈值|`edit.blackbox.enabled`|记录解析回归现场|编辑把文件解析弄坏时，保留修改前后的完整源码。|B|
|13|编辑与读取阈值|`read.summarize.minBodyLines`|摘要：正文折叠阈值|多行代码块达到多少行才折叠成摘要。|N|
|14|编辑与读取阈值|`read.summarize.minCommentLines`|摘要：注释折叠阈值|多行块注释达到多少行才折叠成摘要。|N|
|15|编辑与读取阈值|`read.summarize.unfoldUntil`|摘要：最小可见行数|持续展开，直到摘要至少这么多行。|N|
|16|编辑与读取阈值|`read.summarize.unfoldLimit`|摘要：展开上限|摘要展开绝不超过这么多行。|N|
|17|模型防护与子智能体|`model.loopGuard.checkAssistantContent`|也检查正文|除了思考，对回复正文同样做重复检测。|B|
|18|模型防护与子智能体|`model.loopGuard.toolCallReminder`|规划循环提醒|连续输出规划标题却一直不调用工具时，中断并提醒。|B|
|19|模型防护与子智能体|`model.toolCallLoopGuard.threshold`|重复调用阈值|连续多少次相同调用后才提醒模型。|N|
|20|模型防护与子智能体|`task.maxRecursionDepth`|子智能体嵌套深度|子智能体还能再派多少层；设为 0 会移除任务工具。|N*（不限制/0 无/1/2/3）|
|21|输出限制细节|`tools.artifactTailBytes`|转存时保留的尾部大小|输出转存为文件时，正文里保留多少尾部内容。|N*（1 KB…200 KB）|
|22|输出限制细节|`tools.artifactHeadBytes`|转存时保留的头部大小|与尾部一起保留的开头内容；0 表示只留尾部。|N*（0/1 KB…200 KB）|
|23|输出限制细节|`tools.artifactTailLines`|转存时保留的尾部行数|正文最多保留多少行尾部内容。|N*（50…5000 行）|
|24|输出限制细节|`tools.artifactMaxBytes`|附件文件大小上限|转存文件的最大体积；0 表示不限制。|N*（不限/4/16/64/256 MB/1 GB）|
|25|输出限制细节|`tools.outputMaxColumns`|单行宽度上限|bash、eval、read 单行超过多少字符就截断；0 表示不截断。|N*（关闭/256/512/768/1024/2048/4096）|
|26|扩展|`extensionHandlers.toolCallTimeoutMs`|扩展调用处理超时|扩展处理一次工具调用最多运行多久（毫秒）。|N（毫秒）|

Closing section of `高级` — **仍需在 config.yml 修改** (`settings.omp.advanced.configFile`, new key): the `打开 config.yml` button (`state.configPath`), plus three corrected sentences instead of one count: `{terminal} 项只影响 OMP 终端界面`; `{elsewhere} 项已在本应用的其他设置页面`; `{egress} 项涉及对外发送，只能在 config.yml 中修改`. Feeds from a new `OmpSettingsState.placementCounts`? No contract change needed — compute client-side from `state.settings` (each row already carries `placement`) plus `totalCount`.

### Moved off the page (7)

| id | From | To | Reason |
|---|---|---|---|
|`read.renderMarkdown`|engine|`tui-only`|sets `details.contentType`; no GUI consumer (§1.3)|
|`read.toolResultPreview`|engine|`tui-only`|TUI transcript only|
|`mcp.renderMarkdownResults`|engine|`tui-only`|pi-tui renderer switch|
|`async.printWake`|engine|`tui-only`|print-mode CLI only|
|`extensionRenderers.assistantText`|engine|`tui-only`|no fork consumer of extension renderers|
|`dev.autoqa`|engine|`boundary`|egress to qa.omp.sh, no consent surface in GUI|
|`spotlight.experiment.enabled`|engine|`boundary`|egress of tool output to cloud.stencil.so|

Each move must also delete its `settings.omp.items.<id>.*` copy? No — keep the copy (15 locales) so search/config.yml prose can still describe them, but drop the row from the layout; the layout test warns on orphan copy instead of failing (otherwise 7×15 keys of churn).

---

**5-line summary**
1. The OMP page renders all **93** `engine` rows in 20 sections, ordered by OMP's declaration order rather than by user intent — "Notifications" (one Ask-timeout row) comes first and "Rules (TTSR)" (6 jargon rows) comes before Editing.
2. OMP exposes no "advanced" concept (`settings-defs.ts:114-127`), so the GUI must own the classification; I propose a 4-tab layout (`常用` 18 / `编辑与读取` 19 / `执行与工具` 23 / `高级` 26) owned by a new `ompSettingsLayout.ts` in `packages/ui`, leaving the placement contract unchanged.
3. Seven rows should not be on the page at all: five are terminal-only (`read.renderMarkdown`, `read.toolResultPreview`, `mcp.renderMarkdownResults`, `async.printWake`, `extensionRenderers.assistantText`) and two are egress (`dev.autoqa` → qa.omp.sh, `spotlight.experiment.enabled` → cloud.stencil.so) and belong `boundary`.
4. Concrete defects to fix alongside: `autoThinkingActive` missing from the fork's `CONDITIONS` (row always visible), no unit for `…Ms`/KB rows (`inferUnit`), English-only option labels for 7 enums and all number select options, `-1` meaning "unlimited" rendered as "默认", wrong section title for Discovery & MCP, and a misleading `hiddenCount` footer.
5. Localization: the 15-locale requirement is **already** met and test-enforced for labels/descriptions (decision 2026-11-14 is stale) — extend the same rule to option labels and rewrite the jargon English source, because the current zh copy faithfully translates that jargon.
