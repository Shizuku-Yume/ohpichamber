# 05: Phase A acceptance on the packaged app

**Effort:** rebrand
**Blocked by:** 01, 02, 03, 04
**Covers:** W2, W3, W5
**Read first:** spec `rebrand.md` "How we will know it works"; tasks 01–04 Progress; `standards.md` "Running it"
**Check:** on the integration tip, build the Linux AppImage and launch it with `HOME` set to a throwaway directory under `/home/shizuku/Project/ohpichamber-omp-artifacts/rebrand-05-2026-11-16/home` and no data overrides. Everything W2 lists holds: name and new icon in window, dock and `.desktop`; data only under `<home>/.config/ohpichamber` and `<home>/.config/OhPiChamber`; `xdg-open ohpichamber://host/local` focuses the app; a chat completes through a real provider; `app-update.yml` names `Shizuku-Yume/ohpichamber`. The W3 grep returns only the allowed lines, and the W5 About, Linear and push states hold. `bun run type-check`, `bun run lint`, `VITEST_MAX_WORKERS=2 bun run test`, `bun run docs:validate` and `.workflow/bin/workflow validate` exit 0. `ACCEPTANCE.md` records PASS/FAIL per W item with screenshots.

- [ ] A reviewer that implemented none of 01–04 runs the acceptance.
- [ ] Every FAIL goes back through `flow-break` amend.
- [ ] macOS `Assets.car`/`icon.icns` and iOS device checks are listed as unverified, with the job that produces them.
