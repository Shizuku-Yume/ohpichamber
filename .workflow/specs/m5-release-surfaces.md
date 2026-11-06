# M5: Packaging adaptation, OpenCode build removal, and runtime bundling

**Status:** done
**Priority:** high
**Integration branch:** m5-release-surfaces/integration

## Parallel lanes

Work runs across four disjoint parallel lanes in `/home/shizuku/Project/ohpichamber-worktrees/m5-{a..d}`, merging into `/home/shizuku/Project/ohpichamber-worktrees/m5-integration` (`m5-release-surfaces/integration`):

| Lane | Worktree | Tasks | Owned files |
|---|---|---|---|
| **Lane A** | `m5-a` | `01` → `06` | `.github/workflows/*.yml`, `Dockerfile`, `docker-compose.yml`, `scripts/docker-entrypoint.sh`, `packages/{electron,mobile,web}/README.md` |
| **Lane B** | `m5-b` | `07` | `packages/web/package.json`, `packages/web/bin/cli.js`, `packages/web/server/lib/host/agent-runtime.js`, `packages/web/scripts/` |
| **Lane C** | `m5-c` | `04` | `packages/electron/package.json`, `packages/electron/scripts/{prepare-agent-runtime,verify-agent-runtime,verify-linux-appimage,package}.mjs`, `packages/electron/main.mjs` |
| **Lane D** | `m5-d` | `08` | `packages/web/server/lib/spaces/`, `packages/ui/src/lib/spaces/release.ts`, `packages/web/server/lib/terminal/shutdown.test.js`, `.workflow/technical-debt.md`, `package.json`, `packages/ui/package.json` |

Task `10` (`10-m5-integration-gate.md`) is claimed by whichever lane finishes last after `01`, `04`, `06`, `07`, and `08` are all archived on `m5-release-surfaces/integration`.

## What this is for

With M0–M4 landing the OMP Agent Service, Canonical API, and TUI feature parity, the repository's packaging, CI workflows, Docker manifests, and standalone npm package still carry broken OpenCode remnants, stale version pins (`Bun 1.4.2` and `vendor/omp/c9de2b02` instead of `bun@1.4.4` and `vendor/omp/650f3a10`), and commercial code-signing blockers. Completing this build, packaging, and cleanup work now gives a clean, runnable artifact pipeline on `main` without interfering with the M6 audit/UI polish round or waiting on final M7 device release testing.

## What it does

- **CI & Build Workflows (Unsigned-Ready):** `.github/workflows/release.yml`, `release-desktop-smoke.yml`, `build-macos-arm64-dmg.yml`, `mobile-release.yml`, and `mobile-ci.yml` remove all `opencodeCli`, `prepare:opencode-cli`, `verify:opencode-cli`, and `vscode` steps, align to `bun@1.4.4` (`package.json#packageManager`) and Node 24, stage the verified OMP `18.16.0` (`vendor/omp/650f3a10`) Agent Runtime across the six native targets (`darwin-arm64`, `darwin-x64`, `win32-x64`, `win32-arm64`, `linux-x64`, `linux-arm64`), and build cleanly **without requiring Apple Developer ID certificates, notarization, TestFlight profiles, or mandatory Windows Authenticode secrets** (signing remains optional when secrets are supplied; unsigned/ad-hoc artifacts are emitted cleanly otherwise).
- **npm Standalone (`@openchamber/web`):** A packed `@openchamber/web` tarball bundles the per-platform staged Agent Runtime (`bun@1.4.4`, `agent-service` dist, and platform `pi-natives`), contains zero `workspace:*` or private package dependencies, installs into a clean prefix, and starts both the Host and OMP Agent Service.
- **Linux x64 Electron AppImage & Guest SDK `v2`:** Local `electron:build` produces a verified Linux x64 AppImage with staged `resources/agent-runtime`, launches via `/dev/fuse`, answers `/api/agent/v1/ready` with 200, completes a real-provider prompt, and loads a Guest SDK `v2` panel.
- **Docker & Compose OMP Rewrite:** `Dockerfile`, `docker-compose.yml`, and `scripts/docker-entrypoint.sh` copy the current `vendor/omp/650f3a10` closure and all workspace manifests (`packages/*` and `packages/sdk/examples/*`), replace `./data/opencode/*` mounts with `~/.omp` and retained OpenChamber paths, and remove all OpenCode CLI / `OPENCODE_*` references. (Live container execution is deferred until Docker is provisioned locally or in M7.)
- **Isolated Spaces Gate & Repo Cleanup:** `ISOLATED_SPACES_RELEASED = false` fails closed across create, start, repair, and grant routes before any container/place call with zero `@opencode/*` remnants; root/workspace manifests and READMEs drop stale OpenCode descriptions; and `terminal/shutdown.test.js` fixes its 100 ms SIGTERM timing race so unattended full-gate runs stay deterministic.

## How it is built

- Reuse `packages/electron/scripts/prepare-agent-runtime.mjs` and `verify-agent-runtime.mjs` as the single Agent Runtime staging and hash-verification recipe across Electron and `@openchamber/web` (no second runtime bundler).
- Keep `@openchamber/agent-service`, `@openchamber/agent-contract`, and vendored OMP tarballs private (`private: true`), never published to npm.
- Make code signing conditional in workflow definitions and Electron/Mobile build configs (`CSC_IDENTITY_AUTO_DISCOVERY=false` / unsigned DMG, ZIP, NSIS, APK, and ad-hoc/unsigned iOS build outputs when signing secrets are absent; `verifyUpdateCodeSignature` disabled when unsigned) so builds never fail over Apple or Windows certificates.
- Document unsigned installation clearly in `packages/electron/README.md`, `packages/mobile/README.md`, and `packages/web/README.md` (including macOS Gatekeeper `xattr -cr` and sideloading notes).

## What it must not do

- Block builds or milestones on Apple Developer ID signing, `xcrun notarytool`/`stapler`, TestFlight, or commercial Authenticode certificates.
- Claim macOS, Windows, Android, or live Docker runtime execution that has not been run yet (real-device and cross-OS runtime testing belongs to M7 `m7-release-verification` after M6 polish).
- Publish `@openchamber/agent-service`, `@openchamber/agent-contract`, or vendored OMP packages to npm, or push/release to GitHub/registries without explicit maintainer instruction.
- Reintroduce any OpenCode CLI, fallback engine, or VS Code extension target, or edit `changelog/`.

## How we will know it works

- **W1 (Workflows & Unsigned Matrix).** `.github/workflows/release.yml`, `release-desktop-smoke.yml`, `build-macos-arm64-dmg.yml`, `mobile-release.yml`, and `mobile-ci.yml` parse cleanly, pin `bun@1.4.4` and Node 24, stage the Agent Runtime for the six native targets, allow unsigned builds when signing secrets are absent, and `grep -nE 'opencodeCli|prepare:opencode-cli|verify:opencode-cli|vscode'` across `.github/workflows/*.yml` returns zero release targets or script invocations.
- **W2 (`@openchamber/web` Standalone Tarball).** Staging the web runtime and running `bun pm pack` in `packages/web` produces a tarball with `manifest.json`, `bun` (`1.4.4`), `agent-service` dist, and `pi-natives-linux-x64`, zero `workspace:*` dependencies, and `verifyAgentPayload` passes. Installing the tarball into a clean temp prefix outside the repo starts `openchamber`, returns 200 on `/api/agent/v1/ready`, and completes a real-provider prompt.
- **W3 (Linux x64 Electron AppImage & Guest `v2` Smoke).** `bun run electron:build` on Linux x64 stages and verifies `resources/agent-runtime`, passes `verify:linux-appimage`, launches the packaged AppImage via `/dev/fuse`, returns 200 on `/api/agent/v1/ready`, completes a real-provider prompt, and renders a Guest SDK `v2` panel without error.
- **W4 (Docker & Compose OMP Rewrite).** `Dockerfile` references `oven/bun:1.4.4`, `vendor/omp/650f3a10`, and all workspace `package.json` manifests declared in root `workspaces`; `docker-compose.yml` mounts `~/.omp` and retained OpenChamber directories with zero `opencode` volumes; and `grep -rnE 'c9de2b02|opencode|OH_MY_OPENCODE' Dockerfile docker-compose.yml scripts/docker-entrypoint.sh` returns no stale runtime or mount references.
- **W5 (Isolated Spaces Fail-Closed & Repo Hygiene).** Starting the Host with `ISOLATED_SPACES_RELEASED = false` rejects space create, start, repair, and grant routes before any place/container call; zero `@opencode/*` space runtime/proxy files remain; `packages/web/server/lib/terminal/shutdown.test.js` passes reliably under load without the 100 ms SIGTERM race; and `.workflow/bin/workflow validate`, `bun run type-check`, `bun run lint`, and `bun run test` exit 0.
