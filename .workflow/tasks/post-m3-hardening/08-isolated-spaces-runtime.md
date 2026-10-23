# 08: Decide how isolated spaces leave OpenCode

**Effort:** post-m3-hardening
**Task type:** spike
**Base commit:** <commit-sha>

**Delivers:** Answer to: what would it cost to run isolated spaces on OMP, versus removing the OpenCode space runtime while spaces stay unreleased? Includes options, costs and a recommendation for the maintainer.

**Blocked by:** None
**Files:** `packages/web/server/lib/spaces/` (`space-opencode.js`, `tools-filler.js`, `tools.js` lines 56-71); `packages/web/server/lib/opencode/proxy.js` and its live docker tests `spaces/places/grants.docker.live.test.js`, `sessions.docker.live.test.js`; `packages/web/package.json` (`@opencode/client`/`@opencode/schema`); `packages/ui/src/lib/spaces/release.ts`

**Read first:** `.workflow/specs/post-m3-hardening.md`; `.workflow/isolated-spaces/DESIGN.md`; `.agents/skills/isolated-space-boundary/SKILL.md`; `.workflow/omp-migration/scope.md` (isolated spaces rows); `/home/shizuku/Project/ohpichamber-omp-artifacts/post-m3-review-2026-10-23/``PlanGapAnalysis.md` finding 2
**Covers:** H7

**Check:** `## Findings` answers the question with source references, lists what still ties spaces to OpenCode (in-container CLI/plugin install, `opencode.json`, version read from `@opencode/client`, proxy-based live tests), and drafts the follow-up task for the chosen option after the maintainer answers spec open question 2.

## Done when

- [ ] Every OpenCode dependency in spaces is listed with its file.
- [ ] Both options are costed: OMP Agent Service inside the space (with the security boundary implications), and removal of the OpenCode space runtime plus `proxy.js` and the two `@opencode/*` web dependencies.
- [ ] States what the live docker tests need after `proxy.js` is gone.
- [ ] No source is changed by this task.
