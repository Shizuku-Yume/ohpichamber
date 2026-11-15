# fb15 — Providers (env-var built-ins, ID limits, fetch-models UX)

## 1. Findings

### A. Env-var providers are already built-in providers; only the *evidence* is missing

**Conclusion: no "env providers" kind exists in the data model. Every OMP built-in already appears as a provider; the env-var distinction is a single auth-source field, and the env variable's *name* never reaches the UI. That is the whole gap.**

| Fact | Anchor | Evidence |
|---|---|---|
| Provider catalog id set = bundled registry ∪ models.yml ∪ metadata ∪ stored credentials ∪ OAuth | `packages/agent-service/src/worker/catalog-models.ts:415-424` | `new Set([...modelRegistry.getAll('all').map(m => m.provider), ...Object.keys(currentConfig.providers), ...Object.keys(metadata.providers), ...credentials.list().map(r => r.provider), ...oauthProviderIds()])` — so `openai`/`anthropic`/… are present with or without a key |
| Env key is classified by OMP's own cascade, not by OpenChamber | `catalog-models.ts:569-597` | `const source = authStorage.keys.source(providerId)` → `source.kind === 'env'` maps to contract `source: 'external-environment'`; `api_key`/`oauth` → `'stored-credential'`; `runtime`/`config` → `'managed-environment'` |
| Cascade order (who wins) | `vendor/omp/b5a6b2f7/.../oh-my-pi-pi-ai-18.18.0.tgz:package/src/auth/cascade.ts` `KeyCascade.source`/`#resolve` | runtime → config(`models.yml apiKey`) → OAuth → **login-stored api_key** → config fallback → **env** → other stored api_key |
| OpenChamber writes keys as `source: 'login'` | `packages/agent-service/src/worker/catalog-credentials.ts` `write()` | `credentials.upsert(providerId, { type: 'api_key', key, source: 'login' })` |
| ⇒ **a saved key already overrides the env var** | cascade above | yes — and OpenChamber never writes `models.yml apiKey`, so nothing else can outrank it. `stageModel` writes `auth: 'none'` (a keyless marker, not an override) at `catalog-models.ts:940-950` |
| Env var **name** is knowable but not published | `.../pi-ai.../src/env-api-key.ts` `getEnvApiKeyName()`; contract `ProviderAuthStateSchema` (`packages/agent-contract/src/catalogs.ts:87-96`) | state carries only `{status, credentialRef, method, source}` — no variable name, no "env present" flag |
| Grid cards: env providers already show, with a bare pill | `packages/ui/src/components/sections/providers/ProviderGrid.tsx:71-84`, `providerAuth.ts:28-34` | pill `settings.providers.card.status.environment` = "From environment" / "来自环境变量" |
| Detail page: muted line, no variable name | `packages/ui/src/components/sections/providers/ProvidersPage.tsx:358-360` | `provider.auth.source !== 'stored-credential'` → "From environment" |
| **Env providers are excluded from the connect picker** | `connectableProviders.ts:44-50` | filter `auth.status === 'missing'` only — so "enter an API key" has no picker entry point; the key form only appears inside the provider's own detail page behind "Connect" |
| Stale doc claiming env keys are listed | `packages/ui/src/components/sections/DOCUMENTATION.md:99-120` | describes per-kind cards + "Keys from environment variables are listed above the cards" — pre-OMP text; current code is the single pill/line |
| Stale page description still says OpenCode | `packages/ui/src/lib/i18n/messages/zh-CN.ts:4653` (`settings.providers.grid.description`) | "OpenCode 可以使用的模型提供商" |

Confidence: **high** on the data model and precedence (read the pinned 18.18.0 tarball, not the 18.8.9 checkout at `/home/shizuku/Project/oh-my-pi`, which is older). **Medium-high** on the screenshot mapping: because no separate env section exists in code, the maintainer's "separate kind/section" is the "From environment" pill group on the grid plus the muted line on the detail page. `[INFERENCE]`

### B. The provider-ID regex is inherited from upstream OpenChamber (OpenCode-era) and is not what OMP requires

| Fact | Anchor |
|---|---|
| UI validation regex | `packages/ui/src/components/sections/providers/custom-provider-form.ts:168` (`!/^[a-z0-9][a-z0-9_-]*$/.test(providerId)`) and again at `:226` in `buildCustomProviderRequest` |
| Message | `settings.providers.page.custom.error.providerID.format` ("请使用小写字母、数字、连字符或下划线"); also `.info` at `zh-CN.ts:1966` |
| Origin: upstream, verbatim | `/home/shizuku/Project/openchamber/packages/ui/src/components/sections/providers/custom-provider-form.ts:15` → `const PROVIDER_ID_PATTERN = /^[a-z0-9][a-z0-9-_]*$/;` — upstream is *slightly wider* (`-`/`_` anywhere), so the fork even tightened it |
| Server does **not** restrict | `packages/agent-contract/src/primitives.ts:3` `EntityIdSchema = z.string().min(1)` |
| OMP models.yml key is any string | `.../pi-coding-agent-18.18.0.tgz:package/src/config/models-config-schema-bundle.ts` → `ModelsConfigSchema = type({ "providers?": { "[string]": ProviderConfigSchema } })`; `models-config.ts` validates only non-empty, api/baseUrl/limits |
| OMP ids are matched case-insensitively | `/home/shizuku/Project/oh-my-pi/packages/coding-agent/src/config/model-registry.ts:2891-2896,3058-3063,3125-3127` (`toLowerCase()` comparisons) |
| Real constraints come from the **selector grammar**, not a charset | `packages/agent-contract/src/modelSelector.ts:119-145` (provider = text before **first** `/`), `:189-205` (`#variant`, `@upstream`) |

**So the constraints that must survive are:** non-empty; **no `/`** (splits the selector); **no `#`** (variant split); avoid `:` and `@`; no leading/trailing whitespace; not a plain-object hazard (`__proto__`, `constructor`, `prototype`) because provider ids key `config.providers`, `metadata.providers`, `defaultCredentials`, `customProviderIcons`; and **case-insensitive uniqueness** (OMP lowercases). Everything else — uppercase, dots, length — is free. OMP's own MCP schema uses `^[a-zA-Z0-9_.-]{1,100}$`, which is a good precedent for the shape.

**Audit of other OpenCode-inherited limits** (origin → still needed → action):

| # | Limit | Anchor | Origin | Needed under OMP? | Action |
|---|---|---|---|---|---|
| 1 | provider id `^[a-z0-9][a-z0-9_-]*$` | `custom-provider-form.ts:168,226` | upstream OpenCode | **No** | Replace with grammar-shaped rule (see fix) |
| 2 | base URL: http/https only, **no query, no fragment**, no userinfo | `custom-provider-form.ts:82-90`; `catalogs.ts:5-8` | OpenChamber hardening | userinfo-ban **yes** (secret leak); query-ban **no** (Azure/gateways need `?api-version=`; OMP `baseUrl?: "string"`) | Keep http/https + no userinfo; allow query for custom providers (contract change) |
| 3 | model `contextWindow`/`maxOutputTokens` are **required** in the form | `custom-provider-form.ts:186-193`; contract requires positive ints `catalogs.ts:43-44` | contract need (UI must show a number) | Partly: OMP fills absent limits from the bundled reference then defaults 128000/16384 (`custom-models.ts` `finalizeCustomModel`, `useDefaults:true`) | Keep required, but prefill via discovery + auto-fill (§C) so the user rarely types them |
| 4 | UI offers `audio` and `embedding` modalities for any provider | `custom-provider-form.ts:8-16`, `CustomProviderModelRow.tsx` `MODEL_MODALITIES` | contract enum `catalogs.ts:42` | **No** — the writer rejects them unless the native kind is tts/stt/embedding (`catalog-models.ts` `stageModel`, `Requested modalities do not match the native provider runner`, 422) | Only offer them when such a kind exists; otherwise text/image |
| 5 | MCP server id rewritten to `[a-z0-9_-]` | `packages/ui/src/components/sections/mcp/McpPage.tsx:923` (also upstream `McpPage.tsx:1636`) | OpenChamber | **No** — OMP accepts `^[a-zA-Z0-9_.-]{1,100}$` (`pi-coding-agent.../config/mcp-schema.json`, `propertyNames`) | Relax to OMP's pattern |
| 6 | Skill name `^[a-z0-9][a-z0-9-]*[a-z0-9]$`, ≤64 | `packages/ui/src/components/sections/skills/SkillsPage.tsx:60,208` | Agent Skills spec | **Yes** (`SKILL.md` `name` is lowercase kebab) | Keep |
| 7 | Agent/command names: whitespace→`-`, no other rule | `AgentsPage.tsx:294`, `CommandsSidebar.tsx:153` | neither | yes (names are `@`-mention tokens) | Keep |
| 8 | Header-name token regex | `custom-provider-form.ts:78` | HTTP grammar | yes | Keep |
| 9 | Discovery is `providerEntry` in enterprise mode | `packages/web/server/lib/host/canonical-routes.js:38,272-273`; agent-service `catalogs.ts:107-109`, `stateless.ts:313-315` | fork decision | **yes** (it sends the user's key to the user's own endpoint) | Keep |
| 10 | Copy promising models.dev gap-fill | `zh-CN.ts:2025` (`discovery.info`, unused); `en.ts:2027,2038-2039` (`discovery.source.*`, unused) | pre-cutover feature that was removed | n/a — feature missing | Implement (§C), or delete the keys |

Confidence: **high** on every regex/schema anchor; **high** that OMP accepts a wider id than the UI allows.

### C. Fetch-models is a one-shot id-only import; nothing enriches capabilities

| Fact | Anchor |
|---|---|
| UI panel (the screenshot) | `packages/ui/src/components/sections/providers/CustomProviderModelDiscovery.tsx:1-160` — checkbox rows, counts string, already-added greyed, "全选/取消全选", "添加所选 (n)"/"取消", search only above 8 rows |
| Trigger | `CustomProviderForm.tsx:430-450` → `canonicalClient.discoverProviderModels` (`packages/ui/src/api/canonicalClient.ts:486-490`) → `POST /workspaces/:id/providers/discover` |
| Server | `catalog-models.ts:468-546` — builds `{endpoint}/models`, adds bearer/`x-api-key`/`x-goog-api-key`, 15 s timeout, paginates, returns **only** `modelId`, `name`, optional `contextWindow`, `maxOutputTokens` |
| Result contract | `packages/agent-contract/src/provider-management.ts:51-53` — no modalities, no reasoning, no pricing, no source |
| Where model fields live | `custom-provider-form.ts` `ModelRow` + `buildCustomProviderRequest` → contract `Model` (`catalogs.ts:38-86`) → `catalog-models.ts` `stageModel` writes models.yml `input: ["text"|"image"]`, `contextWindow`, `maxTokens`, `cost{input,output,cacheRead,cacheWrite}`, `reasoning`, `thinking`, `supportsTools` |
| Host already proxies a **models.dev** catalog | `packages/web/server/lib/host/models-metadata.js:32-70` + route `GET /api/openchamber/models-metadata` (`openchamber-routes.js:529-542`); consumed by `packages/ui/src/stores/useConfigStore.ts:34-35,692-722` |
| **OMP bundles a full capability catalog offline** | `vendor/.../oh-my-pi-pi-catalog-18.18.0.tgz:package/src/models.ts` (`getBundledModels`, `getBundledProviders`), `src/models.json` (1.1 MB: pricing, context windows, modalities, thinking) |
| **OMP already has the id matcher to reuse** | `.../pi-catalog.../src/identity/reference.ts` `resolveModelReference` + `getReferenceCandidateIds` (bracket affixes `[Kiro] …`, model-like segment, `:cloud`/`-cloud` strip, namespace prefix strip after last `/`, `:`→`-`, lowercase, trailing markers); index: `identity/bundled.ts` `getBundledModelReferenceIndex()`; consumer precedent: `custom-models.ts` `finalizeCustomModel` |
| Model family/kind vocabulary | `pi-catalog/src/compat/taxonomy.ts` (`classifyModel`), `types.ts` `MODEL_KINDS`, `RUNNER_API_KINDS` |

**Recommendation on the auto-fill source: use the bundled pi-catalog, not OpenRouter.** Reasons: (a) it is the same data OMP itself will use at runtime, so the form cannot disagree with execution; (b) offline — no new egress, no enterprise gate, no new admin knob; (c) it already solves vendor-prefix/bracket/`:cloud` matching, which OpenRouter's flat id list does not. OpenRouter would add a second authority plus a gated off-host call (enterprise-boundary: *Egress/metadata egress*, must be refused in enterprise mode with `403 enterprise_mode` at the point of the request, per `.agents/skills/enterprise-boundary/SKILL.md`). Cost of the bundled choice: coverage is limited to catalogued models, so an uncatalogued model leaves fields blank — acceptable, since OMP would also have no data for it.

Confidence: **high**.

## 2. Proposed fix

### A. Env vars become a *source badge* on built-in entries

1. **Contract** (`packages/agent-contract/src/catalogs.ts:87-96`): add to the `configured` variant
   `environment: z.strictObject({ variable: z.string().min(1).nullable(), active: z.boolean() }).optional()`.
   `variable` is a **name only** (e.g. `OPENAI_API_KEY`), never a value; `active` says the env var currently supplies the winning credential. Update `catalogs.test.ts` valid/invalid rows (add `{ environment: { variable: 'X', active: true, apiKey: 'k' } }` as invalid).
2. **Agent Service** (`catalog-models.ts` `provider()`): compute `getEnvApiKeyName(providerId)` + presence (`$env[name]` non-empty, and `getEnvApiKey(providerId) !== undefined` for computed resolvers) and attach it on every `configured` state, independent of which source won. This is what makes stored-key + env coexist visible. No secret is added — `keys.source()` already exposes `envVar`.
3. **UI**
   - `providerAuth.ts`: replace `getProviderCardStatus`'s three-way with a status + badge list; an env-backed provider whose stored key is active becomes `connected` **plus** an env badge.
   - `ProviderGrid.tsx`: pill stays `settings.providers.card.status.environment` but renders `From $OPENAI_API_KEY` (new key with `{variable}`), keeping the variable-less form when `variable === null` (computed resolvers).
   - `ProvidersPage.tsx:358-360`: replace the muted line with a `SettingsInfoHint`-backed row: "Using $OPENAI_API_KEY. A key saved here takes precedence." + the existing API-key form on that page (already present, `showAuthPanel`) so "just enter the API key" is one click from the card.
   - `connectableProviders.ts:44-50`: keep filtering `status === 'missing'` for the *picker*, but add a secondary "Add a key" affordance on env cards — otherwise the maintainer's exact request ("enter the API key") is unreachable from the picker.
   - Enterprise: `ProviderApiKeyForm` already lives behind `canConnect = !enterprise` (`ProvidersPage.tsx:381`) and the Host refuses credential writes; only the badge/label changes, nothing new to gate.
4. **Copy**: fix `settings.providers.grid.description` (still names OpenCode) in all 13 locales in `providers.i18n.ts`; retire the stale `DOCUMENTATION.md:99-120` paragraph.

Edge cases: two env vars for one provider (`$pickenv`) → `variable: null`, show "From environment"; env var set but blank → treat as absent; stored key active **and** env present → connected + env badge (§A.2); enterprise → badges stay (read-only), key form hidden.

### B. Replace the ID rule with OMP's real grammar

`custom-provider-form.ts`: delete the duplicated regexes at `:168` and `:226`; add one exported validator used by both (the `build` call keeps a guard, as today).

Proposed rule (one function, one message):
```
^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$          // OMP MCP precedent shape
and not /[\/#@:\s]/                          // selector grammar delimiters
and not __proto__ | constructor | prototype  // plain-object keys
and case-insensitively unique among existing providers
```
- Message: keep `providerID.format` but reword to "letters, digits, dots, hyphens, underscores; no `/`, `#`, `@` or spaces" in all 13 locales.
- `existingProviderIDs` check becomes case-insensitive.
- Keep `maxLength 128` (mirrors the Host's logo/settings sanitizers: `provider-logo-routes.js:29`, `settings-helpers.js:43-46`).
- Do **not** loosen the contract (`EntityIdSchema`) — but add a Host-side assertion? The contract is intentionally opaque; the grammar constraint belongs where the id is authored (UI) plus a defensive rejection in `configureProviders` when the id contains `/` (otherwise a crafted client can create an unselectable provider). One line in `configureProvider`, 422 `INVALID_REQUEST`.
- Audit follow-ups in the same change or a separate task: drop the `http(s)`-query ban for custom providers (#2 — decide, §3), gate `audio`/`embedding` modality chips on the native kind (#4), relax `McpPage.tsx:923` to `^[A-Za-z0-9_.-]{0,99}$` (#5).

### C. Models dialog + auto-fill

**Contract** (`provider-management.ts`): extend the discovery result per model with an optional enrichment block and a `source`:
```
{ modelId, name, contextWindow?, maxOutputTokens?,
  catalog?: { input: ('text'|'image')[], contextWindow, maxTokens, cost: Model['pricing'], reasoning: boolean,
              toolsSupported?: boolean, family?: string, status?: 'active'|'alpha'|'beta'|'deprecated' },
  inCurrentForm: boolean }
```
New operation `catalog.provider.models.enrich` (same gate as discovery is **not** needed: it reads the local bundle only; no `providerEntry`, no egress) taking `{ providerId?, models: [{modelId}] }` and returning the `catalog` blocks. Implementation: loop `modelId` → same-provider bundled list (`getBundledModels(providerId)` when the provider is bundled) → `resolveModelReference(modelId, getBundledModelReferenceIndex())` → map `input`→modalities, `contextWindow`/`maxTokens`, `cost`→`Model.pricing`, `reasoning`/`thinking`→`reasoningEffortSupported` + `reasoningOptions`, `supportsTools`, family from `classifyModel`. Pure, offline, testable.

**UI** (`CustomProviderModelDiscovery` → `CustomProviderModelsDialog`):
- Opened from the models section header (`CustomProviderForm.tsx:430`) as a `Dialog` (`components/ui/dialog.tsx`), built only from PATTERNS primitives: `SettingsChipGroup` for the filter row, `SettingsCheckboxRow`-shaped rows with a trailing `Button size="xs"` `+`/`−` stepper, capability chips reusing the badge style from `ProvidersPage.tsx:520-545`, `SettingsInfoHint` for the matching explanation. Container queries (`@xl:`), no viewport breakpoints.
- Header: `共 N 个模型 · 显示 M` + two actions: **清理失效模型** (remove form rows whose id is absent from the fresh discovery result — confirm dialog listing the ids, since it discards user-typed limits) and **添加全部模型** (add every returned id not already present).
- Filter chips: 全部 / 失效 / 文本 / 图片 / 嵌入 / 音频 (+ 视频 **only** if the contract gains a video modality; today it has none — `catalogs.ts:42`). 失效 = form rows not in the discovery result; the other tabs filter by `catalog.input` / kind.
- New button **尝试自动填写模型信息** in the form's models section (next to 查找模型): fills `contextWindow`, `maxOutputTokens`, `modalities`, `toolsSupported`, `pricing`(base stays in `row.base`, already supported by `ModelRow.base`) for every row that lacks a user-set value; never overwrites a value the user typed; per-field provenance shown as "来自 OMP 模型库" (matching `discovery.source.*` keys, which currently exist but are unused).
- Grouping by family: only when every visible row has a `family`; otherwise keep the flat list (a half-grouped list reads worse than none).
- Enterprise: the auto-fill and dialog are local reads — no gate, no notice needed. Discovery itself keeps its existing gate.

**Verification (Check)**
1. Unit: `packages/ui/src/components/sections/providers/custom-provider-form.test.ts` (id rule: accepts `Campus.2`, rejects `a/b`, `a#b`, `__proto__`, duplicate-in-different-case); new `catalog-models.test.ts` case for `enrich` (bundled hit, bracket-affixed id `[Kiro] claude-opus-4-6`, unknown id → no catalog).
2. Real path: `bun run dev`, Settings → Providers → custom provider at a real endpoint (the maintainer's CLIProxyAPI or `http://127.0.0.1:11434/v1`), 获取模型 → 尝试自动填写模型信息 → save → confirm `~/.omp/agent/models.yml` carries `input`, `contextWindow`, `maxTokens`, `cost`; then reopen the provider and confirm the dialog shows 0 失效 after a re-fetch.
3. Env badge: with `OPENAI_API_KEY` exported, open Providers via the packaged app → card shows the env badge; save a key → card shows Connected **and** retains the env badge; delete the stored key → env badge returns as the active source.

## 3. Open choices for the maintainer

1. **Env badge semantics** — (a) badge always shows env presence, even when a stored key wins *(recommended: it is the only way both facts stay visible)*; (b) badge only while env is the active credential, disappearing after a key is saved; (c) no badge on connected cards, keep only the detail-page line.
2. **Provider-ID rule width** — (a) `[A-Za-z0-9][A-Za-z0-9._-]{0,127}`, case-insensitive uniqueness *(recommended: matches OMP's own MCP shape and its lowercase matching)*; (b) keep lowercase-only but allow dots; (c) no client rule at all, let OMP reject — not viable: `/` silently breaks every selector.
3. **Base-URL query strings** — (a) allow `?api-version=`-style queries for custom providers (contract change in `PublicEndpointSchema`) *(recommended: Azure needs it and OMP accepts it)*; (b) keep the ban and document it; (c) allow queries only when the protocol is `responses`.
4. **Auto-fill source** — (a) bundled `@oh-my-pi/pi-catalog` offline *(recommended)*; (b) the already-proxied models.dev route (`/api/openchamber/models-metadata{,}` — existing route, no new gate, but a second authority that can disagree with OMP); (c) OpenRouter `api/v1/models` — new gated egress + admin knob, not recommended.
5. **清理失效模型** — (a) confirm dialog listing removed ids *(recommended: it discards user-typed limits)*; (b) one-click, no confirm.

Paths for the implementing agent: `packages/agent-contract/src/catalogs.ts`, `.../provider-management.ts`, `packages/agent-service/src/worker/catalog-models.ts`, `packages/ui/src/components/sections/providers/{custom-provider-form.ts,ProvidersPage.tsx,ProviderGrid.tsx,providerAuth.ts,connectableProviders.ts,CustomProviderModelDiscovery.tsx,CustomProviderForm.tsx}`, `packages/ui/src/lib/i18n/messages/providers.i18n.ts`, `packages/ui/src/components/sections/DOCUMENTATION.md`.

**Summary:** (1) No separate env-var provider kind exists — every OMP built-in is already listed; only the env var *name* is missing from `ProviderAuthState`, and env-backed providers are filtered out of the connect picker, so "just enter the key" has no entry point. (2) A key saved through OpenChamber is written as OMP `source: 'login'`, which already outranks the env var in `KeyCascade`, so the requested override behavior needs no new precedence work — only a badge that keeps both facts visible. (3) The provider-ID regex at `custom-provider-form.ts:168,226` is inherited verbatim (and tightened) from upstream `custom-provider-form.ts:15`; OMP accepts any models.yml key, so the real limits are only `/`, `#`, `@`, `:`, whitespace, prototype keys and case-insensitive uniqueness — plus an audited list of nine other inherited limits (base-URL query ban, forced model limits, audio/embedding modalities, MCP id rewrite, stale models.dev copy). (4) Fetch-models returns ids and optional limits only; the bundled `@oh-my-pi/pi-catalog` plus its existing `resolveModelReference` gives offline capability/pricing/limit enrichment — better than OpenRouter, and needing no enterprise gate.
