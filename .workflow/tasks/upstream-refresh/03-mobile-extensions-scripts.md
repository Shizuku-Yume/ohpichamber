# 03: Mobile, extensions and scripts

**Effort:** upstream-refresh
**Task type:** feature
**Base commit:** <commit-sha>

**Delivers:** Mobile, built-in extensions and repository scripts match upstream 0056bf6a9: Android/iOS shell updates and assets, the extension registry/build, and the perf/brand/check scripts.

**Blocked by:** 02
**Files:** Path list: `/home/shizuku/Project/ohpichamber-omp-artifacts/upstream-sync-2026-10-27/plan-paths/03.tsv` (91 paths: 85 clean/new, 4 both-side, 1 conflict). Main locations: `packages/mobile/{android,ios,assets}`, `packages/extensions/`, `scripts/{perf,brand,check-changed,docs}`.

**Read first:** Spec W4; `.agents/skills/openchamber-change-discipline/SKILL.md`; `.agents/skills/locale-ui-patterns/SKILL.md`; `.agents/skills/clack-cli-patterns/SKILL.md`; `packages/mobile/README.md`; `scripts/perf/DOCUMENTATION.md`.
**Covers:** W4

**Check:** `bun install --frozen-lockfile` and `bun run type-check` and `bun run lint` and `bun run test` all exit 0, `bun run extensions:build` exits 0, `bun run --cwd packages/mobile build` exits 0, and the script tests under `scripts/` pass. Real path: launch the mobile web surface against the dev server; a physical-device build is not available in this task, so the simulator/device limit is recorded.

## Done when

- [ ] Android and iOS shell sources, assets and build config are at the upstream revision and still build.
- [ ] Built-in extensions build and load; no extension names an OpenCode engine.
- [ ] Scripts keep the fork's exit codes and `--json`/`--quiet` behavior where they had it.
- [ ] Physical-device and store results are named as not exercised.
