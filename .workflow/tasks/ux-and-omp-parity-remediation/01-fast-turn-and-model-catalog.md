# 01: Eliminate turn-start latency and initial model catalog loading stalls

**Effort:** ux-and-omp-parity-remediation
**Task type:** bugfix
**Blocked by:** None
**Covers:** W1
**Files:** `packages/web/server/lib/openchamber-sessions/routes.js`; `packages/agent-service/src/supervisor/workspaces.ts`; `packages/agent-service/src/supervisor/catalog.ts`; `packages/agent-service/src/worker/session.ts`; `packages/agent-service/src/worker/mcp.ts`; `packages/ui/src/stores/useConfigStore.ts`
**Read first:** `.workflow/specs/ux-and-omp-parity-remediation.md`; `.agents/skills/performance-engineering/SKILL.md`; `.agents/skills/sync-state-invariants/SKILL.md`
**Check:** `bun test packages/agent-service/src/supervisor/ packages/agent-service/src/worker/ && bun run --cwd packages/ui test src/stores/useConfigStore` → exits 0 and verifies concurrent catalog reads, cached provider authorization, and non-blocking MCP startup.

- [ ] In `packages/web/server/lib/openchamber-sessions/routes.js`, track confirmed live root sessions and skip the redundant `await reopen(scope)` HTTP round-trip on every prompt when the session worker is already live (falling back to `reopen` only when the worker is cold/unloaded).
- [ ] In `packages/agent-service/src/worker/session.ts` and `mcp.ts`, move initial external MCP server connections (`mcp.apply` / `waitForStartup`) off the critical worker-open path so a slow MCP server never blocks first-turn prompt admission.
- [ ] In `packages/agent-service/src/worker/session.ts`, cache `authorizeTool('provider.use', ...)` approvals per `(provider, model, baseUrl)` for the worker's lifetime to avoid repeated Worker $\to$ Supervisor $\to$ Host HTTP `/authorization-policy` round-trips on every turn.
- [ ] In `packages/agent-service/src/supervisor/workspaces.ts`, allow read-only stateless catalog operations (`catalog.models.read`, `catalog.providers.read`) to run concurrently instead of serializing behind the mutation lock, and pre-warm the stateless catalog worker on workspace registration.
- [ ] In `packages/ui/src/stores/useConfigStore.ts`, persist and synchronously hydrate the model/provider catalog snapshot per workspace from `localStorage` so the model selector renders immediately on startup while background revalidation completes.
