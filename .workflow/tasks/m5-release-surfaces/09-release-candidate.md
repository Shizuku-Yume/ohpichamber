# 09: Certify one release candidate across the retained matrix

**Effort:** m5-release-surfaces
**Task type:** feature
**Base commit:** <commit-sha>

**Delivers:** One release candidate, built from a single commit by the retained release workflows with the maintainer's permission, whose artifact inventory matches the retained matrix; every desktop, mobile, Docker and npm row has real runner/device/container evidence; the Guest SDK published package and packaged `v2` bootstrap smoke pass; and the release docs state exactly what is supported.

**Blocked by:** 01, 02, 03, 04, 05, 06, 07, 08
**Files:** `.github/workflows/release.yml`; `.github/workflows/release-desktop-smoke.yml`; `.github/workflows/mobile-release.yml`; `packages/electron/README.md`; `packages/web/README.md`; `packages/mobile/README.md`; install/release docs; `.workflow/specs/m5-release-surfaces.md` (status only after acceptance).

**Read first:** `.workflow/specs/m5-release-surfaces.md` all checks and the retained matrix; every surface task's `## Progress` and receipt; archived task 23's Guest SDK `v2` decision; `packages/sdk` release scripts; `.workflow/standards.md` real-path rule.
**Covers:** R2, R10

**Check:** With the maintainer's GitHub Actions, registry and device/runner permissions, run the candidate from one commit at the version under test: `.github/workflows/release.yml` for the Electron matrix, `.github/workflows/mobile-release.yml` for mobile, and the Docker/npm release jobs. The runs must produce every R1 artifact, each packaging job must log `prepare:agent-runtime`/`verify:agent-runtime` success, and the uploaded inventory hashes must match the artifacts. Re-run the per-surface smoke on the candidate artifacts (not the task-time artifacts): macOS arm64/x64 launch/ready/prompt, Windows x64/arm64 install/ready/prompt, Linux x64/arm64 launch/ready/prompt, the two physical mobile devices, Docker amd64/arm64 ready/prompt, npm clean-prefix ready/prompt, and the packaged Guest `v2` panel. Every row is pass or `not run`; a missing permission or device keeps the candidate unreleased and is not waived. The mobile device row is required by the question 3 decision, so it cannot be deferred without a new decision. The candidate receipt records commit, version, runner/device/toolchain, artifact hashes and every result.

**Done when**

- [ ] The candidate is built from one commit and one version; the receipt names it and every job.
- [ ] Every retained row has pass evidence from its real runner, device or Docker host; no fixture, source read or local Linux-only result is promoted to a pass.
- [ ] No unverified row is waived. The mobile row is required by the question 3 decision; removing or deferring any row requires a new recorded decision and a matrix change before release.
- [ ] The SDK publish and packaged Guest `v2` smoke pass, and no release artifact contains an OpenCode runtime, VS Code extension or compatibility process.
- [ ] The release docs and install docs match the receipt; unverified targets and platforms are labelled.
- [ ] `.workflow/bin/workflow validate` passes, and the M5 spec stays `in progress` until the maintainer accepts it at `flow-close`.
