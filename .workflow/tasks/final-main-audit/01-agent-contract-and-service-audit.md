# 01: Audit and polish agent-contract and agent-service code quality

**Effort:** final-main-audit
**Task type:** refactor
**Blocked by:** None
**Covers:** W1
**Files:** `packages/agent-contract/**`; `packages/agent-service/**`
**Read first:** `.workflow/specs/final-main-audit.md`; `AGENTS.md` Validation & Correctness Invariants; `.workflow/omp-migration/architecture.md`; `.workflow/omp-migration/contracts.md`
**Check:** `bunx oxlint packages/agent-contract packages/agent-service && bun run --cwd packages/agent-contract type-check && bun run --cwd packages/agent-service type-check && bun run --cwd packages/agent-contract test && bun test --timeout 15000 packages/agent-service/src && bun run --cwd packages/agent-service build` → all exit 0 with 0 errors and 0 warnings.

- [ ] Run `bunx oxlint` across `packages/agent-contract` and `packages/agent-service` (100% fork-owned packages) and eliminate every lint or `anti-slop` finding cleanly (proper Zod schemas/narrowing, zero unjustified casts, zero `Record<string, unknown>` laundering, zero disabled rules).
- [ ] Audit worker lifecycle, process/timer cleanup, IPC error envelopes, and OMP SDK boundary encapsulation across `packages/agent-service/src/supervisor/` and `src/worker/`; fix any leaked listener, unhandled promise, stale comment, or OpenCode/VS Code leftover.
- [ ] Verify `README.md` / `DOCUMENTATION.md` in both packages match the shipped implementation, rebuild `packages/agent-service/dist`, and pass all contract and service tests.
