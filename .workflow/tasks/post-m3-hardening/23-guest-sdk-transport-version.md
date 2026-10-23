# 23: Version the Guest SDK bootstrap transport change

**Effort:** post-m3-hardening
**Task type:** feature
**Base commit:** <commit-sha>

**Delivers:** Panels built with the old SDK either keep working through an explicit compatibility path, or the SDK ships a breaking version that the host and docs name.

**Blocked by:** None
**Files:** `packages/sdk/src/host.ts` (321-327, 538-555); `packages/sdk/src/api-version.ts` (3-5); `packages/sdk/package.json`; `packages/ui/src/components/layout/PluginPane.tsx` (913-965); `packages/docs/content/docs/sdk/example.mdx` and its translations

**Read first:** `.workflow/specs/post-m3-hardening.md`; `/home/shizuku/Project/ohpichamber-omp-artifacts/post-m3-review-2026-10-23/``SurfacesReview.md` findings 1 and 8; `.workflow/decisions.md` "2026-10-11 - Guest bridge uses a private early bootstrap"; `packages/sdk/DOCUMENTATION.md`
**Covers:** H13

**Check:** A test drives the host with an old-protocol guest (`hello` window message) and observes the decided outcome (compatible bootstrap, or an explicit version-mismatch error instead of a silent timeout); SDK examples build against the stated version.

## Done when

- [ ] Asks spec open question 1 when starting.
- [ ] API/wire version and package version reflect the decision.
- [ ] Every locale's SDK example names the supported version.
