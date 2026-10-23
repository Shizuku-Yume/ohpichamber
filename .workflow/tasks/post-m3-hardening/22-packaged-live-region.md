# 22: Measure the packaged live-region announcement

**Effort:** post-m3-hardening
**Task type:** spike
**Base commit:** <commit-sha>

**Delivers:** Answer to: does the packaged Electron app announce streaming status through `aria-live` within 400 ms, as the Web build does?

**Blocked by:** None
**Files:** the chat status live-region component; packaged Electron build

**Read first:** `.workflow/specs/post-m3-hardening.md`; `.workflow/done/omp-through-m3/retrospective.md` (W7 inconclusive live-region); `.workflow/spike-tasks.md`
**Covers:** H12

**Check:** `## Findings` records the accessibility-tree or assistive-technology observation on a packaged build (`bun run electron:build`), with timing, and says yes, no, or what blocks measurement.

## Done when

- [ ] If it fails, a bugfix task is drafted.
