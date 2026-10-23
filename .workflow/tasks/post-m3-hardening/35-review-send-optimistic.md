# 35: Restore optimistic insertion for review-flow sends

**Effort:** post-m3-hardening
**Task type:** bugfix
**Base commit:** <commit-sha>

**Delivers:** A review-flow send displays its user message before the transport resolves, removes only that record on a definite failure, and reconciles it with the canonical message or history read on success.

**Blocked by:** None
**Files:** `packages/ui/src/sync/session-actions.ts` (`optimisticSend` 1630-1692 and the already-wired `_optimisticAdd`/`_optimisticRemove` refs); `packages/ui/src/lib/reviewFlow.ts` (only caller, 372-396); `packages/ui/src/lib/reviewFlow.test.ts`; session-actions and message-loader tests

**Read first:** `.workflow/tasks/post-m3-hardening/07-review-findings-triage.md` Findings item 4; `UIReview.md` finding 2; `packages/ui/src/sync/DOCUMENTATION.md` item 9 and lines 304-308; `packages/ui/src/sync/session-message-loader.ts` optimistic add/remove/confirm

**Check:** A review-flow regression: the pending user message exists before `input.send` settles, a rejected send leaves no optimistic record, and a successful send reconciles to the canonical message without a duplicate. Current code never calls `_optimisticAdd`, so the first assertion fails.

## Done when

- [ ] `optimisticSend` inserts a client-side pending user message before calling `input.send`.
- [ ] A definite send failure removes only that unconfirmed record; a promoted canonical echo is never removed.
- [ ] Success reconciles the optimistic record with the canonical message or history read and does not duplicate it.
- [ ] The regression fails before the change and passes after it.
- [ ] The helper's doc comment and `packages/ui/src/sync/DOCUMENTATION.md` describe the restored behavior.
