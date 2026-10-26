# 25: UI misc: guests, browser, terminal, multi-run

**Effort:** upstream-refresh
**Task type:** feature
**Base commit:** <commit-sha>

**Delivers:** Remaining UI surfaces match upstream: Guest panels, browser and terminal views, multi-run, settings helpers, model picker and the small auxiliary components.

**Blocked by:** 10, 23, 24
**Files:** Path list: `/home/shizuku/Project/ohpichamber-omp-artifacts/upstream-sync-2026-10-27/plan-paths/25.tsv` (247 paths: 160 clean/new, 81 both-side, 45 conflicts). Main locations: `packages/ui/src/lib/{guests,browser,settings,multirun,ghostty,...}`, `packages/ui/src/components/{browser,terminal,model-picker,mcp,dictation,auth,code,diagram,desktop,...}`, `packages/ui/tsconfig.json`.

**Read first:** Spec W6; `.agents/skills/ui-api-decoupling/SKILL.md`; `.agents/skills/drag-to-reorder/SKILL.md`; `.agents/skills/locale-ui-patterns/SKILL.md`; `.agents/skills/performance-engineering/SKILL.md`.
**Covers:** W6

**Check:** `bun install --frozen-lockfile` and `bun run type-check` and `bun run lint` and `bun run test` all exit 0, and in the running app a Guest extension panel opens, the browser panel navigates, the terminal opens a shell and multi-run shows its runs. Real path: drive each surface once and capture the result.

## Done when

- [ ] Guest panels keep the v2 transport from task 04; no second envelope.
- [ ] Browser and terminal panels keep their permission and focus boundaries.
- [ ] Multi-run state is per project and survives reload.
- [ ] No unused upstream component is left unexported or unreachable.
