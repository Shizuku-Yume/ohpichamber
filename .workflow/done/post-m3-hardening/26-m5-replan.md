# 26: Re-plan M5 by release surface

**Effort:** post-m3-hardening
**Task type:** feature
**Base commit:** 342c8182e20c8843176a5b714101f2f0696a5ea9
**Started:** 2026-10-24T22:00:00+08:00
**Finished:** 2026-11-04T12:00:00+08:00

**Delivers:** An approved M5 spec and task set split by surface: release pipeline, macOS/Windows, Capacitor mobile on a device, Docker, npm standalone and isolated spaces.

**Blocked by:** 03
**Files:** `.workflow/specs/m5-release-surfaces.md` (new M5 spec); `.workflow/tasks/m5-release-surfaces/` (new surface tasks); `.workflow/specs/post-m3-hardening.md` (open questions 3 and 6); `.workflow/decisions.md`; `.workflow/omp-migration/implementation-plan.md` M5 section

**Read first:** `.workflow/specs/post-m3-hardening.md`; `/home/shizuku/Project/ohpichamber-omp-artifacts/post-m3-review-2026-10-23/PlanGapAnalysis.md` (c) and `SurfacesReview.md` findings 3, 5; findings from tasks 08, 12 and 13 if landed; `.workflow/done/upstream-rebaseline/01-baseline-and-fork-inventory.md` line 45 (missing Xcode/Android/Docker)
**Covers:** H15

**Check:** `.workflow/bin/workflow validate` passes and the maintainer approves the spec and tasks in one review round.

## Done when

- [x] Asks spec open questions 3 and 6. Both were asked before the plan was written; the maintainer answered keep-mobile and bundle-runtime on 2026-10-24.
- [x] Each surface task names the device, toolchain or runner it needs: macOS `blacksmith-6vcpu-macos-26` / `macos-15-intel`, Windows `windows-2022` plus a Windows 11 arm64 VM, Linux `blacksmith-4vcpu-ubuntu-2404` / `-arm`, Pixel 8 Android 15/API 35 and physical iPhone iOS 26/TestFlight, Docker Engine 28 on both Linux architectures, and Node 24.14+/Bun 1.4.2 for npm.
- [x] Release certification covers the matrix the maintainer keeps, not the inherited one: the six native-leaf targets from task 29, mobile per the answered question 3, Docker and npm per the answered question 6, isolated spaces excluded. VS Code and OpenCode are not certification rows.

## Progress

- Dirty at start: none at `342c8182e` (checked before editing).
- Check before: cannot run. There was no M5 spec or task set; the M5 plan section was a capability list blocked on unowned prerequisites, and the inherited release matrix was not the retained one.
- Work: wrote `.workflow/specs/m5-release-surfaces.md` with R1-R10, the retained matrix and per-surface runner/device requirements; created `.workflow/tasks/m5-release-surfaces/01`-`09`; replaced the implementation plan's M5 section; recorded the answers to questions 3 and 6 in `post-m3-hardening.md` and two `decisions.md` entries. The spec status stays `proposed`; the task set is approved-ready, not approved.
- Open questions asked: Q3 mobile is kept, release blocked until physical device certification; Q6 npm bundles a per-platform Agent Runtime into `@openchamber/web`. No device, runner, Docker or packaged standalone result is claimed as passed.
- Check after: `.workflow/bin/workflow validate` passes with 132 task files. Maintainer explicitly approved the M5 spec and surface task set on 2026-11-04 with accepted registry-leaf criteria (official registry native leaf, signed SLSA provenance attestation, SHA-256/SHA-512 integrity, and target OS/CPU match). M4 remains deferred; no native target runtime certification is claimed. Spec `.workflow/specs/m5-release-surfaces.md` and tasks `.workflow/tasks/m5-release-surfaces/01`-`09` are approved.
- Review boundary: `342c8182e` + `.workflow/specs/m5-release-surfaces.md`, `.workflow/tasks/m5-release-surfaces/`, `.workflow/specs/post-m3-hardening.md`, `.workflow/decisions.md`, `.workflow/omp-migration/implementation-plan.md`, `.workflow/tasks/post-m3-hardening/26-m5-replan.md`; round 1; briefs A,B; boundaries: release matrix, signing/credentials, mobile devices, Docker, npm packaging, isolated-spaces release gate; findings: 1 blocking (A) and 5 blocking (B), all fixed; delta rechecks pass.
- Check (maintainer approval): pass. On 2026-11-04, the maintainer explicitly approved the M5 spec and surface task set, accepting the verified registry-leaf criteria for non-Linux targets while deferring M4 and making no claim of native target runtime certification.
- Next: task archived to `.workflow/done/post-m3-hardening/26-m5-replan.md`. Surfaces can be implemented per `.workflow/tasks/m5-release-surfaces/01`-`09` as prerequisites resolve.
