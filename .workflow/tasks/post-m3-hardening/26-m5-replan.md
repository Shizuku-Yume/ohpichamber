# 26: Re-plan M5 by release surface

**Effort:** post-m3-hardening
**Task type:** feature
**Base commit:** <commit-sha>

**Delivers:** An approved M5 spec and task set split by surface: release pipeline, macOS/Windows, Capacitor mobile on a device, Docker, npm standalone and isolated spaces.

**Blocked by:** 03
**Files:** `.workflow/specs/` (new M5 spec); `.workflow/omp-migration/implementation-plan.md` M5 section

**Read first:** `.workflow/specs/post-m3-hardening.md`; `/home/shizuku/Project/ohpichamber-omp-artifacts/post-m3-review-2026-10-23/``PlanGapAnalysis.md` (c) and `SurfacesReview.md` findings 3, 5; findings from tasks 08, 12 and 13 if landed; `.workflow/done/upstream-rebaseline/01-baseline-and-fork-inventory.md` line 45 (missing Xcode/Android/Docker)
**Covers:** H15

**Check:** `.workflow/bin/workflow validate` passes and the maintainer approves the spec and tasks in one review round.

## Done when

- [ ] Asks spec open questions 3 and 6.
- [ ] Each surface task names the device, toolchain or runner it needs.
- [ ] Release certification covers the matrix the maintainer keeps, not the inherited one.
