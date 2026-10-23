# 17: Measure worker memory under concurrent sessions

**Effort:** post-m3-hardening
**Task type:** spike
**Base commit:** <commit-sha>

**Delivers:** Answer to: what do 1, 5 and 10 concurrent roots cost in RSS (same and different workspaces), and what cap and idle-eviction policy does that support?

**Blocked by:** None
**Files:** `packages/agent-service/src/supervisor/workers.ts` (admission 161-183, launch 262-283)

**Read first:** `.workflow/specs/post-m3-hardening.md`; `.workflow/omp-migration/architecture.md` ADR-03 and lines 42-48, 433; `.workflow/decisions.md` "2026-10-11 - Accept measured worker memory as an M0 limitation"; `.workflow/development.md` task 08 RSS numbers; `.workflow/spike-tasks.md`
**Covers:** H11

**Check:** `## Findings` records the measured RSS per configuration on the real built service (provider or loopback fixture named), the recommended cap and idle timeout, and drafts task 18's exact policy values.

## Done when

- [ ] Measurement scripts are throwaway and deleted; the receipt is kept in the evidence directory.
- [ ] Time box: one measurement run per configuration.
