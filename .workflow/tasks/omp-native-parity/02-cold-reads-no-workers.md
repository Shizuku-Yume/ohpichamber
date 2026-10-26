# 02: Read sessions without starting workers

**Effort:** omp-native-parity
**Task type:** bugfix
**Base commit:** <commit-sha>

**Delivers:** Listing, opening, prefetching and scrolling a session read its JSONL directly; boot opens no sessions; a send at the worker cap evicts the least recently used idle worker instead of returning 503; opening a long session is fast.

**Blocked by:** 01
**Files:** `packages/web/server/index.js` (~1287 `ensureGlobalWatcherStarted`), `packages/web/server/lib/openchamber-sessions/routes.js` (214-222, 507 reopen before read), `packages/web/server/lib/dispatch-results/runtime.js` (230-250), `packages/agent-service/src/sessions/registry.ts` (`coldProjection` ~354, `coldHistory` ~769), `packages/agent-service/src/worker/workers.ts` (55 cap, 489 spawn), `packages/ui/src/hooks/useSessionPrefetch.ts` (96, 177), `SessionNodeItem.tsx` (~1145), `packages/ui/src/sync/session-message-loader.ts` (592-663).

**Read first:** spec "Sessions come from OMP storage"; skills `sync-state-invariants`, `performance-engineering`; `decisions.md` entries on worker capacity (post-m3-hardening/18).
**Covers:** W2, W3

**Check:** Before: a Host test over persisted sessions shows boot and a snapshot read start workers; the dev UI shows "Could not refresh sessions" and 503 after opening more than 5 sessions. After: tests show zero workers after boot and after snapshot/history/messages reads, one after a send, and a 7th-session send succeeding with LRU idle eviction; browser timing for a 2,000-entry session before/after is recorded in the task Progress.

- [ ] Read routes use cold projection; only mutating routes open a worker.
- [ ] Boot and sidebar prefetch open nothing.
- [ ] Cap admission evicts the LRU idle worker; a busy-only cap still fails with a clear error.
- [ ] Loader fetches newest page first.
- [ ] Sidebar refresh error appears only on a real failed refresh.
