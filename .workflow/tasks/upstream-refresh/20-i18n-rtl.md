# 20: i18n and RTL

**Effort:** upstream-refresh
**Task type:** feature
**Base commit:** <commit-sha>

**Delivers:** Arabic and Hebrew locales with mirrored layout, plus the refreshed message catalog and RTL-safe components, work across the shell, chat and settings.

**Blocked by:** 10, 23
**Files:** Path list: `/home/shizuku/Project/ohpichamber-omp-artifacts/upstream-sync-2026-10-27/plan-paths/20.tsv` (109 paths: 66 clean/new, 41 both-side, 27 conflicts; +41.7k lines). Main locations: `packages/ui/src/lib/i18n/`. Deferred from task 10: `components/ui/{OverlayScrollbar.tsx,sonner.tsx,sonner.test.tsx,sortable-tabs-strip.tsx}` (need this task's `direction`/`isRightToLeft`/`getLocaleDirection`), plus the RTL logical-class changes in `components/onboarding/ChooserScreen.tsx` that task 10 kept. Use the shared clock (`components/ui/pause-clock.tsx`, `hooks/useDurationTicker.ts`, `hooks/usePageColors.ts`) for spinners/busy indicators in scope so they are not dead code.

**Read first:** Spec W6; `.agents/skills/locale-ui-patterns/SKILL.md`; `packages/ui/src/lib/i18n/DOCUMENTATION.md`; the fork's locale rules.
**Covers:** W6

**Check:** `bun install --frozen-lockfile` and `bun run type-check` and `bun run lint` and `bun run test` all exit 0, the i18n tests pass, and in the running app switching to Arabic mirrors the layout, keeps icons directional, and no label is clipped in the sidebar, chat composer or settings. Real path: send one message in RTL mode.

## Done when

- [ ] The layout uses logical CSS properties where the new locales need them; no physical-side duplication.
- [ ] Message keys are shared across locales; missing keys fall back visibly.
- [ ] The fork's existing locales keep their translations; no key is silently dropped.
- [ ] RTL is exercised on the settings and chat surfaces, not only the shell.
- [ ] OverlayScrollbar, sonner and the sortable tab strip adopt upstream with the direction helpers; ChooserScreen gets the logical-class changes.
- [ ] `pause-clock`, `useDurationTicker` and `usePageColors` have their consumers where this task touches spinners/busy indicators.
