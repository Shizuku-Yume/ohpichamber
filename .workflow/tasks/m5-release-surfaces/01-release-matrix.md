# 01: Encode the retained release matrix

**Effort:** m5-release-surfaces
**Task type:** feature
**Base commit:** <commit-sha>

**Delivers:** One retained release matrix encoded in the release workflows and install docs: Electron macOS arm64/x64, Windows x64/arm64, Linux x64/arm64; mobile on iOS and Android; Docker linux/amd64 and linux/arm64; npm standalone on Linux x64 with further rows only after their own runner evidence. Inherited VS Code and OpenCode targets, and architectures with no approved native leaf, are removed or explicitly disabled.

**Blocked by:** post-m3-hardening/29
**Files:** `.github/workflows/release.yml` (macOS matrix 133-145, Windows 274-284, Linux 363-374); `.github/workflows/release-desktop-smoke.yml`; `.github/workflows/build-macos-arm64-dmg.yml`; `.github/workflows/mobile-release.yml`; `packages/electron/README.md`; `packages/mobile/README.md`; `packages/web/README.md`; the M5 spec matrix.

**Read first:** `.workflow/specs/m5-release-surfaces.md` "How it is built" and R1; `post-m3-hardening/29`; archived task 14's Windows signing decision; task 24's docs labels; current `release.yml`.
**Covers:** R1

**Check:** Bun parses `.github/workflows/release.yml` and prints exactly the six Electron matrix entries with their runners; `.github/workflows/mobile-release.yml` names the signed Android and iOS build jobs. `grep -nE 'opencodeCli|prepare:opencode-cli|verify:opencode-cli|vscode' .github/workflows/release.yml .github/workflows/release-desktop-smoke.yml .github/workflows/build-macos-arm64-dmg.yml .github/workflows/mobile-release.yml` prints no release target or invocation. `.workflow/bin/workflow validate` passes. The same matrix table appears in the spec and the install docs, and the Docker/npm rows name the tasks that add their workflow jobs.

**Done when**

- [ ] The macOS, Windows and Linux matrices name the exact runners and signing/toolchain inputs from the spec, and no job targets an architecture absent from the six approved native leaves.
- [ ] Every inheriting release or smoke workflow is either updated to the retained matrix or explicitly limited to a named non-release purpose.
- [ ] Mobile, Docker and npm rows match the settled decisions: mobile iOS/Android is supported and blocked only on device certification; Docker covers both Linux architectures; npm starts with Linux x64. No row is listed as supported before its evidence.
- [ ] `packages/electron/README.md`, `packages/mobile/README.md`, `packages/web/README.md` and the install docs state the retained rows and label unverified rows.
- [ ] `workflow validate`, the matrix inventory and the inherited-reference sweep pass, and the receipt records each command and its output.
