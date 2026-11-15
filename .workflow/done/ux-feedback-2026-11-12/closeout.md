# Closeout: ux-feedback-2026-11-12

**Accepted:** 2026-11-15 by ShizukuYume (maintainer)

## Shipped

All 27 tasks are archived and landed on `ux-feedback-2026-11-12/integration` (tip `887edfec5` plus this closeout). The plan had 20 tasks. Seven fix tasks (21–27) came from an independent review round on 2026-11-14, where 8 of 10 tasks without an independent reviewer failed review. Evidence is under `/home/shizuku/Project/ohpichamber-omp-artifacts/ux-feedback-2026-11-13/`; the acceptance matrix is `task20/ACCEPTANCE.md`.

- **W1 to W12** are covered by their tasks and re-run as the 17 maintainer rows in task 20.
- **W13 (full gate).** The gate ran on `f9fba14a4`; from there to the integration tip only `.workflow/` documents changed. Results:
  - `bun run check` 5/5, including `scripts/upstream-gaps.mjs --check`, and `upstream-gaps` 13/13 tests;
  - `bun run type-check`, `bun run lint`, `bun run docs:validate` and `workflow validate` all exit 0;
  - `VITEST_MAX_WORKERS=2 bun run test` passes in all 7 suites: scripts 31/31, SDK 32/32, UI 1236/1236, agent-contract 260, agent-service 525 pass / 10 skip, Electron 71/71, Web 8,569 pass / 142 skip.

  Logs are in `task20/gate-logs/`.
- **Maintainer rows.** On Web and on the packaged Linux AppImage, 16 rows PASS and row 16 (new-chat latency) is PARTIAL, judged by reviewers who implemented nothing (`task20/rowreview/`, two rounds). Row 16:
  - `POST /sessions` went from ~1 s to 13–15 ms;
  - cold prompt acknowledgement went from ~1.5 s to ~500 ms;
  - first token on the prepared path is 220–280 ms;
  - stream cadence is 33.2 ms;
  - the cold, unprepared path is ~760 ms against its 600 ms budget. That budget was waived; see below.

## Key decisions & plan changes

- The nine product decisions of 2026-11-13: tiered tool authorization, project or user MCP scope, page titles, an OMP-native Usage dashboard, settings placed by concept, OMP owning image and memory, turn-end suggestions, 33 ms streaming, and "Token" in Chinese copy.
- On 2026-11-14 the plan was amended with tasks 21–27 after the independent review round. From then on, every window was required to get an independent reviewer and to run the real path through the production composition.
- Agent decisions recorded during implementation: the 2026-11-14 and 2026-11-15 entries in `decisions.md`, covering OMP settings placement and the boundary, the deferred session id with queued prompt delivery, the auto-review and PR-watch cutover, and the ownership of the feedback cutovers.

## Waived checks & skipped reviews

- Task 24, W11. The ≤ 600 ms first-`part.delta` budget on the cold, unprepared path was waived by the maintainer on 2026-11-15 (`decisions.md`: "The cold-path first-delta budget is waived").
- No review was skipped. Every task records a `Review: pass` from an independent reviewer. The tasks that first landed with only a self-review (01, 05, 06, 07, 08, 11, 13, 14, 15, 17) were reviewed afterwards. 06 and 07 passed; the others were fixed by tasks 21–27.

## Remaining debt & follow-ups

- `technical-debt.md`: "Cold new-chat first token waits on OMP session construction". It covers an OMP SDK seam for prebuilt session graphs and a revision guard on `reapplyModelPolicies()`.
- `technical-debt.md`: "OMP TUI-owned behaviors have no GUI mirror or drift test". It covers auto-compaction status, `todo_auto_clear`, and drift tests for plan mode and slash commands.
- `decisions.md` 2026-11-15: "Task 02's asar-guard revert stays unlanded".
