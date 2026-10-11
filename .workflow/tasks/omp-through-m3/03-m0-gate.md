# 03: Record the M0 gate and implementation handoff

**Effort:** omp-through-m3
**Task type:** feature
**Base commit:** <commit-sha>

**Delivers:** A current M0 gate record states what is accepted for M1/M2, what remains explicitly deferred, and the exact source-backed handoff for implementation.

**Blocked by:** 02, 25, 26, 27
**Files:** `.workflow/development.md`, `.workflow/omp-migration/implementation-plan.md`, `.workflow/specs/omp-through-m3.md`

**Read first:** `.workflow/specs/omp-through-m3.md` W1; archived tasks 01/02/19/24 and evidence tasks 25-27; `.workflow/development.md`; migration scope, architecture and implementation-plan gates
**Covers:** W1

**Check:** `bun run docs:validate && .workflow/bin/workflow validate --no-color` plus an evidence-to-requirement review → docs pass and every required M0 item has observed evidence or a recorded maintainer decision. An unresolved required item means this task stays blocked and unarchived; completing a gate report alone cannot release tasks 04, 06 or 07.

- [ ] Compare every M0 implementation-plan item and architecture risk probe with current artifacts, task-02 corrections and tasks 25-27 outcomes. Completed investigations do not turn failed/unavailable capabilities into accepted evidence.
- [ ] Separate reachable M0 work from M5/platform or provider limits without silently dropping required M0 evidence.
- [ ] Record the accepted worker architecture and its measured resource limitation.
- [ ] Make M1 the next ready phase only after every M0 prerequisite is accepted, not merely documented.
- [ ] Keep M0 blocked and this task unarchived if required evidence or a maintainer-owned resource decision is missing.
