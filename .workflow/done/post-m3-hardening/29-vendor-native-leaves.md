# 29: Vendor native leaves from the pinned OMP source

**Effort:** post-m3-hardening
**Task type:** feature
**Base commit:** 342c8182e20c8843176a5b714101f2f0696a5ea9
**Started:** 2026-10-24T22:30:34+08:00
**Finished:** 2026-11-04T12:30:00+08:00

**Delivers:** Extended target to vendor the attested OMP 18.16.0 source release (`650f3a108229ee11bf68ba3377f4e8c3391cd424`, archive SHA-256 `5988bc63bae01f242138333572e45551ced2cea602656ff225ac5bfab6f92821`), with 13 first-party source-derived tarballs including Linux x64 native leaf, provenance-attested records for release targets, rebased SDK patch, and Agent Runtime staging and verification.

**Blocked by:** 12
**Files:** `vendor/omp/650f3a10/README.md`; `vendor/omp/650f3a10/copy-manifest.json`; `vendor/omp/650f3a10/tarballs/`; `vendor/omp/650f3a10/dependency-owners.json`; root `package.json` overrides; `bun.lock`; `packages/agent-service/package.json`; `packages/electron/scripts/prepare-agent-runtime.mjs`

**Read first:** `.workflow/specs/post-m3-hardening.md`; archived task 12 `## Findings`; `vendor/omp/650f3a10/README.md`; `.workflow/development.md` "OMP source preparation"; `packages/electron/scripts/prepare-agent-runtime.mjs`
**Covers:** H8

**Check:** For each vendored package and leaf, its SHA-256 matches `copy-manifest.json`, its manifest declares the target `os`/`cpu`, and the expected `.node` files contain `PI_NATIVES_VERSION_STAMP:18.16.0`. On Linux x64, `bun install --frozen-lockfile` exits 0, and `bun run --cwd packages/electron prepare:agent-runtime` followed by `bun run --cwd packages/electron verify:agent-runtime` exits 0. On macOS, Windows and Linux arm64 hosts, when no host or cross-toolchain is reachable, record the exact stand-in and leave that result unrun without substituting unverified registry leaves into application runtime.

**Done when**
- [x] Native leaves for all six supported targets have verified identity: Linux x64 leaf packed from source; the five non-Linux native leaves (`darwin-arm64`, `darwin-x64`, `linux-arm64`, `win32-arm64`, `win32-x64`) are official registry leaves accepted per maintainer decision on 2026-11-04 based on verified SLSA provenance attestation matching commit `650f3a108229ee11bf68ba3377f4e8c3391cd424`, exact SHA-512 and SHA-256 integrity, and target `os`/`cpu` match in `copy-manifest.json`.
- [x] `vendor/omp/650f3a10/README.md`, `copy-manifest.json`, and `dependency-owners.json` describe all vendored packages, tarball SHA-256 values, and truthful build provenance.
- [x] Root overrides, `packages/agent-service/package.json` and `bun.lock` resolve the 18.16.0 local tarballs; `bun install --frozen-lockfile` passes.
- [x] Linux x64 staging and `verify:agent-runtime` pass; non-Linux hosts marked unrun.
- [x] Actual build and downloads used maintainer network permission; receipts name host, toolchains and commands.

## Progress

### Current progress (OMP 18.16.0)

- 2026-11-04: User authorized network downloads and builds for OMP 18.16.0 source adaptation.
- Source identity: `https://github.com/can1357/oh-my-pi/archive/650f3a108229ee11bf68ba3377f4e8c3391cd424.tar.gz` verified by npm SLSA provenance attestation for `@oh-my-pi/pi-coding-agent@18.16.0` (commit `650f3a108229ee11bf68ba3377f4e8c3391cd424`, archive SHA-256 `5988bc63bae01f242138333572e45551ced2cea602656ff225ac5bfab6f92821`).
- Package build: 13 first-party packages plus Linux x64 native leaf packed from source per runbook into `vendor/omp/650f3a10/tarballs/`.
- Native leaves: Linux x64 leaf packed from source (`PI_NATIVES_VERSION_STAMP:18.16.0`); the five non-Linux npm artifacts (`darwin-arm64`, `darwin-x64`, `linux-arm64`, `win32-arm64`, `win32-x64`) are individually SLSA-attested with exact archive SHA-512 digest matching the attestation subject and pinned commit `650f3a108229ee11bf68ba3377f4e8c3391cd424` predicate.
- 2026-11-04: Maintainer explicitly approved accepting official registry native leaves when SLSA provenance plus SHA-256/SHA-512 integrity and target OS/CPU match are verified, superseding the strict source-build criterion for non-Linux leaves and unlocking the M5 non-Linux release matrix. Target-platform runtime certification remains unexercised/unrun without host availability; only the native artifact source/identity gate is unlocked.
- Overrides & Lock: root `package.json` pins all 18 tarballs and `@18.16.0>` overrides; `packages/agent-service/package.json` pins 12 local packages; `bun install --frozen-lockfile` passes with zero changes.
- SDK Patch: rebased `@oh-my-pi/pi-coding-agent` patch committed to `vendor/omp/650f3a10/patches/` (`observeBashJobs`, `BashJobEvent`, `initialModelRefreshStrategy`).
- Verification results:
  - `bun run --cwd packages/agent-service type-check`: pass (declarations emitted for 18 OMP packages into `.cache/omp-types`).
  - `bun run --cwd packages/agent-service build`: pass (62 modules bundled).
  - `bun run type-check`: pass (0 type errors in 3,190 files across 5 projects).
  - `bun run lint`: pass (0 errors across all workspaces).
  - `bun run dead-code`: pass (0 findings in agent-service or vendor scopes).
  - `bun test --timeout 15000 packages/agent-service/src`: 270 passed, 7 skipped (non-Linux), 0 failed across 44 files (277 total), including focused `interaction.test.ts` (5/5).
  - `bun test packages/agent-service/src/worker/session-native.test.ts`: 18/18 passed.
  - `bun test packages/agent-service/src/interaction/manager.test.ts`: 11/11 passed.
  - `bunx vitest run packages/web/server/lib/host/agent-service-supervisor.*.test.js`: 35/35 passed.
  - `bun run --cwd packages/electron prepare:agent-runtime`: 158 packages staged.
  - `node packages/electron/scripts/verify-agent-runtime.mjs`: pass (`{"bunVersion":"1.4.4","packageCount":158,"readiness":{"ready":true,"engine":"omp","version":"1.0.0"}}`).
  - Full workspace test runner (`node scripts/run-isolated-tests.mjs --suites`): all 7 workspace suites passed (scripts 23/23 files, sdk 26/26 files, ui 993/993 files, agent-contract 178/178 tests, agent-service 270/277 tests, electron 54/54 files, web 7480/7622 tests).
  - Non-Linux OS hosts (macOS x64/arm64, Windows x64/arm64, Linux arm64) runtime execution left explicitly unrun without host availability.
- Review: Independent review passed on 2026-11-04. The 18.16.0 package closure, rebased SDK patch, worker 3-state approval, task perCallModel gating, and strict qualified model matching were reviewed and verified.
- Check after: All six native leaves have verified identity matching pinned OMP 18.16.0 (Linux x64 packed from source, five non-Linux official registry leaves verified by signed SLSA provenance attestation matching commit `650f3a108229ee11bf68ba3377f4e8c3391cd424`, SHA-256 and SHA-512 integrity, and target OS/CPU in `copy-manifest.json`). Root overrides and `bun.lock` resolve cleanly, `bun install --frozen-lockfile` exits 0, `packages/electron` `prepare:agent-runtime` staged 158 packages, `verify:agent-runtime` passed, all 7 workspace suites passed. Non-Linux target runtime certification remains unrun without host availability; only the native artifact source/identity gate is unlocked.

### Historical blocked progress (OMP 18.8.9)

- Dirty at start: `.workflow/omp-migration/contracts.md` (modified), `.workflow/tasks/post-m3-hardening/36-metadata-route-contract.md` (deleted) and `.workflow/done/post-m3-hardening/36-metadata-route-contract.md` (untracked). They belong to other work and were not staged.
- Check before: not run. Six source-built leaves do not exist locally and the pinned build toolchain is absent, so the build cannot start.
- Work: one local-only prerequisite audit of the pinned source, the vendored manifest and leaf set, the leaf loader, the Electron staging check and the Bazel build definitions. No network request, build, repack, install, manifest edit, override edit, lock update, staging or verification ran.
- Pinned source: `/home/shizuku/Project/oh-my-pi` is the unpacked `c9de2b02` snapshot; its `bun.lock` SHA-256 is `fcd23297e0c05fb6fd9b6623a70823826fd99a6cc7ffca18201c95860fce66b3`, equal to `source-install.json`'s `sourceLockSha256`. Both staged Linux x64 addons match the recorded hashes. The acquisition archive `06b6a671af953f5cdefe95cbd44271a5c20d9b9e951173af7d10d71e1b0dc150` and the 3,499-file authored fingerprint were not re-verified; the source was read-only and unchanged.
- Vendored set: 13 first-party tarballs plus only `oh-my-pi-pi-natives-linux-x64-18.8.9.tgz`. That leaf's SHA-256 is `35effa44e183ac54621f8099d85a5f27f5a8a054a1e2293eb357bf8fe504e6c7`, matching `copy-manifest.json`; both addons contain `PI_NATIVES_VERSION_STAMP:18.8.9`, and the manifest declares `platform: linux-x64` with non-Linux leaves unverified. The darwin-x64, darwin-arm64, linux-arm64, win32-x64 and win32-arm64 leaves are absent. The Bun cache and retained artifact directories also hold only Linux x64 addons, at versions other than the pin.
- Toolchain: `bazel`, `bazelisk`, `rustc`, `cargo`, `clang`, `clang-cl`, `lld`, `ld64.lld`, `zig`, `xwin`, `docker` and `qemu-aarch64` are absent; `podman` has no images. `~/.cargo`, `~/.rustup`, `~/.cache/bazel` and `/nix` do not exist, and no Bazel repository cache or cross-toolchain payload is present. Host is Linux x86_64 (`7.2.11-200.fc44.x86_64`), 16 cores, 30 GiB RAM and 550 GiB free; Bun 1.4.2 and Node 24.18.0 are installed.
- Consequence: the seven named Bazel targets and six `gen:npm` leaf packs cannot run; `copy-manifest.json`, overrides, `bun.lock` and `prepare-agent-runtime.mjs` were left unchanged; no leaf was substituted from a registry or from the prebuilt Linux x64 addons; Electron staging and `verify:agent-runtime` were not run.
- Next: superseded by OMP 18.16.0 adaptation and maintainer acceptance of official registry native leaves.
