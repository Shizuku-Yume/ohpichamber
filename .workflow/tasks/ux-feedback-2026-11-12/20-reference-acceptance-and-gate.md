# 20: Reference acceptance of the 17 items and full gate

**Effort:** ux-feedback-2026-11-12
**Blocked by:** 01, 02, 03, 04, 05, 06, 07, 08, 09, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 21, 22, 23, 24, 25, 26, 27
**Covers:** W1, W2, W3, W4, W5, W6, W7, W8, W9, W10, W11, W12, W13
**Files:** `.workflow/development.md`; evidence under `/home/shizuku/Project/ohpichamber-omp-artifacts/ux-feedback-2026-11-13/`
**Read first:** the spec (all W checks); `research/feedback-2026-11-12/00-maintainer-feedback.md` and its screenshots; `.workflow/standards.md` (Real path)
**Check:** `bun run check && bun run type-check && bun run lint && VITEST_MAX_WORKERS=2 bun run test && bun run docs:validate && .workflow/bin/workflow validate` → exit 0, including `scripts/upstream-gaps.mjs --check`; each of the 17 maintainer items passes as a regression row on Web and packaged Linux Electron, with a reviewer verdict.

- [ ] Build the packaged Linux Electron app and run the Web surface from the integration tip, each with an isolated data directory and `HOME`.
- [ ] Run each maintainer item as a regression row against its original screenshot, v2.7.0 (`bc50ba56a`) for OpenChamber surfaces and the OMP TUI for agent behavior, and capture screenshots.
- [ ] A `reviewer` agent that implemented nothing judges each row; differences go back to the owning task and are recaptured.
- [ ] Record results, perf numbers and remaining differences in `development.md`.
- [ ] Before the gate, a `reviewer` that implemented nothing re-reviews every task that landed after the 2026-11-14 independent review round (21–27, 10, 12) and the reviews in `/home/shizuku/Project/ohpichamber-omp-artifacts/ux-feedback-2026-11-13/independent-review/` are all resolved.
