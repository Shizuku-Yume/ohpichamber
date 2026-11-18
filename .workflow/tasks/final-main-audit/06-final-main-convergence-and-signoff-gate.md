# 06: Final convergence, full workspace gate, and release-readiness report

**Effort:** final-main-audit
**Blocked by:** 01, 02, 03, 04, 05
**Covers:** W1, W2, W3, W4, W5
**Files:** `.workflow/development.md`; `.workflow/done/final-main-audit/closeout.md`; `.workflow/specs/final-main-audit.md`
**Read first:** `.workflow/specs/final-main-audit.md`; `.claude/skills/flow-verify/SKILL.md`; `.claude/skills/flow-close/SKILL.md`
**Check:** `bun install --frozen-lockfile && bun run brand:generate --check && bun run check && bun run type-check && bun run lint 2>&1 | tee /tmp/final-audit-lint.log && ! grep -qE ': warning ' /tmp/final-audit-lint.log && bun run dead-code && bun run docs:validate && VITEST_MAX_WORKERS=2 bun run test && .workflow/bin/workflow validate` → every single command exits 0 with zero warnings and zero dead-code findings; `FINAL-AUDIT-REPORT.md` written in `/home/shizuku/Project/ohpichamber-omp-artifacts/final-main-audit-2026-11-18/task06/`.

- [ ] Reconcile all merged changes from tasks 01–05 on `final-main-audit/integration`, rebuild `packages/agent-service`, and run the complete root gate above (fixing any cross-task interaction cleanly and re-running).
- [ ] Spawn an independent read-only reviewer worker to perform an effort-close `flow-verify` audit across `main...final-main-audit/integration` and inspect the screenshots/receipts from tasks 04 and 05.
- [ ] Write `/home/shizuku/Project/ohpichamber-omp-artifacts/final-main-audit-2026-11-18/task06/FINAL-AUDIT-REPORT.md` (summarizing code style/quality results, UI/i18n compliance, Web/Mobile/AppImage/CLI walkthrough receipts, full gate timings, and M7 readiness), update `.workflow/development.md`, write `.workflow/done/final-main-audit/closeout.md`, mark `.workflow/specs/final-main-audit.md` `**Status:** done`, archive task 06, merge `final-main-audit/integration` cleanly into `main`, and prune `final-main-audit` worktrees/branches so `main` is spotless.
