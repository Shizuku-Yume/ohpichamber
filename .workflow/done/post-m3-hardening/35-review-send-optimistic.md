# 35: Restore optimistic insertion for review-flow sends

**Effort:** post-m3-hardening
**Task type:** bugfix
**Base commit:** 342c8182e
**Started:** 2026-10-24T14:24:48Z
**Finished:** 2026-10-24T14:53:36Z

**Delivers:** A review-flow send displays its user message before the transport resolves, removes only that record on a definite failure, and reconciles it with the canonical message or history read on success.

**Blocked by:** None
**Files:** `packages/ui/src/sync/session-actions.ts` (`optimisticSend`, the wired `_optimisticAdd`/`_optimisticRemove` refs, and `sendMessage`'s accepted-run result); `packages/ui/src/lib/reviewFlow.ts` (only caller); `packages/ui/src/lib/reviewFlow.test.ts`; session-actions and message-loader tests

**Read first:** `.workflow/tasks/post-m3-hardening/07-review-findings-triage.md` Findings item 4; `UIReview.md` finding 2; `packages/ui/src/sync/DOCUMENTATION.md` item 9 and lines 304-308; `packages/ui/src/sync/session-message-loader.ts` optimistic add/remove/confirm

**Check:** A review-flow regression: the pending user message exists before `input.send` settles, a rejected send leaves no optimistic record, and a successful send reconciles to the canonical message without a duplicate. Current code never calls `_optimisticAdd`, so the first assertion fails.

## Done when

- [x] `optimisticSend` inserts a client-side pending user message before calling `input.send`.
- [x] A definite send failure removes only that unconfirmed record; a promoted canonical echo is never removed.
- [x] Success reconciles the optimistic record with the canonical message or history read and does not duplicate it.
- [x] The regression fails before the change and passes after it.
- [x] The helper's doc comment and `packages/ui/src/sync/DOCUMENTATION.md` describe the restored behavior.

## Progress

Started 2026-10-24T14:24:48Z on branch `post-m3-hardening/35-review-send-optimistic`, cut from landed `main` `342c8182e`. Dirty at start: none.

**Root cause.** `optimisticSend` still required the wired `_optimisticAdd`/`_optimisticRemove` refs but never called them. It only sent, refetched, and confirmed every loaded message, so the review-flow send had no pending transcript record and no targeted rollback.

**Check before.** With the base `session-actions.ts` restored (stash) and the new regression in place, 3 of 4 tests failed:
`bun test packages/ui/src/sync/session-actions.test.ts -t "review-flow optimistic send"` →
`(fail) ... inserts its pending user message before transport settles and removes only that record on a definite failure`, `(fail) ... keeps an accepted pending record until the canonical turn arrives, then removes it without duplication`, `(fail) ... does not mistake an earlier identical user message for this send's canonical record`; `1 pass, 3 fail`.

**Fix.** The action builds a client-generated pending `Message` (user role, text part) and inserts it through `optimisticAdd` before dispatch, then fires `onOptimisticInsert` at insertion instead of after the refresh. Any rejection removes that one pending ID through `optimisticRemove`; the loader refuses to remove a canonical record promoted under that ID. On acceptance it refetches authoritative history, then removes the pending record only once the canonical counterpart is visible. The normal path uses the accepted `Run` returned by `sendMessage`: the canonical turn's `userMessageId` identifies this send's message. When a caller returns no run, it falls back to a user message absent from the pre-send ID baseline and repeating the content. A store subscription finishes reconciliation when the canonical turn/message arrives live after the refresh.

**Check after.** `bun test packages/ui/src/sync/session-actions.test.ts -t "review-flow optimistic send"` → `4 pass, 0 fail`, 12 assertions. Focused suites: `bun test packages/ui/src/sync/session-actions.test.ts packages/ui/src/lib/reviewFlow.test.ts packages/ui/src/sync/session-message-loader.test.ts` → `126 pass, 0 fail`, 423 assertions. Consumer mocks updated for the `sendMessage` return contract: `bun test packages/ui/src/lib/btw.test.ts packages/ui/src/stores/useMultiRunStore.test.ts packages/ui/src/lib/multirun/fusion.test.ts` → `41 pass, 0 fail`, 231 assertions.

**Static checks.** `bun run type-check:ui` passes. Touched-file ESLint passes. `bun run --cwd packages/ui lint` reports only the pre-existing `react-refresh` errors in untouched `src/components/onboarding/LegacyDataNotice.tsx`; the same package lint excluding that file passes.

**Review boundary.** `342c8182e` + the task's paths and the `sendMessage` consumer mocks; round 1; briefs: A,B; boundaries: none (renderer-side optimistic transcript state, no trust boundary); findings: A 1 blocking / 1 nonblocking, B 0 blocking / 1 nonblocking. Both reviewers independently found that text-only matching could claim an earlier identical message. Fixed by run/turn correlation plus the pre-send ID baseline. Delta round A: pass, no blocking findings; only the previously missing before-fix evidence record, now included above. No security pass applies.

**Not run.** Full root `bun run test` was held for the coordinator's gate slot. The coordinator assigned no slot before this handoff; the candidate SHA and gate command are reported with the landing packet.

Scope note: `sendMessage` now returns its accepted `Run | null` so this caller can identify its canonical turn; every existing caller ignores the result. The three consumer test mocks were updated only for that return type.
