# 20: One model-selector grammar for every layer (R7)

**Effort:** ux-v270-omp-alignment
**Blocked by:** 19
**Covers:** W8
**Files:** `packages/agent-contract/src/modelSelector.ts` (+ test); `packages/ui/src/lib/modelIdentifier.ts`; `packages/ui/src/lib/smallModelRequest.ts`; `packages/ui/src/lib/modelDisplay.ts`; `packages/ui/src/lib/quota/model-families.ts`; `packages/ui/src/lib/routing/contextWindowLimits.ts`; `packages/ui/src/hooks/useContextWindowLimits.ts`; `packages/ui/src/components/chat/PlanReviewCard.tsx`; `packages/ui/src/components/chat/workflows/WorkflowAgentsView.tsx`; `packages/ui/src/components/sections/openchamber/{DefaultsSettings,GitSettings,OmpSettingsPage}.tsx` (parse/format helpers only); `packages/web/server/lib/{small-model,limit-failover,workflows,openchamber-control,scheduled-tasks}/`; `packages/web/server/lib/session-defaults.js`; `packages/agent-service/src/worker/{mode,catalog-models,catalog-agents}.ts`; oxlint config
**Read first:** `research/ux-v270-systemic-review.md` R7; OMP `pi-tui/overlays/model-selector` (`parseModelString`, `splitThinkingSuffix`, `formatModelSelectorValue`) and `pi-coding-agent/config/model-resolver`; skill `openchamber-change-discipline`
**Check:** `bun --cwd packages/agent-contract test && VITEST_MAX_WORKERS=2 bunx vitest run packages/ui/src/lib packages/web/server/lib/small-model && bun run lint` → exit 0, with the round-trip test passing `provider/model:high`, `provider/model:max`, `:auto`, `#variant`, `@upstream`, and the model-ref rule reporting zero sites; real path: with the small-model role set to `provider/model:high`, AI Rename renames a session

- [ ] Add `parseModelSelector`/`formatModelSelector` to `@openchamber/agent-contract`, porting OMP's grammar verbatim: thinking-level suffix, `:auto`, the `:max` literal-id guard, abbreviations, `#variant`, `@upstream`. Roles resolve with OMP's fallback to `default`.
- [ ] Route every parser, formatter and `${provider}/${modelId}` comparison in UI, Host and Agent Service through it (the review counts 14 parsers, 12 formatters, 31 comparisons; re-locate them on the merged tree). Small-model requests map the thinking level to reasoning effort instead of discarding the role.
- [ ] Add an oxlint `no-restricted-syntax` rule rejecting ad-hoc `/`/`:` splitting and template joins on model-ref operands outside the selector module.
- [ ] Deletes: `parseModelIdentifier`, `parseRoleSelector`, `splitRoleSelector`, the `KNOWN_EFFORTS` copies, `parseModelRef` and the other private splitters.
