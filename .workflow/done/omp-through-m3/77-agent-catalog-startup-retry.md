# 77: Recover the agent catalog after Agent Service readiness

**Effort:** omp-through-m3
**Task type:** bugfix
**Base commit:** 572d323e2
**Started:** 2026-10-22T05:35:28Z
**Finished:** 2026-10-22T10:10:00Z

**Delivers:** A transient agent-catalog failure during cold start or reconnect no longer leaves the composer agent control permanently `不可用`. Once the config catalog reports `isInitialized && connectionPhase === 'connected'`, `useAgentsStore` waits for the canonical Agent Service readiness probe and retries that same directory at most three times with short backoff. Success publishes the roster and clears the error; exhausted retries keep the real failure visible.

**Blocked by:** None
**Files:** `packages/ui/src/stores/useAgentsStore.ts`, `packages/ui/src/stores/useAgentsStore.test.ts`, `packages/ui/src/stores/waitForAgentServiceConnection.ts`, `packages/ui/src/stores/waitForAgentServiceConnection.test.ts`, `packages/ui/src/stores/DOCUMENTATION.md`.

**Read first:** `useAgentsStore.ts` catalog status/load, `waitForAgentServiceConnection.ts`, `useCatalogReadiness.ts`, `.workflow` follow-up 75/76 context in `done/omp-through-m3/`.
**Covers:** W9

**Check:** `bun test packages/ui/src/stores/useAgentsStore.test.ts packages/ui/src/stores/waitForAgentServiceConnection.test.ts` → transient 503 then ready publishes and clears, persistent 503 stops after the bounded attempts, non-retryable stays without retry, directory switch retires the old recovery, and a retired readiness waiter stops before probing.

- [x] Retry is owned by the store; ModelControls stays one-shot.
- [x] Readiness uses the canonical Agent Service probe, not model-catalog readiness.
- [x] Runtime/directory guards stop old probes and loads.
- [x] Bounded retries keep a real error visible after exhaustion.
- [x] Focused tests cover transient recovery, exhausted error retention, non-retryable no-retry, directory switch, runtime reset during readiness, and connected-transition rearm.

## Progress

Dirty at start: none.

Root cause: `loadAgents` recorded a per-directory error and returned; the composer called it once per directory, while only config-change events retried. A cold-start failure therefore stayed `error` after the Agent Service became ready.

Implementation: config readiness transition (`isInitialized && connectionPhase === 'connected'`) schedules recovery for the current errored directory; `retryAgentsWhenReady` waits on the existing canonical readiness helper with an `isCurrent` guard, retries `loadAgents` three times, and records a settled key only after exhaustion. Runtime switch clears recovery state; a successful publish clears the settled key. Failure→empty conversion was not introduced.

Evidence: focused store/helper tests 29 pass / 0 fail / 128 expect; UI type-check exit 0; touched-file oxlint reports only three pre-existing anti-slop findings in `useAgentsStore.ts` (fail `unknown`, conditional spread, `typeof window`), none from this change. No new path or credential logging was added; temporary debug traces were removed. The pre-existing `console.warn` in `getConfigDirectory` was left unchanged.

## Packaging blocker (2026-10-22)

a94 was built once and its payload passed FUSE verification (sha256 `5f7de9bc…`, 158 Agent packages, Bun 1.4.2, 29 native modules), but the installed renderer failed during boot with `Uncaught ReferenceError: Cannot access 'Ie' before initialization` and stayed on the loading icon. Root cause: the new `useConfigStore.subscribe(...)` executed at module evaluation while `useConfigStore` and `useAgentsStore` import each other. Fixed in source by deferring the subscription with `queueMicrotask`; focused tests (29/29) and UI type-check pass again. A corrected package was then built once after the queueMicrotask fix: a95 sha256 `970f3237…`; FUSE payload verification passed; the actual a95 executable booted with no renderer errors, the canonical readiness route returned `{ready:true, engine:'omp'}`, the composer agent control showed `writer`, and the agent menu listed the full roster (reviewer, scout, security-reviewer, sonic, task, writer) with no `不可用`. a94 and all older artifacts remain preserved; the launcher points to a95. Data/profile paths were not copied or deleted and no model prompt was sent.

**Post-rebase verification (2026-10-22):** `useAgentsStore.test.ts` and `waitForAgentServiceConnection.test.ts` passed 29/29 (128 expects); UI type-check passed. Agent Service type-check and model-catalog tests passed 31/31. One combined UI test invocation had 13 quota failures and a provider-load error; rerunning the affected suites separately passed (`useQuotaStore.refresh.test.ts` 16/16; `usagePageState.test.ts` plus `useConfigStore.test.ts` 120/120). The config test logs its simulated startup errors but exits 0. The new Linux AppImage passed `verify:linux-appimage`; the prior a95 real boot remains the runtime smoke evidence for this code path.
