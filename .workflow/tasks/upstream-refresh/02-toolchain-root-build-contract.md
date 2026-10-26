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

### Progress record (awaiting task 01)

**Branch:** `upstream-refresh/02-toolchain-root-build-contract`, worktree `/home/shizuku/Project/ohpichamber-worktrees/upstream-refresh-02`. Working tree clean at `0d592b5ff4`.

**Commits**
- `39412d7a83` build(toolchain): move to TypeScript 7, Bun 1.4.4, oxlint 1.88 and Electron 44
- `f8022630d3` chore(agent-service): prepare SDK declarations without the TypeScript JS API
- `a6b92f80f3` refactor(ui): give the dirty-switch and author rules real modules
- `6889413d53` fix(lint): clear the oxlint 1.88 findings the general config surfaces
- `489be48ce2` docs(workflow): record the toolchain cutover decisions
- `d2533b5540` fix(ui): keep the extracted helpers inside the anti-slop boundary rules
- `0d592b5ff4` build(lockfile): drop the deferred SDK example workspace

**Toolchain observed:** bun 1.4.4 (user-local at `~/.local/opt/bun/v1.4.4/bun-linux-x64/bun`, linked `~/.local/bin/bun-1.4.4`; system bun stays 1.4.2), Node v24.18.0, typescript 7.0.2, oxlint and @oxlint/plugins 1.88.0, electron 44.9.3 (`bun pm ls electron`), `packageManager` `bun@1.4.4`.

**Checks (logs in `/home/shizuku/Project/ohpichamber-omp-artifacts/upstream-refresh-02-2026-10-27/`)**
- `bun install` with 1.4.4: exit 0; Electron 44.9.3 installed/repaired.
- `bun install --frozen-lockfile`: exit 0 (`Checked 1429 installs across 1576 packages`).
- `bun run type-check`: exit 0 — `bun check -b` (2,647 files, 5 projects) plus electron, agent-contract, agent-service and mobile package checks.
- `bun run lint`: exit 0, no findings.
- `bun run test`: exit 1 on one pre-existing ambient failure only — `server/lib/network-defaults.test.js` in web, `ApprovalPolicySchemaTooNewError` (the default state dir `~/.config/openchamber/host-approval-policies.sqlite` has `PRAGMA user_version = 2`, this branch supports 1). Proven unrelated: the same file fails on a clean `524a6b5351` checkout with the old toolchain (`11-base-web-network-defaults.log`), and passes on this branch with an isolated `HOME`/data dir. 6 of 7 workspace suites pass; all other 6,050 tests pass.
- `bun run dead-code`: exit 0 after removing one unused export; two non-failing configuration hints (`fix-deprecation.js`, `packages/web/bin/cli.js` entry patterns are redundant in knip instead). Inspected.
- `bunx oxlint` on created/rewritten files: general config clean; anti-slop findings only in pre-existing tunnel-client lines.
- Real path: `bun run dev` with `OPENCHAMBER_DATA_DIR` pointed at an isolated dir (the machine's default dir is blocked by the stale approval DB above) serves the UI at `http://127.0.0.1:5180` (200, title `OpenChamber - AI Coding Assistant`) and `/api/agent/v1/ready` returns 200 `{"ready":true,"engine":"omp","version":"1.0.0"}`. A chat send was not driven: the isolated data dir has no `settings.json` provider, and the operator provider file is consumed by the M0 harness, not the running app. Recorded as the stand-in limit.

**Deviations and their reasons**
- `packages/sdk/examples/source-control-provider/package.json` is **not** adopted: the fork's SDK manifest parser rejects it (`invalid-service`; the `sourceControl` contribution is newer than the parser). Task 04 owns the SDK contract and the rest of that example. Recorded in `decisions.md`.
- `openchamber/no-physical-sides` is wired in `oxlint.config.ts` and set `off` until task 20 converts the layout (881 existing physical classes). Recorded in `decisions.md`.
- `@ark/schema@0.56.2` left `patchedDependencies` because the package is no longer installed; the version override stays. Recorded in `decisions.md`.

**Self-review (flow-verify briefs, run by the implementer)**
- Boundary: `git diff 524a6b5351` over 60 paths — manifests, configs, root build, agent-service, ui relay/tests, workflow docs. Compared each extracted helper with its original body: `dirtySwitchPushTarget` identical; `commitAndSwitchDirtyBranch` keeps the commit → publish → toast → refresh → close → checkout order and the failed-push early return; `repositoryIdentityChoices`/`activeRepositoryIdentity` keep the completeness/connection and bound-account rules; `removeTemporaryFile` rethrows non-ENOENT exactly as the three inlined finally blocks did.
- Process: decisions recorded; no rule, severity or type weakened; no `any`, no new type assertion; version strings stay `3.0.0`/`1.13.2`; upstream root docs, `renovate.json` and `flake.*` untouched.
- Findings: (1) `event-stream.ts` now binds the subscription with `const`; safe because only `write`/`overflow`/the close handler call `stop`, and `journal.subscribe` never invokes the listener synchronously — verified in `projection/journal.ts`. (2) `service.ts` reads `this.sessions` where it previously mirrored it in a local; identical value at the same time. (3) The branch still carries an intermediate commit that adds the deferred example manifest before the docs commit removes it; the tip is correct and the branch is unlanded, so it can be squashed at rebase. (4) `bun run test` cannot be fully green on this machine until the stale `~/.config/openchamber` approval DB is cleared or the test isolates its data dir — pre-existing, not caused here.

**Landing status:** not landed. `upstream-refresh/integration` is at `a335fcaf6c` (a plan amendment moving the GHE token check to task 06) and does not yet contain `.workflow/done/upstream-refresh/01-*`. Awaiting task 01, then: rebase, regenerate `bun.lock` with Bun 1.4.4 keeping simple-git `^4.0.2`, rerun frozen install, type-check, lint and test, archive this file, `workflow validate`, fast-forward the integration branch, remove the task worktree and branch.
