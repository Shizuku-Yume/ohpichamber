# 25: Re-plan M4 as per-feature verification

**Effort:** post-m3-hardening
**Task type:** feature
**Base commit:** <commit-sha>

**Delivers:** An approved M4 spec and task set: one verification-and-fix task per retained orchestration feature, each checking normal completion, failure, reconnect and unsupported behavior.

**Blocked by:** 03, omp-opencode-comparison/01
**Files:** `.workflow/specs/` (new M4 spec); `.workflow/tasks/<m4-effort>/`; `.workflow/omp-migration/implementation-plan.md` M4 section; `.workflow/omp-migration/scope.md` (SCOPE-9.2 and SCOPE-14.3 labels)

**Read first:** `.workflow/specs/post-m3-hardening.md`; `/home/shizuku/Project/ohpichamber-omp-artifacts/post-m3-review-2026-10-23/``PlanGapAnalysis.md` (b) and (c); the `omp-opencode-comparison` research report; `.agents/skills/flow-spec/SKILL.md`; `.agents/skills/flow-break/SKILL.md`
**Covers:** H15

**Check:** `.workflow/bin/workflow validate` passes and the maintainer approves the spec and tasks in one review round.

## Done when

- [ ] Features already wired to the canonical service (Goals, Assist, Routing, Session Work, Scheduled Tasks, Walkthrough, small-model client) become verification tasks, not migrations.
- [ ] SCOPE-9.2 and SCOPE-14.3 labels match their implemented state.
- [ ] OMP-native capabilities found by the comparison audit are classified (adopt, defer, out of scope) by the maintainer.
