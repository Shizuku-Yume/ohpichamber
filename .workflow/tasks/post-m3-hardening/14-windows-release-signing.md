# 14: Require Windows signing for release builds

**Effort:** post-m3-hardening
**Task type:** feature
**Base commit:** <commit-sha>

**Delivers:** Windows release jobs refuse to package without signing material, and the updater verifies update signatures; local and smoke builds can stay unsigned.

**Blocked by:** 11
**Files:** `packages/electron/scripts/package.mjs` (9-13); `packages/electron/package.json` (`verifyUpdateCodeSignature`, 122-124); `.github/workflows/release.yml` Windows job

**Read first:** `.workflow/specs/post-m3-hardening.md`; `/home/shizuku/Project/ohpichamber-omp-artifacts/post-m3-review-2026-10-23/``SurfacesReview.md` finding 4; `.agents/skills/desktop-shell/SKILL.md`; `.agents/skills/openchamber-change-discipline/references/updater-testing.md`
**Covers:** H8

**Check:** Running the release packaging step with no signing secret on a release ref exits non-zero with a clear message; the smoke path still packages unsigned; `verifyUpdateCodeSignature` is `true` for release builds.

## Done when

- [ ] Asks spec open question 4 when starting; uses the secret names the maintainer gives.
- [ ] The security pass runs on the updater trust boundary.
