# 05: Restart the Agent Service after an unexpected exit

**Effort:** post-m3-hardening
**Task type:** bugfix
**Base commit:** <commit-sha>

**Delivers:** After the Agent Service crashes, the Host restarts it with bounded backoff, health reports each state, and a crash loop ends in a visible failed state.

**Blocked by:** None
**Files:** `packages/web/server/lib/host/agent-service-supervisor.js` (`onExit` at 262-268, `restart` at 319); `packages/web/server/lib/host/agent-runtime.js`; the Runtime Status/health owner

**Read first:** `.workflow/specs/post-m3-hardening.md`; `/home/shizuku/Project/ohpichamber-omp-artifacts/post-m3-review-2026-10-23/``AgentServiceReview.md` finding 2; `.workflow/omp-migration/architecture.md` lines 387-392 (restart and backoff); `.agents/skills/sync-state-invariants/SKILL.md`
**Covers:** H4

**Check:** A supervisor regression with a fake spawn: an exit after readiness schedules a restart, repeated exits back off, and the configured limit leaves `phase: failed`. Fails before the change. Real path: `bun run dev`, `kill -9` the Agent Service PID, `/api/agent/v1/ready` returns 200 again within the backoff window, and a new prompt completes.

Root cause at `842a48adc`: `onExit` only marks `phase = 'failed'`; `restart()` has no production caller (only `agent-service-supervisor.skill-source.test.js` calls it), and `agent-runtime.js` calls `service.start()` once.

## Done when

- [ ] An unexpected exit after readiness clears stale scopes (as today) and schedules a bounded restart; an explicit `stop()` never restarts.
- [ ] Pending approvals and questions from the dead service expire as the contract requires; nothing is replayed.
- [ ] The UI shows unavailable while restarting and recovers without a page reload.
- [ ] Easier after 04: both edit the spawn path in the same file.
