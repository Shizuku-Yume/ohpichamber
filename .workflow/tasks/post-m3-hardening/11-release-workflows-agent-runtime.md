# 11: Stage the Agent Runtime in release workflows

**Effort:** post-m3-hardening
**Task type:** bugfix
**Base commit:** <commit-sha>

**Delivers:** Release and smoke workflows stage and verify the Agent Runtime instead of calling removed OpenCode CLI scripts, and the OpenCode smoke workflow is gone.

**Blocked by:** None
**Files:** `.github/workflows/release.yml` (158-169, 205-215, 309-333, 355, 443-448); `.github/workflows/release-desktop-smoke.yml` (78-90, 123-131); `.github/workflows/build-macos-arm64-dmg.yml` (40-52, 85-90); `.github/workflows/opencode-smoke.yml`; `scripts/oc-dev.mjs` (624-625); `packages/electron/package.json` scripts; `packages/electron/scripts/prepare-agent-runtime.mjs`

**Read first:** `.workflow/specs/post-m3-hardening.md`; `/home/shizuku/Project/ohpichamber-omp-artifacts/post-m3-review-2026-10-23/``SurfacesReview.md` findings 2 and 12; `packages/electron/README.md`; `.agents/skills/desktop-shell/SKILL.md`
**Covers:** H8

**Check:** A search of `.github/` and `scripts/` for `opencode-cli` and `opencodeCli` returns nothing; the Linux release job's staging and verification steps, run locally in order, produce a verified `resources/agent-runtime` and a packaged app passing `verify:agent-runtime`. GitHub Actions runs are not part of this Check unless the maintainer permits them.

## Done when

- [ ] Every workflow and `oc-dev` step that prepared or cached the OpenCode CLI now prepares or verifies the Agent Runtime.
- [ ] `opencode-smoke.yml` is removed or replaced by an Agent Service smoke that uses the pinned vendored runtime.
- [ ] Non-Linux matrix jobs fail at native staging with a clear message until task 12's follow-up lands; this is stated in `## Progress`.
