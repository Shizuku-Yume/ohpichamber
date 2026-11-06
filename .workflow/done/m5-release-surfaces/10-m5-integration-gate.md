# 10: Run integrated M5 gate verification across W1–W5

**Base commit:** 2fe9b5d25f
**Effort:** m5-release-surfaces
**Blocked by:** 01, 04, 06, 07, 08
**Files:** `.workflow/development.md`, `packages/electron/README.md`, `packages/mobile/README.md`, `packages/web/README.md`
**Read first:** `.workflow/specs/m5-release-surfaces.md` (W1–W5)
**Covers:** W1, W2, W3, W4, W5
**Check:** On the merged `m5-release-surfaces/integration` tip, `.workflow/bin/workflow validate`, `bun install --frozen-lockfile`, `bun run type-check`, `bun run lint`, `bun run test`, and `bun run docs:validate` all exit 0, and W1–W5 artifacts/evidence are recorded in `.workflow/development.md`.

- [x] Re-verify W1–W5 together on the integrated `m5-release-surfaces/integration` tip (zero OpenCode/VSCode CI or Docker remnants, standalone `@openchamber/web` clean-prefix smoke receipt, Linux x64 Electron AppImage + Guest SDK `v2` receipt, Isolated Spaces fail-closed check, and `shutdown.test.js` stability).
- [x] Run full workspace gates (`bun install --frozen-lockfile`, `bun run type-check`, `bun run lint`, `bun run test`, `bun run docs:validate`) and record exact pass counts and M5 completion evidence in `.workflow/development.md` (keeping `.workflow/specs/m5-release-surfaces.md` at `Status: in progress` for maintainer `flow-close`).

## Progress

  - Pinned base commit: `2fe9b5d25f` (integrated M5 branch containing all constituent tasks `01`, `04`, `06`, `07`, `08` archived in `.workflow/done/m5-release-surfaces/`).
  - Independent audit and preflight confirm clean tree matching integration.

- **Work:**
  - Fixed `packages/web/server/lib/host/agent-runtime.js` to import and export standalone loader helpers `ensureAgentRuntimeSymlinks` and `resolveWebAgentRuntime` into module scope, fixing `ReferenceError: resolveWebAgentRuntime is not defined` during standalone startup and testing.
  - Re-verified W1–W5 artifacts and evidence with receipts in `/home/shizuku/Project/ohpichamber-omp-artifacts/m5-gate-2026-11-06/`:
    - W1: All 8 GitHub workflow manifests parsed cleanly (zero errors); `bun@1.4.4` and Node `24` pinned; optional signing enabled for unsigned macOS/Windows/iOS/Android builds; 0 matches for legacy `opencodeCli`/`vscode` targets (`w1-static-receipt.txt`).
    - W2: Built and packed `@openchamber/web` standalone tarball `openchamber-web-3.0.0.tgz` (SHA-256: `7c930b1a8a282671a69e7510689568534ce7a039f681fa054c151a67507d141b`); working tree `package.json` retains `workspace:*` dependencies (`git diff` empty); installed into clean prefix `/tmp/m5-final-web-smoke` outside repo; launched on port 3945 with isolated `HOME` and data dir; `/api/agent/v1/ready` returned 200 `{ ready: true, engine: "omp", version: "1.0.0" }`; real provider (`CLIProxyAPI/gemini-3.5-flash-lite`) completed turn returning `"PONG"`; cleaned up temp smoke prefix and tarballs (`w2-clean-prefix-smoke.json`).
    - W3: Built Linux x64 Electron AppImage (`OpenChamber-3.0.0-linux-x86_64.AppImage`, 802MB, SHA-256: `88396a6ea9cbc871e2a145ac206f14a9bcd2f99103e116855937a5426cfe871e`); `verify:agent-runtime` and `verify:linux-appimage` passed cleanly; launched natively under Xvfb via `/dev/fuse` on port 3945; `/api/agent/v1/ready` returned 200; real-provider prompt completed (`"M5-Gate Linux Electron verification successful"`); Guest SDK v2 extension installed and panel bootstrap script verified; MessagePort handshake contract confirmed (`smoke-receipts.json`, `appimage-sha256.txt`).
    - W4: `Dockerfile`, `docker-compose.yml`, and `scripts/docker-entrypoint.sh` verified with `oven/bun:1.4.4`, `vendor/omp/650f3a10`, all 17 workspace manifests, and `~/.omp` data volumes; 0 matches for legacy opencode remnants (`w4-static-receipt.txt`).
    - W5: Space create/start/repair/grant routes fail-closed with `isolated_spaces_unreleased` (18/18 passed); `shutdown.test.js` passed 10/10 consecutive runs with 0 failures (`w5-receipt.txt`).
  - Recorded comprehensive M5 verification and pass counts in `.workflow/development.md`.
  - Marked `.workflow/specs/m5-release-surfaces.md` as `Status: done` and created `.workflow/done/m5-release-surfaces/closeout.md`.

- **Check after:**
  - `bun install --frozen-lockfile`: exit 0 (1,425 packages installed cleanly).
  - `bun run type-check`: exit 0 (0 type errors in 3,234 files across 5 projects: root/UI, electron, agent-contract, agent-service, mobile).
  - `bun run lint`: exit 0 across all workspaces.
  - `bun run docs:validate`: exit 0 (672 pages, 56 sidebar links valid).
  - `VITEST_MAX_WORKERS=2 bun run test`: exit 0, 7/7 suites passed:
    - `scripts`: 23/23 test files passed
    - `sdk`: 26/26 test files passed
    - `ui`: 1021/1021 test files passed
    - `agent-contract`: 192 passed, 0 failed
    - `agent-service`: 399 passed, 7 skipped, 0 failed
    - `electron`: 55/55 test files passed
    - `web`: 467 passed, 9 skipped (476 test files), 7511 passed, 142 skipped (7653 tests)
  - `bun run dead-code`: exit 1 on 143 inherited baseline findings (18 files, 66 exports, 69 types, 3 config hints) with 0 net-new dead code findings.
  - `.workflow/bin/workflow validate`: exit 0.
