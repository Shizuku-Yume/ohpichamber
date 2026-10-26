# 08: Real-path acceptance at the integration tip

**Effort:** omp-native-parity
**Task type:** feature
**Base commit:** <commit-sha>

**Delivers:** W11 evidence at the `omp-native-parity/integration` tip: real provider, real OMP config, driven through the visible UI; any defect found is fixed or recorded as a new task.

**Blocked by:** 01, 02, 03, 04, 05, 06, 07
**Files:** evidence under `/home/shizuku/Project/ohpichamber-omp-artifacts/onp-acceptance-<date>/`; `.workflow/development.md` status; spec status.

**Read first:** spec "How we will know it works"; `.workflow/standards.md` real path; skill `chrome-devtools-cli`.
**Covers:** W11

**Check:** At the tip, `bun run test`, `bun run type-check` and `bun run lint` results recorded; `bun run dev` with the provider env sourced; in the browser: CLI sessions listed with titles, a cold old session opens, a draft shows OMP defaults, Plan from a draft, a `task` subagent whose result is read with `read agent://`, sends in 7 sessions without 503, a named bash approval card; screenshots and timings saved.

- [ ] Full checks at the tip recorded.
- [ ] Each W11 step has a screenshot or log.
- [ ] Defects fixed or recorded as tasks; spec status updated.
