# 02: Fix auto routing thinking effort and unify small-model resolution on OMP modelRoles

**Effort:** m4-orchestration
**Task type:** bugfix
**Blocked by:** None
**Files:** `packages/ui/src/components/sections/routing/RoutingPage.tsx`, `packages/ui/src/components/sections/routing/RoutingPage.test.tsx`, `packages/web/server/lib/routing/runtime.js`, `packages/web/server/lib/routing/runtime.test.js`, `packages/web/server/lib/host/prompt-delivery-runtime.js`, `packages/web/server/lib/host/prompt-delivery-runtime.test.js`, `packages/web/server/lib/small-model/index.js`, `packages/web/server/lib/small-model/index.test.js`, `packages/ui/src/lib/smallModelRequest.ts`, `packages/ui/src/lib/smallModelRequest.test.ts`, `packages/ui/src/lib/gitApi.ts`, `packages/ui/src/components/sections/openchamber/DefaultsSettings.tsx`, `packages/ui/src/components/sections/openchamber/SessionWarmingCheckbox.test.tsx`, `packages/web/server/lib/host/settings-helpers.js`, `packages/web/server/lib/host/settings-registry.json`, `packages/ui/src/lib/settings/registry.ts`
**Read first:** `.workflow/specs/m4-orchestration.md`; `.workflow/decisions.md` (2026-11-05 - Fix auto routing effort mapping and unify small-model resolution on OMP modelRoles); `packages/web/server/lib/routing/DOCUMENTATION.md`
**Covers:** W2, W3
**Check:** `bun test packages/ui/src/components/sections/routing/ packages/ui/src/lib/smallModelRequest.test.ts` and `bunx vitest run server/lib/routing server/lib/small-model server/lib/host/prompt-delivery-runtime.test.js server/lib/host/settings-helpers.test.js` in `packages/web` exit 0.

- [ ] `RoutingPage.tsx` removes `AgentSelector` from routing categories and replaces `useModelVariants` (`model.variants`) with `model.reasoningOptions` (`off` plus supported thinking efforts).
- [ ] `routing/runtime.js` and `prompt-delivery-runtime.js` stop setting `options.agentId` (keeping `agentId: null`), validate the category's thinking effort against `model.reasoningOptions`, and write `options.reasoningEffort` on routed prompts.
- [ ] `small-model/index.js` and `smallModelRequest.ts` resolve utility completions via OMP's `modelRoles` (`commit` role for `gitApi.ts` commit/PR generation, `smol` role for `session-assist`, `walkthrough`, `magic-prompts`, and `guests/generate`, falling back to `default` / active model).
- [ ] `DefaultsSettings.tsx` and the settings registry remove the duplicate `smallModelOverride`, `smallModelUseDefault`, and `walkthroughModelOverride` controls.
