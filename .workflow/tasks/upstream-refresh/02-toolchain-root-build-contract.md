# 02: Toolchain and root build contract

**Effort:** upstream-refresh
**Task type:** refactor
**Base commit:** 524a6b5351ac2592e7bb94e69876cd7f4c3970ab
**Started:** 2026-10-27T03:25:00Z
**Status:** paused

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

## Progress

**Dirty at start:** none.

**Parallel build on the coordinator's authorization.** Task 01 is not landed yet (it is being built in `upstream-refresh-01`). The coordinator authorized building 02 in parallel because the only overlap is the manifests and `bun.lock` (01 takes `simple-git` 4.0.2). This branch is built from `upstream-refresh/integration` at `524a6b5351`, and 02 lands only after 01 is archived and landed: rebase onto the integration branch, regenerate `bun.lock`, then rerun every check.

**Toolchain setup (user-local, no system changes).** Bun 1.4.4 is not installed system-wide; it was fetched from the official release archive to `~/.local/opt/bun/v1.4.4/bun-linux-x64/bun` and linked as `~/.local/bin/bun-1.4.4`. Commands below run with that directory first on `PATH`; the system `bun` stays 1.4.2. Node is v24.18.0, above the required >=24.14.0, so no new Node archive was needed.

**Check before:** pending baseline run (`00-baseline-*` logs in the evidence directory).

### Handoff (paused mid-task)

**Where the work is:** worktree `/home/shizuku/Project/ohpichamber-worktrees/upstream-refresh-02`, branch `upstream-refresh/02-toolchain-root-build-contract`, everything uncommitted.

**Done in this session**
- Root manifest: `packageManager` `bun@1.4.4`, `typescript` ~7.0.2, `oxlint`/`@oxlint/plugins` 1.88.0, `bun-pty` 0.5.1, ESLint devDependencies removed, `type-check` = `bun check -b` plus electron/agent-contract/agent-service/mobile, `lint:anti-slop` = `oxlint -c oxlint.anti-slop.config.ts`, `patchedDependencies` swapped to the upstream patch names.
- `bun-patches`: adopted upstream `@legendapp%2Flist@3.6.0.patch`, `@tanstack+virtual-core+3.19.6.patch`, `bun-pty@0.5.1.patch`; deleted `@tanstack+virtual-core+3.17.11.patch` and `bun-pty@0.4.8.patch` (upstream deleted both). `happy-dom@18.0.1.patch` retained (unchanged upstream).
- `ui` `@tanstack/react-virtual` 3.14.21 and `web` `bun-pty` 0.5.1 so the adopted patches apply.
- Root `tsconfig.json` adopted from upstream (no `baseUrl`, sdk reference, no vscode); `ui`/`web` tsconfigs converted off `baseUrl` for TS 7; `sdk` gained `types: ["node"]`; `electron` gained `allowImportingTsExtensions` (its JS imports reach `@openchamber/web` → agent-service `.ts` sources); `agent-contract` gained `types: ["node"]` + `@types/node`.
- `oxlint.config.ts` adopted (general lint, openchamber plugin) and `oxlint.anti-slop.config.ts` added; `tools/oxlint/openchamber/*` adopted. `knip.json` merged (new entries, fork workspaces kept). `Dockerfile` bun 1.4.4 in both stages.
- Deletions: `.env` and `eslint.config.js` (upstream deleted both); every workspace `lint` now calls `oxlint -c ../../oxlint.config.ts --report-unused-disable-directives`; `scripts/check-changed.mjs` and `scripts/anti-slop.mjs` point at the anti-slop config (both are task 03 paths — flag for 03).
- `openchamber/no-physical-sides` is wired but set `off` with a comment: 881 existing physical-side classes are task 20's RTL conversion; enabling now makes every build red.
- TS 7 fixes: `packages/agent-service/scripts/prepare-sdk-types.mjs` rewritten (no compiler JS API in TS 7; emits declarations through `tsc -p` with TS 7-relative `paths`, no `baseUrl`, tolerates only vendor `TS2883`); three tests that parsed source with the TS API rewritten against extracted helpers (`lib/source-control/dirty-branch-switch.ts`, `lib/source-control/authorSelection`-side helpers in `components/views/git/authorSelection.ts`, `lib/legacy-data-notice.ts`); `tunnel-client.ts` WebSocket send now normalizes ArrayBuffer-backed views; `getRandomValues` stubs, `frame.matches` stub, DOM-null guards in tests.
- oxlint 1.88 fixes: 28 agent-service findings (prefer-const, unused imports/params, empty catches documented, statement ternaries expanded, `finally` cleanup moved to `src/worker/temporary-file.ts`, MCP dispatch extracted, fallthrough removed, escape removed); UI findings (`LegacyDataNotice` helpers moved out, optional-chain guards, stale directives removed).
- bun 1.4.4 installed user-locally at `~/.local/opt/bun/v1.4.4/bun-linux-x64/bun`, linked as `~/.local/bin/bun-1.4.4`. Node v24.18.0 satisfies `>=24.14.0`.

**Checks run so far** (logs in `/home/shizuku/Project/ohpichamber-omp-artifacts/upstream-refresh-02-2026-10-27/`)
- `bun install` (1.4.4): ok, Electron 44.9.3 repaired and installed.
- `bun run type-check`: exit 0 (`05-type-check-try5.log`), before the last lint-driven edits; rerun started (`08-type-check-try6.log`).
- `bun run lint`: exit 0 (`07-lint-try2.log`).
- Not yet run: `bun install --frozen-lockfile`, `bun run test`, `bun run dead-code`, `bun pm ls electron`, the `bun run dev` real path with `/api/agent/v1/ready`.

**Not done:** rebase onto `upstream-refresh/integration` after 01 lands, lockfile regeneration after that rebase, the remaining checks, review (`flow-verify`), decisions entry for the ESLint cutover and the staged RTL rule, archive, commit and fast-forward landing.
