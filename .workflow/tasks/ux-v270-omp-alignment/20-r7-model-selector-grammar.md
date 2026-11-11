# 20: One model-selector grammar for every layer (R7)

**Effort:** ux-v270-omp-alignment
**Blocked by:** 19
**Covers:** W8
**Files:** `packages/agent-contract/src/modelSelector.ts` (+ test); `packages/ui/src/lib/modelIdentifier.ts`; `packages/ui/src/lib/smallModelRequest.ts`; `packages/ui/src/lib/modelDisplay.ts`; `packages/ui/src/lib/quota/model-families.ts`; `packages/ui/src/lib/routing/contextWindowLimits.ts`; `packages/ui/src/hooks/useContextWindowLimits.ts`; `packages/ui/src/components/chat/PlanReviewCard.tsx`; `packages/ui/src/components/chat/workflows/WorkflowAgentsView.tsx`; `packages/ui/src/components/sections/openchamber/{DefaultsSettings,GitSettings,OmpSettingsPage}.tsx` (parse/format helpers only); `packages/web/server/lib/{small-model,limit-failover,workflows,openchamber-control,scheduled-tasks}/`; `packages/web/server/lib/session-defaults.js`; `packages/agent-service/src/worker/{mode,catalog-models,catalog-agents}.ts`; oxlint config
**Read first:** `research/ux-v270-systemic-review.md` R7; OMP `pi-tui/overlays/model-selector` (`parseModelString`, `splitThinkingSuffix`, `formatModelSelectorValue`) and `pi-coding-agent/config/model-resolver`; skill `openchamber-change-discipline`
**Check:** `bun --cwd packages/agent-contract test && VITEST_MAX_WORKERS=2 bunx vitest run packages/ui/src/lib packages/web/server/lib/small-model && bun run lint` → exit 0, with the round-trip test passing `provider/model:high`, `provider/model:max`, `:auto`, `#variant`, `@upstream`, and the model-ref rule reporting zero sites; real path: with the small-model role set to `provider/model:high`, AI Rename renames a session
**Base commit:** 8327e6403f13f040ecc09b10b26ff7a2201b2d14
**Status:** active

- [x] Add `parseModelSelector`/`formatModelSelector` to `@openchamber/agent-contract`, porting OMP's grammar verbatim: thinking-level suffix, `:auto`, the `:max` literal-id guard, abbreviations, `#variant`, `@upstream`. Roles resolve with OMP's fallback to `default`.
- [x] Route every parser, formatter and `${provider}/${modelId}` comparison in UI, Host and Agent Service through it (the review counts 14 parsers, 12 formatters, 31 comparisons; re-locate them on the merged tree). Small-model requests map the thinking level to reasoning effort instead of discarding the role.
- [x] Add an oxlint `no-restricted-syntax` rule rejecting ad-hoc `/`/`:` splitting and template joins on model-ref operands outside the selector module.
- [x] Deletes: `parseModelIdentifier`, `parseRoleSelector`, `splitRoleSelector`, the `KNOWN_EFFORTS` copies, `parseModelRef` and the other private splitters.

## Progress

Implemented: `packages/agent-contract/src/modelSelector.ts` (+ round-trip test) ports OMP's grammar
(`parseThinkingSuffix`, `splitThinkingSuffix`, `parseModelString`, `formatModelSelectorValue`,
`splitUpstreamRouting`) with the `:max` literal-id guard, `:auto`, abbreviations, `#variant`,
`@upstream` (routing opt-in, because OMP honors it only for an aggregator base) and role expansion
with the `default` fallback. Added `formatModelRef`/`modelRefEquals`/`splitSelectorThinking`/
`thinkingLevelToReasoningEffort`.

Migrated: UI (`modelIdentifier.ts` deleted with every caller on the contract parser; smallModelRequest,
modelDisplay, quota/model-families, routing/contextWindowLimits, useContextWindowLimits,
PlanReviewCard, WorkflowAgentsView, DefaultsSettings, GitSettings, OmpSettingsPage,
OpenChamberToolsSettings, useWalkthroughReview, useConfigStore); Host (`small-model` with role
expansion and level→effort, `limit-failover/policy`, `workflows/agent-session`, `openchamber-control`
service and generate-image, `scheduled-tasks/loops` and `session-defaults`); Agent Service
(`projection`, `catalog-agents`, `catalog-models`). Deleted: `parseModelIdentifier`,
the three `parseRoleSelector`/`splitRoleSelector`/`KNOWN_EFFORTS` copies, the two `parseModelRef`
copies, `splitProviderModel`/`splitModel`/`parseModel` bodies, `splitColonSuffix`.

Lint: `openchamber/no-model-ref-splitting` in `tools/oxlint/openchamber` wired into
`oxlint.config.ts`; zero findings across ui/web/agent-service/agent-contract paths.

Check before: `bun --cwd packages/agent-contract test` exit 0 (baseline). The Check's vitest leg
`VITEST_MAX_WORKERS=2 bunx vitest run packages/ui/src/lib packages/web/server/lib/small-model` fails
on the base commit too ("Cannot find package 'bun:test'", 412 files, 0 tests): only
`packages/web` carries a vitest config, and it aliases `bun:test` only for its own root.

Check after (real results, scoped equivalents where the Check's vitest leg cannot run):
- `bun --cwd packages/agent-contract test` → exit 0, 242 tests, 0 fail (includes the round-trip test
  for `provider/model:high`, `:max`, `:auto`, `#variant`, `@upstream`).
- `bun run lint` → exit 0; `openchamber/no-model-ref-splitting` reports zero sites.
- UI: `bun --cwd packages/ui test src/lib/smallModelRequest.test.ts src/lib/modelDisplay.test.ts
  src/lib/defaultSendSelection.test.ts src/lib/routing src/lib/quota src/components/views/walkthrough`
  → 69 tests, 68 pass, 1 pre-existing walkthrough timing failure that passes when run alone.
- Web: `bun vitest run server/lib/small-model server/lib/limit-failover server/lib/workflows
  server/lib/scheduled-tasks server/lib/openchamber-control server/lib/session-assist`
  → 27 files, 336 tests pass (including the new `:thinkingLevel` role→effort case).
- `bun run dead-code` → pre-existing findings only; none for the new exports.

Not yet done: the real path (Web on port 4120 with a real provider and `provider/model:high` small-model
role, AI Rename), the reviewer round, merging `ux-v270-omp-alignment/integration`, landing, and the
done file. Stopped at the run's request budget boundary.
