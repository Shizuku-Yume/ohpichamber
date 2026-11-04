# 08: Keep isolated spaces unreleased and fail closed

**Effort:** m5-release-surfaces
**Task type:** feature
**Base commit:** <commit-sha>

**Delivers:** Isolated spaces remain excluded from the release matrix and cannot be enabled: the server release gate refuses create, start, repair and model/login grants before any place or container call, `ISOLATED_SPACES_RELEASED` stays false, and no OpenCode runtime, `opencode.json`, credential row, engine readiness check or proxy remains. The retained container, gatekeeper, code-transfer, preview and escape infrastructure is still present and test-covered.

**Blocked by:** 01, post-m3-hardening/38
**Files:** `packages/web/server/lib/spaces/` (release gate, `journey.js`, `routes.js`, `manager.js` and tests); `packages/web/server/lib/opencode/proxy.js` (deleted by task 38, verified here); `packages/web/package.json` (`@opencode/client`, `@opencode/schema`); `packages/ui/src/lib/spaces/release.ts`; `.workflow/isolated-spaces/DESIGN.md`; spaces docs; M5 spec matrix.

**Read first:** `.workflow/specs/m5-release-surfaces.md` R9 and "Isolated spaces"; `decisions.md: 2026-10-24 - Keep isolated spaces unreleased without the OpenCode runtime`; archived task 08 `## Findings`; `post-m3-hardening/38`; `.agents/skills/isolated-space-boundary/SKILL.md`; `packages/web/server/lib/spaces/DOCUMENTATION.md`.
**Covers:** R9

**Check:** Start the Host with a temporary HOME and no Docker daemon. Call create, start, repair and model/login grant routes for a space; each fails with the documented unsupported/unreleased status before any place or container call, and the returned code/message matches the UI flag. Run the focused spaces refusal tests and the full `packages/web` test suite. `grep -R` finds no in-space `@opencode/cli`, `@opencode/plugin`, `opencode.json`, `isOpenCodeReady` or unmounted proxy registration in shipped space code, and `ISOLATED_SPACES_RELEASED` is false. If a Docker host is available, repeat create/start against it and confirm no container is created; without Docker, record that the refusal was proven at the server gate and no container-level claim is made.

**Done when**

- [ ] The server gate is authoritative and cannot be overridden by the UI flag, `startupSettings.isolatedSpacesEnabled` or the PUT switch route.
- [ ] Create, start, repair and model/login grants fail closed with a clear unreleased/unsupported state before a place or container call.
- [ ] No OpenCode runtime/package/config/credential/readiness/proxy remains in the shipped spaces path; retained container, gatekeeper, code-transfer and preview code is unchanged except for the removal.
- [ ] Focused refusal tests and `bun run --cwd packages/web test` pass; any live Docker run is recorded separately.
- [ ] The M5 matrix and spaces docs say spaces are unreleased and are not a certification row.
- [ ] The receipt names the Host commit, focused test result, Docker host or its absence, and every not-run result.
