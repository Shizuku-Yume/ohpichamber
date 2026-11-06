# 04: Build and verify local Linux x64 Electron AppImage and Guest SDK v2 smoke

**Effort:** m5-release-surfaces
**Base commit:** 919b86a34778a0c537a6f9375e1257c40bfafa64
**Blocked by:** None
**Files:** `packages/electron/package.json`, `packages/electron/scripts/prepare-agent-runtime.mjs`, `packages/electron/scripts/verify-agent-runtime.mjs`, `packages/electron/scripts/verify-linux-appimage.mjs`, `packages/electron/scripts/package.mjs`, `packages/electron/main.mjs`
**Read first:** `.workflow/specs/m5-release-surfaces.md` (W3); `.agents/skills/desktop-shell/SKILL.md`
**Covers:** W3
**Check:** `bun run electron:build` stages and verifies `resources/agent-runtime` with `bun@1.4.4` and `pi-natives-linux-x64`, passes `verify:linux-appimage`, launches the packaged Linux x64 AppImage via `/dev/fuse`, returns 200 on `/api/agent/v1/ready`, completes a real-provider prompt, and renders a Guest SDK `v2` panel cleanly.

- [x] Build the packaged Linux x64 Electron AppImage locally with `bun@1.4.4` and verify `resources/agent-runtime/manifest.json`, `verify:agent-runtime`, and `verify:linux-appimage` pass with zero OpenCode artifacts.
- [x] Launch the packaged AppImage natively via `/dev/fuse` against an isolated data directory, confirm `/api/agent/v1/ready` returns 200 with the embedded Bun Agent Runtime, complete a real-provider chat turn, and verify a Guest SDK `v2` extension panel loads over the private `MessagePort` bootstrap.
- [x] Ensure `packages/electron/package.json` and `packages/electron/scripts/package.mjs` allow unsigned desktop builds cleanly when signing credentials (`CSC_LINK`, `WINDOWS_CSC_LINK`, Apple notarization env vars) are absent (`verifyUpdateCodeSignature` not forced on unsigned builds).

## Progress

- **Check before:**
- Base commit pinned: `919b86a34778a0c537a6f9375e1257c40bfafa64`.
- `bun install --frozen-lockfile` repaired incomplete Electron installation and completed cleanly.
- `packages/electron/package.json` had hardcoded `mac.notarize: true`, `win.verifyUpdateCodeSignature: true`, `dmg.sign: true`.
- `packages/electron/scripts/package.mjs` only handled Windows signing and lacked macOS/Linux unsigned and publish defaults.
- Test fixtures in `verify-agent-runtime.test.mjs` and `verify-linux-appimage.test.mjs` hardcoded `bunVersion: '1.4.2'`.
- `verify:linux-appimage` failed on non-ELF binaries in `@oh-my-pi/pi-natives-*` prebuilds.

- **Work:**
- Updated `packages/electron/package.json`: disabled `mac.notarize`, `win.verifyUpdateCodeSignature`, and `dmg.sign` by default so unsigned packaging works cleanly when signing secrets are absent; added `scripts/package.test.mjs` to `test:architecture`.
- Refactored `packages/electron/scripts/package.mjs`: exported `configurePackageBuild` with comprehensive platform/credential logic: maps `WINDOWS_CSC_*` to `CSC_*`, conditionally enables Windows code signing verification only when credentials exist, disables `CSC_IDENTITY_AUTO_DISCOVERY` and forces `verifyUpdateCodeSignature=false` on unsigned Windows builds, disables notarization/signing and sets `CSC_IDENTITY_AUTO_DISCOVERY=false` on unsigned macOS/Linux builds, and defaults to `--publish=never` when publish flag is absent.
- Added `packages/electron/scripts/package.test.mjs` with 14 unit tests covering direct builder defaults, Windows, macOS, Linux, and publish flag handling.
- Updated `verify-agent-runtime.test.mjs` and `verify-linux-appimage.test.mjs` fixtures to `bun@1.4.4`.
- Updated `verify-linux-appimage.mjs` to filter foreign platform `@oh-my-pi/pi-natives-*` addon binaries similarly to ONNX and prebuilds.
- Ran `bun run electron:build`, verified `resources/agent-runtime/manifest.json`, `verify:agent-runtime`, and `verify:linux-appimage` (AppImage sha256: `df687bee0a54b4a8a72465fb04f1385a5128c288b0ea8b09f9bb9f9fca741e90`).
- Executed native AppImage launch under Xvfb via `/dev/fuse` against isolated HOME and OPENCHAMBER_DATA_DIR (`/home/shizuku/Project/ohpichamber-omp-artifacts/m5-c-2026-11-06/data`), sourced real-provider configuration without logging secrets, verified `/api/agent/v1/ready` returned 200 `{ ready: true, engine: "omp", version: "1.0.0" }`, completed a real-provider prompt turn returning `"M5-C Linux Electron verification successful"`, verified Guest SDK v2 panel loading and private MessagePort bootstrap (`openchamber.guest-bootstrap` v2), and cleanly terminated the AppImage process tree.

- **Check after:**
- `bun run --cwd packages/electron test:architecture` -> 72 tests passed (0 failures)
- `bun run --cwd packages/electron test:updater` -> 22 tests passed (0 failures)
- `bun run --cwd packages/electron type-check` -> exit 0
- `bunx oxlint packages/electron/scripts/...` -> 0 warnings, 0 errors
- `bun run --cwd packages/electron verify:agent-runtime` -> exit 0, Bun 1.4.4, 156 packages, readiness `{"ready":true,"engine":"omp","version":"1.0.0"}`
- `bun run --cwd packages/electron verify:linux-appimage` -> exit 0, Bun 1.4.4, 156 packages, 24 Host native modules
- Real-provider prompt receipt and Guest SDK v2 receipts recorded in `/home/shizuku/Project/ohpichamber-omp-artifacts/m5-c-2026-11-06/smoke-receipts.json`.
- `.workflow/bin/workflow validate` passed.
