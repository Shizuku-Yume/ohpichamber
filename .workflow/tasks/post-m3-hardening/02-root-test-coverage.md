# 02: Run every package in the root test and CI

**Effort:** post-m3-hardening
**Task type:** feature
**Base commit:** <commit-sha>

**Delivers:** `bun run test` runs `agent-service` and `agent-contract` too, keeps running later packages when one fails, and reports a combined exit code; CI runs the same command.

**Blocked by:** 01
**Files:** root `package.json` (`test` script, line 47 at `842a48adc`); `packages/agent-service/package.json`; `packages/agent-contract/package.json`; `scripts/run-isolated-tests.mjs` if it owns the chain; `.github/workflows/oc-review.yml`

**Read first:** `.workflow/specs/post-m3-hardening.md`; `/home/shizuku/Project/ohpichamber-omp-artifacts/post-m3-review-2026-10-23/``GateRerun.md` findings 6-7; `.workflow/standards.md` "Running it"
**Covers:** H1

**Check:** `bun run test` → output includes the `agent-service` (221 pass / 7 skip at `842a48adc`) and `agent-contract` (177 pass) results and exits 0. Then make one UI test fail temporarily: Electron and Web still run and the command exits non-zero. Revert the temporary failure.

## Done when

- [ ] Both new packages have a `test` script.
- [ ] The aggregate collects every package's exit instead of stopping at the first failure.
- [ ] `oc-review.yml` runs the aggregate and needs no separate step per package.
- [ ] `standards.md` "Running it" still describes the right command.
