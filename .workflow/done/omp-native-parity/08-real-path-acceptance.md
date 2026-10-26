# 08: Real-path acceptance at the integration tip

**Effort:** omp-native-parity
**Task type:** feature
**Base commit:** ad8413b82bb8d634e4c78449f9b4f9d015b1f8c3
**Started:** 2026-10-27T02:06:00Z

**Delivers:** W11 evidence at the `omp-native-parity/integration` tip: real provider, real OMP config, driven through the visible UI; any defect found is fixed or recorded as a new task.

**Blocked by:** 01, 02, 03, 04, 05, 06, 07
**Files:** evidence under `/home/shizuku/Project/ohpichamber-omp-artifacts/onp-acceptance-<date>/`; `.workflow/development.md` status; spec status.

**Read first:** spec "How we will know it works"; `.workflow/standards.md` real path; skill `chrome-devtools-cli`.
**Covers:** W11

**Check:** At the tip, `bun run test`, `bun run type-check` and `bun run lint` results recorded; `bun run dev` with the provider env sourced; in the browser: CLI sessions listed with titles, a cold old session opens, a draft shows OMP defaults, Plan from a draft, a `task` subagent whose result is read with `read agent://`, sends in 7 sessions without 503, a named bash approval card; screenshots and timings saved.

- [x] Full checks at the tip recorded. (type-check exit 0; lint exit 1; test exit 1 — details in Progress and the evidence directory.)
- [x] Each W11 step has a screenshot or log.
- [x] Defects fixed or recorded as tasks; spec status updated. (gate debt recorded as task 09; spec notes the partial acceptance.)

## Progress

- Base `ad8413b82bb8d634e4c78449f9b4f9d015b1f8c3`; dirty at start: none. Branch `omp-native-parity/08-real-path-acceptance`.
- Check before: no W11 evidence or full-gate record existed at the branch tip before this run; the full checks and browser run below are the first acceptance attempt.
- Check after: `bun run type-check` exit 0; `bun run lint` exit 1; `bun run test` exit 1 (focus runs reproduced agent-service timeout and web failures; UI full-run file failures recorded). W11 browser steps all observed as listed below. This is recorded as partial technical acceptance, not a passing release gate.
- Environment: `bun run dev` with the real fish provider env sourced privately (no values printed), UI 5199, API 3929, isolated data dir, real `~/.omp/agent` config; one browser page in isolated context `onp-acceptance`. Evidence: `/home/shizuku/Project/ohpichamber-omp-artifacts/onp-acceptance-2026-10-26/` (`evidence.md`, screenshots, logs, `timings.log`).
- W11 results: CLI-created session listed with OMP title; cold open 431 ms with no new session worker; fresh draft showed OMP default GPT-6.1 Sol and High; a substantive prompt auto-titled `Write automated testing haiku`; Plan from a draft created `mode.kind=plan` and used plan tools (`glob`, `grep`, `read`, `ask`, `write local://`, `write xd://propose`); a `task` subagent was read via `read agent://HorizontalPiranha` and returned `ONP08-SUBAGENT-OK` with no red tool errors; seven app sessions sent with zero 503 lines and two observed worker evictions (session workers stayed at the 5 cap); a named bash approval card showed `bash`, the command, always-allow wording, deny and allow once, and executed after allow once. All screenshots are named `w11-*` in the evidence directory.
- Full checks at the tip: `bun run type-check` exit 0; `bun run lint` exit 1 (agent-service 18 anti-slop, UI 7; blame shows all but `journal.ts:88` and `session-message-loader.test.ts:223` pre-date the effort, both from Task01); `bun run test` 4/7 suites passed, UI 5/813 files failed, agent-service 1 test timed out at 30 s, web 12/6177 failed. Focused reruns after stopping the dev server reproduced the agent-service timeout and web 12 failures; the combined UI rerun hit the known mock.module leakage (individual-file runner is authoritative), so the full-run UI file failures remain recorded rather than reclassified.
- Defects/observations: adding a project did not refresh the sidebar's sessions until reload; cold session timeline issues `GET /sessions/:id/events` 404 and `/subagents` 404 (snapshot path rendered); two non-repo `repository-context` 422s on project add; React nested-button hydration console errors. None blocked a W11 step; the full-gate failures are not accepted as passing. Task 09 records the gate debt and the effort stays in progress for maintainer acceptance.
- Security: no source change; the only real-config change was `tools.approvalMode` set through the visible OMP settings for the bash card, then restored (line removed) to the original file. Provider values were never printed. Dev server stopped; no test wrote the real config.
- Review boundary: evidence-only change set (task/spec/development docs), no source touched. Flow-verify not applicable to a source diff; the acceptance evidence was reviewed against W11 item by item, and the failing gate is recorded instead of claimed.

**Finished:** 2026-10-27T02:35:00Z
