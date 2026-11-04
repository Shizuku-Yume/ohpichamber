# Pinned OMP package inputs

These archives come from OMP revision `650f3a108229ee11bf68ba3377f4e8c3391cd424`, verified against the npm SLSA provenance payload for `@oh-my-pi/pi-coding-agent@18.16.0`.

`copy-manifest.json` records each repository-relative input, SHA-256 and size, with the immutable artifact-set identity. The 13 first-party archives include their licenses and native notices. Keep their bytes unchanged. Root package overrides select these local archives; installation and runtime resolution must not depend on the original source checkout or artifact custody directory.

`dependency-owners.json` records the 225 version-scoped parent/dependency bindings derived from the pinned 18.16.0 installed SDK consumer. They preserve the SDK closure without globally replacing application dependency versions. Root `bun.lock` records the resolved graph; use `bun install --frozen-lockfile --ignore-scripts` for reproduction.

The retained `@ark/schema@0.56.2` and `puppeteer-core@25.3.0` patches and the explicit application SDK patch `@oh-my-pi/pi-coding-agent@vendor/omp/650f3a10/tarballs/oh-my-pi-pi-coding-agent-18.16.0.tgz` (`patches/@oh-my-pi%2Fpi-coding-agent@vendor%2Fomp%2F650f3a10%2Ftarballs%2Foh-my-pi-pi-coding-agent-18.16.0.tgz.patch`, committed with `bun patch --commit --ignore-scripts`) are applied through root `patchedDependencies`. The 13 tarball bytes remain unchanged; this is an explicit installed-SDK source delta, not a new same-version source identity or M0 proof. The patch modifies only `src/sdk.ts`, `src/async/job-manager.ts` and `src/tools/bash.ts`: `CreateAgentSessionOptions` adds optional `initialModelRefreshStrategy?: ModelRefreshStrategy` (applied at the `createAgentSessionScoped` line-3195 `resolveModelDiscoveryFallback` call with default `"online-if-uncached"` unchanged and later explicit `ModelRegistry` discovery untouched), `AsyncJobManager` exports `BashJobEvent` (`started` with `jobId` and private `sessionKey`; `chunk` with the raw executor string; `finished` with `exitCode`, `cancelled` and `timedOut`) and per-manager `observeBashJobs` subscription/unsubscribe without global monkey-patching or new factory child plumbing, and `BashTool` publishes unclipped executor chunks and raw terminal flags through that root-shared manager (including native child jobs) while canonical ended publication still awaits the native job promise. M0 evidence remains reusable only for unchanged SDK owners; the modified initial factory refresh fallback and native Bash paths must be re-proven in the mandatory M2 canonical HTTP scenarios. The Linux x64 native archive is included. Non-Linux native execution and equivalence to a native source build remain unverified.

The service's `src/sdk-assets.d.ts` copies the pinned source's asset declarations (`types/assets/index.d.ts`, SHA-256 `bf20c22cdf85a50009831eb6b8fb097286557ac6ba5bddd2c519aca26e51842e`). Its TypeScript configuration uses the SDK's ES2024/Bun settings; these declarations describe text imports, not a replacement SDK API.

## Reproducing this pin

This is the measured runbook recipe, not a claim of hermetic or two-build reproducibility. It needs network access to fetch the source archive and the locked third-party packages; use it only with the maintainer's permission. The pinned input is a SHA-addressed codeload archive without Git history, so the recorded revision and hashes are the identity.

**Verify identity first.** Revision `650f3a108229ee11bf68ba3377f4e8c3391cd424`; source archive SHA-256 `5988bc63bae01f242138333572e45551ced2cea602656ff225ac5bfab6f92821`. Reject an archive whose hashes differ.

**Prerequisites.** Bun `1.4.4`, Node for the source scripts, a disposable copy of the source excluding `.git` and `node_modules`, and a fresh HOME/XDG/TMPDIR/cache root. Never mutate the retained source. `<RETAINED>` is an absolute artifact directory.

**Native addons in 18.16.0.** The source snapshot contains no prebuilt native binaries. Linux x64 addons staged into `packages/natives/native/` before leaf generation are: `pi_natives.linux-x64-modern.node` = `85b98a2af71467d7f70b476ee4c987dd7d5a52e6d88d904e9c702a7de7ce4838` (the loaded addon) and `pi_natives.linux-x64-baseline.node` = `33ff4e88c1640abb09a481aa9b5eaa87c9b9daed902ee4fb8565a9bd5e20ef3e` (packaged, not loaded). Both are stamped `PI_NATIVES_VERSION_STAMP:18.16.0`. The Linux x64 leaf was packed from source per runbook. The remaining five platform leaves (`darwin-x64`, `darwin-arm64`, `linux-arm64`, `win32-x64`, `win32-arm64`) are official registry packages (`@oh-my-pi/pi-natives-*@18.16.0`) with verified SLSA provenance attestation matching commit `650f3a108229ee11bf68ba3377f4e8c3391cd424`, manifest target `os`/`cpu`, and exact archive SHA-512/SHA-256 digests matching `copy-manifest.json`, accepted per maintainer decision on 2026-11-04 to unlock the M5 release matrix without claiming unrun target-platform runtime certification.

1. **Prepare the disposable source.**
   `bun install --frozen-lockfile --ignore-scripts --filter @oh-my-pi/pi-coding-agent --filter @oh-my-pi/collab-web --filter @oh-my-pi/omp-stats`
2. **Build and pack the 13 packages** into `<RETAINED>/tarballs`:
   `cd <SOURCE> && bun --cwd=packages/natives run gen:npm --tag linux-x64`

   `cd <SOURCE>/packages/natives/npm/linux-x64 && bun pm pack --destination <RETAINED>/tarballs --quiet`

   `cd <SOURCE> && bun -e 'import { prepareNativeCorePackage, applyPublishBin } from "./scripts/ci-release-publish.ts"; await prepareNativeCorePackage("packages/natives", true); await applyPublishBin("packages/coding-agent", true);'`

   Then run this from each package directory in this order: `stats`, `omptype`, `agent`, `ai`, `catalog`, `mnemopi`, `natives`, `tui`, `utils`, `wire`, `snapcompact`, `coding-agent`:

   `cd <SOURCE>/packages/<name> && bun pm pack --destination <RETAINED>/tarballs --quiet`

   `coding-agent` is last because its prepack generates the tool views, stats client embed, docs index and CLI bundle, then resets the stats placeholder.
3. **Check and copy.** Compare every tarball's SHA-256 and size with `copy-manifest.json`, then place them under `vendor/omp/<revision>/tarballs/`. The manifest covers 15 files: the 13 tarballs and the `@ark/schema` and `puppeteer-core` patch inputs. The `@oh-my-pi/pi-coding-agent` patch under `patches/` is application-owned and is not part of that manifest.
4. **Recreate the consumer and lock.** Start from the retained task-24 consumer inputs `/home/shizuku/Project/ohpichamber-omp-artifacts/650f3a10/task24-20261011/inputs/consumer/{package.json,bun.lock,patches}` after rechecking the artifact-set hashes. Install the 12 first-party packages as explicit `file:` dependencies and bind all 13 artifacts as overrides; the Linux x64 leaf arrives through the core package's `optionalDependencies`. In the seeded lock, replace the top-level `workspaces` entry with the consumer root, replace the top-level `overrides` with the consumer overrides (including `"@ark/schema": "0.56.2"` and the 225 owner-scoped entries recorded in `dependency-owners.json`), preserve the source third-party records and both patch files/`patchedDependencies`, replace first-party package records with local artifact records from the initial consumer lock, and remove every `@workspace:` record and catalog metadata. A fresh registry-range install is not acceptable: it drifted on 45 entries before correction in task 24. `bun install --frozen-lockfile --ignore-scripts` must exit 0 without changing the seeded lock.
5. **Wire the application.** Root `package.json` overrides select the 13 local archives; root `patchedDependencies` keeps the two vendor patches and the application SDK patch keyed by the coding-agent tarball path. Update `dependency-owners.json` only from a new installed closure.
6. **Verify.**
   - each manifest destination's SHA-256/size matches `copy-manifest.json`;
   - `bun install --frozen-lockfile --ignore-scripts` at the repository root (locked third-party packages need registry access; record the offline limit);
   - `bun run --cwd packages/agent-service test` (the package script supplies `--timeout 15000`; plain `bun test` uses a shorter default that the credential-reopen tests exceed), or `bun run test` for the full gate, and the packaged Desktop path: `prepare:agent-runtime`, `verify:agent-runtime`, then `verify:agent-runtime "<packaged resources>"` and `verify:linux-appimage` when packaging;
   - retain the new artifact set read-only (`0444` files, `0555` directories), record its artifact-set SHA-256, and keep the exact source/consumer lock and patch inputs.

## Bumping the pin

1. Obtain the new revision and archive with the maintainer's permission; record the revision, archive SHA-256, authored fingerprint, source lock SHA-256 and acquisition method (the GitHub API returned HTTP 403 for the current acquisition; the Atom feed plus codeload supplied the revision and archive).
2. Choose a native target host for the 13-package build. A new native leaf needs its target host and leaf source; Linux arm64 and the non-Linux leaves are task 29's scope (`29-vendor-native-leaves.md`).
3. Rebuild the 13 packages, then write the new `copy-manifest.json` (revision, destinations, SHA-256/size, artifact-set identity) before copying or comparing anything; the old manifest covers the old pin only. Regenerate `dependency-owners.json` from the new installed closure and replace the whole `vendor/omp/<revision>/` directory, including patches.
4. Migrate every application binding together: the 13 root `overrides` (12 archives plus the native leaf), the 12 explicit `file:` dependencies in `packages/agent-service/package.json`, both vendor patch paths plus the coding-agent SDK patch key in root `patchedDependencies`, and the 225 owner-scoped `@oh-my-pi/...@<version>>...` overrides that mirror `dependency-owners.json`. Then re-resolve `bun.lock`.
5. Rerun the checks above: the Agent Service suite, the full root gate, packaged-resource verification and the Linux AppImage verification when packaging, plus Agent Runtime readiness. Record the exact revisions, hashes and any stand-in.
6. Update the spec/development record. Do not claim two-build reproducibility, an offline mirror or native source-build equivalence without a measured receipt.
