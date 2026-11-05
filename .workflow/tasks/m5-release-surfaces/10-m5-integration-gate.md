# 10: Run integrated M5 gate verification across W1–W5

**Effort:** m5-release-surfaces
**Blocked by:** 01, 04, 06, 07, 08
**Files:** `.workflow/development.md`, `packages/electron/README.md`, `packages/mobile/README.md`, `packages/web/README.md`
**Read first:** `.workflow/specs/m5-release-surfaces.md` (W1–W5)
**Covers:** W1, W2, W3, W4, W5
**Check:** On the merged `m5-release-surfaces/integration` tip, `.workflow/bin/workflow validate`, `bun install --frozen-lockfile`, `bun run type-check`, `bun run lint`, `bun run test`, and `bun run docs:validate` all exit 0, and W1–W5 artifacts/evidence are recorded in `.workflow/development.md`.

- [ ] Re-verify W1–W5 together on the integrated `m5-release-surfaces/integration` tip (zero OpenCode/VSCode CI or Docker remnants, standalone `@openchamber/web` clean-prefix smoke receipt, Linux x64 Electron AppImage + Guest SDK `v2` receipt, Isolated Spaces fail-closed check, and `shutdown.test.js` stability).
- [ ] Run full workspace gates (`bun install --frozen-lockfile`, `bun run type-check`, `bun run lint`, `bun run test`, `bun run docs:validate`) and record exact pass counts and M5 completion evidence in `.workflow/development.md` (keeping `.workflow/specs/m5-release-surfaces.md` at `Status: in progress` for maintainer `flow-close`).
