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

Base `7cc282d08504afc88d1531b6ba527009de3b0794`; implementation source is in prior Task20 commits through `8228fca7fe9bc9e8ed42c326fe3518f004178d82`. Scope `.workflow/omp-migration/scope.md:354-357` reserves selected credential import for Task22 and retires legacy importer/readers at Task17. The notice never calls that API. Its in-app user click reuses `ModelControls.tsx:356,480-483`: set `settingsProvidersConnectRequested` true, open Providers settings/dialog without page reload, then dismiss; ProvidersPage consumes the flag to open its existing add-provider flow. Host receipt `/home/shizuku/Project/ohpichamber-omp-artifacts/task20-2026-10-23/host-vitest.log`: 33/33 pass, exit 0. Rendered UI receipt `/home/shizuku/Project/ohpichamber-omp-artifacts/task20-2026-10-23/ui-rendered.log`: 3 pass/0 fail/11 expectations, exit 0, confirms notice presence/dismiss/remount/clean absence and provider connect flag/settings transition. Host API response is `{present:boolean}`; helper checks existence only. Route smoke `/home/shizuku/Project/ohpichamber-omp-artifacts/task20-2026-10-23/route-ui-smoke.json` is helper/Express smoke only.

Root-gate evidence lineage: the coordinator-designated full-suite receipt is green at HEAD `eb53d38d277b0b8f6808477e0a9bebe138e34b94` (7/7 suites); it predates the current `fb3ac597306d96aeabd3eeb3432be20eb141e686` provider-connect UI change, so current source is not covered and no full rerun was authorized. An earlier distinct run at HEAD `ce4fc1eb8ff10c1a4ce5734f38fa03d584688cae` has exit 1 in `full-root-gate-exit.json`; its log records agent-service `INVALID_REQUEST` and Web `EXDEV`, with TMPDIR device 54 versus worktree device 53. Do not conflate these receipts. Browser CLI full and targeted attempts timed out at 60 seconds; no actual browser surface evidence. Task remains active/unarchived pending fresh review and acceptance.
