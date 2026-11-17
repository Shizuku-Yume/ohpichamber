# 03: Delete fixed debt entries and remove fixed-sleep eviction windows

**Effort:** tech-debt-sweep
**Task type:** bugfix
**Blocked by:** None
**Covers:** W3, W8
**Files:** `.workflow/technical-debt.md`; `packages/agent-service/src/supervisor/workers.capacity.test.ts`; the web suites named in the contention entry when they show a fixed wait (`server/lib/host/canonical-plugins.test.js`, `server/lib/git/service.test.js`, `server/lib/spaces/code-out.test.js`)
**Read first:** `.workflow/specs/tech-debt-sweep.md` (item 3); `.workflow/technical-debt.md` header rules; `workers.capacity.test.ts` (`waitForEviction`, `expectNotEvictedFor` already used by one test)
**Check:** `(VITEST_MAX_WORKERS=2 bun run --cwd packages/web test >/dev/null 2>&1 &) ; for i in 1 2 3 4 5; do bun test packages/agent-service/src/supervisor/workers.capacity.test.ts || exit 1; done; .workflow/bin/workflow validate` → 5/5 passes while the web suite loads the machine, and validate exits 0.

- [ ] Delete the seven fixed entries (session unread state, session pins, workspace listing isolation, session parent link, turn elapsed 0.0s, Host tool errors, relocation/archive race) after confirming each cited fix on the tip.
- [ ] Replace the fixed `Bun.sleep` windows in "an idle worker is evicted while active-turn and pending-approval roots stay" and "a running background shell job postpones eviction until it ends" with bounded polling on observable state.
- [ ] Inspect the three web suites for fixed waits or shared temp/git fixtures and fix what you find; record what was clean.
- [ ] Delete the "Root test contention flakes" entry in the same commit as the fix.
