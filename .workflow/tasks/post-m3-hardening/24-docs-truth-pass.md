# 24: Make product docs claim only verified behavior

**Effort:** post-m3-hardening
**Task type:** feature
**Base commit:** a37446ac7a309f5ce8a9a27bec0de3e326a73cf9
**Started:** 2026-10-24T07:05:21Z
**Status:** active

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

## Progress

Dirty at start: none. Task24 uses branch `post-m3-hardening/24-docs-truth-pass` in worktree `/home/shizuku/Project/ohpichamber-worktrees/post-m3-hardening-lane-g-24`, based at main `a37446ac7a309f5ce8a9a27bec0de3e326a73cf9` after Task23 landed. Goal: product docs and package READMEs claim only behavior backed by `development.md`/retrospective evidence; label M4 features, Mobile and npm standalone as unverified where the evidence does not support them, consistently across locales.
