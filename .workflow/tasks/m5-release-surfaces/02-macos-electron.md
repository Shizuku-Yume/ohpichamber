# 02: Certify macOS Electron artifacts

**Effort:** m5-release-surfaces
**Task type:** feature
**Base commit:** <commit-sha>

**Delivers:** Signed, notarized macOS arm64 and x64 Electron artifacts from the release workflow; each installs, launches its embedded Host and Agent Service, answers `/api/agent/v1/ready` with 200, completes a real-provider prompt, and carries a matching update manifest. Quake show/hide/close and the Mini Chat shortcut are exercised on the arm64 build.

**Blocked by:** 01, post-m3-hardening/13
**Files:** `.github/workflows/release.yml` macOS job (133-272); `.github/workflows/release-desktop-smoke.yml` macOS job; `packages/electron/scripts/package.mjs`; `packages/electron/scripts/after-pack.cjs`; `packages/electron/resources/entitlements.mac.plist`; `packages/electron/scripts/verify-update-manifest.mjs`; macOS install docs.

**Read first:** `.workflow/specs/m5-release-surfaces.md` matrix, R3 and "Electron"; archived task 11's packaged smoke limits; archived task 14's signing lesson; `.agents/skills/desktop-shell/SKILL.md`; `.agents/skills/openchamber-change-discipline/references/updater-testing.md`.
**Covers:** R3

**Check:** First update `.github/workflows/release-desktop-smoke.yml` so its macOS matrix carries a per-entry runner and uses `runs-on: ${{ matrix.runner }}`: `blacksmith-6vcpu-macos-26` for arm64 and `macos-15-intel` for x64. Then dispatch that workflow for macOS. For each arch: the job asserts `xcodebuild -version` (26.x on the arm64 runner, 16.x on the x64 runner), stages and verifies the Agent Runtime, `codesign -vv --deep --strict` and `xcrun stapler validate` exit 0 on the `.app`, the DMG installs, the app launches, `/api/agent/v1/ready` returns 200, and a real-provider prompt completes in the visible UI driven through the app's remote-debugging endpoint. Record `xcodebuild -version`, the runner label, the artifact hash, the readiness body and the prompt result. Without runner or Apple signing access the result is `not run` and the task is blocked with the exact access request.

**Done when**

- [ ] The macOS smoke matrix selects `blacksmith-6vcpu-macos-26` for arm64 and `macos-15-intel` for x64 with `runs-on: ${{ matrix.runner }}`, and asserts the expected Xcode major version on each runner.
- [ ] Both architectures build from one commit and stage `resources/agent-runtime` with the pinned Bun 1.4.2 and the matching native leaf.
- [ ] Both apps pass signature, hardened-runtime, entitlement and notarization verification; `verify:agent-runtime` passes against the packaged `Contents/Resources`.
- [ ] Both DMGs install and launch; ready returns 200; a real-provider prompt completes; the arm64 run records Quake show/hide/close and Mini Chat shortcut behavior.
- [ ] The arm64 and x64 `latest-mac.yml` files match their artifacts and are not combined into one misleading manifest.
- [ ] No OpenCode CLI, VS Code extension artifact or compatibility process is packaged.
- [ ] The receipt names the runner, Xcode version, signing identity, artifact hashes and every not-run or stand-in result.
