# 20: Tell existing OpenCode users what changed on first run

**Effort:** post-m3-hardening
**Task type:** feature
**Base commit:** 7cc282d08504afc88d1531b6ba527009de3b0794
**Started:** 2026-10-23T00:00:00Z
**Status:** active

**Delivers:** On the first OMP run, a user with existing OpenCode data sees a one-time notice saying their old sessions were not imported, where the old data stays, and how to sign in to providers again.

**Blocked by:** None
**Files:** Host startup or a Host route that reports legacy-data presence; a UI notice component; locale files

**Read first:** `.workflow/specs/post-m3-hardening.md`; `.workflow/omp-migration/scope.md` lines 349-357 (no transcript import, one-time credential handoff); `.agents/skills/locale-ui-patterns/SKILL.md`; `.workflow/STYLE.md` "Front-end text"
**Covers:** H11

**Check:** With a disposable `HOME` holding a fake OpenCode data directory, the notice appears once and stays dismissed after restart; with a clean `HOME` it never appears; the legacy directory is only checked for existence, never read.

## Done when

- [ ] No legacy file content is read or imported.
- [ ] The notice links to the credential handoff path that already exists.
## Progress

Base `7cc282d08504afc88d1531b6ba527009de3b0794`; implementation source is in prior Task20 commits through `8228fca7fe9bc9e8ed42c326fe3518f004178d82`. Host route receipt: `/home/shizuku/Project/ohpichamber-omp-artifacts/task20-2026-10-23/host-vitest.log`, 33/33 passed, exit 0 (`host-vitest-exit.json`). Rendered UI receipt: `/home/shizuku/Project/ohpichamber-omp-artifacts/task20-2026-10-23/ui-rendered.log`, 3 pass/0 fail/10 expects, exit 0 (`ui-rendered-exit.json`); asserts visible present notice, dismiss, unmount/remount persistence, Configure providers navigation, and clean Host absence. Host response is only `{present:boolean}`; helper uses existence check only. Route smoke artifact `/home/shizuku/Project/ohpichamber-omp-artifacts/task20-2026-10-23/route-ui-smoke.json` independently records clean absent, legacy present, dismissed, and same route present after Host restart.

Final full root gate: `TMPDIR=/tmp/omp-task20-final-20261024 bun run test`; metadata `/home/shizuku/Project/ohpichamber-omp-artifacts/task20-2026-10-23/final-gate-meta.json`, output `/home/shizuku/Project/ohpichamber-omp-artifacts/task20-2026-10-23/final-root-gate.log`, exit receipt `/home/shizuku/Project/ohpichamber-omp-artifacts/task20-2026-10-23/full-root-gate-exit.json` reports exit 1 at HEAD `ce4fc1eb8ff10c1a4ce5734f38fa03d584688cae`, base `7cc282d08504afc88d1531b6ba527009de3b0794`. Suites: scripts 22/22; SDK 23/23; UI 805/805; agent-contract 177 pass; agent-service 228 pass/7 skipped/1 failure `catalog-plugins.test.mjs` native marketplace project install INVALID_REQUEST at `packages/agent-service/src/worker/catalog-plugins.ts:237`; Electron 44/44; Web 375 passed/9 skipped, 6108 passed/135 skipped/1 failure `packages/web/server/lib/spaces/code-in.test.js` EXDEV rename from `/tmp/oc-.../s` to the artifact TMPDIR. TMPDIR device 54 differs from worktree device 53. Both failures are outside Task20 changed paths; no unrelated changes. Browser CLI full and targeted attempts timed out at 60 seconds. Task remains active/unarchived, not ready.
