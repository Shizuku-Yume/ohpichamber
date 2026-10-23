# 18: Enforce a worker capacity and idle-eviction policy

**Effort:** post-m3-hardening
**Task type:** feature
**Base commit:** <commit-sha>

**Delivers:** The Agent Service enforces the measured worker cap and evicts idle workers, returning an explicit capacity outcome instead of growing without bound.

**Blocked by:** 17
**Files:** `packages/agent-service/src/supervisor/workers.ts`; the contract owner for the capacity outcome in `packages/agent-contract`

**Read first:** `.workflow/specs/post-m3-hardening.md`; task 17 `## Findings`; `.workflow/omp-migration/contracts.md` (Problem Details, unsupported/unavailable outcomes); `.agents/skills/sync-state-invariants/SKILL.md`
**Covers:** H11

**Check:** Service regressions: opening one root past the cap returns the capacity outcome; an idle worker past the timeout is stopped and its session reopens cold with history intact; a worker with a running turn or pending approval is never evicted.

## Done when

- [ ] Policy values come from task 17, not guesses.
- [ ] The UI shows the capacity outcome as a real message.
