# 08: Verify Isolated Spaces fail-closed gate, fix shutdown test race, and clean package manifests

**Effort:** m5-release-surfaces
**Blocked by:** 01
**Files:** `packages/web/server/lib/spaces/`, `packages/ui/src/lib/spaces/release.ts`, `packages/web/server/lib/terminal/shutdown.test.js`, `.workflow/technical-debt.md`, `package.json`, `packages/web/package.json`, `packages/ui/package.json`, `packages/electron/package.json`
**Read first:** `.workflow/specs/m5-release-surfaces.md` (W5); `.agents/skills/isolated-space-boundary/SKILL.md`; `packages/web/server/lib/spaces/DOCUMENTATION.md`; `.workflow/technical-debt.md` (`Terminal shutdown test races its own SIGTERM record`)
**Covers:** W5
**Check:** Spaces create, start, repair, and grant routes fail closed when `ISOLATED_SPACES_RELEASED = false` with zero `@opencode/*` space runtime remnants; `packages/web/server/lib/terminal/shutdown.test.js` passes 10 consecutive runs under load; `.workflow/bin/workflow validate`, `bun run type-check`, `bun run lint`, and `bun run test` exit 0.

- [ ] Verify `ISOLATED_SPACES_RELEASED = false` fails closed authoritatively on server create, start, repair, and model/login grant routes before any place or container call (cannot be overridden by client flags or `PUT` settings), and confirm zero `@opencode/cli`, `@opencode/plugin`, `opencode.json`, or `isOpenCodeReady` remnants exist in shipped spaces code.
- [ ] Fix the timing race in `packages/web/server/lib/terminal/shutdown.test.js` ("escalates a noncooperative workload only after the shared deadline") using bounded event polling / adequate grace slack without altering production shutdown escalation, and remove the resolved debt entry from `.workflow/technical-debt.md`.
- [ ] Remove stale `"opencode"` keywords/descriptions from root and workspace `package.json` manifests where appropriate without breaking Guest SDK or package exports.
