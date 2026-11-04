# 02: Toolchain and root build contract

**Effort:** upstream-refresh
**Task type:** refactor
**Base commit:** 524a6b5351ac2592e7bb94e69876cd7f4c3970ab
**Started:** 2026-10-27T03:25:00Z

**Delivers:** The repository builds and checks with upstream's toolchain: TypeScript ~7.0.2, Bun 1.4.4, oxlint 1.88, Electron ^44.9.3, upstream root config and a regenerated lockfile; every package version stays 3.0.0 (mobile 1.13.2).

**Blocked by:** 01
**Files:** Path list: `/home/shizuku/Project/ohpichamber-omp-artifacts/upstream-sync-2026-10-27/plan-paths/02.tsv` (18 paths). Main locations: root `package.json`, `bun.lock`, `tsconfig.json`, `oxlint.config.ts`, `oxlint.anti-slop.config.ts`, `knip.json`, `Dockerfile`, `bun-patches/`, `tools/oxlint/`, the eight package manifests, and the tracked `.env` / `eslint.config.js` decisions.

**Read first:** Spec "Sequence" and W3; decisions.md: 2026-10-27 - Bump the toolchain before refreshing ui and web; `.agents/skills/openchamber-change-discipline/SKILL.md`; AGENTS.md "Validation"; upstream `package.json` scripts (`bun check -b`).
**Covers:** W3, W11

**Check:** `bun install` then `bun install --frozen-lockfile` succeed from a clean state, and `bun run type-check`, `bun run lint`, `bun run test` and `bun run --cwd packages/electron type-check` all exit 0, and `bun pm ls electron` resolves 44.x. Real path: `bun run dev` serves the Web UI and `/api/agent/v1/ready` returns 200.

## Done when

- [x] `packageManager` is `bun@1.4.4`, TypeScript is ~7.0.2 in every workspace, oxlint and @oxlint/plugins are 1.88.0, Electron is ^44.9.3.
- [x] The root `type-check` uses the upstream contract (`bun check -b` plus the package checks) and passes.
- [x] Every `bun-patches/*` entry is either replaced by the upstream equivalent or retained with a reason; the deleted patches are gone.
- [x] The `eslint.config.js` deletion and the tracked `.env` deletion are decided and recorded; no ESLint/oxlint duplicate convention is left half-migrated.
- [x] Fork versions stay 3.0.0 / mobile 1.13.2; no upstream version string is adopted.
- [x] Upstream root docs (AGENTS.md, README.md, CONTRIBUTING.md, CHANGELOG.md, SECURITY.md) and `renovate.json`/`flake.*` are not adopted.

## Progress

**Dirty at start:** none.

**Parallel build on the coordinator's authorization.** Task 01 was built in parallel in `upstream-refresh-01`. Initial implementation was completed on `524a6b5351`. Once task 01 landed on `upstream-refresh/integration` at `d1cf3704f8`, this branch rebased onto `d1cf3704f8`.

**Rebase onto integration (d1cf3704f8):**
- Intermediate SDK example workspace add/remove in `bun.lock` squashed cleanly into the initial toolchain commit (`4feb40a115`).
- Conflicted manifests merged keeping task 01's `simple-git` ^4.0.2 in `package.json`, `packages/ui/package.json`, `packages/web/package.json` alongside task 02's toolchain upgrades (`typescript` ~7.0.2, `packageManager` bun@1.4.4, `oxlint`/`@oxlint/plugins` 1.88.0, `electron` ^44.9.3, `bun-pty` 0.5.1, `react-virtual` 3.14.21).
- `LegacyDataNotice` helper conflict resolved by accepting task 01's `legacyDataNoticeHelpers.ts` and removing task 02's duplicate `packages/ui/src/lib/legacy-data-notice.ts`.
- `bun.lock` regenerated with Bun 1.4.4 (`bun install`); `bun install --frozen-lockfile` confirmed clean.

**Toolchain setup (user-local, no system changes).** Bun 1.4.4 is not installed system-wide; it was fetched from the official release archive to `~/.local/opt/bun/v1.4.4/bun-linux-x64/bun` and linked as `~/.local/bin/bun-1.4.4`. Commands ran with that directory first on `PATH`; system bun remains 1.4.2. Node is v24.18.0.

**Commits landed on this branch:**
- `4feb40a115` build(toolchain): move to TypeScript 7, Bun 1.4.4, oxlint 1.88 and Electron 44
- `e3c724c539` chore(agent-service): prepare SDK declarations without the TypeScript JS API
- `3fb38c3ce7` refactor(ui): give the dirty-switch and author rules real modules
- `4421596ad0` fix(lint): clear the oxlint 1.88 findings the general config surfaces
- `fa1ff61589` docs(workflow): record the toolchain cutover decisions
- `79c35d6f9f` fix(ui): keep the extracted helpers inside the anti-slop boundary rules
- `d049198f25` docs(workflow): record task 02 checks, deviations and self-review

**Toolchain observed:** bun 1.4.4, Node v24.18.0, typescript 7.0.2, oxlint and @oxlint/plugins 1.88.0, electron 44.9.3 (`bun pm ls electron`), `packageManager` `bun@1.4.4`.

Check after:
- `bun install` with 1.4.4 and `bun install --frozen-lockfile`: exit 0 (`post-rebase-frozen-install.log`)
- `bun run type-check`: exit 0 (`post-rebase-type-check.log`)
- `bun run lint`: exit 0 (`post-rebase-lint.log`)
- `bun run dead-code`: exit 0, inspected (`post-rebase-dead-code.log`)
- `bunx oxlint -c oxlint.config.ts` on all changed files: exit 0 (`post-rebase-oxlint.log`)
- `bunx oxlint -c oxlint.anti-slop.config.ts` on authored files: clean, 0 findings.
- `VITEST_MAX_WORKERS=2 bun run test`: exit 0; 7/7 suites passed (374 test files passed, 9 skipped; 6086 tests passed, 128 skipped) (`post-rebase-test.log`).
- `bun pm ls electron`: resolves 44.9.3.
- Real path: `OPENCHAMBER_DATA_DIR` isolated under `/tmp/ohpi-02-data-post-rebase`, `bun run dev` served UI at `http://127.0.0.1:5180` (HTTP 200, title "OpenChamber - AI Coding Assistant") and `/api/agent/v1/ready` on port 3902 returned 200 `{"ready":true,"engine":"omp","version":"1.0.0"}` (`post-rebase-dev.log`).

**Deviations and their reasons:**
- `packages/sdk/examples/source-control-provider/package.json` is not adopted in task 02; deferred to task 04 where the SDK source-control contribution and remaining examples are added.
- `openchamber/no-physical-sides` is wired in `oxlint.config.ts` and set to `off` until task 20 (RTL conversion) converts the 881 existing physical class occurrences.
- `@ark/schema@0.56.2` dropped from `patchedDependencies` as it is no longer installed.

**Finished:** 2026-10-27T05:25:00+08:00
