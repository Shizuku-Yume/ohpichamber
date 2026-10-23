# 20: Tell existing OpenCode users what changed on first run

**Effort:** post-m3-hardening
**Task type:** feature
**Base commit:** <commit-sha>

**Delivers:** On the first OMP run, a user with existing OpenCode data sees a one-time notice saying their old sessions were not imported, where the old data stays, and how to sign in to providers again.

**Blocked by:** None
**Files:** Host startup or a Host route that reports legacy-data presence; a UI notice component; locale files

**Read first:** `.workflow/specs/post-m3-hardening.md`; `.workflow/omp-migration/scope.md` lines 349-357 (no transcript import, one-time credential handoff); `.agents/skills/locale-ui-patterns/SKILL.md`; `.workflow/STYLE.md` "Front-end text"
**Covers:** H11

**Check:** With a disposable `HOME` holding a fake OpenCode data directory, the notice appears once and stays dismissed after restart; with a clean `HOME` it never appears; the legacy directory is only checked for existence, never read.

## Done when

- [ ] No legacy file content is read or imported.
- [ ] The notice links to the credential handoff path that already exists.
