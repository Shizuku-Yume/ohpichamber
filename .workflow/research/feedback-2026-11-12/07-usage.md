## Item 7: Usage page (#13) and chat-page usage (#14)

I ran no builds or tests. Facts below are from reading source, one read-only probe with a fake catalog service, and read-only queries on `~/.omp/*.db` and the logs. Nothing was edited.

### 1. Cause of #14

**Observed:** the work-status panel lists all 26 built-in providers. Each row says "Selected quota credential unavailable", and the names are cut to one letter. The Settings sidebar in #13 also lists all 26 ("总计 26").

**Root cause (verified):** the UI stopped sending `workspaceId` on quota requests, and the Host requires it.
- `fetchQuota.ts:53,89` and `activateGiftReset` call `/api/quota/*` with no query.
- `private-credential.js:151-166` (`catalogSelectionRequest`) requires `workspaceId`, so every catalog read fails with `INVALID_REQUEST` (400).
- I ran `createCatalogCredentialSelections` with a fake service and no `workspaceId`; both `listQuotaSelections` and `resolveQuotaSelection('claude')` threw `INVALID_REQUEST` 400.
- `routes.js:41-47` turns the list failure into 503 "Quota provider catalog unavailable". It logs `[quota] provider catalog could not be listed: Selected credential operation failed`. That log line appears 6 times in `~/.config/openchamber/logs/openchamber-4121.log`.
- `routes.js:55-68` rethrows the per-provider 400, because it is not `CREDENTIAL_UNAVAILABLE`, and the outer catch returns 503 "Selected quota credential unavailable". This is the exact text in the screenshot.

**Why it regressed:** commits `542b6a76a` and `b1cdbbb0a` (Oct 22) bound quota reads to `useConfigStore.workspaceId`. The v2.7.0 merge `8327e6403` (Nov 12) dropped that from `useQuotaStore.ts` and `fetchQuota.ts`. The parent had `workspaceId` at `fetchQuota.ts:74,90` and `useQuotaStore.ts:243-260,321-339`. HEAD has none. `useQuotaStore.refresh.test.ts:26` still sets `workspaceId` but asserts nothing about it.

**Three faults that make one failure look like 26:**
1. **Missing workspace scope.** Described above.
2. **"Failed list read means ask every provider."** `fetchQuota.ts:44-49` returns `null` on failure, and `useQuotaStore.fetchQuotas` then requests all 26. This breaks the repo rule that a failed read must not look like an authoritative answer.
3. **Rows for unknown configuration.** `usageGroups.ts:47-50` shows a row when `!result && refreshErrors[id]`, so 26 failures become 26 rows. `WorkStatusUsageSection.tsx:136-139` is built so the status text wins over the name, which gives the one-letter stubs.

**Wider pattern:** `usageHeadline.ts:20-29` (`QUOTA_PROVIDER_ALIASES`) is an OpenCode-era alias table. The Host's `QUOTA_PROVIDER_RELATIONS` (`private-credential.js:126-141`) holds the real OMP-native-to-logical mapping. Native ids such as `openai-codex`, `google-gemini-cli`, `zai`, `kimi-code` and `xai-oauth` don't match the aliases, so the collapsed headline stays empty for them. There are two tables for one relation.

### 2. #13 findings

- **Sidebar and selection:**
  - `UsageSidebar.tsx:101` iterates the static `QUOTA_PROVIDERS` (26 entries in `lib/quota/providers/index.ts`).
  - `selectedProviderId` is written there and read nowhere else, so clicking a provider changes nothing.
  - `UsagePage.tsx` shows the global stats report, then cards only for `results.filter(configured)`.
- **Upstream v2.7.0:** the Usage settings page is master/detail. The sidebar lists all providers, with "未设置" for unconfigured ones. The detail pane shows that provider's quota and an inline credential form (`QuotaCredentials`, `ClaudeCodeSignIn`). Token and cost stats are a separate main-area view (`MainLayout`, `MobileApp`). The fork embedded `UsageStatsReport` in the settings page, removed the credential forms, and kept the all-providers sidebar. The result is inert.
- **Token legend:** `UsageStatsView.tsx:428-465` uses a 4-column grid with a `shrink-0` value, so labels become "输.", "输…", "缓.". This is the same overflow class as maintainer item 9.
- **Cost of $0.00 and reasoning share "—" with 46.5万 tokens:**
  - `usage.ts:204` hard-codes `reasoning: null`. OMP records `usage.reasoningTokens` when the provider reports it.
  - Cost is the session-recorded `usage.cost.total`. A custom model with no price gets `{0,0,0,0}` (`custom-models.ts:115-118`), so unpriced and free are indistinguishable in the contract.
  - Here, `gemini-3.8-flash` on CLIProxyAPI has 63 of 64 rows at zero cost.
  - The catalog's `Model.pricing` is `null` when rates are unknown (`catalog-models.ts:180-192`), so the UI can tell the two apart.

### 3. Data-source inventory

| Source | Provider | Model | Time range | Notes |
|---|---|---|---|---|
| **Session JSONL** (authoritative for the current report; `worker/usage.ts`) | yes | yes | any `[from,to)` | Per message: tokens (input, output, cache read/write), cost, `stopReason`, timestamp. Also available but dropped by `readSource` (lines 88-89): `duration`, `ttft`, `errorMessage`, `serviceTier`, `credentialId` (account), `upstreamProvider`, `reasoningTokens`, `premiumRequests`. Also `model_usage` entries (small-model, judge calls), tool calls and results, user messages. Only validated branches of Host-authorized references. Query filters: `workspaceId`, `projectId` only. |
| **`~/.omp/stats.db`** (`omp-stats` 18.18.0; `settleUsageSession` writes it every turn) | yes | yes | any (raw `messages`); presets 24h/7d/30d/90d/all via rollups | Per request: duration, ttft, stop_reason, error_message, 4 token kinds, cost split, `cost_unpriced`, agent_type, folder, tool_calls. Aggregates ready: `getStatsByProvider` (requests, failures, model count, tokens, cost, avg tok/s), provider hourly and time series, per-model TTFT and tok/s series, cost series. OhPiChamber never reads it. It is global: it includes TUI sessions and fixtures (`native-fixture` 5,072 rows, `smoke`). Cost is re-priced from the bundled catalog when the stored cost is 0. |
| **`agent.db usage_history`** (`authStorage.usage.history`) | yes | model-scoped limits | any `since` | Quota snapshots per account and limit window, written only when OMP itself fetches usage reports. Here only `openai-codex`, last on Oct 7. `omp-stats getProviderWindowStats` derives window cycles and tokens-per-window from it. |
| **OMP native live quota** (`authStorage.usage.reports({provider?})`) | yes | model/tier scope | now only | 22 built-in usage providers (`usage/registry.ts`). Per-account `UsageLimit` with window, used/limit/remaining/status and `resetCredits`. Probes only providers with a stored credential, env key or runtime key. A provider with no usage endpoint (`providerFor` undefined) gets no row. Not called anywhere in `agent-service/src`. |
| **Inherited quota fetchers** (`server/lib/quota`, 26 logical ids in the UI list; the registry also has `github-copilot-addon`) | yes | some | now only (UI polls every 3 min) | Credentials come from the Agent Service `AuthStorage` via the Host catalog. The Host filters to catalog-configured providers, so the server side is already correct. Overlap with OMP is partial. OC-only: deepinfra, deepseek, openrouter, nano-gpt, zhipuai, wafer, neuralwatt, kilo, zenmux, opencode-zen. OMP-only: alibaba-token-plan, muse-code, factory-droid, umans, synthetic, devin, commandcode, and a real `ollama-cloud` provider where OC's is a stub. |
| **Custom providers (models.yml)** | enumerable | enumerable | n/a | `readProviders` (`catalog-models.ts:412-425`) unions registry, `currentConfig.providers`, stored credentials and OAuth ids. Each entry has a name, endpoint, protocol and `auth.status`. `useConfigStore.providers` (`combineCanonicalCatalog`) already holds only providers with at least one enabled model, custom ones included. Custom providers have no quota API in OMP or OC, so they get statistics only. The catalog also lists non-inference keys (`exa`, `tavily`) as configured, so "configured" alone is the wrong filter. |

On this machine `agent.db` holds only test api-keys plus exa/tavily. The one real provider is the custom CLIProxyAPI, with 206 requests and 6.07M tokens in `stats.db`. For this maintainer there are no quota cards. Statistics are the whole page.

### 4. Page designs the data supports

**A. Master/detail narrowed to configured providers (upstream shape).**
- The sidebar has "All providers" plus one row per configured provider: `useConfigStore.providers`, plus ids from `/api/quota/providers`, plus providers present in the range's stats (muted "removed").
- Each detail pane shows quota (if the provider has a source) and that provider's statistics.
- Per-provider sessions, prompts, active days and activity chart need `providerId` added to `UsageQuery` and the worker filter. Tokens, cost, cache hit rate and the model table can be derived from `models[]` with no contract change.
- Custom-provider detail panes would be mostly statistics only.

**B. One page with a scope switcher.**
- Drop the middle-column sidebar. A top scope selector (All | provider… | with a range and project filter) drives the whole page.
- Statistics follow the scope.
- The "All" scope adds a provider comparison: a table and bars by tokens, cost, steps, cache hit rate, cost per 1M tokens and share. A cost cell with `pricing === null` shows "—", never $0.00.
- A Quota section lists only configured quota-capable providers in scope, and is hidden when there are none.
- This is the smallest change and gives the token legend full width.

**C. OMP-native dashboard.**
- Provider aggregates, TTFT, tok/s, error rate, hourly burn and window insights come from `stats.db` rollups, plus `authStorage.usage.reports` and history.
- It needs a new agent-service endpoint and contract.
- It is global (TUI sessions and fixtures included), which cuts against the worker's Host-authorized-reference design (`usage.ts:34-42`). Pricing can disagree with the session report.
- It is the richest option and the closest TUI `/usage` parity.

**Recommendation: B.**
1. First fix the regression (section 5). Without it every option shows 26 errors.
2. Build B on the session-derived report. Extend it with `reasoning` (sum of `reasoningTokens`) and per-model `ttft`/`duration` averages and error counts. All of it is already in the loaded JSONL, so the worker change is small. Add `providerId` to the query only if per-provider session counts and activity are wanted.
3. Leave C's `stats.db` global view and OMP-native quota for later.

**Choices for the maintainer:**
- (a) Show providers that have history but are no longer configured. I recommend yes, muted.
- (b) Statistics scope: OhPiChamber-authorized sessions only (current), or all OMP sessions including the TUI (C). I recommend the current scope.
- (c) Quota source: keep the OC fetchers, or move the ~12 overlapping providers to OMP native for accounts, reset credits and history. I recommend keeping the fetchers for now. This is a separate effort.

### 5. Fix shape for #14 (smallest correct)

1. Restore workspace scope:
   - Send `workspaceId` from `useConfigStore.workspaceId` on `fetchConfiguredQuotaProviders`, `fetchQuota` and `activateGiftReset`.
   - Gate `ensureLoadedForRuntime` on `workspaceId`, key `quotaRequests` by workspace, and reload on workspace change. This restores the `542b6a76a`/`b1cdbbb0a` logic onto the 2.7.0 store.
   - Add a test that the query carries `workspaceId`.
2. Make a failed list read set `phase: 'error'` with one message, and stop the "ask every provider" path. Fix the comment at `fetchQuota.ts:44-49`.
3. In `usageGroups.ts`, drop the `!result && refreshErrors` branch for providers not known to be configured.
4. Replace `QUOTA_PROVIDER_ALIASES` with the native-to-logical mapping the Host already owns, for example by having `/api/quota/providers` return the native ids.
5. Update `components/sections/DOCUMENTATION.md:286-299` and `server/lib/quota/DOCUMENTATION.md` when the page changes.