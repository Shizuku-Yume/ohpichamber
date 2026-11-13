# 17: New chat without the stall: optimistic message and fast session create

**Effort:** ux-feedback-2026-11-12
**Blocked by:** None
**Covers:** W11
**Files:** `packages/agent-service/src/supervisor/{service,catalog,workers}.ts`; `packages/ui/src/sync/{session-ui-store,session-actions}.ts`; the optimistic send helpers; `scripts/perf/omp-performance.mjs` and `scripts/perf/DOCUMENTATION.md`
**Read first:** `research/feedback-2026-11-12/15-16-streaming-latency.md` (causes 2 and 3, measurements); skills `performance-engineering`, `sync-state-invariants`; `scripts/perf/DOCUMENTATION.md`
**Check:** `bun run profile:omp` with the new `create → run → first event` scenario records before and after on the fixture provider: `POST /sessions` p50 ≤ 400 ms (before about 1 s) and first `part.delta` ≤ 600 ms after send on a new chat (before 1.3 s); a UI test shows the user message rendered before `createRun` resolves and reconciled once accepted; supervisor tests exit 0. Receipts go in the evidence directory and `development.md`.
**Check before:**
- `bun run profile:omp -- --url http://127.0.0.1:4117 --dir /tmp/oc-perf-serve-4117/project --output /home/shizuku/Project/ohpichamber-omp-artifacts/ux-feedback-2026-11-13/task17/before --skip-ui` on base commit `80e8eefd795f9bbe89ca6ac4e1fec6b433993fd5`:
  - `POST /sessions` p50: 1623.46 ms (samples: 1619.46, 1621.06, 1623.46, 1673.77, 1656.03 ms; budget ≤ 400 ms)
  - first `part.delta` after send on a new chat p50: 1889.12 ms (samples: 1873.37, 1879.3, 1889.12, 1921.85, 1894.23 ms; budget ≤ 600 ms)
  - first `part.delta` after `POST /runs` p50: 246.44 ms (samples: 246.44, 250.98, 258.83, 243.29, 230.75 ms)
  - catalog models: first 18.09 ms, warm median 10.95 ms, max 12.00 ms (budget 20 ms)
  - catalog providers: first 16.03 ms, warm median 12.83 ms, max 15.03 ms (budget 20 ms)
  - dispatch: new session 95.53 ms, warm 95.97 ms, overhead -0.44 ms (budget 150 ms)
  - Receipt written to `/home/shizuku/Project/ohpichamber-omp-artifacts/ux-feedback-2026-11-13/task17/before/omp-performance.json`.
**Base commit:** 80e8eefd795f9bbe89ca6ac4e1fec6b433993fd5
**Status:** active

- [ ] `POST /sessions` responds before `registerCatalogWorker`'s MCP and skills reads; the generation guard keeps a late registration from overwriting a newer one.
- [ ] The normal send path inserts a pending user message through `optimisticAdd`/`reconcileAcceptedSend`; a failed send restores the draft and shows the cause.
- [ ] The UI attaches the session event stream before `createRun`.
- [x] Add the scenario and budget to `profile:omp`.
