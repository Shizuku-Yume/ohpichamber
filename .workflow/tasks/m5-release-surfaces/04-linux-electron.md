# 04: Build and verify local Linux x64 Electron AppImage and Guest SDK v2 smoke

**Effort:** m5-release-surfaces
**Blocked by:** 01
**Files:** `packages/electron/scripts/prepare-agent-runtime.mjs`, `packages/electron/scripts/verify-agent-runtime.mjs`, `packages/electron/scripts/verify-linux-appimage.mjs`, `packages/electron/scripts/package.mjs`, `packages/electron/main.mjs`
**Read first:** `.workflow/specs/m5-release-surfaces.md` (W3); `.agents/skills/desktop-shell/SKILL.md`
**Covers:** W3
**Check:** `bun run electron:build` stages and verifies `resources/agent-runtime` with `bun@1.4.4` and `pi-natives-linux-x64`, passes `verify:linux-appimage`, launches the packaged Linux x64 AppImage via `/dev/fuse`, returns 200 on `/api/agent/v1/ready`, completes a real-provider prompt, and renders a Guest SDK `v2` panel cleanly.

- [ ] Build the packaged Linux x64 Electron AppImage locally with `bun@1.4.4` and verify `resources/agent-runtime/manifest.json`, `verify:agent-runtime`, and `verify:linux-appimage` pass with zero OpenCode artifacts.
- [ ] Launch the packaged AppImage natively via `/dev/fuse` against an isolated data directory, confirm `/api/agent/v1/ready` returns 200 with the embedded Bun Agent Runtime, complete a real-provider chat turn, and verify a Guest SDK `v2` extension panel loads over the private `MessagePort` bootstrap.
