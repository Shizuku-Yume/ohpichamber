# 20: Move operational session metadata to Host persistence

**Effort:** omp-through-m3
**Task type:** feature
**Base commit:** <commit-sha>

**Delivers:** Goals, assist recap, context cursor, pinned notes, folders and retention metadata persist under the Host Gateway independently of the agent transcript or OpenCode session endpoints.

**Blocked by:** 04
**Files:** `packages/web/server/lib/openchamber-sessions/`, Host metadata store/routes, metadata consumers and owning documentation

**Read first:** `.workflow/specs/omp-through-m3.md` M2 ownership prerequisite; architecture ADR-04; `packages/web/server/lib/openchamber-sessions/session-metadata-store.js`; `packages/web/server/index.js` metadata composition; nearest module documentation
**Covers:** W2, W9

**Check:** `node scripts/run-isolated-tests.mjs packages/web/server/lib/openchamber-sessions` plus a temporary Host restart scenario → write/read goal, recap, cursor, pins and folders after restart with no OpenCode metadata endpoint; failed writes preserve valid previous data. Remove the temporary scenario after recording evidence.

- [ ] Inventory metadata consumers before changing their persistence owner.
- [ ] Keep only operational metadata in Host storage, never copy the OMP conversation transcript.
- [ ] Make missing versus corrupt metadata and write failure explicit; retain unrelated valid session data.
- [ ] Preserve applicable existing Host metadata through an explicit conversion where needed; do not automatically import OpenCode transcripts.
- [ ] Remove the OpenCode metadata accessor once retained callers use Host persistence.
