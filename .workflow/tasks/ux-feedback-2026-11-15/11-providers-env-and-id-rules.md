# 11: Show env-backed providers as built-ins and remove OpenCode-era input limits

**Effort:** ux-feedback-2026-11-15
**Blocked by:** None
**Covers:** W9
**Files:** `packages/agent-contract/src/{catalogs.ts,catalogs.test.ts}`, `packages/agent-service/src/worker/catalog-models.ts`, `packages/ui/src/components/sections/providers/{custom-provider-form.ts,custom-provider-form.test.ts,ProvidersPage.tsx,ProviderGrid.tsx,providerAuth.ts,connectableProviders.ts,CustomProviderModelRow.tsx}`, `packages/ui/src/components/sections/mcp/McpPage.tsx`, `packages/ui/src/lib/i18n/messages/providers.i18n.ts`, `packages/ui/src/components/sections/DOCUMENTATION.md`
**Read first:** spec "How it is built → Providers"; `research/feedback-2026-11-15/Providers.md` (A, B, fixes A and B); `decisions.md` 2026-11-15 "Provider IDs follow OMP's selector grammar…"; `.agents/skills/enterprise-boundary/SKILL.md`
**Check:** contract tests accept `environment: { variable, active }` and reject any value field; `custom-provider-form.test.ts` accepts `Campus.2` and rejects `a/b`, `a#b`, `__proto__` and a case-only duplicate; agent-service tests reject `/` in `configureProvider` with 422. Real path (packaged app, `OPENAI_API_KEY` exported): the OpenAI card shows "From $OPENAI_API_KEY" and offers the key form; saving a key shows connected plus the badge; deleting it returns the env source; a custom provider `Campus.2` with an Azure base URL carrying `?api-version=` saves and lists its models.

- [ ] `ProviderAuthState` carries `environment: { variable, active }` (name only), computed from OMP's env-key name and cascade on every configured provider.
- [ ] The grid pill and detail page name the variable and offer the key form on env-backed cards; the badge stays when a stored key wins.
- [ ] One exported provider-ID validator replaces the two regexes; uniqueness is case-insensitive; `configureProvider` rejects `/`.
- [ ] `PublicEndpointSchema` allows a query string for custom providers (userinfo still refused).
- [ ] The MCP name rule follows OMP's pattern; audio and embedding modality chips appear only for a native kind that supports them.
- [ ] `settings.providers.grid.description` no longer names OpenCode in any locale; the stale `DOCUMENTATION.md` paragraph is rewritten.
