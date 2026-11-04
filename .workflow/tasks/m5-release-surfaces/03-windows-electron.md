# 03: Certify Windows Electron installers

**Effort:** m5-release-surfaces
**Task type:** feature
**Base commit:** <commit-sha>

**Delivers:** Authenticode-signed Windows x64 and arm64 NSIS installers from the release workflow; each verifies, installs, launches its embedded Host and Agent Service, answers `/api/agent/v1/ready` with 200, completes a real-provider prompt, and keeps updater signature verification enabled.

**Blocked by:** 01, post-m3-hardening/13
**Files:** `.github/workflows/release.yml` Windows job (274-359); `.github/workflows/release-desktop-smoke.yml` Windows job; `packages/electron/scripts/package.mjs`; `packages/electron/package.json` (`build.win.verifyUpdateCodeSignature`); `packages/electron/updater-*.test.mjs`; Windows install docs.

**Read first:** `.workflow/specs/m5-release-surfaces.md` matrix, R4 and "Electron"; archived task 14 (`WINDOWS_CSC_LINK` / `WINDOWS_CSC_KEY_PASSWORD`); archived task 11's Windows staging limit; `.agents/skills/desktop-shell/SKILL.md`; `.agents/skills/openchamber-change-discipline/references/updater-testing.md`.
**Covers:** R4

**Check:** First update `.github/workflows/release-desktop-smoke.yml` Windows job to map `WINDOWS_CSC_LINK` and `WINDOWS_CSC_KEY_PASSWORD` to electron-builder and set `OPENCHAMBER_REQUIRE_WINDOWS_SIGNING=1` for the signed run. Dispatch it for Windows on `windows-2022` for x64 and arm64. Both jobs stage and verify the Agent Runtime and produce NSIS installers; `signtool verify /pa` exits 0 on each. The x64 installer installs and launches on `windows-2022`; the arm64 installer is handed to a documented Windows 11 arm64 VM, installed there with no x64 emulation, and launched. For each, `/api/agent/v1/ready` returns 200 and a real-provider prompt completes in the visible UI driven through the app's remote-debugging endpoint. Record the Authenticode subject, artifact hashes, VM build and result. Without the certificate, runner or VM the row is `not run`; the VM step is a documented artifact handoff, not a workflow-provisioned runner claim.

**Done when**

- [ ] The smoke workflow's signed Windows run maps the two signing secrets and sets `OPENCHAMBER_REQUIRE_WINDOWS_SIGNING=1`; its unsigned path is not used as a release result.
- [ ] Both architectures build from one commit and stage `resources/agent-runtime` with the pinned Bun 1.4.2 and the matching native leaf.
- [ ] Release packaging fails before electron-builder when the two signing secrets are absent; the local/smoke unsigned path remains explicit and is not used as a release result.
- [ ] `signtool verify /pa` passes for both installers, `verifyUpdateCodeSignature` stays true, and a signed update check runs on the installed x64 build.
- [ ] Both installers install and launch; ready returns 200; a real-provider prompt completes; the arm64 result comes from a Windows 11 arm64 VM.
- [ ] No OpenCode CLI, VS Code extension artifact or compatibility process is packaged.
- [ ] The receipt names the runner, Visual Studio/NSIS versions, signing subject, VM build, artifact hashes and every not-run or stand-in result.
