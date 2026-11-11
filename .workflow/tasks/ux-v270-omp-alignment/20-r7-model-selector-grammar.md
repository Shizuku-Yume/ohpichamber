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
`VITEST_MAX_WORKERS=2 bunx vitest run packages/ui/src/lib packages/web/server/lib/small-model` cannot
run from the repo root, at baseline or on this branch: 412 files fail with
`Cannot find package 'bun:test'`. The only vitest config in the tree is `packages/web/vitest.config.ts`,
which shims `bun:test` through `test/bun-test-shim.ts` and aliases `@/` for the web root only;
`bunx vitest run --root ../ui` from `packages/web` applies no aliases at all (1,224 files, 0 tests).
`packages/ui` has no vitest config because its suites are `bun:test` files run one process per file by
`scripts/run-isolated-tests.mjs` (module-level singletons and mixed runners make a shared process fail
by load order). The equivalent legs below are the ones the packages themselves run.

Check after (real results, scoped equivalents where the Check's vitest leg cannot run):
- `bun --cwd packages/agent-contract test` → exit 0, 242 tests, 0 fail (includes the round-trip test
  for `provider/model:high`, `:max`, `:auto`, `#variant`, `@upstream`).
- `bun run lint` → exit 0; `openchamber/no-model-ref-splitting` reports zero sites.
- UI, the vitest leg's equivalent: `bun --cwd packages/ui test src/lib 2>&1` (the package's isolated
  runner, one process per file) plus `bun --cwd packages/ui test src/components/views/walkthrough`.
  The first combined `bun test` invocation over both roots reported 68/69 with one walkthrough failure;
  run alone the walkthrough suite passes three times out of three, and its failure text is a mock leak
  from a sibling `src/lib` file ("Unexpected git directories response"), so the flake is cross-file
  state, unrelated to this diff and pre-existing.
- Web: `bun vitest run server/lib/small-model server/lib/limit-failover server/lib/workflows
  server/lib/scheduled-tasks server/lib/openchamber-control server/lib/session-assist`
  → 27 files, 336 tests pass (including the new `:thinkingLevel` role→effort case).
- `bun run dead-code` → pre-existing findings only; none for the new exports.

## Real path

Web on port 4120 (`bun server/index.js --port 4120`) with the real provider env. The live
`modelRoles` record already stored suffixed values (`CLIProxyAPI/gemini-3.8-flash:high`), the exact
shape the old parser mis-split. Set `smol` to `CLIProxyAPI/claude-haiku-5-5:high` (a real model from
the workspace catalog that advertises `high`), then ran the sidebar's "使用 AI 重命名" (AI Rename)
on the session titled `Ready confirmation exchange`. Result: the session title became
`Ready confirmation`, read back from `GET /api/agent/v1/sessions`. Server closed afterwards; no secret
appears in the server log.

## Review

One `reviewer` round on `8327e6403..HEAD`; every blocking finding fixed:
- Settings lost `:max`/`:auto` and literal ids: `splitSelectorThinking` now receives the catalog's
  literal-id lookup in Defaults, Git and OMP Settings, so a suffix the catalog claims stays in the id.
- A cyclic or unparseable configured role silently fell through to the composer model: both the UI
  and Host small-model paths now distinguish "not configured" from "configured but unresolvable" via
  `isRoleConfigured` and fail instead of redirecting.
- An inner alias's `:level` overrode the outer one: the outermost level now wins.
- A carried level was appended after `#variant`, which put it inside the variant: it is now formatted
  into the parsed selector, so `provider/model:high#route` reads back.
- Native array-valued roles threw on `.trim()`: `ModelRoleValues` accepts `string | readonly string[]`
  and expands from the first entry.
- `#variant` was dropped from utility completions: both small-model paths forward it.
- The lint rule missed camel-case and bare-identifier joins and excluded `.js`: fixed, and the rule now
  sits at the top level of `oxlint.config.ts`. That surfaced 46 real sites across UI/Host/service which
  are all migrated onto `modelRefKey`/`modelRefInstanceKey`/`formatModelRef`.
