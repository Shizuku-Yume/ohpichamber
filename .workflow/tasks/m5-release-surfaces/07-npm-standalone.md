# 07: Bundle the Agent Runtime into @openchamber/web standalone tarball

**Effort:** m5-release-surfaces
**Blocked by:** None
**Files:** `packages/web/package.json`, `packages/web/bin/cli.js`, `packages/web/server/lib/host/agent-runtime.js`, `packages/web/scripts/`
**Read first:** `.workflow/specs/m5-release-surfaces.md` (W2); `.workflow/decisions.md` (`2026-10-24 - Bundle the Agent Runtime into @openchamber/web`); `packages/web/server/lib/host/agent-runtime.js`; `packages/electron/scripts/prepare-agent-runtime.mjs`
**Covers:** W2
**Check:** Staging the web runtime with `bun@1.4.4` and Node 24.14+ and running `bun pm pack` in `packages/web` produces a tarball whose `package.json` contains zero `workspace:*` or private `@openchamber/agent-*` dependencies, passes `verifyAgentPayload`, installs into a clean temp prefix outside the repo, starts `openchamber`, answers `/api/agent/v1/ready` with 200, and completes a real-provider prompt.

- [ ] Add a web Agent Runtime staging/pack script that reuses `prepare-agent-runtime.mjs` and `verify-agent-runtime.mjs` (no second runtime packer), stripping `workspace:*` and private `@openchamber/agent-service` / `@openchamber/agent-contract` dependencies from the packed manifest while keeping those packages `private: true`.
- [ ] Update `packages/web/server/lib/host/agent-runtime.js` and `packages/web/bin/cli.js` so the Host resolves the bundled Agent Runtime payload first before falling back to workspace dev paths.
- [ ] Verify clean-prefix installation outside the repository checkout: `openchamber` starts the Host and bundled Agent Service, returns 200 on `/api/agent/v1/ready`, and completes a real-provider prompt.
