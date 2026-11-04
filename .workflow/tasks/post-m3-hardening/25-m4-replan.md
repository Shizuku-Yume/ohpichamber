# 25: Re-plan M4 as per-feature verification

**Effort:** post-m3-hardening
**Task type:** feature
**Base commit:** 342c8182e20c8843176a5b714101f2f0696a5ea9
**Status:** paused

**Delivers:** An approved M4 spec and task set: one verification-and-fix task per retained orchestration feature, each checking normal completion, failure, reconnect and unsupported behavior.

**Blocked by:** 03, omp-opencode-comparison/01
**Files:** `.workflow/specs/` (new M4 spec); `.workflow/tasks/<m4-effort>/`; `.workflow/omp-migration/implementation-plan.md` M4 section; `.workflow/omp-migration/scope.md` (SCOPE-9.2 and SCOPE-14.3 labels)

**Read first:** `.workflow/specs/post-m3-hardening.md`; `/home/shizuku/Project/ohpichamber-omp-artifacts/post-m3-review-2026-10-23/PlanGapAnalysis.md` (b) and (c); the `omp-opencode-comparison` research report; `.agents/skills/flow-spec/SKILL.md`; `.agents/skills/flow-break/SKILL.md`
**Covers:** H15

**Check:** `.workflow/bin/workflow validate` passes and the maintainer approves the spec and tasks in one review round.

## Done when

- [ ] Features already wired to the canonical service (Goals, Assist, Routing, Session Work, Scheduled Tasks, Walkthrough, small-model client) become verification tasks, not migrations.
- [ ] SCOPE-9.2 and SCOPE-14.3 labels match their implemented state.
- [ ] OMP-native capabilities found by the comparison audit are classified (adopt, defer, out of scope) by the maintainer.

## Progress

- Status: paused (deferred per maintainer decision on 2026-11-04).
- Defer reason: On 2026-11-04, the maintainer explicitly decided to defer M4 replanning from post-M3 hardening to a dedicated future milestone effort. Prerequisite `omp-opencode-comparison/01` remains unexecuted. This task is kept in place as paused to preserve the deferred M4 status truthfully without prematurely representing M4 replanning or per-feature verification as complete.
- Check before: cannot run.
- Next: Resume when maintainer schedules the dedicated M4 effort and executes the comparison audit.
