# Closeout: m5-release-surfaces

**Status:** Completed
**Closed:** 2026-11-06

## Shipped

Comprehensive packaging adaptation, OpenCode build removal, and runtime bundling across all five core release surfaces (W1–W5) and six constituent tasks (`01`, `04`, `06`, `07`, `08`, and `10`). All tasks are completed, verified, and archived under `.workflow/done/m5-release-surfaces/`. Root workspace gates passed with zero errors (`bun install --frozen-lockfile`, `bun run type-check`, `bun run lint`, `bun run docs:validate`, and `bun run test` 7/7 suites passed across all packages including full `packages/web` Vitest; `bun run dead-code` verified with zero net-new findings against inherited baseline). Real-path runtime smokes were executed with real provider `CLIProxyAPI/gemini-3.5-flash-lite` across standalone `@openchamber/web` and Linux x64 Electron AppImage under isolated environments.

### Key Capabilities Shipped

- **CI & Build Workflows (W1, Task 01):** Removed all legacy `opencodeCli`, `prepare:opencode-cli`, `verify:opencode-cli`, and `vscode` targets across all 8 GitHub workflow manifests. Pinned `bun-version: 1.4.4` and `node-version: 24` across all workflows. Made macOS/Windows/iOS/Android code-signing strictly optional so clean unsigned/ad-hoc builds succeed without secrets.
- **Docker Packaging & OMP 18.16.0 (W4, Task 06):** Updated `Dockerfile`, `docker-compose.yml`, and `scripts/docker-entrypoint.sh` to `oven/bun:1.4.4`, `vendor/omp/650f3a10`, all 17 workspace manifests, and `~/.omp` data volumes with 0 legacy OpenCode remnants.
- **npm Standalone Distribution (W2, Task 07):** Packaged `@openchamber/web` standalone tarball with per-platform bundled Agent Runtime (`bun 1.4.4`, `agent-service` dist, and 156 packages). Pack script preserves working tree `workspace:*` dependencies. Tarball verified in clean isolated npm prefix outside the repository, answers `/api/agent/v1/ready` 200, and completes real-provider prompt runs.
- **Linux x64 Electron AppImage & Guest SDK v2 (W3, Task 04):** Built and verified Linux x64 AppImage (`OpenChamber-3.0.0-linux-x86_64.AppImage`, 802MB) bundling Bun 1.4.4, 156 Agent packages, and 24 Host native modules. Launched natively via `/dev/fuse` under Xvfb with isolated data directory, answered `/api/agent/v1/ready` 200, completed real-provider turn, and verified Guest SDK v2 panel HTML bootstrap script and private MessagePort handshake contract.
- **Isolated Spaces Fail-Closed & Terminal Shutdown (W5, Task 08):** Authoritative `ISOLATED_SPACES_RELEASED = false` fail-closed enforcement verified across space creation, start, restart (repair), and model/login/domain grants before place/container/wait invocation. Removed all legacy `@opencode/*` space files. Resolved terminal shutdown race, passing 10/10 consecutive runs of `shutdown.test.js`.

### W-Check Results (W1–W5)

- **W1 (CI workflows & release matrix):** Pass. All 8 workflow YAMLs parsed with zero errors; `bun@1.4.4` and Node `24` pins verified; optional code signing enabled; zero matches for legacy opencode CLI/vscode targets. Receipt: `w1-static-receipt.txt`.
- **W2 (@openchamber/web standalone tarball):** Pass. Produced standalone tarball `openchamber-web-3.0.0.tgz` (SHA-256: `7c930b1a8a282671a69e7510689568534ce7a039f681fa054c151a67507d141b`), zero `workspace:*` dependencies inside packed tarball, working tree package.json untouched; installed in clean temp prefix `/tmp/m5-final-web-smoke`, launched on port 3945 with isolated data dir; `/api/agent/v1/ready` returned 200 `{ ready: true, engine: "omp", version: "1.0.0" }`; real provider completed prompt with `"PONG"`. Receipt: `w2-clean-prefix-smoke.json`.
- **W3 (Linux x64 Electron AppImage & Guest SDK v2):** Pass. Packaged `OpenChamber-3.0.0-linux-x86_64.AppImage` (SHA-256: `88396a6ea9cbc871e2a145ac206f14a9bcd2f99103e116855937a5426cfe871e`), `verify:agent-runtime` and `verify:linux-appimage` passed. Launched under Xvfb via `/dev/fuse` on port 3945; `/api/agent/v1/ready` returned 200; real-provider completed prompt (`"M5-Gate Linux Electron verification successful"`); Guest SDK v2 panel loaded with bootstrap script and MessagePort contract verified (`channel: "openchamber.guest-bootstrap"`, `version: 2`). Receipt: `smoke-receipts.json`.
- **W4 (Docker manifests & runtime):** Pass. `Dockerfile`, `docker-compose.yml`, and `scripts/docker-entrypoint.sh` use `oven/bun:1.4.4`, `vendor/omp/650f3a10`, 17 workspace manifests, and `~/.omp` volume mounts; 0 matches for legacy opencode remnants. Receipt: `w4-static-receipt.txt`.
- **W5 (Isolated Spaces fail-closed & terminal shutdown):** Pass. Space create/start/repair/grant routes fail-closed with `isolated_spaces_unreleased` (18/18 passed in `release.test.js` and `routes.test.js`); `shutdown.test.js` passed 10/10 consecutive runs with 0 failures. Receipt: `w5-receipt.txt`.

### Full Root Workspace Gates

- `bun install --frozen-lockfile`: exit 0 (1,425 packages installed cleanly).
- `bun run type-check`: exit 0 across 5 projects (3,234 files).
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
