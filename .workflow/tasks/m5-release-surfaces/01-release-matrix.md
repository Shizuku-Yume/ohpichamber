# 01: Clean CI workflows, align bun@1.4.4, and enable unsigned cross-platform builds

**Effort:** m5-release-surfaces
**Blocked by:** None
**Files:** `.github/workflows/release.yml`, `.github/workflows/release-desktop-smoke.yml`, `.github/workflows/build-macos-arm64-dmg.yml`, `.github/workflows/mobile-release.yml`, `.github/workflows/mobile-ci.yml`, `packages/electron/package.json`, `packages/electron/scripts/package.mjs`, `packages/electron/README.md`, `packages/mobile/README.md`, `packages/web/README.md`
**Read first:** `.workflow/specs/m5-release-surfaces.md` (W1); `.workflow/decisions.md` (`2026-11-06 - Split post-M4 roadmap into M5 packaging cleanup, M6 full audit and polish, and M7 pragmatic release`)
**Covers:** W1
**Check:** Bun parses all `.github/workflows/*.yml` files cleanly; `grep -nE 'opencodeCli|prepare:opencode-cli|verify:opencode-cli|vscode' .github/workflows/*.yml` prints no release target or invocation; all workflows pin `bun@1.4.4` and Node 24; `.workflow/bin/workflow validate` passes.

- [ ] Remove all `opencodeCli`, `prepare:opencode-cli`, `verify:opencode-cli`, and `vscode` steps/targets from `.github/workflows/release.yml`, `release-desktop-smoke.yml`, `build-macos-arm64-dmg.yml`, `mobile-release.yml`, and `mobile-ci.yml`.
- [ ] Align all workflow Bun pins to `1.4.4` (matching `package.json#packageManager` and `prepare-agent-runtime.mjs`) and Node to `24`, staging and verifying the OMP `18.16.0` (`vendor/omp/650f3a10`) Agent Runtime across the six native Electron targets (`darwin-arm64`, `darwin-x64`, `win32-x64`, `win32-arm64`, `linux-x64`, `linux-arm64`).
- [ ] Configure macOS, Windows, Android, and iOS build jobs so commercial signing/notarization secrets are strictly optional: when Apple Developer ID / notarization / TestFlight or Windows Authenticode secrets are absent, builds succeed and emit unsigned/ad-hoc artifacts (`CSC_IDENTITY_AUTO_DISCOVERY=false`, `verifyUpdateCodeSignature` disabled when unsigned) instead of failing.
- [ ] Update `packages/electron/README.md`, `packages/mobile/README.md`, and `packages/web/README.md` with accurate build targets and unsigned macOS/iOS self-installation instructions (`xattr -cr` / sideloading).
