# 15: Run the Docker image on the Agent Service

**Effort:** post-m3-hardening
**Task type:** feature
**Base commit:** <commit-sha>

**Delivers:** The Docker image starts the Host and Agent Service from the pinned vendored runtime, without installing the OpenCode CLI or the `oh-my-opencode` bootstrap.

**Blocked by:** 11
**Files:** `Dockerfile` (line 60: `npm install -g @opencode/cli@2.0.25`); `scripts/docker-entrypoint.sh` (6-7, 53-60); docs that describe Docker setup

**Read first:** `.workflow/specs/post-m3-hardening.md`; `/home/shizuku/Project/ohpichamber-omp-artifacts/post-m3-review-2026-10-23/``PlanGapAnalysis.md` finding 8; `packages/web/README.md`; `.agents/skills/openchamber-change-discipline/SKILL.md` (Dockerfile workspace rule)
**Covers:** H10

**Check:** `docker build` then `docker run` → `/api/agent/v1/ready` returns 200 and a prompt completes. No Docker daemon is available on this workstation; if that is still true, the Check is recorded as not run and the build inputs are validated statically, stated as such.

## Done when

- [ ] No `OPENCODE_*` or `oh-my-opencode` handling remains in the image.
- [ ] arm64 images depend on task 12's follow-up; this is stated.
