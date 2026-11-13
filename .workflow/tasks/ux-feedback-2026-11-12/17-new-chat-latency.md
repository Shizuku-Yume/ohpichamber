# 17: New chat without the stall: optimistic message and fast session create

**Effort:** ux-feedback-2026-11-12
**Blocked by:** None
**Covers:** W11
**Files:** `packages/agent-service/src/supervisor/{service,catalog,workers}.ts`; `packages/ui/src/sync/{session-ui-store,session-actions}.ts`; the optimistic send helpers; `scripts/perf/omp-performance.mjs` and `scripts/perf/DOCUMENTATION.md`
**Read first:** `research/feedback-2026-11-12/15-16-streaming-latency.md` (causes 2 and 3, measurements); skills `performance-engineering`, `sync-state-invariants`; `scripts/perf/DOCUMENTATION.md`
**Check:** `bun run profile:omp` with the new `create → run → first event` scenario records before and after on the fixture provider: `POST /sessions` p50 ≤ 400 ms (before about 1 s) and first `part.delta` ≤ 600 ms after send on a new chat (before 1.3 s); a UI test shows the user message rendered before `createRun` resolves and reconciled once accepted; supervisor tests exit 0. Receipts go in the evidence directory and `development.md`.

- [ ] `POST /sessions` responds before `registerCatalogWorker`'s MCP and skills reads; the generation guard keeps a late registration from overwriting a newer one.
- [ ] The normal send path inserts a pending user message through `optimisticAdd`/`reconcileAcceptedSend`; a failed send restores the draft and shows the cause.
- [ ] The UI attaches the session event stream before `createRun`.
- [ ] Add the scenario and budget to `profile:omp`.
