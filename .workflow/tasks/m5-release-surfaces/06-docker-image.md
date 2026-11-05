# 06: Rewrite Dockerfile, docker-compose.yml, and entrypoint for OMP 18.16.0

**Effort:** m5-release-surfaces
**Blocked by:** 01
**Files:** `Dockerfile`, `docker-compose.yml`, `scripts/docker-entrypoint.sh`, `.github/workflows/release.yml`, `packages/web/README.md`
**Read first:** `.workflow/specs/m5-release-surfaces.md` (W4); `.agents/skills/openchamber-change-discipline/SKILL.md` (Dockerfile workspace rule); current `Dockerfile`, `docker-compose.yml`, `scripts/docker-entrypoint.sh`
**Covers:** W4
**Check:** Static verification confirms `Dockerfile` uses `oven/bun:1.4.4`, copies `vendor/omp/650f3a10` and every workspace `package.json` declared in root `package.json` (`packages/*` and `packages/sdk/examples/*`), `docker-compose.yml` mounts `~/.omp` and retained OpenChamber paths with zero `opencode` volumes, and `grep -rnE 'c9de2b02|opencode|OH_MY_OPENCODE' Dockerfile docker-compose.yml scripts/docker-entrypoint.sh` returns 0 matches.

- [ ] Fix `Dockerfile` `deps` and `runtime` stages to use `oven/bun:1.4.4`, copy `vendor/omp/650f3a10` (replacing stale `vendor/omp/c9de2b02`), and include all workspace `package.json` manifests required by `--frozen-lockfile` (`packages/*` and `packages/sdk/examples/*`).
- [ ] Replace `./data/opencode/{share,state,config}` mounts in `docker-compose.yml` with `./data/omp:/home/openchamber/.omp` alongside `./data/openchamber`, `./data/ssh`, and `./workspaces`, and ensure `scripts/docker-entrypoint.sh` pre-creates `/home/openchamber/.omp` cleanly with zero `OPENCODE_*` or `OH_MY_OPENCODE` handling.
- [ ] Add an optional non-pushing Docker build job to `.github/workflows/release.yml` and update Docker setup docs in `packages/web/README.md` (noting live container runtime verification runs in M7 once local Docker is available).
