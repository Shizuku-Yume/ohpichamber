# 13: Reference acceptance on the packaged app and the full gate

**Effort:** ux-feedback-2026-11-15
**Blocked by:** 01, 02, 03, 04, 05, 06, 07, 08, 09, 10, 11, 12
**Covers:** W11
**Read first:** spec "How we will know it works"; `research/feedback-2026-11-15/README.md` (verbatim feedback and the maintainer's screenshots); the previous effort's task 20 for the acceptance-matrix format
**Check:** on the integration tip, `bun run check`, `bun run type-check`, `bun run lint`, `VITEST_MAX_WORKERS=2 bun run test`, `bun run docs:validate` and `.workflow/bin/workflow validate` exit 0, logs in the Evidence directory. A reviewer that implemented nothing walks every item on the packaged Linux AppImage and the Web surface and records PASS or FAIL with screenshots in `ACCEPTANCE.md`.

- [x] Build the AppImage from the integration tip and run it with an isolated data dir and a real provider.
- [x] One acceptance row per feedback item (1–7, with 6 split into its four parts) plus the two planning additions (OMP simplification and Advanced tab; unified spacing and control sizes).
- [x] Each row compares against the maintainer's original screenshot and the spec's W check, not a derived list.
- [x] Every settings page is screenshotted at 1600 px and reviewed against `PATTERNS.md`.
- [x] Any FAIL goes back through `flow-break` amend; the gate result and the matrix are recorded in `development.md`.
- [x] Rows that need a person (Linear consent, a phone or second device) are listed for the maintainer with exact steps, not marked PASS by the reviewer.

## Progress

- **Check after:** tip `0986f1f815` (`gate/FINAL2-SUMMARY.txt`, logs under `/home/shizuku/Project/ohpichamber-omp-artifacts/ux-feedback-2026-11-16/task13/gate/`): `bun run check` exit 0 (40 s, 5/5 steps: `tsc -b` 3,875 files / 5 projects, `upstream-drift` clean, `error-cause` 0 baseline, `css-classes` 2,266 tokens, `upstream-gaps` 662/662 allowlisted); `bun run type-check` exit 0 (36 s); `bun run lint` exit 0 (4 s, 7 workspaces, 0 errors); `VITEST_MAX_WORKERS=2 bun run test` exit 0 (966 s, 7/7 suites passed, 0 failed — scripts 32/32, sdk 32/32, ui 1,245/1,245, agent-contract 265/0, agent-service 578 pass / 10 skip / 0 fail, electron 71/71, web 527 pass / 9 skip files with 8,614 pass / 142 skip tests); `bun run docs:validate` exit 0 (0 s, 696 pages / 58 links); `.workflow/bin/workflow validate` exit 0 (2 s, 303 task files); `bun run dead-code` exit 1 non-blocking (35 s, 43 unused files / 166 unused exports / 116 unused types / 7 hints vs base `1fc6270437` 44 / 170 / 118 / 7, 0 new findings in this effort).
- **Review:** pass (base `fd48f28944`; independent read-only reviewer `reviewer-fixes-1`, 4 rounds in `review/review-1.md` and `review/review-2.md`, final **APPROVE** on `0986f1f815`; acceptance walkers were separate sessions that implemented nothing).
- **AppImage builds & Web runs:** Round 1 `a16878d9…` (`fd48f28944`/`de487fa91e`), Round 2 `70acebe7…` (`ea3feade34`), Round 3 `ffa4199f…` (`b6a5ca3f47`), Round 4 `349335f3…` (`0986f1f815`, smoke in `appimage/round4-smoke.png` + Web tab-strip receipt `shots/fix-tabs-receipt.json`; Round-4 AppImage spot-walk of P1 tab strip not re-walked because `rows/row-P1-round4.md` is absent).
- **Acceptance matrix & maintainer rows:** recorded in `/home/shizuku/Project/ohpichamber-omp-artifacts/ux-feedback-2026-11-16/task13/ACCEPTANCE.md` and summarized in `.workflow/development.md` (10 `PASS`, 2 `PARTIAL` — row 3 and row 6c, 30/30 settings pages `PASS` at 1600 px on AppImage & Web). Maintainer-needed rows (`M1` Linear consent, `M2` second machine/phone, `M3` Figma client ID, `M4` physical touch reorder, `M6` enterprise-mode W10 decision) are listed with exact steps in both `ACCEPTANCE.md` and `.workflow/development.md` (none marked `PASS` by reviewers).

## Amendments (FAIL -> fix wave)

Gate and walker failures from Rounds 1–3 were resolved as a recorded fix wave on `ux-feedback-2026-11-15/13` rather than re-opening earlier task numbers:

- First-run gate (`fd48f28944` → `de487fa91e`): openrouter route export (`8a06bb5e47`), private `AUTO_FILL_NOTICE_ID_LIMIT` (`43ffe8cdaa`), retired `permissionAutoAccept` allowlist cleanup (`da4d367cbd`), settings-layout & catalog-env drift decisions (`de487fa91e`).
- Walker defects (R1–R3): web-search fallback reorder with `null` primary (`34e7f9ba87`); loop-guard `calls` unit chip (`7ebc7d43fe`); search clear on jump (`5b257e06db`); select option description width (`62d59319bc`); fresh-profile reasoning default (`cb2a45fca7`); message slice rendering + sized sliced image export (`1d8d191ab3`, `b6a5ca3f47`); settings P2 28 px heights, stacked-to-field conversion, usage/plugins toolbars, layout guard extension, 32×32 dialog icon buttons, and drift decisions (`64f60cc50c`, `5db5067b66`, `925f3d9568`, `ded928edea`, `9aaf5d00fa`); provider discovery credential cascade (`fd3d0dd10f`, `418c125e46`); cold-start workspace directory binding (`ea3feade34`, `ff76f0f7ba`); English OMP/Chat/Projects tab-strip intrinsic sizing (`0986f1f815`).
