# 19: Version Host SQLite schemas and document backup

**Effort:** post-m3-hardening
**Task type:** feature
**Base commit:** <commit-sha>

**Delivers:** Host SQLite stores carry a schema version with ordered migrations, refuse to open a newer schema, and have a documented backup and restore procedure that covers OMP data too.

**Blocked by:** None
**Files:** `packages/web/server/lib/host/metadata-sqlite.js` (44-120); the queue store and `approval-policy-store.js`; operator docs in `packages/docs` or `docs/`

**Read first:** `.workflow/specs/post-m3-hardening.md`; `/home/shizuku/Project/ohpichamber-omp-artifacts/post-m3-review-2026-10-23/``PlanGapAnalysis.md` finding 12; `.agents/skills/sync-state-invariants/SKILL.md`
**Covers:** H11

**Check:** Regressions: a fresh database gets the current `user_version`; an old-version fixture migrates once; a newer version is refused with an explicit error and no write. Then follow the documented backup and restore steps on a disposable `HOME` and confirm sessions, queue and metadata come back.

## Done when

- [ ] Backup covers Host SQLite files, OMP `agent.db` and session JSONL locations without exposing credentials.
- [ ] The leftover `message-queue.json` after conversion is documented (kept, renamed or removed) with its reason.
