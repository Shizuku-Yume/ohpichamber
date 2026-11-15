# 05: Route MCP OAuth redirects by runtime and gate them in enterprise mode

**Effort:** ux-feedback-2026-11-15
**Blocked by:** 04
**Covers:** W4
**Files:** `packages/web/server/lib/host/` (new MCP OAuth callback route and pending-state map, `canonical-routes.js`, `worker-operation-authorizer.js`), `packages/web/server/lib/enterprise-mode.js` and its tests, `packages/agent-service/src/worker/mcp.ts`, `packages/ui/src/components/sections/mcp/McpOAuthSignIn.tsx`, `packages/ui/src/lib/runtime-switch.ts` consumers, `packages/docs` security page, `.workflow/omp-migration/contracts.md` route table
**Read first:** spec "How it is built → MCP sign-in"; `research/feedback-2026-11-15/IntegrationOAuth.md` (F5, fix 6, choices B and C); `.agents/skills/enterprise-boundary/SKILL.md`; `.agents/skills/ui-api-decoupling/SKILL.md`; guest and tracker public-route precedents (`guests/routes.js`, `trackers/routes.js`)
**Check:** Host tests cover state validation (unknown, expired, replayed state refused), enterprise mode refusing both the authorizer branch and the callback with `403 enterprise_mode`, and the redirect choice per runtime. Real path: (a) packaged desktop: Linear sign-in redirects to the dedicated loopback port and completes; (b) Host started with `--host 0.0.0.0`, UI opened from a second machine: the redirect is `http://<host>:<port>/api/agent/v1/mcp/oauth/callback` and the flow completes; (c) enterprise mode: sign-in returns `403 enterprise_mode` with readable copy.

- [ ] A local desktop runtime uses the Agent Service loopback on a fixed dedicated port with a pinned `redirectUri`.
- [ ] Remote Web, mobile, and desktop-on-remote-Host use the public Host callback route, which validates `state` against a Host-held pending map and hands the code to the `complete` action.
- [ ] Enterprise mode refuses MCP OAuth at the authorizer and the callback route; `enterprise-mode.js`, its tests and the security docs list the gate.
- [ ] `contracts.md` lists the callback route.
- [ ] "A second machine" is this machine's non-loopback address opened in a browser; the consent step uses the local OAuth MCP fixture from task 04.
