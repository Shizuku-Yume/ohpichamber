# 07: Reproduce or close the unconfirmed review findings

**Effort:** post-m3-hardening
**Task type:** spike
**Base commit:** <commit-sha>

**Delivers:** Answer to: which of the review findings below are real bugs? Each gets "confirmed, bugfix task NN drafted" or "not a bug" with evidence.

**Blocked by:** None
**Files:** `packages/agent-service/src/supervisor/workers.ts` (spawn 277-282, stop 383-403); `packages/agent-service/src/worker/shell.ts` (277-291); `packages/agent-service/src/sessions/registry.ts` (311-314, 433-448); `packages/ui/src/stores/globalSessions.ts` (54-58); `packages/ui/src/stores/useGlobalSessionsStore.ts` (284-288); `packages/ui/src/sync/session-actions.ts` (`optimisticSend`, 1630-1692); `packages/ui/src/lib/reviewFlow.ts` (371-396); `.workflow/omp-migration/contracts.md` line 127; `packages/web/server/lib/openchamber-sessions/routes.js` line 491

**Read first:** `.workflow/specs/post-m3-hardening.md`; `/home/shizuku/Project/ohpichamber-omp-artifacts/post-m3-review-2026-10-23/``AgentServiceReview.md` findings 4, 5, 8 and `UIReview.md` findings 2-3; `.workflow/spike-tasks.md`; `packages/ui/src/sync/DOCUMENTATION.md` lines 46-49 and 304-308
**Covers:** H6

**Check:** Each item has a recorded reproduction attempt (command, input, output) and a conclusion in `## Findings`; every confirmed item has a drafted bugfix task in this effort; `.workflow/bin/workflow validate` passes.

## Done when

- [ ] Worker descendants: does a shell child survive worker stop on Linux? Workers are not spawned in their own process group and stop kills only the direct PID.
- [ ] Cold snapshot cursor: does a cursor returned for a cold deleted-space snapshot fail on the next replay?
- [ ] Project-scoped discovery errors: can a `projectId`-scoped error make `useGlobalSessionsStore` drop that project's known sessions?
- [ ] `optimisticSend`: is "no optimistic insert" intended under native ID allocation? If yes, the function name, the unused `_optimisticAdd`/`_optimisticRemove` guards and the sync docs are aligned as a docs/refactor task; if no, it is a regression.
- [ ] Route drift: `PATCH /sessions/:id` in contracts versus `/sessions/:id/metadata` in the Host; decide which is right and draft the fix.
- [ ] Time box: one reproduction attempt per item. Do not re-investigate the `sync-context.tsx:180` reattach finding; it was a false positive.
