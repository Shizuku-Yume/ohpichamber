# 04: Final tech-debt-sweep integration gate

**Effort:** tech-debt-sweep
**Task type:** refactor
**Blocked by:** 01, 02, 03
**Covers:** W1, W2, W3, W4
**Files:** `.workflow/development.md`; `.workflow/done/tech-debt-sweep/closeout.md`
**Read first:** `.workflow/specs/tech-debt-sweep.md`; `.agents/skills/flow-verify/SKILL.md`; `.agents/skills/flow-close/SKILL.md`
**Check:** `bun run dead-code && bun run type-check && bun run lint 2>&1 | tee /tmp/debt-gate-lint.log && ! grep -q 'warning' /tmp/debt-gate-lint.log && bun run docs:validate && VITEST_MAX_WORKERS=2 bun run test && .workflow/bin/workflow validate` → all exit 0 on `tech-debt-sweep/integration`.

- [ ] Verify `bun run dead-code` exits `0`, `bun run lint` exits `0` with 0 warnings, `bun run type-check` exits `0`, `bun run docs:validate` exits `0`, and `VITEST_MAX_WORKERS=2 bun run test` exits `0` across all 7 suites on `tech-debt-sweep/integration`.
- [ ] Record verification evidence in `.workflow/development.md` and `.workflow/done/tech-debt-sweep/closeout.md`, mark `.workflow/specs/tech-debt-sweep.md` `**Status:** done`, archive Task `04`, and run `.workflow/bin/workflow validate` (keep integrated on `tech-debt-sweep/integration` if `main` packaging is still running, or fast-forward `main` only if `git -C /home/shizuku/Project/ohpichamber status --short` is clean and no build process is active).
