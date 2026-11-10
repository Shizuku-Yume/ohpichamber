# 21: Carry error causes end to end and authorize proposed state (R6)

**Effort:** ux-v270-omp-alignment
**Blocked by:** 19
**Covers:** W7
**Files:** `packages/agent-service/src/protocol.ts`; `packages/agent-service/src/worker/{index,policy,stateless,mcp,catalog-agents}.ts`; `packages/agent-service/src/supervisor/{workers,service,catalog}.ts`; `packages/web/server/lib/host/{agent-runtime,worker-operation-authorizer,canonical-routes}.js`; `packages/ui/src/api/canonicalClient.ts`; `packages/ui/src/lib/problemMessage.ts`; `packages/ui/src/stores/useMcpConfigStore.ts`; `packages/ui/src/components/sections/mcp/McpPage.tsx`; UI catch sites listed by the review (A13-A18 and the 68-site baseline)
**Read first:** `research/ux-v270-systemic-review.md` R6; `packages/web/server/lib/host/DOCUMENTATION.md`; `.workflow/omp-migration/contracts.md` (problem details); skills `ui-api-decoupling`, `locale-ui-patterns`
**Check:** `bun --cwd packages/agent-service test && VITEST_MAX_WORKERS=2 bunx vitest run packages/web/server/lib/host packages/ui/src/api packages/ui/src/lib/problemMessage.test.ts && bun run lint` → exit 0, with the sentinel propagation test and the C1-C6 proposed-state authorizer tests passing; real path: install and connect an MCP server from the Integrations catalog → success, and a refused operation's toast names the refusing check

- [ ] Add `detail` to the worker `operation.error` reply. Fill it from the thrown error in the worker; forward it unchanged through `WorkerOperationError`, the supervisor service, the catalog coordinator, `agent-runtime.js` and `canonicalClient`. Remove the generic default messages instead of rewording them per layer.
- [ ] `denied()` takes a required reason that reaches `WorkerPolicyResult.detail` and the worker's `ProjectionError`.
- [ ] Authorizers evaluate the operation's proposed state: the candidate MCP server/OAuth config, the new permission preset, the agent being written, the provider/model being added (C1-C6), never the pre-operation snapshot.
- [ ] One UI helper builds toast and banner text from problem `detail`, falling back to the translated sentence. All listed catch sites use it, and a lint ratchet stops new translation-only error toasts.
- [ ] Add a sentinel test: a worker throws a unique string, which must appear in the reply, the problem response, `CanonicalApiError.message` and the rendered toast.
- [ ] Deletes: `'SDK worker operation failed'`, `'Session operation failed'`, `'Catalog operation failed'` and `'The authorized Agent workspace is unavailable'` as substitutes for a known cause.
