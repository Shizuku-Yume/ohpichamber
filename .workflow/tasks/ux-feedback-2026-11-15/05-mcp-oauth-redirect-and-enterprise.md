# 05: Route MCP OAuth redirects by runtime and gate them in enterprise mode

**Effort:** ux-feedback-2026-11-15
**Blocked by:** 04
**Covers:** W4
**Files:** `packages/web/server/lib/host/` (new MCP OAuth callback route and pending-state map, `canonical-routes.js`, `worker-operation-authorizer.js`), `packages/web/server/lib/enterprise-mode.js` and its tests, `packages/agent-service/src/worker/mcp.ts`, `packages/ui/src/components/sections/mcp/McpOAuthSignIn.tsx`, `packages/ui/src/lib/runtime-switch.ts` consumers, `packages/docs` security page, `.workflow/omp-migration/contracts.md` route table
**Read first:** spec "How it is built → MCP sign-in"; `research/feedback-2026-11-15/IntegrationOAuth.md` (F5, fix 6, choices B and C); `.agents/skills/enterprise-boundary/SKILL.md`; `.agents/skills/ui-api-decoupling/SKILL.md`; guest and tracker public-route precedents (`guests/routes.js`, `trackers/routes.js`)
**Check:** Host tests cover state validation (unknown, expired, replayed state refused), enterprise mode refusing both the authorizer branch and the callback with `403 enterprise_mode`, and the redirect choice per runtime. Real path: (a) packaged desktop: Linear sign-in redirects to the dedicated loopback port and completes; (b) Host started with `--host 0.0.0.0`, UI opened from a second machine: the redirect is `http://<host>:<port>/api/agent/v1/mcp/oauth/callback` and the flow completes; (c) enterprise mode: sign-in returns `403 enterprise_mode` with readable copy.
**Base commit:** 68e6a1dd10e1e771009278a677d41918deb27b5d
**Status:** active

- [ ] A local desktop runtime uses the Agent Service loopback on a fixed dedicated port with a pinned `redirectUri`.
- [ ] Remote Web, mobile, and desktop-on-remote-Host use the public Host callback route, which validates `state` against a Host-held pending map and hands the code to the `complete` action.
- [ ] Enterprise mode refuses MCP OAuth at the authorizer and the callback route; `enterprise-mode.js`, its tests and the security docs list the gate.
- [ ] `contracts.md` lists the callback route.
- [ ] "A second machine" is this machine's non-loopback address opened in a browser; the consent step uses the local OAuth MCP fixture from task 04.

## Progress

- Task 04 was already merged into this branch, and the Host side of this task (`60620cf04b`,
  `292a4facc3`, `7eec4fc2f3`: public `GET /api/agent/v1/mcp/oauth/callback` with a bounded pending-state
  map, `403 enterprise_mode` at the route, the canonical `start` action and the worker `mcp-oauth`
  branch, `enterprise-mode.js` header) was already on this branch; this slice did not touch
  `packages/web/server`.
- Runtime split landed in two commits: `0b7dc65878` (agent-contract constants + Agent Service pin and
  policy-refusal pass-through) and `64f1dd1e9e` (UI redirect choice, enterprise copy in 15 locales,
  section docs).
- Redirect table: local desktop / web-on-localhost -> `http://localhost:38471/callback`; remote web,
  Capacitor mobile, desktop-on-remote-Host (also over an SSH tunnel) -> `<base>/api/agent/v1/mcp/oauth/callback`;
  relay mode -> loopback; a user-typed redirect URI wins.
- Agent Service: default redirect pinned from the contract; a redirect that is not the listener this
  flow binds marks the flow as needing `callbackInput` and takes a random unused loopback port, so a
  Host redirect never depends on (or collides with) the loopback listener. A `ProjectionError`
  policy refusal keeps its code/status rather than becoming `MCP_OAUTH_FAILED`.
- Checks run: `VITEST_MAX_WORKERS=2 bun test src/worker/mcp.test.ts` (19 pass),
  `bun test src/components/sections/mcp/mcpOAuthRedirect.test.ts`
  `+ McpOAuthSignIn.test.tsx` (25 pass), agent-service supervisor suite (102 pass),
  `bun run --cwd packages/ui type-check`, `bun run --cwd packages/agent-service type-check`,
  `bun run --cwd packages/agent-contract build`, `bun run --cwd packages/agent-service build`,
  `bunx oxlint` on every changed file, `bun run dead-code` (no new dead exports; pre-existing backlog only).
- Not done here: the real-path runs (packaged desktop, second machine, enterprise mode) and the
  independent review — both belong to the effort's landing flow, and this slice was scoped to the
  runtime split plus its tests. The Host+fixture run was started (built `packages/web/dist`, isolated
  HOME/DATA on 4247) but only reached host readiness before this window's budget ended; it produced no
  evidence file and every process it started is stopped.
