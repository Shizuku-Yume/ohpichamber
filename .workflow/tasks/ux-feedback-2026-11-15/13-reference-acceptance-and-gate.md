# 13: Reference acceptance on the packaged app and the full gate

**Effort:** ux-feedback-2026-11-15
**Blocked by:** 01, 02, 03, 04, 05, 06, 07, 08, 09, 10, 11, 12
**Covers:** W11
**Read first:** spec "How we will know it works"; `research/feedback-2026-11-15/README.md` (verbatim feedback and the maintainer's screenshots); the previous effort's task 20 for the acceptance-matrix format
**Check:** on the integration tip, `bun run check`, `bun run type-check`, `bun run lint`, `VITEST_MAX_WORKERS=2 bun run test`, `bun run docs:validate` and `.workflow/bin/workflow validate` exit 0, logs in the Evidence directory. A reviewer that implemented nothing walks every item on the packaged Linux AppImage and the Web surface and records PASS or FAIL with screenshots in `ACCEPTANCE.md`.

- [ ] Build the AppImage from the integration tip and run it with an isolated data dir and a real provider.
- [ ] One acceptance row per feedback item (1–7, with 6 split into its four parts) plus the two planning additions (OMP simplification and Advanced tab; unified spacing and control sizes).
- [ ] Each row compares against the maintainer's original screenshot and the spec's W check, not a derived list.
- [ ] Every settings page is screenshotted at 1600 px and reviewed against `PATTERNS.md`.
- [ ] Any FAIL goes back through `flow-break` amend; the gate result and the matrix are recorded in `development.md`.
- [ ] Rows that need a person (Linear consent, a phone or second device) are listed for the maintainer with exact steps, not marked PASS by the reviewer.
