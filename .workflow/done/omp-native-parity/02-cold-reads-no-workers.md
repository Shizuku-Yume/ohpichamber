# 02: Read sessions without starting workers

**Effort:** omp-native-parity
**Task type:** bugfix
**Base commit:** a419646f88b7a0ed144547f76c6b1fd76496cbcb
**Started:** 2026-10-26T17:10:00Z
**Finished:** 2026-10-26T17:43:11Z

**Delivers:** Listing, opening, prefetching and scrolling a session read its JSONL directly; boot opens no sessions; a send at the worker cap evicts the least recently used idle worker instead of returning 503; opening a long session is fast.

**Blocked by:** 01
**Files:** `packages/web/server/index.js` (~1287 `ensureGlobalWatcherStarted`), `packages/web/server/lib/openchamber-sessions/routes.js` (214-222, 507 reopen before read), `packages/web/server/lib/dispatch-results/runtime.js` (230-250), `packages/agent-service/src/sessions/registry.ts` (`coldProjection` ~354, `coldHistory` ~769), `packages/agent-service/src/worker/workers.ts` (55 cap, 489 spawn), `packages/ui/src/hooks/useSessionPrefetch.ts` (96, 177), `SessionNodeItem.tsx` (~1145), `packages/ui/src/sync/session-message-loader.ts` (592-663).

**Read first:** spec "Sessions come from OMP storage"; skills `sync-state-invariants`, `performance-engineering`; `decisions.md` entries on worker capacity (post-m3-hardening/18).
**Covers:** W2, W3

**Check:** Before: a Host test over persisted sessions shows boot and a snapshot read start workers; the dev UI shows "Could not refresh sessions" and 503 after opening more than 5 sessions. After: tests show zero workers after boot and after snapshot/history/messages reads, one after a send, and a 7th-session send succeeding with LRU idle eviction; browser timing for a 2,000-entry session before/after is recorded in the task Progress.

- [x] Read routes use cold projection; only mutating routes open a worker.
- [x] Boot and sidebar prefetch open nothing.
- [x] Cap admission evicts the LRU idle worker; a busy-only cap still fails with a clear error.
- [x] Loader fetches newest page first.
- [x] Sidebar refresh error appears only on a real failed refresh.

- **Check before:** observed on the task-01 smoke at the integration base: opening/list refreshes went through `reopen` and the sidebar showed `Could not refresh sessions` with only a few persisted sessions; a 7th-session cap refusal was not reproduced in the browser, but the pre-change `reserveSessionCapacity` threw 503 instead of evicting (source and Task18 tests). The read path started a worker for every snapshot/history.
- **Check after:**
  - `bun test packages/agent-service/src/sessions/cold-reads.test.ts` -> 1 pass, 7 expect: snapshot+history of a persisted session return data and `/internal/workers` is empty before and after.
  - `bun test packages/web/server/lib/openchamber-sessions/routes.test.js` -> 10 pass, 15 expect: `service.open`/`history` call only snapshot/history; no reopen.
  - `bun test packages/agent-service/src/supervisor/{workers.capacity,service-capacity}.test.ts` -> 8 pass, 25 expect: cap evicts the least recently active idle worker, a busy-only cap returns the typed 503 capacity problem, and concurrent opens never exceed the cap.
  - `bun test packages/ui/src/sync/session-message-loader.test.ts` -> 40 pass, 148 expect: the first history request is the newest turn window (`leafTurnId`, no cursor), older pages follow its cursor.
  - Browser smoke (isolated `onp-a` context, dev UI 5191/API 3921, data `onp-a-2026-10-26`): boot and sidebar list showed zero session workers; opening a 2,000-entry JSONL session showed its newest marker in **733 ms** on a loaded UI (snapshot API warm 36 ms; first fresh page reload including app bootstrap was 6.06 s and is recorded as the caveat, not the session-open budget). A send then started exactly one session worker.
  - LRU admission path is also covered by the service capacity test opening a third root at a cap of two; a busy-only cap still returns `worker_capacity`.
- **Root cause:** read routes called `reopen()` before every snapshot/history, and Agent Service only used cold projection for deleted-space sessions; admission rejected at the cap instead of evicting an idle worker. Native-only OMP sessions also lacked a reference until first mutation, so reads/reopen failed; they now get a cold reference from the list and are promoted on first worker open.
- **Residual:** full root `bun run test` not rerun; `packages/ui` type-check remains blocked by the pre-existing locale drift. The 6.06 s fresh-reload figure includes app bootstrap and is not the loaded-UI open measurement.

- **Review boundary:** Base `a419646f88` + `packages/agent-service/src/sessions/registry.ts`, `packages/agent-service/src/sessions/cold-reads.test.ts`, `packages/agent-service/src/supervisor/{workers.ts,workers.capacity.test.ts,service-capacity.test.ts}`, `packages/web/server/index.js`, `packages/web/server/lib/host/canonical-routes.js`, `packages/web/server/lib/openchamber-sessions/{routes.js,routes.test.js}`, `packages/ui/src/sync/session-message-loader.test.ts`, `.workflow/decisions.md`, this task file; round: 1; briefs: self-review (A/B/security review workers were started but cancelled at 5m42s on the completion directive); trust boundaries: Host session scope -> JSONL path, native reference promotion, canonical mutation reopen, worker capacity eviction; findings: 0 blocking / 5 nonblocking recorded below.
- **Nonblocking review findings kept:** native-cold metadata is populated by list, so a direct snapshot before any list/reopen has no reference (boot always lists first); canonical mutation reopen runs before body validation, so an invalid mutating request can start an authorized worker; a cold abort/approval response can likewise start a worker before the expected 404; the 6.06 s fresh-reload figure is app bootstrap, not the 733 ms loaded-UI session-open measurement; full root tests and UI typecheck (pre-existing locale drift) were not run.
- **Security pass:** no new external listener, credential path or provider egress. The changed closure is session scope -> OMP session file: native paths come only from OMP's scoped list, Host scope still authorizes every canonical mutation before reopen, and capacity eviction refuses pending/running/approval/shell-busy roots. Residual risk is the native-cold-before-list case above.
