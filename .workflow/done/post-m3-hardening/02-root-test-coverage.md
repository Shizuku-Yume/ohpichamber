# 02: Run every package in the root test and CI

**Effort:** post-m3-hardening
**Task type:** feature
**Base commit:** c74823e17
**Started:** 2026-10-23T06:03:27Z
**Status:** active

**Delivers:** `bun run test` runs `agent-service` and `agent-contract` too, keeps running later packages when one fails, and reports a combined exit code; CI runs the same command.

**Blocked by:** 01
**Files:** root `package.json` (`test` script, line 47 at `842a48adc`); `packages/agent-service/package.json`; `packages/agent-contract/package.json`; `scripts/run-isolated-tests.mjs` if it owns the chain; `.github/workflows/oc-review.yml`

**Read first:** `.workflow/specs/post-m3-hardening.md`; `/home/shizuku/Project/ohpichamber-omp-artifacts/post-m3-review-2026-10-23/``GateRerun.md` findings 6-7; `.workflow/standards.md` "Running it"
**Covers:** H1

**Check:** `bun run test` → output includes the `agent-service` (221 pass / 7 skip at `842a48adc`) and `agent-contract` (177 pass) results and exits 0. Then make one UI test fail temporarily: Electron and Web still run and the command exits non-zero. Revert the temporary failure.

## Done when

- [x] Both new packages have a `test` script.
- [x] The aggregate collects every package's exit instead of stopping at the first failure.
- [x] `oc-review.yml` runs the aggregate and needs no separate step per package.
- [x] `standards.md` "Running it" still describes the right command (`bun run test`).

## Progress

Dirty at start: none (worktree clean at `c74823e17`).

Check before:
- Root `test` was `node scripts/run-isolated-tests.mjs scripts && ...` — `&&` stops at the first failing package, and `packages/agent-service` had no `test` script while neither it nor `agent-contract` appeared in the chain.

Implementation:
- `scripts/run-isolated-tests.mjs --suites` runs every package test script in order, continues after failures, prints each suite, and exits 1 if any failed. Root `test` calls that mode; the file-test mode is unchanged.
- `packages/agent-service/package.json` gains a `test` script with a 15 s per-test timeout; the two credential-reopen tests complete in about 7 s on this machine and exceeded Bun's 5 s default (assertions unchanged). `packages/agent-contract` already had `bun test src`.
- `.github/workflows/oc-review.yml` runs the aggregate once; the redundant per-package Electron steps were removed because the Electron package `test` script already runs those files.

Check after (landing run on rebased `f56861c21`, log `/home/shizuku/Project/ohpichamber-omp-artifacts/task02-2026-10-23/landing-root-test-2.log`):
- `bun run test` → exit 0, `[workspace-test] 7/7 suites passed`: scripts 22/22 files, sdk 23/23, ui 804/804, agent-contract 177 pass / 0 fail, agent-service 225 pass / 7 skip / 0 fail, electron 44/44, web 373 passed / 9 skipped files and 6102 passed / 135 skipped tests.
- Failure injection (run before the rebase): added a failing UI test; `bun run test` exited 1 with UI `803/804 test files passed, 1 failed`, and agent-contract, agent-service (221/7/0), electron (44/44) and web (371/9, 6095/135) still ran. Temporary test removed before every green run; the injection was not repeated.
- `scripts/run-isolated-tests.mjs` file-test mode still passes its own `scripts` suite;
- `bun run --cwd packages/ui type-check` and `bun run --cwd packages/ui lint` were green on the task 01 landing; this task changes no TypeScript source.

**Finished:** 2026-10-23T06:33:27Z
