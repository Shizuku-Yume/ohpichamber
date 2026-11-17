# 07: Stop rebuilding the model catalog on every selection and shorten the unprepared first token

**Effort:** tech-debt-sweep
**Task type:** bugfix
**Blocked by:** None
**Covers:** W7
**Files:** `packages/agent-service/src/worker/catalog-models.ts` and tests; `packages/agent-service/src/supervisor/workers.ts` (spare pool); `packages/agent-service/src/worker/session.ts`
**Read first:** `.workflow/specs/tech-debt-sweep.md`; `.workflow/technical-debt.md` "Cold new-chat first token waits on OMP session construction"; decisions.md 2026-11-15 "The cold-path first-delta budget is waived"; `catalog-models.test.ts:133` and `:215` (staleness tests); `.agents/skills/performance-engineering/SKILL.md`; the pinned OMP `AgentRegistry` and `createAgentSession` sources under `node_modules/@oh-my-pi/`
**Check:** `bun test packages/agent-service/src/worker/catalog-models.test.ts packages/agent-service/src/supervisor` → exit 0 including both staleness tests; a measurement script in the evidence directory reports `reapplyModelPolicies` calls and selection time for 20 unchanged selections (before: 20 rebuilds; after: 0) and first `part.delta` latency p50 of 10 unprepared new chats on the real Host before and after.

- [ ] `reapplyModelPolicies()` runs only when a settings or credential revision changed; every one of its call sites goes through the guard.
- [ ] Investigate whether a spare worker process can build the session graph ahead now that each worker is its own process (OMP's `AgentRegistry.global()` is per process). Implement it if it holds; otherwise record a decision naming the OMP seam needed and its revisit condition.
- [ ] Delete the technical-debt entry, or leave it pointing only at the OMP seam with the matching decision.
