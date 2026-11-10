# 13: Resolve the merge in the chat UI

**Effort:** ux-v270-omp-alignment
**Blocked by:** 11
**Covers:** W1, W2
**Files:** `packages/ui/src/components/chat/**`
**Read first:** spec "How it is built" (Merge); `merge-lanes.tsv` lane 13; `research/ux-v270-systemic-review.md` R1 and R3; skills `ui-api-decoupling`, `sync-state-invariants`, `locale-ui-patterns`
**Check:** in a worktree on the scaffold branch, `bun scripts/upstream-drift.mjs --markers --lane 13` → 0; `bun run --cwd packages/ui type-check` reports no error located under `components/chat/`; `bun scripts/upstream-drift.mjs --check -- packages/ui/src/components/chat` → 0 `unexplained`

- [ ] Resolve the conflicted chat paths with the merge rule. Adopt upstream's message parts, including `ShownToolCard`, `HtmlRenderFrame`, `UiPageFrame`, `OpenChamberToolOutput`, `ToolResultParts`, the subagent UI block, text direction and the composer's `oc-surface-floating`/`oc-composer-sheen` surface. Keep only the OMP-boundary data access.
- [ ] Restore upstream chat files the fork silently deleted (no ledger row) unless a decision retires them; record the decision reference when one does.
- [ ] Do not redesign chat semantics here; the R3 cutover (tasks 23-24) starts from this merged state.
- [ ] Deletes: fork rewrites of chat files whose delta carries no OMP-boundary reason.
