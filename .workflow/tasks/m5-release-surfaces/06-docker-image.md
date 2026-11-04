# 06: Certify the Docker image on both Linux architectures

**Effort:** m5-release-surfaces
**Task type:** feature
**Base commit:** <commit-sha>

**Delivers:** A Docker image built from `oven/bun:1.4.2` that starts the Host and Agent Service on linux/amd64 and linux/arm64, answers ready, completes a real-provider prompt, contains no OpenCode CLI or `oh-my-opencode` bootstrap, and whose `docker compose` file mounts only retained OpenChamber paths. A Docker candidate job in `.github/workflows/release.yml` builds each architecture on its native runner and uploads an OCI image artifact with its digest; registry publication stays a separate, permission-gated step.

**Blocked by:** 01, post-m3-hardening/29
**Files:** `Dockerfile`; `docker-compose.yml`; `scripts/docker-entrypoint.sh`; `.github/workflows/release.yml` (new Docker candidate job); Docker setup docs (`packages/web/README.md` or the operational reference).

**Read first:** `.workflow/specs/m5-release-surfaces.md` matrix, R7 and "Docker"; archived task 15 (`## Progress` static checks and arm64 dependency); archived task 11's `verify:agent-runtime` commands; `.agents/skills/openchamber-change-discipline/SKILL.md` (Dockerfile workspace rule); current `Dockerfile`, `docker-compose.yml`, entrypoint.
**Covers:** R7

**Check:** On a Linux x64 host with Docker Engine 28 and BuildKit, build and load one architecture at a time: `docker buildx build --platform linux/amd64 --load -t openchamber:m5-amd64 .` on the x64 host, and the same with `--platform linux/arm64 --load -t openchamber:m5-arm64 .` on a native arm64 Docker host. Run each loaded tag with a fresh HOME and a test provider config: `/api/agent/v1/ready` returns 200 and a real-provider prompt completes. `docker run --rm openchamber:m5-amd64 sh -lc '! command -v opencode && ! env | grep -E "^(OPENCODE_|OH_MY_OPENCODE)"'` exits 0, and `docker compose config` shows no inherited `opencode` volume. Then inspect the `.github/workflows/release.yml` Docker candidate job: each native runner builds its architecture and uploads an OCI tar plus digest; no registry push runs without the maintainer's permission. The current workstation has no Docker daemon; without a Docker host the check is `not run` and the task is blocked with that exact prerequisite.

**Done when**

- [ ] `.github/workflows/release.yml` has a Docker candidate job for each architecture on its native runner; it uploads an OCI image artifact and digest, and no registry push runs without permission.
- [ ] The image builds for both architectures from the same commit with the pinned Bun base and the matching approved native leaf; arm64 is not built from an unverified leaf or run under emulation as a pass.
- [ ] Each image starts as the `openchamber` user, binds through the authenticated entrypoint, returns 200 from `/api/agent/v1/ready`, and completes a real-provider prompt.
- [ ] The image contains no OpenCode CLI, `oh-my-opencode`, `OPENCODE_*` handling or removed release script.
- [ ] `docker-compose.yml` uses only the retained OpenChamber config, state and workspace volumes; `data/opencode` mounts are gone and existing users get a documented migration note if their data is affected.
- [ ] A repeat `docker compose up -d` works from the documented commands, and the receipt names the Docker Engine/BuildKit versions, image digests, host architectures and every stand-in.
