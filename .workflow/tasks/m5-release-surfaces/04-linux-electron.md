# 04: Certify Linux Electron AppImages

**Effort:** m5-release-surfaces
**Task type:** feature
**Base commit:** <commit-sha>

**Delivers:** Linux x64 and arm64 AppImages from the release workflow; each launches on its native runner, starts the embedded Host and Agent Service, answers `/api/agent/v1/ready` with 200, completes a real-provider prompt, and produces the matching architecture's update manifest.

**Blocked by:** 01
**Files:** `.github/workflows/release.yml` Linux jobs (363-439) and manifest jobs (446-518); `.github/workflows/release-desktop-smoke.yml` Linux job; `packages/electron/scripts/verify-linux-appimage.mjs`; `packages/electron/scripts/package.mjs`; Linux install docs.

**Read first:** `.workflow/specs/m5-release-surfaces.md` matrix, R5 and "Electron"; archived task 11's Linux package smoke and its `GH_TOKEN` limit; archived task 15's arm64 dependency; `.agents/skills/desktop-shell/SKILL.md`; `.agents/skills/openchamber-change-discipline/references/updater-testing.md`.
**Covers:** R5

**Check:** With the maintainer's runner permission, dispatch `.github/workflows/release-desktop-smoke.yml` for Linux on `blacksmith-4vcpu-ubuntu-2404` (x64) and `blacksmith-4vcpu-ubuntu-2404-arm` (arm64). Each job stages and verifies the Agent Runtime, `verify:linux-appimage` exits 0 on the native-architecture AppImage, the AppImage launches, `/api/agent/v1/ready` returns 200, and a real-provider prompt completes in the visible UI driven through the AppImage's remote-debugging endpoint. Record the FUSE state, artifact hash, readiness body and prompt result. Without a runner the row is `not run`; `APPIMAGE_EXTRACT_AND_RUN=1` is recorded as a stand-in, not as a normal launch.

**Done when**

- [ ] Both architectures build from one commit and stage `resources/agent-runtime` with the pinned Bun 1.4.2 and the matching approved native leaf.
- [ ] Both AppImages pass the payload/native-module verification and launch on their matching native runner; no cross-architecture packaging is used.
- [ ] Ready returns 200 and a real-provider prompt completes on both architectures.
- [ ] `latest-linux.yml` and `latest-linux-arm64.yml` each match their own artifact and are not merged into one misleading manifest.
- [ ] No OpenCode CLI, VS Code extension artifact or compatibility process is packaged.
- [ ] The receipt names both runners, kernel/FUSE state, artifact hashes and every not-run or stand-in result.
