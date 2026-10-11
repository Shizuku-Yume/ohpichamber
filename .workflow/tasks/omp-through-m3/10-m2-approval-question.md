# 10: Implement approval and question CAS across restarts

**Effort:** omp-through-m3
**Task type:** feature
**Base commit:** <commit-sha>

**Delivers:** Approvals and questions are service-owned pending records with authenticated answer/cancel operations, compare-and-set versions, timeout/expiry handling and restart invalidation.

**Blocked by:** 09
**Files:** `packages/agent-service/src/interaction/`, host proxy routes, contract tests and service tests

**Read first:** `.workflow/specs/omp-through-m3.md` M2/W4; contracts approval/question sections; OMP interaction APIs; architecture trust, worker and restart rules
**Covers:** W4

**Check:** `bun test packages/agent-service/src/interaction` plus one real pending request through the disposable Host/service boundary → exactly one concurrent answer wins; stale versions do not mutate state; cancel/expiry are terminal; restart invalidates old handles. Keep the consumer-visible race/restart regression, not mock forwarding assertions.

- [ ] Project OMP approval/question requests into service-owned records with stable IDs and versions.
- [ ] Enforce CAS atomically at the service boundary, not in UI state or OMP UI helpers.
- [ ] Distinguish answer, cancel, expiry, worker failure and restart invalidation.
- [ ] Prevent cross-session answer/cancel access through authenticated scope checks.
- [ ] Emit state transitions through the session event cursor.
