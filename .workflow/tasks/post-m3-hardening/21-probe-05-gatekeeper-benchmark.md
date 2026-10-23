# 21: Run the PROBE-05 Host Gatekeeper benchmark

**Effort:** post-m3-hardening
**Task type:** spike
**Base commit:** <commit-sha>

**Delivers:** Answer to: what latency and CPU cost do 10,000 real Host-boundary file accesses through the Gatekeeper add, and does it need a cache?

**Blocked by:** None
**Files:** the Host Gatekeeper/authorizer owner (`packages/web/server/lib/host/worker-operation-authorizer.js` and its callers)

**Read first:** `.workflow/specs/post-m3-hardening.md`; `.workflow/omp-migration/architecture.md` line 747 (PROBE-05); `.workflow/done/omp-through-m3/23-m2-gate.md`; `scripts/perf/DOCUMENTATION.md`; `.agents/skills/performance-engineering/SKILL.md`
**Covers:** H12

**Check:** `## Findings` records p50/p95/p99 and CPU for the 10,000-access run on the real Host path, with the receipt in the evidence directory, and answers whether a cache is warranted.

## Done when

- [ ] No cache is added by this task.
- [ ] Time box: one benchmark design, run three times.
