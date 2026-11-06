# 07: Bundle the Agent Runtime into @openchamber/web standalone tarball

**Base commit:** 919b86a34778a0c537a6f9375e1257c40bfafa64
**Effort:** m5-release-surfaces
**Blocked by:** None
**Files:** `packages/web/package.json`, `packages/web/bin/cli.js`, `packages/web/server/lib/host/agent-runtime.js`, `packages/web/scripts/`
**Read first:** `.workflow/specs/m5-release-surfaces.md` (W2); `.workflow/decisions.md` (`2026-10-24 - Bundle the Agent Runtime into @openchamber/web`); `packages/web/server/lib/host/agent-runtime.js`; `packages/electron/scripts/prepare-agent-runtime.mjs`
**Covers:** W2
**Check:** Staging the web runtime with `bun@1.4.4` and Node 24.14+ and running `bun pm pack` in `packages/web` produces a tarball whose `package.json` contains zero `workspace:*` or private `@openchamber/agent-*` dependencies, passes `verifyAgentPayload`, installs into a clean temp prefix outside the repo, starts `openchamber`, answers `/api/agent/v1/ready` with 200, and completes a real-provider prompt.

- [x] Add a web Agent Runtime staging/pack script that reuses `prepare-agent-runtime.mjs` and `verify-agent-runtime.mjs` (no second runtime packer), stripping `workspace:*` and private `@openchamber/agent-service` / `@openchamber/agent-contract` dependencies from the packed manifest while keeping those packages `private: true`.
- [x] Update `packages/web/server/lib/host/agent-runtime.js` and `packages/web/bin/cli.js` so the Host resolves the bundled Agent Runtime payload first before falling back to workspace dev paths.
- [x] Verify clean-prefix installation outside the repository checkout: `openchamber` starts the Host and bundled Agent Service, returns 200 on `/api/agent/v1/ready`, and completes a real-provider prompt.

## Progress

- **Check before:**
- Baseline inspection on branch `m5-release-surfaces/07-npm-standalone` at commit `919b86a34778a0c537a6f9375e1257c40bfafa64`:
  - `packages/web/package.json` had `"@openchamber/agent-contract": "workspace:*"`, `"@openchamber/agent-service": "workspace:*"`, `"@openchamber/sdk": "workspace:*"`.
  - No web Agent Runtime staging or packaging scripts existed under `packages/web/scripts/`.
  - `packages/web/server/lib/host/agent-runtime.js` defaulted `entrypoint` to `import.meta.resolve('@openchamber/agent-service/private-protocol')` and had no bundled runtime detection or link reconstruction.
  - `packages/web/bin/cli.js` did not resolve bundled agent runtime binaries or entrypoint.

- **Work:**
- Added `packages/web/scripts/prepare-agent-runtime.mjs`:
  - Reuses `prepareAgentRuntime` from `packages/electron/scripts/prepare-agent-runtime.mjs` and `verifyAgentPayload` from `packages/electron/scripts/verify-agent-runtime.mjs` (single runtime bundler/verifier, zero forking).
  - Rebuilds `@openchamber/sdk` dist before staging and verifies the staged payload against pinned `bun@1.4.4`.
- Added `packages/web/scripts/standalone-loader.mjs`:
  - Reconstructs missing symlinks within `resources/agent-runtime/` (including `service/node_modules/@openchamber/agent-contract`).
  - Bootstraps local symlinks in `node_modules/@openchamber/` if present.
  - Implements ESM `resolve` hook for `@openchamber/agent-contract`, `@openchamber/agent-service/private-protocol`, and `@openchamber/sdk`.
- Added `packages/web/scripts/prepack.mjs`, `postpack.mjs`, and `pack-standalone.mjs`:
  - `prepack.mjs`: builds built-in extensions, stages runtime, creates backup of `package.json`, strips `workspace:*` dependencies and private `@openchamber/agent-*` packages, bundles `@openchamber/sdk@^3.0.0` via `bundleDependencies: ["@openchamber/sdk"]`, and includes `resources/agent-runtime` and `scripts/standalone-loader.mjs` in `files`.
  - `postpack.mjs`: immediately restores the working tree `package.json` with workspace dependencies; re-packs the `.tgz` with `tar` to preserve relative symlinks and `.npmignore`; validates the packed manifest has zero `workspace:*` and zero `@openchamber/agent-*` entries while verifying private packages remain `private: true`; runs `verifyAgentPayload` on the extracted payload.
- Updated `packages/web/server/lib/host/agent-runtime.js`:
  - Exports `ensureAgentRuntimeSymlinks` and `resolveWebAgentRuntime` (re-exported from `standalone-loader.mjs`).
  - Updates `createHostAgentRuntime` to resolve bundled runtime first before falling back to workspace dev paths.
- Updated `packages/web/bin/cli.js`:
  - Resolves bundled agent runtime at startup and configures `process.env.OHPICHAMBER_BUN` and `process.env.OHPICHAMBER_AGENT_SERVICE_ENTRYPOINT`.
  - Updates `getBunBinary()` to prioritize bundled `bunPath`.
  - Bootstraps standalone loader and sets `NODE_OPTIONS=--import=...` for child processes.
- Added unit tests in `packages/web/server/lib/host/agent-runtime.test.js` (6 tests covering null handling, architecture mismatch, missing files, symlink restoration, and supervisor creation).

- **Check after:**
- `bunx oxlint -c oxlint.config.ts packages/web/bin/cli.js packages/web/server/lib/host/agent-runtime.js packages/web/server/lib/host/agent-runtime.test.js packages/web/scripts/standalone-loader.mjs packages/web/scripts/prepare-agent-runtime.mjs packages/web/scripts/prepack.mjs packages/web/scripts/postpack.mjs packages/web/scripts/pack-standalone.mjs`: 0 errors, 0 warnings.
- `bun run --cwd packages/web test server/lib/host/agent-runtime.test.js`: 6/6 tests passed.
- `bun run --cwd packages/web type-check`: 0 type errors across 1,948 files.
- `bun run --cwd packages/web pack:standalone`:
  - Staged `resources/agent-runtime` with pinned Bun 1.4.4 and 156 packages.
  - Produced tarball `openchamber-web-3.0.0.tgz` (285.43 MB, SHA-256: `1003e7b63e9a91b0c32840d29c94a80659039f9b38fed6f016661320d081b5f4`).
  - Packed manifest verified: zero `workspace:*` dependencies, zero `@openchamber/agent-*` dependencies, `@openchamber/sdk` bundled, private packages verified `private: true`.
  - `verifyAgentPayload` on extracted tarball passed.
  - Working tree `package.json` restored cleanly.
- Clean-prefix smoke test in fresh temp prefix `/tmp/openchamber-clean-smoke-m5-b` outside repository:
  - Installed tarball cleanly via `npm install`: 196 packages added, 0 missing module errors.
  - Tested `openchamber status`: cleanly reported stopped instance.
  - Started `openchamber serve --port 3942` with isolated `HOME` and `OPENCHAMBER_DATA_DIR=/home/shizuku/Project/ohpichamber-omp-artifacts/m5-b-2026-11-06/data`.
  - `GET http://127.0.0.1:3942/api/agent/v1/ready` responded HTTP 200 with `{"ready": true, "engine": "omp", "version": "1.0.0"}`.
  - Created session `238e9475-dd0a-4de5-8c70-104235fe02bd` with real provider `CLIProxyAPI` (`gemini-3.5-flash-lite`) loaded via `~/.config/ohpichamber/omp-m0-provider.env`.
  - Dispatched prompt run `7ff5ded6-588f-43fb-81fe-395a8de045d2` ("Respond with the single word PONG.").
  - Real provider completed turn `d9ec9630-ab54-470b-8eac-9ae481d083a4` with status `completed` and returned text reply `"PONG"` (10,309 total tokens).
  - Server gracefully stopped via SIGTERM, clean prefix removed, repository tarballs removed.
  - Receipt saved to `/home/shizuku/Project/ohpichamber-omp-artifacts/m5-b-2026-11-06/clean-prefix-smoke.json`.
