# 16: Make Agent Service and worker diagnostics observable

**Effort:** post-m3-hardening
**Task type:** feature
**Base commit:** <commit-sha>

**Delivers:** Worker and service stderr reaches a bounded, redacted Host log tagged with root session and worker generation, with a configurable level, and Runtime Status can show recent entries.

**Blocked by:** None
**Files:** `packages/agent-service/src/supervisor/workers.ts` (stdio at 279-280); `packages/agent-service/src/index.ts` (46); `packages/agent-service/src/supervisor/service.ts` (317); `packages/web/server/lib/host/agent-service-supervisor.js` (stderr handler at 248); the Runtime Status diagnostics owner

**Read first:** `.workflow/specs/post-m3-hardening.md`; `/home/shizuku/Project/ohpichamber-omp-artifacts/post-m3-review-2026-10-23/``PlanGapAnalysis.md` finding 11; `.agents/skills/performance-engineering/SKILL.md`
**Covers:** H11

**Check:** A worker that writes a sentinel line to stderr produces one log entry with its root session and generation; a sentinel secret in that line is redacted; the log stays within its size bound under a flood test. Real path: an MCP startup error appears in Runtime Status.

## Done when

- [ ] No secret, token or prompt content is logged.
- [ ] Logging is not on a per-event hot path without a bound.
- [ ] Coordinate with 04 if both are in flight: same spawn code.
