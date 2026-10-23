# 10: Move retained Host owners out of lib/opencode

**Effort:** post-m3-hardening
**Task type:** refactor
**Base commit:** <commit-sha>

**Delivers:** Retained Host modules live with their owners outside `packages/web/server/lib/opencode/`, with behavior unchanged.

**Blocked by:** 01
**Files:** `packages/web/server/lib/opencode/` (`session-runtime.js`, `bootstrap-runtime.js`, `cli-entry-runtime.js`, `cli-options.js`, `core-routes.js`, `openchamber-routes.js`, `feature-routes-runtime.js`, `server-utils-runtime.js`, `shutdown-runtime.js`, `shared.js`, `models-metadata.js`, `npm-registry-config.js`, their tests, `DOCUMENTATION.md`); `packages/web/server/index.js` imports (lines 57-74)

**Read first:** `.workflow/specs/post-m3-hardening.md`; `packages/web/server/lib/opencode/DOCUMENTATION.md`; `.workflow/omp-migration/scope.md` "Preserving host infrastructure in lib/opencode"; `.agents/skills/openchamber-change-discipline/SKILL.md`
**Covers:** H7

**Check:** `bun run --cwd packages/web test` passes before and after with the same counts; `bun run dead-code` reports no new findings; a fresh `bun run dev` serves the UI and `/api/agent/v1/ready` returns 200.

## Done when

- [ ] Every moved module has one owner directory and updated documentation; no re-export shims are left behind.
- [ ] `proxy.js` and its tests are left where they are; task 08 owns them.
- [ ] Each module is moved as a rename, so `git log --follow` keeps its history.
