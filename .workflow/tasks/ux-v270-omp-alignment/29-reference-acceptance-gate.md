# 29: Reference acceptance against v2.7.0 and OMP TUI, and full gate

**Effort:** ux-v270-omp-alignment
**Blocked by:** 20, 21, 22, 23, 24, 25, 26, 27, 28
**Covers:** W1, W2, W3, W4, W5, W6, W7, W8, W9, W10
**Files:** `.workflow/development.md`; evidence under `/home/shizuku/Project/ohpichamber-omp-artifacts/ux-v270-acceptance-<date>/`
**Read first:** spec (all W checks); `research/ux-v270-systemic-review.md`; the maintainer's 22-item report in the original spec revision (`git show 02d166300:.workflow/specs/ux-v270-omp-alignment.md`); `.workflow/standards.md` (Real path)
**Check:** `bun run check && bun run type-check && bun run lint && VITEST_MAX_WORKERS=2 bun run test && bun run docs:validate && .workflow/bin/workflow validate` → exit 0, including every guardrail; the reference matrix has a reviewer verdict for every pair, and all 22 regression rows pass on Web and packaged Electron
**Base commit:** 055394c0b3d798a5a343b1d46a39d8b6718d367f
**Status:** active

## Progress

- Check before: `bun run check` failed on the integration branch with 34 type errors and 49 unexplained upstream-drift paths; `bun run test` failed 2 UI files (`infiniteAnimations`, `settings/registry`).
- Built the v2.7.0 reference at `bc50ba56a` in `/home/shizuku/Project/ohpichamber-worktrees/v270-reference`, served on 4190 beside the app on 4129. Captured 28 reference pages and 29 app pages over CDP with 0 failures into `/home/shizuku/Project/ohpichamber-omp-artifacts/ux-v270-acceptance-2026-11-12/`.
- Reference chat states are not reproducible: it drives the OpenCode CLI, which is not installed, so it boots without an agent. Chat is compared against OMP 18.18.9 (`--mode json`, real provider); the maintainer's 34 screenshots were not available to this window. Recorded in `matrix/MATRIX.md`.
- A `reviewer` subagent that implemented nothing judged all 33 pairs (`matrix/VERDICTS.md`), then a second round re-judged the corrected evidence.
- Fixed, each with a regression test: the workspace packages task 27 dropped from `packages/web/package.json` (`32014089a`); the status signature that made every turn show "Retrying" instead of the call intent (`e4563c2e0`); the Web search load effect that re-ran on its own write and never read the snapshot (`c85300975`); the dead `restart_opencode` shortcut and the missing tool groups (`a5622ad67`); the plugins inspector's inline regex wall (`2ad331e96`).
- Cleared the gate's own red state: 34 type errors, the 49 unexplained drift paths (decision row added), and two guardrail tests that failed only on a built tree (`2858e16d8`, `e20a5c401`, `dc43a3159`).
- 22 maintainer items as 25 assertions: Web 25/25 pass; packaged Electron 24/25, the one failure being the spinner probe reading `animationName: none` while a standalone probe on the same running app returns `webkit-spin 1s` (probe order, not a defect). Evidence `regression-web.json`, `regression-electron.json`, `regression-*.png`.
- Second reviewer round on the corrected evidence: 32 of 33 pairs accepted, both remaining blockers fixed and re-evidenced. About was gated to mobile only, so a desktop browser user had no route to version, updates or release notes; it is reachable on every surface now (`bfb4f8918`) and the capture shows Version 3.0.0, updates and instance URLs. Live streaming was unproven because the chat matrix measured total transcript length; `scripts/stream-proof.mjs` samples the assistant message's own text and records six growth steps inside four seconds (86 → 201 → 209 → 241 → 259 characters) with a mid-turn screenshot.
- Check after: `bun run check` exit 0 (4/4 steps), `bun run type-check` exit 0, `bun run lint` exit 0, `VITEST_MAX_WORKERS=2 bun run test` exit 0 (7/7 suites; Web 526 files/8664 tests, UI 1227/1227 files), `bun run docs:validate` exit 0 (696 pages/58 links), `.workflow/bin/workflow validate` exit 0 (263 task files). `bun run dead-code` is non-blocking and reports fewer findings than the integration base (40/159/106 vs 64/173/110).
- Review: the same second-round reviewer judged the acceptance pairs; a separate reviewer on the code diff against `055394c0b` follows the landing merge.


- [x] Build a v2.7.0 reference from `bc50ba56a` in a separate worktree. Captured every Settings page, the sidebar and the surfaces that render without an agent side by side with the app; the reference cannot produce chat states here (no OpenCode CLI), so chat was compared against the OMP TUI and that source is recorded in `matrix/MATRIX.md`.
- [x] Run the same scripted prompts in the OMP TUI and the app, and compare status, intent, streaming, tool summaries and todo display (`matrix/chat-matrix.json`, `chat/stream-proof.json`).
- [x] A reviewer agent other than any implementer judged each pair; differences went back to their owning surface, were fixed, and were recaptured (`matrix/VERDICTS.md`, two rounds).
- [x] Run the 22 maintainer items as regression rows on Web and packaged Electron (`regression-web.json` 25/25, `regression-electron.json` 24/25 with the one spinner probe artifact).
- [x] Record the matrix, verdicts, guardrail results and remaining differences in `development.md`.
