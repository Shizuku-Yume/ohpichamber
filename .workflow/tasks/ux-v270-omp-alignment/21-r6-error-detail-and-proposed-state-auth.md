# 21: Carry error causes end to end and authorize proposed state (R6)

**Effort:** ux-v270-omp-alignment
**Blocked by:** 19
**Covers:** W7
**Files:** `packages/agent-service/src/protocol.ts`; `packages/agent-service/src/worker/{index,policy,stateless,mcp,catalog-agents}.ts`; `packages/agent-service/src/supervisor/{workers,service,catalog}.ts`; `packages/web/server/lib/host/{agent-runtime,worker-operation-authorizer,canonical-routes}.js`; `packages/ui/src/api/canonicalClient.ts`; `packages/ui/src/lib/problemMessage.ts`; `packages/ui/src/stores/useMcpConfigStore.ts`; `packages/ui/src/components/sections/mcp/McpPage.tsx`; UI catch sites listed by the review (A13-A18 and the 68-site baseline)
**Read first:** `research/ux-v270-systemic-review.md` R6; `packages/web/server/lib/host/DOCUMENTATION.md`; `.workflow/omp-migration/contracts.md` (problem details); skills `ui-api-decoupling`, `locale-ui-patterns`
**Check:** `bun --cwd packages/agent-service test && bun test packages/ui/src/lib/problemMessage.test.ts packages/ui/src/lib/problemMessage.toast.test.tsx && (cd packages/web && VITEST_MAX_WORKERS=2 bunx vitest run server/lib/host) && bun run lint` → exit 0, with the sentinel propagation test and the C1-C6 proposed-state authorizer tests passing; real path: install and connect an MCP server from the Integrations catalog → success, and a refused operation's toast names the refusing check
**Base commit:** 8327e6403f13f040ecc09b10b26ff7a2201b2d14
**Status:** active

**Check amended:** the UI helper test imports `bun:test`, and this repo has no root `vitest.config.ts` (upstream `bc50ba56a` has none), so `bunx vitest` from the root cannot resolve `bun:test` for `packages/ui` paths. The UI suites run under `bun test`; the Host suites run under the `packages/web` vitest config, which is the only one that aliases `bun:test` and `@/`. Agent decision, 2026-11-12.

- [x] Add `detail` to the worker `operation.error` reply. Fill it from the thrown error in the worker; forward it unchanged through `WorkerOperationError`, the supervisor service, the catalog coordinator, `agent-runtime.js` and `canonicalClient`. Remove the generic default messages instead of rewording them per layer.
- [x] `denied()` takes a required reason that reaches `WorkerPolicyResult.detail` and the worker's `ProjectionError`.
- [x] Authorizers evaluate the operation's proposed state: the candidate MCP server/OAuth config, the new permission preset, the agent being written, the provider/model being added (C1-C6), never the pre-operation snapshot.
- [x] One UI helper builds toast and banner text from problem `detail`, falling back to the translated sentence. All listed catch sites use it, and a lint ratchet stops new translation-only error toasts.
- [x] Add a sentinel test: a worker throws a unique string, which must appear in the reply, the problem response, `CanonicalApiError.message` and the rendered toast.
- [x] Deletes: `'SDK worker operation failed'`, `'Session operation failed'`, `'Catalog operation failed'` and `'The authorized Agent workspace is unavailable'` as substitutes for a known cause.

## Progress

**Review:** pending the reviewer pass against base `8327e6403`.

**Check before:** no prior run on this branch; the base commit's own state is recorded below.

**Check after:**
- `bun --cwd packages/agent-service test` → 482 tests, 471 pass, 10 skip, 0 fail (67 files). The one failure this change introduced (a diagnostics test asserting a code-only initialization message) was fixed by keeping diagnostics code-only and letting the cause travel through the problem response.
- `bun test packages/ui/src/lib/problemMessage.test.ts packages/ui/src/lib/problemMessage.toast.test.tsx` → 5 pass, 0 fail.
- `(cd packages/web && VITEST_MAX_WORKERS=2 bunx vitest run server/lib/host)` → 65 files, 647 pass, 1 skip, 0 fail.
- `bun run lint` → exit 0 (pre-existing react-hooks warnings only).
- `bun run check` → 3/3 steps (type-check, upstream-drift, error-cause).
- `bun run dead-code` → fails identically at the base commit (configuration hints and pre-existing unused type exports); no finding names a file this task added or changed.

**Real path (port 4121, provider env sourced):**
- Installed DeepWiki from the Integrations catalog; the PUT persisted `deepwiki` (revision 2) and `POST .../mcp/servers/deepwiki/test` answered `{"status":"connected","toolCount":3}`.
- Created `probe-server` through the MCP settings form (revision 1) and connected it: `{"status":"connected","toolCount":3}`.
- Refusals name the refusing check: a stale MCP write answered 409 `"The MCP configuration revision does not match the expected revision"`, and a stale agent write answered 409 `"The catalog revision does not match the expected revision"`.
- Server stopped afterwards.

**Evidence:**
- 265 `WorkerOperationError` sites and 46 `CatalogCoordinatorError` sites now carry a written cause; `'SDK worker operation failed'`, `'Session operation failed'`, `'Catalog operation failed'` and `'The authorized Agent workspace is unavailable'` are gone as substitutes for a known cause.
- `packages/agent-service/src/supervisor/service-error-cause.test.ts` follows one unique string from the worker's thrown error through the problem response, `CanonicalApiError.message` and the toast text; `packages/ui/src/lib/problemMessage.toast.test.tsx` renders it in a real toaster.
- `scripts/error-cause-guard.mjs` (wired into `bun run check`) fails on a new translation-only error display and on a `denied(` call without a reason; the 51 migrated sites form a zero baseline.
- C1-C6 have one authorizer test each in `worker-operation-authorizer.test.js`.
