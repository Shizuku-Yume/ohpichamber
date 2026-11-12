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

- Check before: not run (task 29 starts from the tree task 28 landed).
- Built the v2.7.0 reference at `bc50ba56a` in `/home/shizuku/Project/ohpichamber-worktrees/v270-reference`, served on 4190; app served on 4129. Captured 28 reference pages and 29 app pages over CDP with 0 failures. Evidence under `/home/shizuku/Project/ohpichamber-omp-artifacts/ux-v270-acceptance-2026-11-12/`.
- Reference chat states are not reproducible: it requires the OpenCode CLI, which is not installed, so it boots without an agent. Compared chat against the OMP TUI instead (`omp 18.18.9 --mode json`); the maintainer's 34 screenshots were not available.
- Fixed an integrated-tree boot defect owned by task 27: `fba213e13` dropped `@openchamber/agent-contract`, `@openchamber/agent-service` and `@openchamber/sdk` from `packages/web/package.json` while 58 server modules import them, so a fresh install left the Web server unable to start. Restored the three lines (`32014089a`).
- `bun run electron:build` exited 0 and produced `OpenChamber-3.0.0-linux-x86_64.AppImage` (sha256 `971dc47d…`). Not launched.
- Check after: not run. The full chain and the reviewer verdicts are outstanding, so W10 is not satisfied and this task is not archived.
