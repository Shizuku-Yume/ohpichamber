# 04: Turn an MCP install that needs sign-in into a sign-in, not an error

**Effort:** ux-feedback-2026-11-15
**Task type:** bugfix
**Blocked by:** None
**Covers:** W4
**Files:** `packages/agent-service/src/supervisor/{catalog.ts,catalog-mcp.test.ts}`, `packages/agent-service/src/worker/{mcp.ts,mcp.test.ts}`, `packages/agent-contract/src/catalogs.ts`, `packages/ui/src/components/views/{IntegrationsCatalogView.tsx,IntegrationsCatalogView.test.tsx}`, `packages/ui/src/components/sections/mcp/{McpOAuthSignIn.tsx,McpOAuthSignIn.test.tsx}`, `packages/ui/src/stores/useMcpConfigStore.ts`, `packages/ui/src/lib/i18n/messages/integrations-catalog.i18n.ts`
**Read first:** spec "How it is built → MCP sign-in"; `research/feedback-2026-11-15/IntegrationOAuth.md` (F1–F4, F7, fix 1–5); `decisions.md` 2026-11-15 "MCP sign-in starts on install…" and 2026-11-13 "MCP installs choose project or user scope"
**Check:** `bun test packages/agent-service/src/supervisor/catalog-mcp.test.ts packages/agent-service/src/worker/mcp.test.ts` exits 0 with a no-worker probe that fails with `HTTP 403 … WWW-Authenticate` classified `saved-needs-auth`, and a DCR rejection whose message survives; UI tests show `saved-needs-auth` gives the connection card and no error toast, auto-start sends one `start`, and a poll turning `pending → authenticated` connects. Real path (isolated Host): install Linear (`https://mcp.linear.app/mcp`) at user scope → info toast "saved, sign in to finish" → browser opens Linear's authorize page → after consent the server shows connected with no further click; `~/.omp/agent/mcp.json` (isolated HOME) lists `linear` with no token values. Install Figma → the registration refusal and a client-ID field, not "Could not install".

- [ ] One auth classifier serves both apply paths (live worker and no-worker probe), and `isAuthError` recognizes `403` and `insufficient_scope`; `saved-not-connected` throws only for non-auth failures.
- [ ] `MCPApplyResult.outcome` is required for MCP applies; the store stops inferring from `status`.
- [ ] `#runOAuthFlow` resolves endpoints with OMP's `resolveMcpOAuthEndpointsFromServer` and passes the original error through; `MCP_OAUTH_CANCELLED` renders neutral, not red.
- [ ] The catalog view treats `saved-needs-auth` as success with an action, opens the detail page and mounts `McpOAuthSignIn` with auto-start; a reinstall of a saved, unauthenticated server never toasts success.
- [ ] On `pending`, the panel opens the authorization URL once, polls the OAuth state every 1.5 s within the 5-minute budget with elapsed time and Cancel, cancels on unmount, and connects on `authenticated`. "Sign-in already in progress" replaces the `CATALOG_CONFLICT` error.
- [ ] A closed client registration pre-fills and focuses the client-ID field with the provider's own message.
- [ ] Copy changes reach all 15 locales.
- [ ] The agent has no Linear account, so the full loop is proven against a local OAuth MCP fixture server (protected-resource metadata, DCR, PKCE, auto-consent) through the real Host and Agent Service; the Linear run is recorded up to its authorize page. The maintainer's Linear consent is collected in task 13.
