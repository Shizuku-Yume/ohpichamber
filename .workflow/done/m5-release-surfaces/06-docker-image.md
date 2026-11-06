# 06: Rewrite Dockerfile, docker-compose.yml, and entrypoint for OMP 18.16.0

**Effort:** m5-release-surfaces
**Base commit:** 1e548fb64eb2af519fba643ab26fab0f7f0f58c5
**Blocked by:** 01
**Files:** `Dockerfile`, `docker-compose.yml`, `scripts/docker-entrypoint.sh`, `.github/workflows/release.yml`, `packages/web/README.md`
**Read first:** `.workflow/specs/m5-release-surfaces.md` (W4); `.agents/skills/openchamber-change-discipline/SKILL.md` (Dockerfile workspace rule); current `Dockerfile`, `docker-compose.yml`, `scripts/docker-entrypoint.sh`
**Covers:** W4
**Check:** Static verification confirms `Dockerfile` uses `oven/bun:1.4.4`, copies `vendor/omp/650f3a10` and every workspace `package.json` declared in root `package.json` (`packages/*` and `packages/sdk/examples/*`), `docker-compose.yml` mounts `~/.omp` and retained OpenChamber paths with zero `opencode` volumes, and `grep -rnE 'c9de2b02|opencode|OH_MY_OPENCODE' Dockerfile docker-compose.yml scripts/docker-entrypoint.sh` returns 0 matches.

- [x] Fix `Dockerfile` `deps` and `runtime` stages to use `oven/bun:1.4.4`, copy `vendor/omp/650f3a10` (replacing stale `vendor/omp/c9de2b02`), and include all workspace `package.json` manifests required by `--frozen-lockfile` (`packages/*` and `packages/sdk/examples/*`).
- [x] Replace `./data/opencode/{share,state,config}` mounts in `docker-compose.yml` with `./data/omp:/home/openchamber/.omp` alongside `./data/openchamber`, `./data/ssh`, and `./workspaces`, and ensure `scripts/docker-entrypoint.sh` pre-creates `/home/openchamber/.omp` cleanly with zero `OPENCODE_*` or `OH_MY_OPENCODE` handling.
- [x] Add an optional non-pushing Docker build job to `.github/workflows/release.yml` and update Docker setup docs in `packages/web/README.md` (noting live container runtime verification runs in M7 once local Docker is available).

## Progress

- **Check before:**
  - Base commit pinned: 1e548fb64eb2af519fba643ab26fab0f7f0f58c5 (integration tip with Task 01 merged).
  - `Dockerfile` used stale `vendor/omp/c9de2b02` and copied only `packages/*` manifests, omitting all 10 `packages/sdk/examples/*` package manifests required by root `workspaces`.
  - `docker-compose.yml` mounted three `./data/opencode/*` paths (`./data/opencode/share`, `./data/opencode/state`, `./data/opencode/config`).
  - `scripts/docker-entrypoint.sh` did not pre-create `/home/openchamber/.omp`.
  - `.github/workflows/release.yml` lacked a Docker build verification job.
  - `packages/web/README.md` contained an orphaned snippet and lacked full OMP Docker Compose documentation.
  - `grep -rnE 'c9de2b02|opencode|OH_MY_OPENCODE' Dockerfile docker-compose.yml scripts/docker-entrypoint.sh` matched 4 lines (1 in `Dockerfile`, 3 in `docker-compose.yml`).
- **Work:**
  - Updated `Dockerfile` `deps` stage to copy `vendor/omp/650f3a10` and all 17 workspace `package.json` files from root `workspaces` (`packages/*` and `packages/sdk/examples/*`), with `oven/bun:1.4.4` in `base` and `runtime` stages.
  - Updated `docker-compose.yml` to mount `./data/omp:/home/openchamber/.omp` alongside `./data/openchamber`, `./data/ssh`, and `./workspaces`, removing all opencode mounts.
  - Updated `scripts/docker-entrypoint.sh` to pre-create `${HOME}/.omp` alongside `${HOME}/.ssh` with zero `OPENCODE_*` or `OH_MY_OPENCODE` references.
  - Added `build-docker` non-pushing image build job and `build_docker` workflow_dispatch option to `.github/workflows/release.yml`.
  - Updated `packages/web/README.md` with complete Docker & Compose setup instructions for OMP 18.16.0, explicit directory permissions, and documented that live container runtime verification is deferred to milestone M7 (`m7-release-verification`) due to local Docker daemon unavailability.
- **Check after:**
  - `grep -rnE 'c9de2b02|opencode|OH_MY_OPENCODE' Dockerfile docker-compose.yml scripts/docker-entrypoint.sh` returned 0 matches (`task06-grep-check.txt`).
  - Static verification script confirmed `Dockerfile` uses `oven/bun:1.4.4`, copies `vendor/omp/650f3a10` and all 17 workspace manifests; `docker-compose.yml` mounts `~/.omp` and retained paths with 0 opencode volumes; and `scripts/docker-entrypoint.sh` pre-creates `.omp` (`task06-static-verification.txt`).
  - `release.yml` and `docker-compose.yml` parsed cleanly as YAML (`task06-yaml-parse.txt`).
  - `.workflow/bin/workflow validate` passed (210 task files valid).
