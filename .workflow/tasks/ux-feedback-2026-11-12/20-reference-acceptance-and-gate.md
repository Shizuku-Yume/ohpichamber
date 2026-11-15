# 20: Reference acceptance of the 17 items and full gate

**Effort:** ux-feedback-2026-11-12
**Blocked by:** 01, 02, 03, 04, 05, 06, 07, 08, 09, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 21, 22, 23, 24, 25, 26, 27
**Covers:** W1, W2, W3, W4, W5, W6, W7, W8, W9, W10, W11, W12, W13
**Files:** `.workflow/development.md`; evidence under `/home/shizuku/Project/ohpichamber-omp-artifacts/ux-feedback-2026-11-13/`
**Read first:** the spec (all W checks); `research/feedback-2026-11-12/00-maintainer-feedback.md` and its screenshots; `.workflow/standards.md` (Real path)
**Check:** `bun run check && bun run type-check && bun run lint && VITEST_MAX_WORKERS=2 bun run test && bun run docs:validate && .workflow/bin/workflow validate` → exit 0, including `scripts/upstream-gaps.mjs --check`; each of the 17 maintainer items passes as a regression row on Web and packaged Linux Electron, with a reviewer verdict.
**Base commit:** 6a24a2a24bfe6d3755fb6c0f7ff4530ef9f642f5
**Status:** active

- [ ] Build the packaged Linux Electron app and run the Web surface from the integration tip, each with an isolated data directory and `HOME`.
- [ ] Run each maintainer item as a regression row against its original screenshot, v2.7.0 (`bc50ba56a`) for OpenChamber surfaces and the OMP TUI for agent behavior, and capture screenshots.
- [ ] A `reviewer` agent that implemented nothing judges each row; differences go back to the owning task and are recaptured.
- [ ] Record results, perf numbers and remaining differences in `development.md`.
- [ ] Before the gate, a `reviewer` that implemented nothing re-reviews every task that landed after the 2026-11-14 independent review round (21–27, 10, 12) and the reviews in `/home/shizuku/Project/ohpichamber-omp-artifacts/ux-feedback-2026-11-13/independent-review/` are all resolved.

## Progress

Check before: `bun run check` 4/5 — `upstream-gaps` failed with 354 unallowlisted `omp.*` settings-search gaps, and `upstream-drift` listed fork-differs paths with no decision.

Check after: `bun run check` 5/5 exit 0; `bun run type-check` exit 0 (3,860 files / 5 projects); `bun run lint` exit 0 (all workspaces); `bun run docs:validate` exit 0 (696 pages, 58 sidebar links); `.workflow/bin/workflow validate` exit 0 (290 task files); `bunx oxlint` on the changed files exit 0; `node --test scripts/upstream-gaps.test.mjs` 13/13. `VITEST_MAX_WORKERS=2 bun run test` exit 1 — see the suite line below. Receipts: `/home/shizuku/Project/ohpichamber-omp-artifacts/ux-feedback-2026-11-13/task20/gate-logs/` (`35-check.log`, `28-typecheck.log`, `29-lint.log`, `31-docs.log`, `32-wf.log`, `30-test-full.log`, `GATE-1-2.md`).

`VITEST_MAX_WORKERS=2 bun run test` at f51a345e19: 5/7 suites. scripts, sdk, ui, agent-contract and electron pass; agent-service is 516 pass / 2 fail and web is 8569 pass / 1 fail. Each failure was triaged rather than assumed: `file-resources-native.test.ts:167` still fails with `session.ts` and `usage.ts` reverted to 6a24a2a and that file is untouched by this branch (its cause is `interaction.ts:55 ensureThemeSync()` fixing the pi-tui glyph for the rest of the process); `spaces/dispatcher.test.js` is flaky alone (4 isolated runs: 26/26, 25/26, 26/26, 26/26) and was last touched before the branch base; `session-native.test.ts:599` passes isolated and is unproven. This effort's own `02-test-initial.log` recorded agent-service 518 pass / 0 fail, so the suite is not yet at the recorded baseline and the gate is **not** passed.

Guardrail work in this task: `scripts/lib/upstream-gaps/audit-settings.mjs` now resolves a row component's anchor template (`settingsItem={anchor}` where `anchor` is a `const`) and expands `@const-prefix:` against the OMP placement authority, which turned 354 false gaps into 67 real ones and 66 genuinely dead `omp.*` search entries were deleted; the WORKTREE walk skips gitignored build output (`web-dist`, `agent-runtime`) so a stale bundle is not read as source; `scripts/upstream-gaps.mjs` now fails an allowlist row whose gap no longer exists. `.workflow/upstream-deltas.tsv` gained rows for every previously unexplained `fork-differs` path plus the 2026-11-15 decision entry, and three rows git contradicted were deleted.

Review: blocked — the full suite is red on three load-order/flaky failures above, outside this task's two owned lanes.

