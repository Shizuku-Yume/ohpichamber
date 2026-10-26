# 02: Toolchain and root build contract

**Effort:** upstream-refresh
**Task type:** refactor
**Base commit:** <commit-sha>

**Delivers:** The repository builds and checks with upstream's toolchain: TypeScript ~7.0.2, Bun 1.4.4, oxlint 1.88, Electron ^44.9.3, upstream root config and a regenerated lockfile; every package version stays 3.0.0 (mobile 1.13.2).

**Blocked by:** 01
**Files:** Path list: `/home/shizuku/Project/ohpichamber-omp-artifacts/upstream-sync-2026-10-27/plan-paths/02.tsv` (18 paths). Main locations: root `package.json`, `bun.lock`, `tsconfig.json`, `oxlint.config.ts`, `oxlint.anti-slop.config.ts`, `knip.json`, `Dockerfile`, `bun-patches/`, `tools/oxlint/`, the eight package manifests, and the tracked `.env` / `eslint.config.js` decisions.

**Read first:** Spec "Sequence" and W3; decisions.md: 2026-10-27 - Bump the toolchain before refreshing ui and web; `.agents/skills/openchamber-change-discipline/SKILL.md`; AGENTS.md "Validation"; upstream `package.json` scripts (`bun check -b`).
**Covers:** W3, W11

**Check:** `bun install` then `bun install --frozen-lockfile` succeed from a clean state, and `bun run type-check`, `bun run lint`, `bun run test` and `bun run --cwd packages/electron type-check` all exit 0, and `bun pm ls electron` resolves 44.x. Real path: `bun run dev` serves the Web UI and `/api/agent/v1/ready` returns 200.

## Done when

- [ ] `packageManager` is `bun@1.4.4`, TypeScript is ~7.0.2 in every workspace, oxlint and @oxlint/plugins are 1.88.0, Electron is ^44.9.3.
- [ ] The root `type-check` uses the upstream contract (`bun check -b` plus the package checks) and passes.
- [ ] Every `bun-patches/*` entry is either replaced by the upstream equivalent or retained with a reason; the deleted patches are gone.
- [ ] The `eslint.config.js` deletion and the tracked `.env` deletion are decided and recorded; no ESLint/oxlint duplicate convention is left half-migrated.
- [ ] Fork versions stay 3.0.0 / mobile 1.13.2; no upstream version string is adopted.
- [ ] Upstream root docs (AGENTS.md, README.md, CONTRIBUTING.md, CHANGELOG.md, SECURITY.md) and `renovate.json`/`flake.*` are not adopted.
