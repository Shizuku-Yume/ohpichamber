# 10: Design system, theme and rebranding

**Effort:** upstream-refresh
**Task type:** feature
**Base commit:** <commit-sha>

**Delivers:** Upstream's UI primitives, spacing/raised-surface styling, logos, app icons, PWA assets and theme catalog are in place, with the fork's theme-import behavior preserved.

**Blocked by:** 02
**Files:** Path list: `/home/shizuku/Project/ohpichamber-omp-artifacts/upstream-sync-2026-10-27/plan-paths/10.tsv` (226 paths: 215 clean/new, 10 both-side, 3 conflicts; includes 89 assets). Main locations: `packages/ui/src/components/{ui,icon,icons,onboarding,update,emoji}`, `packages/ui/src/{assets,styles,App.css,index.css}`, `packages/ui/src/lib/theme/`.

**Read first:** Spec W6; `packages/ui/src/lib/theme/STYLING.md`; `.agents/skills/locale-ui-patterns/SKILL.md`; `.agents/skills/openchamber-change-discipline/SKILL.md`; decisions.md: 2026-10-27 - Keep the fork version at 3.0.0 (branding assets do not change the version).
**Covers:** W6

**Check:** `bun install --frozen-lockfile` and `bun run type-check` and `bun run lint` and `bun run test` all exit 0, `bun run --cwd packages/ui build` exits 0, and the running app renders the new logo/icons and both light and dark themes without layout regressions. Real path: switch theme, open a dialog and a toast, and capture screenshots for the task record.

## Done when

- [ ] Logo, app icons and PWA assets are applied everywhere the upstream set covers, including the Electron and web public directories owned by tasks 05 and 22 (coordinate; do not duplicate).
- [ ] Design tokens are the single source for spacing, radius and surface elevation; no component keeps a parallel token set.
- [ ] Theme import still accepts the fork's existing themes; OpenCode-named theme fixtures remain only as fixtures.
- [ ] Onboarding and update surfaces render with the new primitives.
