# OAuth MCP fixture

A local server that behaves like a hosted OAuth-protected MCP server, so the
MCP sign-in loop can be driven end to end through the real Host and Agent
Service without a vendor account. The `echo` tool is the only capability; the
point is the authorization dance in front of it.

Everything stays in memory, listens on `127.0.0.1` only, and mints random
tokens per run. Stopping the process forgets every client, code and token.

## Run it

```sh
bun scripts/mcp-oauth-fixture/server.mjs --port 41441
```

| Flag | Effect |
|---|---|
| `--port <n>` | Port to bind on `127.0.0.1` (default `41441`; `0` picks a free one). |
| `--no-dcr` | Advertise `registration_endpoint` but answer `POST /register` with `403 {"error":"unapproved_client"}`. Models Figma, whose registration endpoint only accepts catalog-approved clients. Authorization still works for the pre-registered client id `fixture-preregistered` with any `http://localhost`/`http://127.0.0.1` redirect, so the manual client-ID path can be exercised. |
| `--challenge-403` | Answer an unauthenticated MCP request with `403` instead of `401`, keeping the same `WWW-Authenticate` challenge. Reproduces servers that answer 403 before OAuth. |
| `--consent-page` | Serve a one-button HTML consent page at `/authorize` instead of redirecting at once. For screenshots and for watching a human click through. |
| `--help` | Print the flags. |

The server prints its MCP URL and the discovery document URL on startup, then
one line per authorize request and per MCP method. Authorize logging lists the
parameters a provider would see, with `code_challenge` truncated.

## Endpoints

The base URL is whatever `host:port` the server bound (`http://127.0.0.1:41441`
by default). All paths are relative to it.

| Route | Behaviour |
|---|---|
| `POST /mcp` | Streamable HTTP MCP, JSON-RPC: `initialize`, `notifications/initialized` (`202`), `ping`, `tools/list` (one `echo` tool), `tools/call echo`. Replies with `application/json`; a notification gets an empty `202`. |
| `GET /mcp` | `405` (no server-initiated SSE stream). `DELETE /mcp` → `204`. |
| unauthenticated `/mcp` | `401` (or `403` under `--challenge-403`) with `WWW-Authenticate: Bearer resource_metadata="<base>/.well-known/oauth-protected-resource/mcp", scope="mcp:read"`. |
| `GET /.well-known/oauth-protected-resource` and `.../mcp` | `{resource, authorization_servers:[<base>], scopes_supported, bearer_methods_supported, resource_name}`. |
| `GET /.well-known/oauth-authorization-server` and `.../mcp` | `issuer`, `authorization_endpoint`, `token_endpoint`, `registration_endpoint`, `code_challenge_methods_supported: ["S256"]`, `grant_types_supported: [authorization_code, refresh_token]`, `response_types_supported: [code]`, `token_endpoint_auth_methods_supported: ["none"]`. |
| `POST /register` | RFC 7591 dynamic client registration → `201` with `client_id` and the echoed `redirect_uris`. `403 unapproved_client` under `--no-dcr`. |
| `GET /authorize` | Validates `client_id`, `redirect_uri` (must be one registered for that client; the pre-registered client accepts any loopback redirect), `response_type=code`, `state`, `code_challenge` and `code_challenge_method=S256`. Consents immediately with `302 <redirect_uri>?code=<code>&state=<state>`, or renders the consent page under `--consent-page`. |
| `POST /token` | `authorization_code` grant with S256 PKCE, single-use code, client and redirect matching; `refresh_token` grant with rotation. Returns `access_token`, `refresh_token`, `token_type: Bearer`, `expires_in: 3600`. |
| `GET /__state` | Debug JSON for evidence: mode flags, registered client count, issued code count, issued token count, active token counts, and the last authorize parameters (challenge truncated). |

## Point OpenChamber at it

Settings → **MCP** → add a server → remote **HTTP** with the URL:

```
http://127.0.0.1:41441/mcp
```

Create it, then use the OAuth section of the same page ("Sign in"). That path
goes through the Agent Service worker, its `MCPOAuthFlow`, and the OMP SDK's
discovery — the same code a Linear install uses. The loopback callback is the
Agent Service's own listener, so the fixture's `redirect_uri` validation is
what proves registration and PKCE stayed consistent.

The MCP URL above is also what a catalog or `.omp/mcp.json` entry needs:

```json
{
  "mcpServers": {
    "oauth-fixture": { "type": "http", "url": "http://127.0.0.1:41441/mcp" }
  }
}
```

Collect evidence from `GET /__state` (counts prove the code was exchanged
exactly once) and from the server's stdout (proves the authorizer received
`code_challenge` + `S256` and a matching `redirect_uri`).

## Test

```sh
bun test scripts/mcp-oauth-fixture/
```

The suite starts each fixture on an ephemeral port and drives the protocol with
`fetch`: challenge → discovery → DCR → PKCE authorize → token → authenticated
`initialize`/`tools/list`/`tools/call`, plus refresh rotation, a wrong verifier,
code reuse, an unregistered redirect, a non-S256 challenge, `--consent-page`,
`--no-dcr` with the pre-registered client, and `--challenge-403`. One test also
connects with the OMP SDK's own MCP HTTP client (`@oh-my-pi/pi-coding-agent`,
resolved inside `packages/agent-service`) and calls the tool; it is skipped when
that dependency tree is not installed.
