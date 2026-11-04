# 07: Bundle the Agent Runtime into @openchamber/web

**Effort:** m5-release-surfaces
**Task type:** feature
**Base commit:** <commit-sha>

**Delivers:** A packed `@openchamber/web` tarball that carries a per-platform Agent Runtime built from the same staged payload Electron verifies, installs into a clean prefix with no `workspace:*` or private Agent Service dependency, starts the Host and bundled Agent Service, answers `/api/agent/v1/ready` with 200, and completes a real-provider prompt. The Agent Service, Contract and vendored OMP packages are not published.

**Blocked by:** 01, post-m3-hardening/29
**Files:** `packages/web/package.json` (dependencies 34-38, `files` 113-120); `packages/web/bin/cli.js`; `packages/web/server/lib/host/agent-runtime.js`; `packages/electron/scripts/prepare-agent-runtime.mjs` and `verify-agent-runtime.mjs` (reuse, do not fork); `packages/agent-service/package.json`; `packages/agent-contract/package.json`; root `package.json`; `.github/workflows/release.yml` `publish-npm`; `packages/web/README.md`; install docs.

**Read first:** `.workflow/specs/m5-release-surfaces.md` matrix, R8 and "npm standalone"; `decisions.md: 2026-10-24 - Bundle the Agent Runtime into @openchamber/web`; `packages/web/server/lib/host/agent-runtime.js`; `packages/electron/scripts/prepare-agent-runtime.mjs`; archived task 24's npm label.
**Covers:** R8

**Check:** With Bun 1.4.2 and Node 24.14+, run the new web runtime staging command, then `bun pm pack` in `packages/web`. Inspect the tarball: it contains the staged runtime `manifest.json`, the Bun binary, the service dist and the matching platform package, and its `package.json` has no `workspace:*` or private `@openchamber/agent-service`/`@openchamber/agent-contract` dependency. Install the tarball into a clean prefix (no repository checkout), run `openchamber --port 0` with a test provider config, and observe `/api/agent/v1/ready` 200 and a real-provider prompt complete. Verify the staged payload with the Electron `verifyAgentPayload` identity checks (platform, architecture, Bun 1.4.2, package/file hashes). Run the same clean-prefix check on any additional npm matrix row on its own runner; without that row, Linux x64 is the only certified npm target.

**Done when**

- [ ] The web package has one staging script that reuses the Electron runtime recipe and produces the same manifest/hashes; no second runtime packer is introduced.
- [ ] The packed `@openchamber/web` manifest contains no `workspace:*` dependency and no private package name, and the tarball includes the per-platform runtime payload.
- [ ] The Host resolves the bundled runtime before a workspace development path, and a clean-prefix install starts Host and Agent Service without a repository checkout.
- [ ] Ready returns 200 and a real-provider prompt completes; `verifyAgentPayload` accepts the bundled payload.
- [ ] The release publish step publishes `@openchamber/web` and the SDK only; a dry-run candidate builds and uploads the packed web tarball, while `@openchamber/agent-service`, `@openchamber/agent-contract` and the vendored OMP packages remain private.
- [ ] Docs state the certified npm platforms and label all others unverified; the receipt names Node, Bun, npm prefix, tarball hash and every not-run row.
