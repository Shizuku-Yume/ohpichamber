# Settings UI Patterns

## Related contracts

Button, icon, color and visual-state rules belong to [UI styling](../../lib/theme/STYLING.md). Visible and accessible strings follow the existing [localization contract](../../../../../.agents/skills/locale-ui-patterns/SKILL.md).

For settings that read/write runtime data or change a reachable capability, consult the [runtime boundary and surface contract](../../../../../.agents/skills/ui-api-decoupling/SKILL.md#name-the-surfaces-before-editing). Name the retained surfaces before adding or moving a page so desktop and phone reachability are deliberate. The [settings registry](../../lib/settings/DOCUMENTATION.md) owns keys, scope and persistence.

Shared component/theme and localization contracts take precedence over examples; resolve material conflicts before changing the UI.

## Canonical Direction

Settings are built from the shared primitives in
`packages/ui/src/components/sections/shared/SettingsSection.tsx`,
`SettingsPageLayout.tsx`, and `SettingsInfoHint.tsx`. Never hand-roll page
chrome, section headers, field rows, checkbox rows, or info tooltips with raw
divs — use the primitives, and extend them (in the shared file) when a new
shape is genuinely missing.

- Flat hierarchy through spacing and typography; no cards, boxed backgrounds, or row chrome.
- Secondary helper text is hidden behind an info icon (`info` prop) by default; the default view stays quiet.
- Controls take their chrome from the shared primitives (`dropdownTriggerVariants()` for selects; no per-call size) and their width from the named width classes. A control carries no raw `w-*`/`max-w-*`/`min-w-[…]`, and neither does a `controlClassName`; `w-full`, `min-w-0`, `max-w-none` and `max-w-full` are the allowed fill/shrink tokens. See [widths](references/layout.md#widths) for which class each control takes and [control sizing](references/controls.md#standard-sizes-and-widths) for inputs beside dropdowns.
- Layouts respond to the settings pane width via container queries (`@xl:` / `@3xl:`), never viewport `sm:`–`2xl:` breakpoints (the pane is much narrower than the viewport inside the dialog). Dialog bodies and hover-only opacity affordances are the sanctioned exceptions.
- Checkbox/radio state comes before labels; selected states are subtle.

## References by topic

Consult only the branches affected by the change; these are ordinary module references, not companion skills.

| Topic | Reference |
|---|---|
| Page skeleton, hierarchy, nav placement, spacing, columns, responsiveness | [Layout](references/layout.md#page-skeleton) |
| Field rows, checkboxes, radios, chips, selects, inputs, steppers, info hints | [Controls](references/controls.md#field-rows) |
| Control/page moves, availability, anchors, search entries | [Search](references/search.md#required-integration) |

## Quick Primitive Selection

| Need | Shared primitive |
|---|---|
| Page wrapper (title, description, save status, scrolling, `@container`) | `SettingsPageLayout` |
| Titled block with divider | `SettingsSection` (`divider={false}` for the first one) |
| Label left / control right | `SettingsFieldRow` (the default row) |
| Label above control (two-column cells, wide controls only) | `SettingsStackedField` |
| Flat list of items that each expand into an editor | `SettingsDisclosure` |
| Boolean | `SettingsCheckboxRow` |
| OMP registry row (number, string, enum, boolean from one setting) | `OmpRowControl` |
| Mutually exclusive list | `SettingsRadioGroup` + `SettingsRadioOption` |
| Short segmented options | `SettingsChipGroup` |
| Sub-cluster with a quiet L3 title inside a section | `SettingsControlGroup` |
| Two-column area on wide panes | `SettingsTwoColumn` |
| Helper text on demand (hover + tap) | `info` prop or `SettingsInfoHint` |

`SettingsFieldRow` is the row for every control; `SettingsStackedField` is
only for two-column cells and controls too wide for a row. Row shapes, the
width class each control takes, and the section/row/checkbox spacing classes
are defined once in [layout](references/layout.md).

`settingsLayoutGuard.test.ts` under `packages/ui` enforces the mechanical
part and reports `file:line`: no raw width on a settings control or in a
`controlClassName`, no non-zero `space-y-*` on a wrapper around sections, no
page padding on `SettingsPageLayout` (the page cap stays `max-w-[840px]`), no
viewport breakpoint in pane content, `SETTINGS_WIDTH_NUMBER_CLASS` only
inside its stepper row, and no margin/gap/stack on a control or row
primitive. [Layout guard](references/layout.md#layout-guard) lists every rule
and its sanctioned exceptions.

Do not introduce raw `<Tooltip>`-based info icons.

## Expandable rows

`SettingsDisclosure` is for a flat list of items that each expand into an
editor (a routing category). Its header is one ghost toggle
with a chevron, the item name and an optional quiet summary; an `accessory`
such as `SettingsCheckboxRow` sits beside the toggle so it stays a separate
hit target, and it adds its own focus stop, so a header with an accessory is
two tab stops rather than one. The editor renders only while expanded. Do not
wrap a list of disclosures in cards or give the rows `divide-*`/border chrome:
the list stays flat, like every other settings stack, and each row's own
padding sets the rhythm between them. For a single always-visible control use
`SettingsFieldRow`; for a one-time reveal of helper copy use the `info` prop.

## Description Policy (info hints)

- Explanatory prose goes behind the info icon via the `info` prop by default.
- An info hint is one or two short sentences that add what the label or summary does not say. It names no list of every action and carries no caveat that stopped being true.
- When labels alone cannot explain the differences, consequences, or conditions needed to choose a setting, use a title, a visible description, then checkbox or radio controls. Option lists whose labels already read as complete choices (large-text paste modes, send shortcut) keep the explanation behind `info` even when it carries an exception. Having multiple options or a group title alone does not require a description; see `references/controls.md` for composition.
- Stays visible: security/data-loss warnings, destructive consequences, required syntax/placeholder lists the user reads while typing, dynamic status, empty states, validation errors, active-flow wizard instructions.
- Mixed text: keep the warning sentence visible, move the explanation to `info`.

## Save Feedback

For ordinary settings persisted through `updateDesktopSettings`, `SettingsPageLayout showSaveStatus` renders the shared quiet indicator: success is silent, "Saving…" appears only past ~500 ms, and failures show "Save failed". These writes report automatically; a page-specific persistence API participating in this ordinary-settings flow reports through `reportSettingsSaveState` from `@/lib/persistence`. Do not add per-page save badges or success toasts.

Settings entity editors use the native Canonical API and follow the autosave contract in [the Settings module documentation](DOCUMENTATION.md#autosave-on-configuration-and-behavior-pages). Project setup values use the Host project config API and the section-specific save behavior in [Project settings](DOCUMENTATION.md#project-settings-and-the-personal-setup-file). Neither flow reads OpenCode configuration files.

The OpenCode configuration pages autosave by their own contract (`components/sections/DOCUMENTATION.md`, *Autosave*) and never use this indicator.

## Settings Search Contract

Every stable Settings control addition or move must consider search in the same change:

- explicit registry item in `packages/ui/src/lib/settings/search.ts` when searchable;
- matching `data-settings-item` anchor (primitives accept `settingsItem`);
- localized title/description keys;
- availability matching actual render conditions;
- when a control moves to another page, update the item's `page` too.

Dynamic entity rows normally are not indexed. See [search registry rules](references/search.md#registry-rules).

## Completion Criteria

- Built from shared primitives; no ad-hoc page/section/row markup.
- Description placement follows the policy above; warnings/syntax/status remain visible.
- Container-query (`@xl:`/`@3xl:`) responsiveness — no viewport breakpoints in pane content.
- Rows follow the one row pattern; control widths and section stacks come from the named classes, and `settingsLayoutGuard.test.ts` passes ([layout guard](references/layout.md#layout-guard)).
- Search registry, anchor, page, localization, and availability agree.
- Nearby Settings precedent and relevant tests remain consistent.
