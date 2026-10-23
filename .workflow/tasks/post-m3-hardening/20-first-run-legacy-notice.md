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

Focused Host Vitest: 33/33 passed. UI behavior test: 1/1 passed. Disposable-HOME route smoke receipt: `/home/shizuku/Project/ohpichamber-omp-artifacts/task20-2026-10-23/route-ui-smoke.json`, output `{clean:{present:false},legacy:{present:true},dismissed:true,restarted:{present:true}}`; helper checks only existence. Full root gate with `TMPDIR=/tmp bun run test`: scripts 22/22 files, SDK 23/23, UI 805/805, agent-contract 177 pass, agent-service 229 pass/7 skip, Electron 44/44, Web 376 files passed/9 skipped and 6109 passed/135 skipped. Browser CLI smoke remains unavailable after two 60-second timeouts; no browser-surface claim. Task remains active and unarchived; no main merge.
