# 07: One row pattern, one set of control sizes and one spacing scale across Settings

**Effort:** ux-feedback-2026-11-15
**Blocked by:** None
**Covers:** W5
**Files:** `packages/ui/src/components/sections/shared/{SettingsSection.tsx,OmpRowControl.tsx,ompRowHelpers.ts}`, every page under `packages/ui/src/components/sections/**` that sets its own control widths or section spacing (inventory in `SettingsLayout.md` F2, F5, F10, F11), `packages/ui/src/components/sections/{PATTERNS.md,references/layout.md}`, a guard test or lint rule under `packages/ui` or `tools/oxlint`
**Read first:** spec "How it is built → Settings layout"; `research/feedback-2026-11-15/SettingsLayout.md` (F1–F5, F10–F11, fix A); `decisions.md` 2026-11-15 "Settings rows use one row pattern…"; `PATTERNS.md`, `references/layout.md`, `STYLING.md` in full
**Check:** `bun run type-check:ui` and `bun run --cwd packages/ui test` exit 0; the guard test fails on a raw width or spacing utility added to a control in `components/sections` and passes on the tree. Real path (Web, 1600×900): on OMP, Tools, Memory, Chat, Sessions, Agents and Behavior, each row's control ends within 2 px of its row's trailing edge (devtools `getBoundingClientRect`) and every select in a section shares one right edge; screenshots of every settings page go to the Evidence directory.

- [ ] `SettingsFieldRow`'s control column grows and aligns to the trailing edge on `@xl`; `alignEnd={false}` callers keep working; narrow containers keep the stacked fallback.
- [ ] Named classes in `SettingsSection.tsx` cover control widths (select, number stepper, short text, long text) and vertical spacing (section, row stack, checkbox stack); select triggers in rows fill one width.
- [ ] `OmpRowControl` renders number, string and enum rows as field rows; booleans stay checkbox rows.
- [ ] Pages drop their `space-y-6` section wrappers, ad-hoc control widths (`w-48`, `w-64`, `max-w-md`, `h-7 w-44`, `max-w-sm`), `GitPage`'s padding override and in-pane viewport breakpoints (`RemoteInstancesPage`, `NotificationSettings`).
- [ ] `PATTERNS.md` and `layout.md` document the classes and the rule; a guard rejects regressions.
- [ ] The 840 px page cap is unchanged.
