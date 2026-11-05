# 02: Fix auto routing thinking effort and unify small-model resolution on OMP modelRoles

**Effort:** m4-orchestration
**Task type:** bugfix
**Blocked by:** 01
**Files:** `packages/ui/src/components/sections/routing/RoutingPage.tsx`, `packages/ui/src/components/sections/routing/RoutingPage.test.tsx`, `packages/web/server/lib/routing/runtime.js`, `packages/web/server/lib/routing/runtime.test.js`, `packages/web/server/lib/host/prompt-delivery-runtime.js`, `packages/web/server/lib/host/prompt-delivery-runtime.test.js`, `packages/web/server/lib/small-model/index.js`, `packages/web/server/lib/small-model/index.test.js`, `packages/ui/src/lib/smallModelRequest.ts`, `packages/ui/src/lib/smallModelRequest.test.ts`, `packages/ui/src/lib/gitApi.ts`, `packages/ui/src/components/sections/openchamber/DefaultsSettings.tsx`, `packages/ui/src/components/sections/openchamber/SessionWarmingCheckbox.test.tsx`, `packages/web/server/lib/host/settings-helpers.js`, `packages/web/server/lib/host/settings-registry.json`, `packages/ui/src/lib/settings/registry.ts`
**Read first:** `.workflow/specs/m4-orchestration.md`; `.workflow/decisions.md` (2026-11-05 - Fix auto routing effort mapping and unify small-model resolution on OMP modelRoles); `packages/web/server/lib/routing/DOCUMENTATION.md`
**Covers:** W2, W3
**Check:** `bun test packages/ui/src/components/sections/routing/ packages/ui/src/lib/smallModelRequest.test.ts` and `bunx vitest run server/lib/routing server/lib/small-model server/lib/host/prompt-delivery-runtime.test.js server/lib/host/settings-helpers.test.js` in `packages/web` exit 0.
- **Base commit:** a4871c9d0365bd61b90d3f113b8d658c484caaaf

- [x] `RoutingPage.tsx` removes `AgentSelector` from routing categories and replaces `useModelVariants` (`model.variants`) with `model.reasoningOptions` (`off` plus supported thinking efforts).
- [x] `routing/runtime.js` and `prompt-delivery-runtime.js` stop setting `options.agentId` (keeping `agentId: null`), validate the category's thinking effort against `model.reasoningOptions`, and write `options.reasoningEffort` on routed prompts.
- [x] `small-model/index.js` and `smallModelRequest.ts` resolve utility completions via OMP's `modelRoles` (`commit` role for `gitApi.ts` commit/PR generation, `smol` role for `session-assist`, `walkthrough`, `magic-prompts`, and `guests/generate`, falling back to `default` / active model).
- [x] `DefaultsSettings.tsx` and the settings registry remove the duplicate `smallModelOverride`, `smallModelUseDefault`, and `walkthroughModelOverride` controls.

## Progress

- **Check before:**
  - Baseline UI check: `bun test packages/ui/src/components/sections/routing/ packages/ui/src/lib/smallModelRequest.test.ts` passed (7 tests in 1 file; `RoutingPage.test.tsx` did not exist).
  - Baseline Web check: `bunx vitest run server/lib/routing server/lib/small-model server/lib/host/prompt-delivery-runtime.test.js server/lib/host/settings-helpers.test.js` in `packages/web` (5 test files, 131 tests passed; `prompt-delivery-runtime.test.js` did not exist).
  - Baseline defects confirmed:
    - `RoutingPage.tsx` rendered `AgentSelector` for category agents and mapped thinking levels from legacy `model.variants` instead of `model.reasoningOptions`.
    - `prompt-delivery-runtime.js` assigned `options.agentId = routing.agent ?? options.agentId` on routed prompts, which caused `openchamber/auto` sends to fail Host admission with HTTP 400 `INVALID_REQUEST`.
    - `small-model/index.js` and `smallModelRequest.ts` read duplicate Host overrides (`smallModelOverride`, `smallModelUseDefault`, `walkthroughModelOverride`) in `settings.json` instead of OMP's `modelRoles` (`smol`, `commit`, `default`).
    - `DefaultsSettings.tsx` rendered duplicate `smallModelOverride`, `smallModelUseDefault`, and `walkthroughModelOverride` fields.
- **Work:**
  - `RoutingPage.tsx`: Removed `AgentSelector` and agent fields; replaced `useModelVariants` (`model.variants`) with `useModelReasoningEfforts` (`model.reasoningOptions` with `off`).
  - `RoutingPage.test.tsx`: Added focused UI behavior tests verifying no `AgentSelector` is rendered and thinking select displays `reasoningOptions` with `off`.
  - `routing/runtime.js`: In `chooseSelection`, `toModelRef`, `withKnownVariant`, and `resolveAutoSelection`: stopped setting `agentId` (keeping `null`), validated thinking effort against `model.reasoningOptions`, and wrote `reasoningEffort`.
  - `prompt-delivery-runtime.js`: Stopped assigning `options.agentId`, forcing `options.agentId = null` and writing `options.reasoningEffort = routing.model.reasoningEffort ?? null`.
  - `prompt-delivery-runtime.test.js`: Added unit tests verifying `openchamber/auto` prompt capture rewrites `providerId`, `modelId`, `reasoningEffort` with `agentId: null`, passing Host prompt admission.
  - `small-model/client.js` & `small-model/index.js`: Removed `readSmallModelSettingsOverride` and `settings.json` readers; implemented `getModelRoles` from the Agent Service; resolved utility completions via OMP `modelRoles` (`smol` by default, `commit` when specified, falling back to `default`).
  - `smallModelRequest.ts`: Added `role` to `SmallModelRequest`; resolved models via OMP `modelRoles` (`commit` for git, `smol` for utility callers, falling back to `default`).
  - `gitApi.ts`: Specified `role: 'commit'` on commit message and PR description requests.
  - `WalkthroughBlocker.tsx`: Replaced `walkthroughModelOverride` with OMP `modelRoles.smol` setting mutation.
  - `DefaultsSettings.tsx`: Removed `smallModelOverride`, `smallModelUseDefault`, `walkthroughModelOverride` controls and unused state.
  - `settings/registry.ts`, `settings-helpers.js`, `settings-registry.json`, `settings-helpers.test.js`: Removed duplicate settings fields and updated tests.
- **Check after:** `bun test packages/ui/src/components/sections/routing/ packages/ui/src/lib/smallModelRequest.test.ts` passed (9 tests, 0 failures) and `bunx vitest run server/lib/routing server/lib/small-model server/lib/host/prompt-delivery-runtime.test.js server/lib/host/settings-helpers.test.js` in `packages/web` passed (6 test files, 133 tests passed, 0 failures).
  - Static analysis: `bunx oxlint ...` on all 18 authored/modified files (0 errors, 0 warnings).
  - Type-check: `bun run type-check:ui`, `bun run type-check:web`, and `bun run type-check` (0 type errors across all packages).
  - Real user/service smoke:
    - Dev server executed on assigned isolated ports `OPENCHAMBER_HMR_UI_PORT=5201`, `OPENCHAMBER_HMR_API_PORT=3931`.
    - Verified `RoutingPage`: 0 AgentSelectors, thinking efforts populated from `model.reasoningOptions`.
    - Verified `openchamber/auto` prompt send: captured, resolved to fallback model, rewritten with `agentId: null`, passed Host prompt admission.
    - Verified `DefaultsSettings`: 0 smallModel/walkthroughModel overrides rendered.
    - Verified OMP `modelRoles`: configured `smol` and `commit` roles resolved.
    - Evidence artifacts recorded: `routing-page.png`, `defaults-settings.png`, `real-path-task02.json`.
- Independent review: Approved by director.
