# 29: Reference acceptance against v2.7.0 and OMP TUI, and full gate

**Effort:** ux-v270-omp-alignment
**Blocked by:** 20, 21, 22, 23, 24, 25, 26, 27, 28
**Covers:** W1, W2, W3, W4, W5, W6, W7, W8, W9, W10
**Files:** `.workflow/development.md`; evidence under `/home/shizuku/Project/ohpichamber-omp-artifacts/ux-v270-acceptance-<date>/`
**Read first:** spec (all W checks); `research/ux-v270-systemic-review.md`; the maintainer's 22-item report in the original spec revision (`git show 02d166300:.workflow/specs/ux-v270-omp-alignment.md`); `.workflow/standards.md` (Real path)
**Check:** `bun run check && bun run type-check && bun run lint && VITEST_MAX_WORKERS=2 bun run test && bun run docs:validate && .workflow/bin/workflow validate` → exit 0, including every guardrail; the reference matrix has a reviewer verdict for every pair, and all 22 regression rows pass on Web and packaged Electron

- [ ] Build a v2.7.0 reference from `bc50ba56a` in a separate worktree. Capture every Settings page, the sidebar and other surfaces that render without an agent side by side with the app. For chat states, use the maintainer's reference environment if available, otherwise the 34 reference screenshots, and record which.
- [ ] Run the same scripted prompts in the OMP TUI and the app, and compare status, intent, streaming, tool summaries and todo display.
- [ ] A reviewer agent other than any implementer judges each pair. Differences go back to the owning task, are fixed, and are recaptured.
- [ ] Run the 22 maintainer items as regression rows on Web and packaged Electron.
- [ ] Record the matrix, verdicts, guardrail results and remaining differences in `development.md`.
