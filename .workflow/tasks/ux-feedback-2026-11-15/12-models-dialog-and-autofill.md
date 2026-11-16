# 12: Models dialog with add-all, stale cleanup and model-info auto-fill

**Effort:** ux-feedback-2026-11-15
**Blocked by:** 11
**Covers:** W10
**Files:** `packages/agent-contract/src/provider-management.ts`, `packages/agent-service/src/worker/catalog-models.ts` and tests, `packages/web/server/lib/host/` (OpenRouter fetch route and enterprise refusal), `packages/web/server/lib/enterprise-mode.js` and tests, `packages/ui/src/components/sections/providers/{CustomProviderForm.tsx,CustomProviderModelsDialog.tsx}` (replacing `CustomProviderModelDiscovery.tsx`), `packages/ui/src/api/canonicalClient.ts`, `packages/ui/src/lib/i18n/messages/providers.i18n.ts`
**Read first:** spec "How it is built → Models dialog"; `research/feedback-2026-11-15/Providers.md` (C, fix C); `decisions.md` 2026-11-15 "Model auto-fill reads OMP's bundled catalog first and OpenRouter second"; `.agents/skills/enterprise-boundary/SKILL.md`; the maintainer's reference screenshot description in the research README
**Check:** agent-service tests: `enrich` returns catalog data for a bundled id and for a bracket-affixed id (`[Kiro] claude-opus-4-6`), and nothing for an unknown id; Host tests: the OpenRouter route sends model ids only and returns `403 enterprise_mode` in enterprise mode. Real path (the maintainer's CLIProxyAPI endpoint, isolated OMP home): 添加全部模型 (add all models) adds every returned id; 清理失效模型 (remove stale models) lists and removes ids the endpoint no longer returns after confirmation; 尝试自动填写模型信息 (try to fill in model info) writes `input`, `contextWindow`, `maxTokens` and `cost` into `models.yml` for catalogued ids and fills an uncatalogued id from OpenRouter; values the user typed are untouched.
**Base commit:** cabcb082a62fbd7cfd9292a06e332b914c61addf
**Status:** active

- [ ] Discovery results carry an optional `catalog` block; `catalog.provider.models.enrich` reads `@oh-my-pi/pi-catalog` through `resolveModelReference`, offline.
- [ ] Models the catalog misses go to OpenRouter's public models API through a Host route that sends model ids only and refuses in enterprise mode; the UI reports a catalog-only result there.
- [ ] `CustomProviderModelsDialog` replaces `CustomProviderModelDiscovery`: filter chips (全部 All / 失效 Stale / 文本 Text / 图片 Image / 嵌入 Embedding / 音频 Audio), per-model add and remove, capability chips, 添加全部模型 (add all models) and 清理失效模型 (remove stale models, with a confirmation listing the ids); family grouping only when every row has a family. Built from Settings primitives and the shared dialog.
- [ ] Auto-fill fills only empty fields and labels each filled value with its source.
- [ ] The unused `discovery.source.*` and `discovery.info` keys are used or deleted; copy in all 15 locales.
