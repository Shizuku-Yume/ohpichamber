# 07: One row pattern, one set of control sizes and one spacing scale across Settings

**Effort:** ux-feedback-2026-11-15
**Blocked by:** None
**Covers:** W5
**Files:** `packages/ui/src/components/sections/shared/{SettingsSection.tsx,OmpRowControl.tsx,ompRowHelpers.ts}`, every page under `packages/ui/src/components/sections/**` that sets its own control widths or section spacing (inventory in `SettingsLayout.md` F2, F5, F10, F11), `packages/ui/src/components/sections/{PATTERNS.md,references/layout.md}`, a guard test or lint rule under `packages/ui` or `tools/oxlint`
**Read first:** spec "How it is built → Settings layout"; `research/feedback-2026-11-15/SettingsLayout.md` (F1–F5, F10–F11, fix A); `decisions.md` 2026-11-15 "Settings rows use one row pattern…"; `PATTERNS.md`, `references/layout.md`, `STYLING.md` in full
**Check:** `bun run type-check:ui` and `bun run --cwd packages/ui test` exit 0; the guard test fails on a raw width or spacing utility added to a control in `components/sections` and passes on the tree. Real path (Web, 1600×900): on OMP, Tools, Memory, Chat, Sessions, Agents and Behavior, each row's control ends within 2 px of its row's trailing edge (devtools `getBoundingClientRect`) and every select in a section shares one right edge; screenshots of every settings page go to the Evidence directory.
**Base commit:** f68a30f8628fe696ac6c54493a61597e72be890d

- [x] `SettingsFieldRow`'s control column grows and aligns to the trailing edge on `@xl`; `alignEnd={false}` callers keep working; narrow containers keep the stacked fallback.
- [x] Named classes in `SettingsSection.tsx` cover control widths (select, number stepper, short text, long text) and vertical spacing (section, row stack, checkbox stack); select triggers in rows fill one width.
- [x] `OmpRowControl` renders number, string and enum rows as field rows; booleans stay checkbox rows.
- [x] Pages drop their `space-y-6` section wrappers, ad-hoc control widths (`w-48`, `w-64`, `max-w-md`, `h-7 w-44`, `max-w-sm`), `GitPage`'s padding override and in-pane viewport breakpoints (`RemoteInstancesPage`, `NotificationSettings`).
- [x] `PATTERNS.md` and `layout.md` document the classes and the rule; a guard rejects regressions.
- [x] The 840 px page cap is unchanged.

## Progress

- Base commit already set (`f68a30f8628fe696ac6c54493a61597e72be890d`, at task start; no rebase since).
- **Check before:** not run, source-level finding in `SettingsLayout.md` F2–F5. `OmpRowControl` rendered every non-boolean setting through `SettingsStackedField` (label above, control capped at 24rem), only booleans used a row; the guard test did not exist; four width vocabularies and three spacing vocabularies coexisted (`w-fit max-w-[28ch]`, `w-48`, `max-w-md`, `@xl:w-fit @xl:flex-none`, plus page-level `space-y-6` on top of the section's own `py-8`).
- **Check after:**
  - `bun run type-check:ui` → `✓ No type errors in 3,540 files across 2 projects`.
  - `VITEST_MAX_WORKERS=2 bun run --cwd packages/ui test` → `1240/1240 test files passed` (100.8s).
  - `bunx oxlint` on every TS/TSX changed vs base (163 files) → no errors; one pre-existing `react-hooks/exhaustive-deps` warning in `chat/MarkdownRendererImpl.tsx`, a file from another task's merge, not touched here.
  - `settingsLayoutGuard.test.ts` → `11 pass, 0 fail`.
  - Real path (Web surface, 1600×900, 31 Settings pages, `getBoundingClientRect` probes): **229 field rows, 0 rows farther than 2 px from the row's trailing edge**, 0 section select-alignment failures. Every select in a section shares one right edge: OMP 16 selects at 1294px, Sessions 18 at 1294px, Tools 7 at 1294px (spread 0px each). The 840px page cap is unchanged and no page exceeds it. Evidence: `/home/shizuku/Project/ohpichamber-omp-artifacts/ux-feedback-2026-11-16/task07/` (`measurements.md`, `measurements.json`, `screenshots/`, `screenshots-notes.md`, `raw/`).
  - Guard mutation proof: the reviewer appended a raw `w-48` to the 236 real controls plus mid-file mutations (a `space-y-4` section stack, a spacing utility, a viewport breakpoint, a bare number width) — 0 misses.
- **Review:** pass (independent reviewer worker `t07-reviewer`, read-only), two rounds. Round 1 blockers (guard parser holes, attribute-expression JSX, the spacing rule contradicting the docs, the About and Appearance rows) were fixed; round 2 found no blocking findings.
- **Non-blocking leftovers:** guard rule S checks direct `SettingsSection` children only, so a nested wrapper such as `ProjectEnvironmentSection.tsx:147`'s `space-y-6` still passes; rule G does not cover padding utilities on controls; hover-only `md:` opacity affordances, sidebars and the project dialog shell are allowlisted by file/pattern; tasks 09/10 own the routing category list and the web-search fallback list — this task only removed page-level overrides around them.
- **Files outside the task's `Files` list that this change touched** (all via the constant rename, the shared width/space cutover, or the new guard's contract): `shared/ModelRoleEditor.tsx` (row/stacked picker widths), `shared/SettingsCards.tsx` (card search width), `views/git/PublishDialog.tsx` (dialog field stack), `settingsLayoutGuard.test.ts` (new), `references/controls.md` (stale constant names), and three test files whose module mocks name the removed constants: `openchamber/SessionRetentionSettings.test.tsx`, `openchamber/VoiceSettings.audioFocus.test.tsx`, `openchamber/sourceControlOAuthPolling.test.tsx`. Every other path is a page under `components/sections/**` that the task's `Files` line already covers.
- **Integration merge:** `ux-feedback-2026-11-15/integration` was merged into the task branch; three conflicts (`McpOAuthSignIn.tsx`, `ProviderGrid.tsx`, `ProvidersPage.tsx`) were resolved by keeping both sides' behaviour and re-expressing the integration's `space-y-*`/`max-w-*` utilities with the named classes. No old constant name survives in `packages/ui`.
