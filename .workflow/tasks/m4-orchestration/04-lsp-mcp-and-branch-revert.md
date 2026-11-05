# 04: Enable OMP worker LSP, tolerate unmanaged MCP configs read-only, and stabilize branch revert

**Effort:** m4-orchestration
**Task type:** feature
**Blocked by:** None
**Files:** `packages/agent-service/src/worker/session.ts`, `packages/agent-service/src/worker/session-native.test.ts`, `packages/agent-service/src/worker/mcp.ts`, `packages/agent-service/src/worker/mcp.test.ts`, `packages/agent-contract/src/catalogs.ts`, `packages/agent-contract/src/catalogs.test.ts`, `packages/ui/src/components/sections/mcp/`
**Read first:** `.workflow/specs/m4-orchestration.md`; `.workflow/decisions.md` (2026-11-05 - Enable OMP LSP settings in workers, project unmanaged MCP configs read-only, and clean up settings naming; 2026-11-05 - Scope M4 to CP-09 branch-revert stability, B3 adaptation fixes, and orchestration verification)
**Covers:** W5, W6, W7
**Check:** `bun test packages/agent-contract/src/catalogs.test.ts packages/agent-service/src/worker/mcp.test.ts packages/agent-service/src/worker/session-native.test.ts` and `bunx oxlint packages/agent-service/src/worker/session.ts packages/agent-service/src/worker/mcp.ts` exit 0.

- [ ] `packages/agent-service/src/worker/session.ts` removes the hardcoded `enableLsp: false` override in `createAgentSession(...)`, allowing OMP's `lsp.*` settings (`formatOnWrite`, `diagnosticsOnWrite`, `diagnosticsOnEdit`) to take effect inside the worker's authorized `cwd`.
- [ ] `packages/agent-service/src/worker/mcp.ts` projects hand-written/unmanaged `.omp/mcp.json` files (without an `openchamber` wrapper or with `env`/`headers`) as read-only unmanaged servers (`managed: false`, secrets redacted) instead of throwing 500 `MCP_CONFIG_READ_FAILED`, and refuses in-place mutations until explicitly converted.
- [ ] `packages/agent-service/src/worker/session.ts` `selectBranch` returns HTTP 409 without calling `this.fail()` when `navigateTree` does not change the leaf or when rollback to the prior leaf and custom entry succeeds; subsequent prompts succeed in the same worker generation.
