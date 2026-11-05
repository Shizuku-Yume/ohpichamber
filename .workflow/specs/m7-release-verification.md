# M7: Pragmatic platform verification and release distribution

**Status:** proposed
**Priority:** high

## What this is for

Once M5 has cleaned and adapted the packaging/CI/Docker pipelines and M6 has completed the full-codebase audit, feature restorations, UI design overhaul, and maintainer feedback fixes, OhPiChamber needs one final release verification pass on the actual platforms the maintainer tests and uses—without blocking release on Apple signing/notarization ceremonies or unavailable hardware.

## What it does

- Builds release candidate artifacts from a single post-M6 commit across the configured workflows (`.github/workflows/release.yml` and `.github/workflows/mobile-release.yml`, or local builds where applicable).
- Executes real installation and runtime verification on the four maintainer-tested environments:
  1. **Linux (x64 Electron AppImage & `@openchamber/web` standalone):** Launches embedded Host and OMP Agent Service, answers `/api/agent/v1/ready` with 200, and completes real usage flows.
  2. **Windows (Electron installer / portable build):** Installs and launches on Windows, starts embedded Host and OMP Agent Service, and completes real usage flows.
  3. **Android (Capacitor APK):** Installs on an Android device, pairs with a Host, streams canonical chat, and handles reconnects and approvals.
  4. **Docker (`linux/amd64` on local Docker Engine):** Builds and starts via `Dockerfile` and `docker-compose up -d` on the maintainer's Docker host with `~/.omp` and OpenChamber volumes, answers `/api/agent/v1/ready` with 200, and completes a real-provider chat.
- Emits **unsigned / ad-hoc installable build artifacts** for **Apple targets (macOS arm64/x64 DMG/ZIP and iOS IPA)** from CI so Apple users can download and self-sign / clear quarantine (`xattr -cr`) themselves, with clear installation notes and zero Apple Developer ID / notarization / TestFlight blockers.
- Updates `changelog/unreleased.md` (when explicitly requested by the maintainer at release time) and product install docs to reflect the exact release artifacts.

## How it is built

- Consumes the M5 packaging recipes (`prepare-agent-runtime.mjs`, unsigned-capable `release.yml` / `mobile-release.yml`, `@openchamber/web` runtime bundler, and OMP `Dockerfile` / `docker-compose.yml`) on top of the finalized M6 application tree.
- Requires explicit maintainer authorization before triggering any GitHub Actions workflow dispatch, git push, tag, GitHub release, or npm publish.

## What it must not do

- Require Apple Developer ID certificates, `xcrun notarytool` / `stapler` notarization, TestFlight distribution, or paid Windows EV/Authenticode certificates to pass release.
- Claim runtime verification on macOS or iOS hardware that was only built as an unsigned package.
- Push tags or publish packages without explicit maintainer instruction.

## How we will know it works

- **W1 (Candidate Build Output).** Every target package builds cleanly from one post-M6 commit with staged OMP Agent Runtime verification (`verify:agent-runtime`) and zero OpenCode or VS Code artifacts; macOS and iOS jobs succeed in unsigned build mode.
- **W2 (Linux, Windows, Android & Local Docker Verification).** Real-world installation and end-to-end chat/workbench checks pass on Linux, Windows, Android, and local `docker compose`, recorded with exact commit SHA and artifact hashes.
- **W3 (Release Readiness & Docs).** Install docs clearly state tested platforms (Linux, Windows, Android, Docker) and unsigned self-install instructions for macOS/iOS, and all root workspace gates (`type-check`, `lint`, `test`, `docs:validate`) pass.
