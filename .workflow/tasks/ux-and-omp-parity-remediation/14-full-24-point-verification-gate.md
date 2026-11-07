# 14: Run the full workspace static gate and 24-point real-path verification across Web and Electron

**Effort:** ux-and-omp-parity-remediation
**Task type:** feature
**Blocked by:** 12, 13
**Covers:** W26
**Files:** `.workflow/development.md`; `.workflow/specs/ux-and-omp-parity-remediation.md`
**Read first:** `.workflow/specs/ux-and-omp-parity-remediation.md`; `.workflow/standards.md`; `AGENTS.md`
**Check:** `bun run dead-code && bun run type-check && bun run lint && bun run docs:validate && VITEST_MAX_WORKERS=2 bun run test && .workflow/bin/workflow validate` → all exit 0, and real-path Web + packaged Electron walkthrough verifies W1–W26.

- [ ] Run the full workspace static verification suite (`bun run dead-code`, `bun run type-check`, `bun run lint`, `bun run docs:validate`, `VITEST_MAX_WORKERS=2 bun run test`, `.workflow/bin/workflow validate`) on the integration branch and resolve any cross-task regressions.
- [ ] Build and launch both the Web surface and packaged Electron desktop app (`bun run electron:build`), drive every single one of the 24 reported items (`W1`–`W25`) end to end with a real provider and local `omp` installation, capture verification receipts/screenshots, and record the final evidence in `.workflow/development.md`.
