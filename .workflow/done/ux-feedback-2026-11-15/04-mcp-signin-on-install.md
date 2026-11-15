# 04: Turn an MCP install that needs sign-in into a sign-in, not an error

**Effort:** ux-feedback-2026-11-15
**Task type:** bugfix
**Blocked by:** None
**Covers:** W4
**Files:** `packages/agent-service/src/supervisor/{catalog.ts,catalog-mcp.test.ts}`, `packages/agent-service/src/worker/{mcp.ts,mcp.test.ts}`, `packages/agent-contract/src/catalogs.ts`, `packages/ui/src/components/views/{IntegrationsCatalogView.tsx,IntegrationsCatalogView.test.tsx}`, `packages/ui/src/components/sections/mcp/{McpOAuthSignIn.tsx,McpOAuthSignIn.test.tsx}`, `packages/ui/src/stores/useMcpConfigStore.ts`, `packages/ui/src/lib/i18n/messages/integrations-catalog.i18n.ts`
**Read first:** spec "How it is built → MCP sign-in"; `research/feedback-2026-11-15/IntegrationOAuth.md` (F1–F4, F7, fix 1–5); `decisions.md` 2026-11-15 "MCP sign-in starts on install…" and 2026-11-13 "MCP installs choose project or user scope"
**Check:** `bun test packages/agent-service/src/supervisor/catalog-mcp.test.ts packages/agent-service/src/worker/mcp.test.ts` exits 0 with a no-worker probe that fails with `HTTP 403 … WWW-Authenticate` classified `saved-needs-auth`, and a DCR rejection whose message survives; UI tests show `saved-needs-auth` gives the connection card and no error toast, auto-start sends one `start`, and a poll turning `pending → authenticated` connects. Real path (isolated Host): install Linear (`https://mcp.linear.app/mcp`) at user scope → info toast "saved, sign in to finish" → browser opens Linear's authorize page → after consent the server shows connected with no further click; `~/.omp/agent/mcp.json` (isolated HOME) lists `linear` with no token values. Install Figma → the registration refusal and a client-ID field, not "Could not install".
**Base commit:** f68a30f8628fe696ac6c54493a61597e72be890d

- [x] One auth classifier serves both apply paths (live worker and no-worker probe), and `isAuthError` recognizes `403` and `insufficient_scope`; `saved-not-connected` throws only for non-auth failures.
- [x] `MCPApplyResult.outcome` is required for MCP applies; the store stops inferring from `status`.
- [x] `#runOAuthFlow` resolves endpoints with OMP's `resolveMcpOAuthEndpointsFromServer` and passes the original error through; `MCP_OAUTH_CANCELLED` renders neutral, not red.
- [x] The catalog view treats `saved-needs-auth` as success with an action, opens the detail page and mounts `McpOAuthSignIn` with auto-start; a reinstall of a saved, unauthenticated server never toasts success.
- [x] On `pending`, the panel opens the authorization URL once, polls the OAuth state every 1.5 s within the 5-minute budget with elapsed time and Cancel, cancels on unmount, and connects on `authenticated`. "Sign-in already in progress" replaces the `CATALOG_CONFLICT` error.
- [x] A closed client registration pre-fills and focuses the client-ID field with the provider's own message.
- [x] Copy changes reach all 15 locales.
- [x] The agent has no Linear account, so the full loop is proven against a local OAuth MCP fixture server (protected-resource metadata, DCR, PKCE, auto-consent) through the real Host and Agent Service; the Linear run is recorded up to its authorize page. The maintainer's Linear consent is collected in task 13.

## Progress

- Evidence: `/home/shizuku/Project/ohpichamber-omp-artifacts/ux-feedback-2026-11-16/task04/` (`receipt-final.md`, `receipt-fixture.md`, `receipt-closures.md`, `*-final.png`).
- Real path proved: an isolated Host on port 4144 serving the rebuilt web bundle over the built Agent Service, OAuth fixture servers on 41441-41444, and isolated `HOME`/`OPENCHAMBER_DATA_DIR`/workspace directories under a throwaway temp root. The fixture full loop auto-starts, opens the authorize page once, polls and shows connected with no further click (token issued, `mcp initialize` and `tools/list`); `--challenge-403` is saved as "sign in to finish" instead of an install error; `--no-dcr` reveals and focuses the client-ID field with the provider's own refusal and completes after a client ID is entered; a post-handoff denial shows the red alert with the provider's sentence and no code was issued; Linear reaches its authorize page with `S256`, `state` and `redirect_uri`; Linear cancel renders neutral; Figma's refusal reveals the focused client-ID field; the isolated `~/.omp/agent/mcp.json` lists the servers with no token values.
- Not proved: the maintainer's Linear consent (task 13); the 5-minute timeout was not run in a browser. Known quirk, reproducing on the parent commit: the catalog card briefly resets to `Install` after a successful install.
- Copy, error codes and the unauthenticated `error` result: `.workflow/decisions.md` 2026-11-16 "MCP sign-in failure is a contract-visible result, and a closed registration asks for the client ID". Checkbox 6 is satisfied as reveal+focus of the client-ID field; nothing is pre-filled because no client ID is known.
- Review: pass — independent reviewer worker session `t04-reviewer`, two rounds. Round 1 blocking findings: a post-handoff failure was dropped, and the anti-slop ratchet regressed; both fixed. Round 2: no blocking findings in code.
- Check after:
  - `VITEST_MAX_WORKERS=2 bun test packages/agent-service/src/supervisor/catalog-mcp.test.ts packages/agent-service/src/worker/mcp.test.ts` -> 28 pass, 0 fail, 185 expect() calls across 2 files.
  - `bun test scripts/mcp-oauth-fixture/` -> 8 pass, 0 fail, 66 expect() calls.
  - `cd packages/ui && VITEST_MAX_WORKERS=2 bun test src/components/sections/mcp/McpOAuthSignIn.test.tsx src/components/sections/mcp/McpOAuthSignIn.runtime.test.tsx src/components/views/IntegrationsCatalogView.test.tsx src/stores/useMcpConfigStore.test.ts src/lib/i18n/messages.test.ts src/components/sections/mcp/McpPage.test.tsx src/components/sections/mcp/McpPage.runtime.test.tsx` -> 62 pass, 0 fail, 4740 expect() calls across 7 files.
  - `bun run --cwd packages/ui type-check` -> no type errors in 3,534 files across 2 projects.
  - `bun run --cwd packages/agent-service type-check` -> exit 0, prepared source-derived declarations for 18 OMP packages.
  - `bun run --cwd packages/agent-contract type-check` -> exit 0.
  - `node scripts/check-changed.mjs --base f68a30f8628fe696ac6c54493a61597e72be890d` -> anti-slop ratchet reports "No new findings"; the command exits 1 only on the known pre-existing dead-code baseline.
