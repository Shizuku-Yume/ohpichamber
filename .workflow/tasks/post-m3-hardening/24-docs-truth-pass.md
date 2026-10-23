# 24: Make product docs claim only verified behavior

**Effort:** post-m3-hardening
**Task type:** feature
**Base commit:** <commit-sha>

**Delivers:** Product docs and package READMEs describe M4 features, Mobile and npm standalone as they are verified today, labeling unverified behavior.

**Blocked by:** None
**Files:** `packages/docs/README.md` (3-5); `packages/docs/content/docs/auto-model-routing.mdx` (8-14) and other M4 feature pages; `packages/mobile/README.md` (line 9 still says OpenCode-backed); `packages/web/README.md`; translations

**Read first:** `.workflow/specs/post-m3-hardening.md`; `/home/shizuku/Project/ohpichamber-omp-artifacts/post-m3-review-2026-10-23/``SurfacesReview.md` findings 5, 7 and `PlanGapAnalysis.md` (c); `.workflow/done/omp-through-m3/retrospective.md` "Debt left behind"
**Covers:** H14

**Check:** `bun run docs:validate` passes, and a reviewer reading each changed page against `development.md` evidence finds no claim stronger than the evidence.

## Done when

- [ ] Labels are consistent across locales.
- [ ] The Mobile README describes the current Canonical API host, not OpenCode.
- [ ] Delegate the prose to `writer`; facts come from the cited evidence.
