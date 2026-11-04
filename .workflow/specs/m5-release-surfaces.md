# M5: Release and retained surfaces

**Status:** proposed
**Priority:** high

## What this is for

The M3 migration executes OpenChamber through the OMP Agent Service, but no retained surface has release evidence. The inherited release workflow could not build after the OpenCode scripts were removed, only Linux x64 has a staged Agent Runtime, there is no runnable Docker or standalone npm path, and Capacitor has never been driven on a device. The old M5 list mixed real prerequisites with capabilities and did not say which platform matrix is actually supported, so a release cannot be certified and a support claim cannot be checked.

Without this effort, the project can build a development tree but cannot say which artifacts a user may install, or prove that those artifacts start the Canonical Server and Agent Service without OpenCode.

## What it does

A maintainer can take one commit, build one release candidate, and install it on every retained target:

- Electron desktop: signed and notarized macOS arm64 and x64, signed Windows x64 and arm64, and Linux x64 and arm64 AppImages. Each launches its embedded Host Gateway and Agent Service, answers `/api/agent/v1/ready` with 200, and completes a chat through a real provider.
- Capacitor mobile: a signed Android build on a physical Pixel 8 running Android 15/API 35 arm64-v8a and a signed iOS build on a physical iPhone running iOS 26 through TestFlight. Each pairs with a Host, runs a canonical chat, reconnects after a network drop, recovers an approval or question, routes a push-click to its session, and queues a message sent offline.
- Docker: the image starts the Host and Agent Service on linux/amd64 and linux/arm64, without the OpenCode CLI, and `docker compose` starts the documented volumes.
- npm standalone: a packed `@openchamber/web` tarball installs into a clean prefix and starts the Host and Agent Service with no private workspace dependency, using the bundled per-platform Agent Runtime.
- Isolated spaces: remain unreleased. The server refuses create, start, repair and model/login grants before a container or place call, and no OpenCode runtime, config, credential row or proxy is present.

The release notes and product docs describe exactly the matrix that has evidence, and name every target that remains unverified. A target without a real runner, device or container result is not released.

## How it is built

### Authorities and matrix

`scope.md` owns the retained product surfaces: Web/PWA, Electron Desktop, Mobile (Capacitor) and the Guest SDK. This spec owns the release matrix that certifies them.

The maintained OS/architecture matrix is the six native targets the maintainer approved when choosing task 29's source-build route: macOS arm64, macOS x64, Windows x64, Windows arm64, Linux x64 and Linux arm64. That route builds and vendors the leaves; a target is certified only after those leaves exist and its artifact passes. VS Code and OpenCode are neither surfaces nor certification rows. An inherited job or target with no row below is removed or explicitly disabled, not kept as an untested extra.

| Surface | Target | Runner / device | Toolchain and signing |
|---|---|---|---|
| Electron | macOS arm64 | `blacksmith-6vcpu-macos-26` | Runner Xcode 26; Apple Developer ID certificate; hardened runtime; notarization with `APPLE_ID` / `APPLE_APP_SPECIFIC_PASSWORD` / `APPLE_TEAM_ID` |
| Electron | macOS x64 | `macos-15-intel` | Runner Xcode 16; same Apple signing and notarization |
| Electron | Windows x64 | `windows-2022` | Visual Studio 2022 C++ build tools; NSIS; Authenticode PFX via `WINDOWS_CSC_LINK` and `WINDOWS_CSC_KEY_PASSWORD`; updater signature verification on |
| Electron | Windows arm64 | `windows-2022` build; Windows 11 arm64 VM for install and launch | Same NSIS and Authenticode path; no x64 emulation for the certification run |
| Electron | Linux x64 | `blacksmith-4vcpu-ubuntu-2404` | Bun 1.4.2, Node 24, FUSE/libfuse2 for AppImage (or `APPIMAGE_EXTRACT_AND_RUN=1` as the named stand-in) |
| Electron | Linux arm64 | `blacksmith-4vcpu-ubuntu-2404-arm` | Same, native arm64 host |
| Mobile | Android | `blacksmith-4vcpu-ubuntu-2404` build; physical Pixel 8, Android 15/API 35, arm64-v8a device for certification | Temurin JDK 21; Android SDK platform 35 and build-tools 35.0.0; `adb` over USB; signed APK and AAB |
| Mobile | iOS | `blacksmith-6vcpu-macos-26` build; physical iPhone, iOS 26, TestFlight for certification | Xcode 26 with iOS 26 SDK; Apple Distribution certificate and three provisioning profiles; TestFlight install; `xcrun devicectl` for logs |
| Docker | linux/amd64, linux/arm64 | Linux x64 and native arm64 hosts with Docker Engine 28 and BuildKit | `oven/bun:1.4.2` base; buildx; `docker compose` |
| npm | Linux x64 (additional OS/arch rows only after their own runner install) | Linux x64 host; the matching runner for any additional row | Node 24.14+ for the Host; Bun 1.4.2 for the Agent Service; clean npm prefix; per-platform bundled Agent Runtime |

Bun 1.4.2 and Node 24 are pinned by the repository and every runner uses those versions. A job that cannot get its target runner fails loudly; it does not fall back to a different architecture or an emulated binary without naming it.

### Release candidate

A release candidate is one commit and one version, built by the retained release workflows with the maintainer's permission: `.github/workflows/release.yml` for the Electron matrix, `.github/workflows/mobile-release.yml` for mobile, and the Docker and npm jobs added by their surface tasks. One receipt joins the runs and names the candidate commit, each runner or device, each artifact hash and each surface result.

Every packaging job stages the Agent Runtime before packaging, verifies the payload against its `manifest.json`, and packages no OpenCode CLI. `release-desktop-smoke.yml`, `build-macos-arm64-dmg.yml` and `mobile-release.yml` may be exercised directly for a focused failure, but a release claim comes only from the candidate runs.

### Surface boundaries

- **Electron.** The packaged app starts the bundled Agent Runtime with its own Bun binary, not a host Bun install. Each platform verifies signature and update metadata in addition to launch and chat. macOS notarization uses `xcrun notarytool`; Windows uses Authenticode and `verifyUpdateCodeSignature: true`; Linux verifies both `latest-linux.yml` and `latest-linux-arm64.yml`.
- **Mobile.** The shell bundles the mobile Web UI and connects to a Host; it does not embed the server or Agent Service. Certification covers pairing, canonical streaming, reconnect, approval/question recovery, push-click routing and offline queue. A simulator or emulator result is a named stand-in, not a device result.
- **Docker.** The image contains the Host, the built Agent Service and the pinned native leaves for its target. It starts as the `openchamber` user and binds `0.0.0.0` only because the entrypoint requires UI authentication. `docker-compose.yml` mounts only the retained OpenChamber config and workspace paths; inherited `data/opencode` mounts are removed.
- **npm standalone.** `@openchamber/web` ships the built Host and a per-platform Agent Runtime payload. Private `@openchamber/agent-service` and `@openchamber/agent-contract` packages are not published as a prerequisite, and the published `package.json` contains no `workspace:*` dependency. The Host resolves the bundled runtime before a workspace development path.
- **Isolated spaces.** No space runtime is built or released in M5. `post-m3-hardening/38` owns the OpenCode removal and the server release gate. This effort proves the gate and keeps the feature unreleased.
- **Guest SDK.** The release candidate publishes the SDK version decided in `decisions.md: 2026-10-24 - Break the Guest SDK version for the private bootstrap transport`, and a packaged Electron smoke loads a Guest panel through the `v2` bootstrap. No mobile Guest runtime is claimed.

Failure behavior is explicit: a missing signing secret, target leaf, runner, device or container host fails the certification row and leaves it unreleased. It never substitutes a different artifact for the row.

### Evidence

A receipt names the candidate commit, runner image or device model and OS build, toolchain versions, command, artifact hashes, and pass/fail/not-run. GitHub Actions logs, `codesign`/`stapler`, `signtool`, `adb`/`devicectl`, `docker inspect` and `/api/agent/v1/ready` output are retained under `/home/shizuku/Project/ohpichamber-omp-artifacts/m5-<date>/`. A local static check may support a row but never replaces the runner or device result.

## What it must not do

- Claim macOS, Windows, mobile-device, Docker or GitHub Actions results that were not run on that target. The stand-in is named in the receipt and the row stays unverified.
- Reuse the inherited release matrix as if it were the retained one. There is no VS Code extension or OpenCode runtime row.
- Publish `@openchamber/agent-service`, `@openchamber/agent-contract` or the vendored OMP packages to npm. The settled answer is to bundle the runtime into `@openchamber/web`.
- Rebuild isolated spaces on OMP in this effort, or make an unreleased space reachable while it has no agent runtime.
- Add a fallback engine, a compatibility alias or a second release path to make a target pass.
- Push to a registry, create a GitHub release, call GitHub APIs or use the network without the maintainer's explicit permission. Building a release candidate locally is not permission to publish it.
- Run a full release candidate as a substitute for the focused checks its tasks own. The candidate gate runs once, after the surfaces pass.
- Edit `changelog/`.

## What was considered and rejected

- **Certify the inherited upstream matrix as-is.** It is convenient and already wired in the workflows, but it includes OpenCode CLI preparation and the retired VS Code extension, and it treats every historical target as supported without the maintainer's native-leaf decision. The retained matrix comes from the surfaces and the six approved leaves instead.
- **Release mobile after simulator or emulator checks.** The simulator proves rendering and build wiring, not pairing, push delivery or reconnect on a phone. Those are the behaviors the mobile row exists to certify.
- **Publish the Agent Service and OMP closure.** Publishing would put the fork's private OMP tarballs under third-party package names and make npm ownership part of the release. Bundling the verified Electron runtime keeps the dependency closure inside the artifact.
- **Drop npm standalone and send every Web/PWA user to Docker.** Docker is the simpler server path, but the current product documentation and the public `@openchamber/web` package both present a global install, and the maintainer chose to keep that path by bundling the verified runtime.
- **Build isolated spaces' OMP runtime in M5.** The source inventory in `post-m3-hardening/08` showed a second Agent Service boundary, new distribution, supervision, grants and escape evidence. The maintainer kept spaces unreleased; that work remains a separate effort.
- **Certify only Linux x64 because it is the only reachable host.** It would make the release claim smaller than the product matrix and leave Windows/macOS users with untested artifacts.
- **Build the five missing native leaves inside the release jobs.** Task 29 builds and pins them from source. Release jobs consume the vendored result, so a release failure cannot silently change the runtime identity.

## How we will know it works

- **R1.** The retained matrix exists in one table, and the docs and task `Covers` agree with it: Electron macOS arm64/x64, Windows x64/arm64, Linux x64/arm64; mobile iOS/Android; Docker linux/amd64 and linux/arm64; npm Linux x64 with further rows only after their own runner evidence; isolated spaces excluded. `.github/workflows/release.yml` has exactly the six Electron rows and names the mobile workflow; the Docker and npm jobs are added by their surface tasks, not invented here. An inventory check over the workflow and docs reports exactly that set, and `.workflow/bin/workflow validate` passes.
- **R2.** One release candidate from a single commit produces every artifact in R1 through the retained workflows: `release.yml` for Electron, `mobile-release.yml` for mobile, and the Docker/npm jobs added by their tasks. Every packaging job stages and verifies the Agent Runtime, no job runs a removed OpenCode script, and the artifact inventory lists each file with its hash. This is a real GitHub Actions run with the maintainer's permission; without it the check is `not run`.
- **R3.** The macOS arm64 and x64 candidate artifacts pass `codesign -vv --deep --strict`, contain the hardened runtime and required entitlements, pass `xcrun stapler validate`, launch from the DMG, answer `/api/agent/v1/ready` with 200, and complete a prompt through a real provider. Each architecture's update manifest matches its artifact.
- **R4.** The Windows x64 and arm64 installers pass `signtool verify /pa`; `verifyUpdateCodeSignature` is true; the x64 installer installs and launches on `windows-2022`, and the arm64 installer installs and launches on a Windows 11 arm64 VM. Both answer ready with 200 and complete a prompt.
- **R5.** Both Linux AppImages launch on their native architectures, answer ready with 200, complete a prompt, and produce separate x64 and arm64 update manifests. A FUSE-free run is recorded as `APPIMAGE_EXTRACT_AND_RUN=1`, not as a normal launch.
- **R6.** The signed Android build installs on the named physical Pixel 8 (Android 15/API 35, arm64-v8a) and the signed iOS build installs through TestFlight on the named physical iPhone running iOS 26. Each pairs, runs a canonical chat, reconnects after a network drop, recovers an approval or question, routes a push-click to the right session, and queues an offline message. A simulator or emulator result does not close the check.
- **R7.** The Docker image runs on linux/amd64 and linux/arm64: each architecture is built and loaded on its native host, `/api/agent/v1/ready` returns 200, a prompt completes, and the image contains no OpenCode CLI, `oh-my-opencode` or `OPENCODE_*` handling. The release candidate uploads an OCI artifact and digest per architecture without a registry push. `docker compose config` shows no inherited `opencode` volume.
- **R8.** The packed `@openchamber/web` tarball installs into a clean prefix with Node 24.14+ and Bun 1.4.2, contains no `workspace:*` dependency, starts the Host and bundled Agent Runtime, answers ready with 200, and completes a prompt. The Linux x64 row is mandatory; another OS/arch row joins the matrix only after its own runner installs the tarball and passes the same check.
- **R9.** With the isolated-spaces release gate false, create, start, repair and model/login grant requests fail before a place or container call, `ISOLATED_SPACES_RELEASED` is false, and no `@opencode/*` runtime, `opencode.json`, credential row, engine readiness check or proxy remains. The retained container, gatekeeper, code-transfer and preview paths remain.
- **R10.** The candidate gate has evidence for every row in R1. The mobile row is not waived: the question 3 decision requires physical-device certification before release. Any other row without evidence is `not run` and keeps the release blocked; removing or deferring a row requires a new recorded decision and a matrix change first. Guest SDK publish and the packaged `v2` Guest smoke pass. The release docs and product docs describe only the certified rows and label every unverified row. No check is reported as passed from a fixture, source read or local Linux-only run.

The main use is R2 through R10 on the candidate commit: build the matrix, install each artifact, start the real Host and Agent Runtime, and complete a real provider prompt on each target. R1 and R9 use focused commands; everything that depends on a runner, device or container is run there rather than inferred.

## Settled decisions

- **Question 3 - Mobile stays in the matrix.** Capacitor mobile is a supported surface. Release is blocked until physical Pixel 8 (Android 15/API 35, arm64-v8a) and physical iPhone (iOS 26, TestFlight) certification passes. Decision: `decisions.md: 2026-10-24 - Keep Capacitor mobile in the M5 release matrix`.
- **Question 6 - Bundle npm standalone.** `@openchamber/web` carries a per-platform Agent Runtime built from the same staged payload Electron verifies; the Agent Service, Contract and vendored OMP packages stay private. Decision: `decisions.md: 2026-10-24 - Bundle the Agent Runtime into @openchamber/web`.

## Open questions

None. The two questions that blocked task 26 were settled on 2026-10-24.

## Notes

Inputs: `/home/shizuku/Project/ohpichamber-omp-artifacts/post-m3-review-2026-10-23/PlanGapAnalysis.md` findings 1, 3 and 8, `SurfacesReview.md` findings 2-5 and 12, `post-m3-hardening` tasks 08, 11-15 and 29, and the task 26 record. Prerequisites not owned by this effort are `post-m3-hardening/13` (non-Linux process-tree cleanup), `29` (six native leaves) and `38` (OpenCode space-runtime removal). The docs truth task 24 already labels the current mobile and npm behavior as unverified; this effort replaces those labels with evidence or an explicit removal.

The implementation plan's M5 section points here for the surface breakdown and keeps the milestone order; it does not duplicate this matrix.
