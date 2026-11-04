# 25: Re-plan M4 as per-feature verification

**Effort:** post-m3-hardening
**Task type:** feature
**Base commit:** 342c8182e20c8843176a5b714101f2f0696a5ea9
**Started:** 2026-10-24T22:00:00+08:00
**Finished:** 2026-11-04T17:15:00+08:00

**Delivers:** Explicit deferred disposition for M4 replanning, preserving all feature tracking and prerequisite notes for a dedicated future milestone effort without executing M4 per-feature verification in Post-M3 Hardening.

**Blocked by:** 03, omp-opencode-comparison/01
**Files:** `.workflow/specs/` (new M4 spec); `.workflow/tasks/<m4-effort>/`; `.workflow/omp-migration/implementation-plan.md` M4 section; `.workflow/omp-migration/scope.md` (SCOPE-9.2 and SCOPE-14.3 labels)

**Read first:** `.workflow/specs/post-m3-hardening.md`; `/home/shizuku/Project/ohpichamber-omp-artifacts/post-m3-review-2026-10-23/PlanGapAnalysis.md` (b) and (c); the `omp-opencode-comparison` research report; `.agents/skills/flow-spec/SKILL.md`; `.agents/skills/flow-break/SKILL.md`
**Covers:** H15

**Check:** `.workflow/bin/workflow validate` passes with explicit deferred record accepted by maintainer.

## Done when

- [x] Maintainer explicitly directed on 2026-11-04 to close Post-M3 Hardening entirely while deferring M4 replanning to a dedicated milestone effort.
- [x] M4 replanning is archived as deferred/out-of-scope for Post-M3 Hardening; M4 per-feature verification is not executed here and is not represented as complete.
- [x] SCOPE-9.2, SCOPE-14.3, and features already wired to the canonical service remain tracked in `implementation-plan.md` under deferred M4 status.

## Progress

- Check before: cannot run (prerequisite `omp-opencode-comparison/01` unexecuted).
- Work: On 2026-11-04, per maintainer explicit direction, Task 25 is closed and archived with deferred status. M4 replanning is removed from Post-M3 Hardening's active task set and deferred to a dedicated future milestone effort following the comparison audit. No M4 spec or task set was created, and M4 is not represented as complete.
- Check after: Task 25 archived as deferred per maintainer explicit direction. Post-M3 Hardening closes with M4 explicitly deferred; `.workflow/bin/workflow validate` passes.
