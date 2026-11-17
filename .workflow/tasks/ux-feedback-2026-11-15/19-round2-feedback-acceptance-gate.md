# 19: Round-2 visual acceptance on AppImage + Web and full workspace gate

**Effort:** ux-feedback-2026-11-15
**Blocked by:** 14, 15, 16, 17, 18
**Covers:** W12, W13, W14, W15, W16, W17
**Files:** `.workflow/development.md`
**Read first:** `.workflow/specs/ux-feedback-2026-11-15.md` (2026-11-18 follow-up amendment) (W12–W17); `/home/shizuku/Project/ohpichamber-omp-artifacts/feedback-2026-11-18/` (`1..6-*.png`); `.workflow/done/ux-feedback-2026-11-15/13-reference-acceptance-and-gate.md`; `/home/shizuku/Project/ohpichamber-omp-artifacts/ux-feedback-2026-11-16/task13/ACCEPTANCE.md`
**Check:** on the `ux-feedback-2026-11-15/integration` tip, build `packages/agent-service` and the packaged Linux AppImage (`bun run electron:build:linux` or workspace AppImage build), walk W12–W16 on both the AppImage and Web at 1600 px (`zh-CN` and `en`) via an independent reviewer worker that wrote none of Tasks 14–18, and run `bun run check && bun run type-check && bun run lint 2>&1 | tee /tmp/fb15-19-lint.log && ! grep -qE ': warning ' /tmp/fb15-19-lint.log && VITEST_MAX_WORKERS=2 bun run test && bun run docs:validate && .workflow/bin/workflow validate` → all exit 0, every row PASS in `ACCEPTANCE-ROUND2.md`.

- [ ] Rebuild `packages/agent-service` and the Linux AppImage from the merged integration tip; capture side-by-side `zh-CN` and `en` screenshots matching all 6 maintainer images (`feedback-2026-11-18/1..6-*.png`) on both Web (1600 px) and the packaged AppImage.
- [ ] Have an independent read-only reviewer worker (that implemented none of 14–18) audit the `4f9a7c7f39..HEAD` diff and walk W12–W16 plus `PATTERNS.md` / `STYLING.md` / `settingsLayoutGuard.test.ts` compliance; fix any blocking visual or code defect before re-walking.
- [ ] Run the full gate (`check`, `type-check`, `lint` with 0 warnings, `VITEST_MAX_WORKERS=2 bun run test`, `docs:validate`, `workflow validate`; serialize root `vitest` with `/tmp/root-test-suite.lock` if another effort's gate is running).
- [ ] Record Round-2 acceptance in `/home/shizuku/Project/ohpichamber-omp-artifacts/ux-feedback-2026-11-18-r2/task19/ACCEPTANCE-ROUND2.md` and update `.workflow/development.md` on the integration branch. Do not mark the spec `done` and do not merge into `main`.
