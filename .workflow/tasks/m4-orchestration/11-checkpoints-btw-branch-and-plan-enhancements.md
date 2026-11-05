# 11: Wire checkpoint/rewind tools, /btw branch promotion (branchFromBtw), and Plan mode enhancements

**Effort:** m4-orchestration
**Task type:** feature
**Blocked by:** 04
**Files:** `packages/agent-contract/src/session.ts`, `packages/agent-service/src/worker/session.ts`, `packages/agent-service/src/worker/mode.ts`, `packages/agent-service/src/worker/session-native.test.ts`, `packages/ui/src/components/chat/btw/BtwPanel.tsx`, `packages/ui/src/components/chat/btw/useBtwPanelState.ts`, `packages/ui/src/components/chat/PlanReviewCard.tsx`
**Read first:** `.workflow/specs/m4-orchestration.md`; `.workflow/research/omp-tui-parity-audit.md` (§1.6, §2)
**Covers:** W14
**Check:** `bun test packages/agent-service/src/worker/session-native.test.ts packages/ui/src/components/chat/` and `bun run type-check` exit 0.

- [ ] Wire `checkpoint` and `rewind` tool state rehydration and `#applyRewind` (`branchWithSummary` + `rewind-report` entry projection) in `packages/agent-service/src/worker/session.ts`.
- [ ] Add `btw.branch` (`branchFromBtw`) control in `worker/session.ts` and a "Promote to Branch" + `<inject>` steering action in `BtwPanel.tsx`.
- [ ] Support deferred mid-run Plan mode entry in `worker/mode.ts` (arming Plan mode for turn completion instead of throwing 409 `RUN_ACTIVE`), `plan.autosave`, and execution model selection in `PlanReviewCard.tsx`.
