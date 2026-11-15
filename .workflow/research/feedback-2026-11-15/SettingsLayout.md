# fb15 — SettingsLayout

## 1. Findings

### F1. The width chain: the page cap is upstream-identical, the emptiness is per-row
Measured from code (no rendering available):

| Level | Rule | Width at a 1600px viewport |
|---|---|---|
| Settings window | `SettingsWindow.tsx:77` `w-[90vw] max-w-[1200px]` | 1200 |
| Nav rail | `SettingsView.tsx:1162` `sm:w-64` | −256 |
| Content pane | `SettingsView.tsx:1172` `flex-1` | **≤ 944** |
| Page container | `SettingsPageLayout.tsx:78` `mx-auto max-w-[840px] px-6 @3xl:px-12` | 840 outer / **744 usable** |
| Field row label col | `SettingsSection.tsx:338` `@xl:w-56` + `gap-8` | 224 + 32 |
| Field row control | `SettingsSection.tsx:23` `w-fit max-w-[28ch]` (~196px) | ends at ~452 of 744 |
| Stacked field control | `SettingsSection.tsx:298` `max-w-[24rem]` | 384 of 744 |

`max-w-[840px]` is **identical in upstream** (`/home/shizuku/Project/openchamber/.../SettingsPageLayout.tsx:59`), so the fork did not narrow the page. The maintainer's "~400px controls in a ~1100px area" maps onto the *stacked* row: a 384px control in a 744px column leaves **360px dead on every row** [high confidence].

### F2. Root cause of the screenshots: `OmpRowControl` stacks everything except booleans
`OmpRowControl.tsx:48-140` renders `SettingsStackedField` (label above, control below, capped at 24rem) for `number`, `string`, and enum; only `boolean` uses `SettingsCheckboxRow`. Consumers (9 pages): `OmpSettingsPage.tsx:348`, `MemoryPage.tsx:111,136,157,181,206`, `ToolsPage.tsx:258,267,282,320,329,342,370,379,392,405`, `BehaviorPage.tsx:425`, `ChatSettings.tsx:373,392,411,558`, `DefaultsSettings.tsx:511,577,596,615,634,653,672,691,710`, `AgentsPage.tsx:351,370,400`.

So the 编辑/读取/读取摘要 page is 100% stacked rows — no label-left/control-right row anywhere — which is exactly the "narrow left column, empty right side" the maintainer sees. `PATTERNS.md` Quick Primitive Selection reserves `SettingsStackedField` for "two-column cells, wide controls"; the OMP rows are neither.

Ad-hoc widths in the same renderer break alignment further:
- `OmpRowControl.tsx:72` `<SelectTrigger className="w-48">` — bypasses `SETTINGS_SELECT_ROW_TRIGGER_CLASS`.
- `OmpRowControl.tsx:116` `className="max-w-md"` on a plain `Input` — a third width vocabulary.
- `ToolsPage.tsx:185` `<SelectTrigger className="w-64">` — a fourth.

### F3. `SettingsFieldRow`'s trailing alignment is inert, and it collapses `w-full` children
`SettingsSection.tsx:358-359`:
```
'flex min-w-0 flex-1 items-center gap-2 @xl:w-fit @xl:flex-none',
alignEnd && '@xl:justify-end',
```
At `@xl` the control column is `w-fit` + `flex-none`, i.e. content-sized: `justify-end` has no free space to distribute, so `alignEnd` (documented "Align control to the trailing edge on desktop. @default true") does nothing. (`flex-1` and `flex-none` are both emitted; which wins depends on Tailwind's utility order, not class order — so the row is either **left-packed with dead space** or **wide with a canyon in the middle**. Both look wrong; only a measurement settles which.) Upstream has the same two lines (`openchamber/.../SettingsSection.tsx:349-350`), so this is inherited, not a fork regression [high confidence on inertness, medium on which variant the maintainer sees].

Concrete symptom: `RoutingPage.tsx:432-446` puts `<div className="flex w-full min-w-0 items-center gap-2">` with a `flex-1` Input inside that `w-fit` column → the input collapses to its intrinsic ~20ch default, so the "add category" field is a short stub pinned to the right half of the row, not a row-filling field. Elsewhere the codebase already knows the fix: `ExtensionsPage.tsx:474` passes `controlClassName="min-w-0 @xl:flex-1"`, `McpPage.tsx:915` passes `controlClassName="flex-wrap @xl:w-auto @xl:flex-1"`.

### F4. Every select has a different width, so nothing lines up
`SettingsSection.tsx:23` `const SETTINGS_TRIGGER_WIDTH_CLASS = 'w-fit max-w-[28ch]'` — the fork changed upstream's `'w-full min-w-[16ch] max-w-[28ch]'` (`openchamber:24`) so triggers hug their value (comment at `SettingsSection.tsx:15-22`). Consequence: in a vertical stack of rows, each select's right edge lands wherever its current value ends → a ragged right column. Combined with F2/F3, the page reads "unfinished" rather than "roomy".

### F5. Section rhythm is doubled, and one stack spacing serves two shapes
Pages that wrap sections in `<div className="space-y-6">` (`OmpSettingsPage.tsx:337`, `ToolsPage.tsx:153`, `MemoryPage.tsx:103`, `BehaviorPage.tsx:421`, `ChatSettings.tsx:366`) add 24px *on top of* `SettingsSection`'s own `py-8` (32px) → 56px gaps, and they break `SettingsPageLayout.tsx:82`'s `[&>section:first-of-type]` rule. `layout.md` says "Sections own vertical rhythm". Also `SETTINGS_OPTION_STACK_CLASS` (`space-y-1.5`, 6px) is used for containers that mix `SettingsCheckboxRow` (6px is right) with `SettingsStackedField` (needs ~16-24px) → stacked label+control rows read cramped [high confidence].

### F6. Routing: adding a category fails the save (hard bug)
- `RoutingPage.tsx:305` creates `{ …, name, description: '', … }`.
- Server rejects empty description: `packages/web/server/lib/routing/store.js:59` `description: z.string().trim().min(1).max(2000)`; enforced on every PUT at `runtime.js:443-446` (`parseEffectiveConfig` → `status: 400`).
- Client throws (`routingApi.ts:132-137` → `readState` `throw`), `RoutingPage.tsx:249` reports `'error'` → the shared "Save failed" indicator.
- The draft keeps the invalid row, and every later edit re-sends the whole config, so **the page stays unsaveable** until a description is typed. Same for clearing `name` (`RoutingPage.tsx:146`, `maxLength` only) and clearing `description` (`:181`).
- Inherited: upstream has the identical `description: ''` (`openchamber/RoutingPage.tsx:320`) and the same server rule. The maintainer's data confirms nothing was ever saved: `/home/shizuku/.local/share/ohpichamber-iso/data/routing.json` has no `categories` key at all.
- Tests mock the store (`RoutingPage.test.tsx:135` `saveConfig: async () => {}`), so nothing catches it.

### F7. Routing: bespoke accordion, not the shared primitives
`RoutingPage.tsx:106-195` `CategoryRow` is a hand-rolled disclosure: ghost `Button` with a chevron (`:126`), name + model summary in the same button, `Switch` (`:135`) as the enable control, `divide-y divide-border/40 border-y border-border/40` list chrome (`:410`), and inline editor with `SettingsTwoColumn` (`:142`) + `SettingsFieldRow` (`:163`) + `Textarea rows={5}` (`:181`). Against `PATTERNS.md`: "Flat hierarchy… no cards, boxed backgrounds, or row chrome"; "Never hand-roll page chrome, section headers, field rows, checkbox rows"; boolean → `SettingsCheckboxRow`. Only one row can be expanded (`expandedId`, `:416`). Three separate removal/restore affordances: `Remove` inside the panel (`:190`), `Restore {name}` outline buttons below the list (`:426`), and `Reset to default` (`:188`). Enabled count (Auto needs ≥2) appears only inside a readiness sentence at `:377`.

### F8. Web search — fallback providers
`WebSearchPage.tsx:190-258`:
- Wrapped in `SETTINGS_CONTROL_CLUSTER_CLASS` → **`max-w-[24rem]`**: the whole drag list, pills, remove buttons and the add control are compressed into 384px (`:212`).
- `FallbackStatus` (`:175-184`) renders a **success** pill "已配置" on every row — but a fallback can only be in the list if it is selectable, and `addable` already filters on `provider.configured` (`:203-207`); so the success pill carries no information. Only the warning branches (needsKey / needsSetup) are meaningful.
- Removal is `<Button variant="outline" size="xs">` with visible text 移除 (`:223-226`) — a bordered secondary button per row, plus a separate `aria-label` sentence. Row chrome the patterns don't ask for.
- Add is a `Select` whose trigger permanently displays the label "添加备用提供商" and never a value (`:236-255`) — a value picker used as an action, at a different width from everything else.
- No empty state: zero fallbacks renders nothing plus the add control.

Precedent to copy: `SettingsSortableList.tsx:19-55` (ghost icon drag handle only) + `SettingsSortableVisibilityList.tsx:31-46` (handle + one checkbox row, no per-row buttons) + `ProviderAccounts.tsx:99-120` (divided rows, ghost actions).

### F9. Web search — timeout placement
`WebSearchPage.tsx:261-290`: the timeout owns a **whole L2 `SettingsSection` at the bottom of the page**, containing only `SETTINGS_NUMBER_STEPPER_ROW_CLASS` with `NumberInput` + unit + reset icon — no field label, no row. The stepper itself is `SETTINGS_NUMBER_INPUT_CLASS = 'typography-ui-label w-[calc(5.75rem+5ch)]'` (`SettingsSection.tsx:40`) ≈ 175-190px wide (sized to hold a 5-digit port, not 1-300 seconds) sitting alone on a full-width line. The correct shape already exists two files away: `ChatSettings.tsx:611-637` (FieldRow + stepper row + unit).

### F10. Compliance defects found while inventorying
- Viewport breakpoints inside pane content (documented violation, `layout.md` "Responsiveness: Container Queries"): `RemoteInstancesPage.tsx:2302,2316,2330,2372,2395,2432,2469,2499,2529,2571` (`md:flex-row md:gap-8`), `NotificationSettings.tsx:589` (`md:grid-cols-2 lg:gap-3`).
- `GitPage.tsx:118` overrides the page padding: `className="px-4 @xl:px-6 @3xl:px-12"`.
- `RemoteInstancesPage` uses `SETTINGS_NUMBER_INPUT_CLASS` outside a stepper row (`:2379,2407,2584,2848,2890`).

### F11. Page inventory and row-pattern classification

| Slug (metadata.ts) | Component | Layout class | Row pattern |
|---|---|---|---|
| omp | OmpSettingsPage | single | **stacked only** (all via OmpRowControl) |
| memory | MemoryPage | single | stacked (OmpRowControl) + `ModelRoleEditor` field row |
| tools | ToolsPage | single | checkbox rows + nested stacked (`ps-6`, `w-64`) |
| behavior | BehaviorPage | single | field rows + stacked + OmpRowControl |
| chat | ChatSettings | single (3 tabs) | field rows (compliant) **+ OmpRowControl stacked** |
| sessions | DefaultsSettings/SessionWork/Retention | single | field rows (compliant) **+ OmpRowControl stacked + mixed gaps** |
| routing | RoutingPage | single | **bespoke accordion** + 2 field rows |
| web-search | WebSearchPage | single | chip group + card grid + sortable list + lone stepper |
| providers | ProvidersPage/ProviderGrid | card grid | compliant |
| mcp | McpPage/McpGrid | card grid | compliant; rows pass `controlClassName` correctly |
| plugins | PluginsPage | card grid | compliant |
| extensions | ExtensionsPage | card grid | compliant |
| integrations | IntegrationsPage | card grid + stacked | stacked inside cards |
| git | GitPage | list + dialog | padding override (`:118`) |
| agents, commands, skills*, snippets, magic-prompts, usage, projects | split pages | side list + editor | mostly field rows; `SnippetsPage.tsx:141,160` hand-sets `h-7 w-44` / `max-w-sm` inputs |
| remote-instances | RemoteInstancesPage | single | **bespoke**, viewport breakpoints |
| notifications | NotificationSettings | single | field rows + viewport-breakpoint grid |
| appearance/general/shortcuts/voice/tunnel/about | OpenChamberPage sections | single | field rows + `SettingsTwoColumn` (compliant) |

### F12. Rendering evidence: not produced
Everything above comes from source, config and schema, plus the maintainer's on-disk `routing.json`; no page was rendered. Measurements marked ≈ are computed from CSS classes, not taken from a live DOM.

## 2. Proposed fix

### Fix A — Row pattern (fixes item 1; owner: `shared/SettingsSection.tsx` + `shared/OmpRowControl.tsx`)

1. **Make `SettingsFieldRow` actually end-aligned.** Replace `@xl:w-fit @xl:flex-none` with a bounded growing column: `@xl:w-auto @xl:flex-1` and keep `alignEnd && '@xl:justify-end'`. Then label (224px) … control pinned to the row's trailing edge. Keep `alignEnd={false}` callers (`ExtensionsPage.tsx:474`, `OpenChamberVisualSettings.tsx:497/539/585`, `PasskeySettings.tsx:307`, `BehaviorPage.tsx:368`) working: they already pass their own `controlClassName`, which still applies.
2. **Add a stable control width for select rows** so right edges align: give `SettingsFieldRow` an optional `controlWidth` (default `@xl:w-56`) applied to the control cluster; `SETTINGS_SELECT_ROW_TRIGGER_CLASS` then fills it (`w-full max-w-[28ch]`) inside a row — i.e. revert the trigger to upstream's `w-full min-w-[16ch] max-w-[28ch]` for rows only, keeping `w-fit` for stacked cells. This is the single change that removes the ragged right column (F4).
3. **Switch `OmpRowControl` number/string/enum to `SettingsFieldRow`** (`OmpRowControl.tsx:48,109,127`), keeping `SettingsChipGroup` as the control and `Textarea`-less strings as `Input inputSize="compact"` with `SETTINGS_SELECT_ROW_TRIGGER_CLASS`-family width. Booleans stay `SettingsCheckboxRow`. This one edit fixes OMP, Memory, Tools, Behavior, Chat, Sessions and Agents pages at once.
4. Use `SettingsTwoColumn` only where the content is genuinely two-up (short numeric fields on the OMP/Tools pages) — with `SettingsStackedField` inside cells, per `layout.md`.
5. Delete the `space-y-6` wrappers (`OmpSettingsPage.tsx:337`, `ToolsPage.tsx:153`, `MemoryPage.tsx:103`, `BehaviorPage.tsx:421`, `ChatSettings.tsx:366`); sections own their rhythm. Where rows of different shapes are mixed, use `space-y-3`/`space-y-4` instead of `SETTINGS_OPTION_STACK_CLASS` (keep 1.5 only for pure checkbox/radio lists).
6. Do **not** raise the 840px cap in this change: with rows end-aligned the pane reads full at 744px, and raising it only buys ~104px (pane max 944). Revisit only if it still feels cramped (open choice 2).

Edge cases: `alignEnd` callers that pass `controlClassName="w-full max-w-none"` (textarea rows) must keep filling; RTL (`inset-s`, `justify-end`) unaffected; mobile (`<@xl`) keeps the stacked fallback; `data-settings-item` anchors stay on the same node (`settings.ts` ids unchanged).

Check:
- `bun run type-check:ui`
- `bun run --cwd packages/ui test` — `OmpSettingsPage.test.tsx`, `BehaviorPage.test.tsx`, `ChatSettings.test.tsx`, `DefaultsSettings.test.tsx`, `MemoryPage`-touching tests, `settingsItemOwnership.test.ts`, `settingsDescriptionPolicy.test.ts`
- Real path: `OPENCHAMBER_DATA_DIR=/tmp/fb15-data bun run --cwd packages/web dev:server` (port 3011), open `/` → Settings → OMP, and measure in devtools: for one row, `document.querySelector('[data-settings-item="omp.compaction.enabled"]').parentElement.getBoundingClientRect().width` ≈ 744 and the row's control `right` ≈ row `right` − 0. Screenshot at 1600×900.
- `bunx oxlint packages/ui/src/components/sections/shared/SettingsSection.tsx packages/ui/src/components/sections/shared/OmpRowControl.tsx`

### Fix B — Routing page (item 2; owner: `routing/RoutingPage.tsx` + new `shared/SettingsSection.tsx` primitive + `layout.md`/`PATTERNS.md` note)

1. **Fix the unsaveable draft (F6) before any restyle.** Two parts:
   - Gate the debounced save on validity: `flush()` runs only when every category has non-empty `name`/`description` (and no id collision); otherwise show an inline `SETTINGS_HELPER_CLASS` line under the offending editor ("A description is required — Auto reads it to sort prompts") and keep `reportSettingsSaveState` idle instead of `'error'`.
   - Create a new category with a usable placeholder description is *not* acceptable (it would be sent to Jev as criteria). Gate, don't fake.
2. **Add the missing primitive** instead of hand-rolling: `SettingsDisclosure` in `SettingsSection.tsx` — `{ title, secondary, accessory (trailing control), expanded, onToggle, children }`, flat (no card, no `divide-*`), `aria-expanded`, chevron, `data-settings-item` passthrough. `CategoryRow` becomes a thin wrapper over it; the `divide-y border-y` list chrome (`RoutingPage.tsx:410`) is removed and spacing comes from `space-y-3`.
3. **Enable control**: keep one control per row but pick the canonical one. Either `SettingsCheckboxRow` inside the disclosure header (PATTERNS boolean rule) or — if a switch reads better next to a chevron — record the exception in `PATTERNS.md`. Recommendation: checkbox row; the switch adds a second hit target inside a button-like row.
4. **Add row**: use `SettingsFieldRow` with `controlClassName="min-w-0 @xl:flex-1"` (the `McpPage.tsx:915` precedent) so the input fills; submit on Enter and on the button; after adding, expand the new row.
5. **Restore removed built-ins** inline at the end of the list as `Button variant="ghost" size="xs"` inside a `SettingsControlGroup title="Removed"`, not a floating outline row.
6. **Merge readiness into one line** above the list: keep the enabled count ("2 of 4 enabled — Auto needs at least two") with the existing `readinessText` in the Auto section.

Registration: keep `data-settings-item="routing.add-category"`, `routing.category-thinking`, `routing.fallback-model`, `routing.fallback-thinking` (`search.ts` ids unchanged). No new copy needed for the disclosure itself; the "description is required" line needs one new key in **every** locale dictionary (`routing.i18n.ts` holds all of them — en, nl, uk, …).

Check:
- Unit: add a `RoutingPage.test.tsx` case asserting that after clicking Add with an empty description, `saveConfig` is **not** called and the helper line renders; then typing a description allows the save with a valid payload.
- `bun run type-check:ui`; `bun run --cwd packages/ui test` (routing + `settingsItemOwnership`).
- Real path: isolated data dir, add a category named "Docs", type a description, confirm the status reads saved and `/tmp/fb15-data/routing.json` gains `categories.docs` with `{builtin:false,name,description}`. Confirms the server round-trip that is broken today.

### Fix C — Web search fallbacks (item 3a; owner: `websearch/WebSearchPage.tsx`)

1. Drop `SETTINGS_CONTROL_CLUSTER_CLASS` (`:212`); use `w-full max-w-[40rem]` (or `max-w-none`) so the list uses the row.
2. Row shape, modelled on `SettingsSortableVisibilityList` + `ProviderAccounts`:
   `[drag handle ghost icon] [ordinal, tabular-nums, w-4] [provider name truncate] [warning pill only when key missing / not configured] [icon remove button SETTINGS_ICON_BUTTON_CLASS]`.
   Success pill removed; keep `FallbackStatus` returning only the two warning branches.
3. Remove control: `Button variant="ghost" size="icon"` with `aria-label={t('settings.webSearch.native.removeFallback', …)}` and `title` — no visible text button.
4. Add affordance: `DropdownMenu` opened from `Button variant="outline" size="xs"` + `Icon name="add"` labelled 添加备用提供商, listing `addable` providers; disabled with a helper line when `addable.length === 0`. This stops using a value picker as an action.
5. Empty state: one `SETTINGS_HELPER_CLASS` line ("No fallbacks — the primary provider answers alone.") plus the add button.
6. Drag mechanics need no change: `SettingsSortableList` already satisfies the drag-to-reorder skill (Mouse 8px, Touch 200ms, vertical strategy, `CSS.Translate`, stable ids, keyboard sensor).

New copy keys (all locales): empty state, "add fallback" button aria. Reuse `settings.webSearch.native.fallbacks` / `.fallbackInfo` / `.addFallback` / `.removeFallback`.

Check: `bun run --cwd packages/ui test` — `WebSearchPage.test.tsx`; keyboard reorder (Space + ArrowDown) and touch long-press on the real page; screenshot with ≥3 fallbacks at 1600px.

### Fix D — Web search timeout (item 3b; owner: same file)

Move the timeout out of its own bottom section into the **first** section, as a `SettingsFieldRow`, exactly like `ChatSettings.tsx:611-637`:
```
<SettingsSection title={t('settings.webSearch.section.provider')} …>
  <SettingsChipGroup …/>            // mode
  <p className={SETTINGS_HELPER_CLASS}>{status}</p>
  <SettingsFieldRow label={t('settings.webSearch.native.timeout')} settingsItem="web-search.timeout">
    <div className={SETTINGS_NUMBER_STEPPER_ROW_CLASS}>
      <NumberInput … min={1} max={300} className={SETTINGS_NUMBER_INPUT_CLASS} />
      <span className={SETTINGS_NUMBER_UNIT_CLASS}>s</span>
      <Button size="icon" className={SETTINGS_ICON_BUTTON_CLASS} … reset />
    </div>
  </SettingsFieldRow>
</SettingsSection>
```
Width: keep `SETTINGS_NUMBER_INPUT_CLASS` but consider a short-form variant for 3-digit values (`w-[calc(4rem+3ch)]`) so the stepper stops looking like a port field. Placement also removes one L2 section from the page. The `web-search.timeout` search anchor and registry entry (`search.ts:1511-1516`) stay valid; no page/`keywords` change.

Check: search "timeout" in Settings still lands with the highlight on the row; the value round-trips (reload shows it); a reset restores 60.

## 3. Open choices for the maintainer

1. **Row layout on dense pages** — (a) field rows everywhere except genuinely two-up cells [recommended: uses the width, matches PATTERNS and every upstream page]; (b) keep stacked but widen the cap to `max-w-none` inside a two-column grid [more compact vertically, but a 6-item page becomes a table of labels]; (c) leave stacked and raise the page cap to ~960 [least code, least benefit — the emptiness is in the row, not the page].
2. **Page width** — (a) keep `max-w-[840px]` [recommended: upstream parity, and the window caps at 1200 anyway]; (b) `@3xl:max-w-[56rem]` on pages whose content is two-column [small, safe gain]; (c) remove the cap above `@3xl` [widest, but long-form text lines and textareas get hard to read].
3. **Routing categories presentation** — (a) flat disclosure list built on a new `SettingsDisclosure` primitive [recommended: categories are 4-6 with a long textarea, and this keeps them in one screen]; (b) card grid with a per-category detail screen and back arrow (`McpGrid`/`PluginsPage` idiom) [most consistent with Providers/MCP, but an extra navigation step for a 4-row list]; (c) table with inline editing [densest, but a 2000-char description has no room].
4. **Category enable control** — (a) `SettingsCheckboxRow` in the disclosure header [recommended: canonical boolean]; (b) keep the `Switch` and document the exception in `PATTERNS.md` [fine if the chevron makes a checkbox look odd].
