# 01: List sessions and titles from OMP storage

**Effort:** omp-native-parity
**Task type:** bugfix
**Base commit:** cbe1f912b3eda59858061e1dccdffa4c496cb4b9
**Started:** 2026-10-26T15:53:07Z
**Finished:** 2026-10-26T16:21:25Z

**Delivers:** The sidebar lists a directory's OMP sessions from OMP's own storage, including sessions created by the `omp` CLI, with OMP's titles. New chats get OMP's generated title; an app rename writes the OMP title.

**Blocked by:** None
**Files:** `packages/agent-service/src/sessions/references.ts`, `packages/agent-service/src/sessions/registry.ts` (list path), Agent Service session list route, `packages/web/server/lib/openchamber-sessions/routes.js` (list, rename), Host metadata title handling, `packages/ui/src/lib/sessionTitle.ts`, sidebar session list loading; OMP `SessionManager` (`setSessionName`, `listForPicker`) and `session-listing.ts` `listRecentSessions` in the pinned package.

**Read first:** spec "Sessions come from OMP storage"; `packages/ui/src/sync/DOCUMENTATION.md`; `.workflow/omp-migration/contracts.md` session list sections.
**Covers:** W1

**Check:** Before: with a session created by `omp -p` in a test directory (isolated OMP agent dir), the Agent Service list omits it and titles are null. After: an Agent Service test lists it with its OMP title; a Host route test shows rename writes the JSONL title line; a UI test shows OMP titles, not `generateSessionTitle` output.

- [x] Agent Service lists from OMP storage with OMP's listing code; no worker starts.
- [x] Reference file keeps only non-OMP facts; unreferenced JSONL still listed.
- [x] OMP title generation runs for new app chats; UI heuristic removed if unused.
- [x] Rename goes through OMP `setSessionName`.

## Progress

- **Dirty at start:** none.
- **Check before:** a throwaway script in the isolated fixture created an OMP session with `SessionManager.create`, titled it `CLI-created session`, then called `SessionRegistry.list('check-workspace')` on a fresh service state. It returned `{"nativeId":"01a178ee-9d04-7576-bf06-2a4481847fb4", "listedSessionIds":[], "titles":[]}` — the JSONL exists in the directory's OMP session storage, but the reference-only list omits it.
- **Baseline:** `bun run test` was started at the Base but overlapped implementation edits; its recorded result (6038 pass / 7 fail, 377 files) is not a clean Base baseline. The failures shown were the in-progress `metadata.title` contract change. Focused post-change suites below are the used evidence.
- **Check after:**
  - `bun test packages/agent-service/src/sessions/omp-listing.test.ts` -> 1 pass, 9 expect() calls. It creates an isolated OMP agent dir, two OMP JSONL sessions (one reference-backed with a different Host `rootSessionId`, one CLI-style without a reference), lists both with their OMP titles, asserts `workers.list()` is empty, then renames the unreferenced session and reads `Renamed by the app` from both `SessionManager.getSessionName()` and the JSONL header `title`.
  - `bun test server/lib/openchamber-sessions/routes.test.js` (packages/web) -> 9 pass, 11 expect() calls; the new route test asserts `PATCH /api/agent/v1/sessions/session/title` receives `{workspaceId,title}` and returns the composed session with the OMP title.
  - Focused Host suites (`openchamber-sessions`, `openchamber-control/service.test.js`, `pwa-manifest-routes`, `dispatch-results`, `notifications/template-runtime`, `message-search`) -> 79 pass, 0 fail.
  - Focused UI title/store suites (`session-title-generation`, `session-actions`, `session-records`) -> 94 pass, 0 fail, 303 expect() calls.
  - `packages/agent-service`: `src/sessions` 23 pass, 0 fail (177 expect); broader focused run 84 pass / 1 timeout in existing `worker/session-native.test.ts > native plan proposal supports approve-compact through canonical questions` (30 s timeout, unrelated to titles).
- **Type-check:** `packages/agent-service` and `packages/web` pass. `packages/ui` is blocked by a pre-existing locale drift at Base: `es/ja/ko/pt-BR/uk/zh-CN/zh-TW` define `chat.btw.titleFallback`, which `en.ts` does not; `tsc` reports `TS2353` for those seven files. No task file was involved. All other UI type errors from this change were fixed.
- **Lint:** `bunx oxlint` on the authored Agent Service/UI core files reports only pre-existing anti-slop findings (anonymous widening and `unknown` parameter helpers in `session-actions.ts`, and pre-existing conditional spreads/assertions later in `registry.ts`). The conditional spreads introduced by this task were removed. `bun run dead-code` reports only the existing unused FormCard/TodoTray/agentMentions/LegacyDataNotice items; no new unused export from this task.
- **Security pass:** title routes authorize through the existing Host session scope before dispatch; the Agent Service validates the requested workspace against its registered catalog, rejects scope mismatch, and passes the title only to OMP. No shell, path, credential or network sink is added. Boundaries reviewed: Host session title route, Agent Service title route, registry title resolution.
- **Review boundary:** Base `cbe1f912b3` + `packages/agent-contract`, `packages/agent-service/src/{sessions,projection,supervisor,worker}`, `packages/web/server/{index.js,lib/openchamber-*/,lib/host/pwa-manifest-routes.js,lib/message-search,lib/notifications,lib/dispatch-results,lib/openchamber-control}`, `packages/ui/src` title consumers/tests; round: 1; briefs: self-review; boundaries: session title authorization, OMP JSONL write; findings: 0 blocking / 0 nonblocking.
- **Decisions:** `decisions.md: 2026-10-26 - OMP owns session titles`; `2026-10-26 - Cold title writes use OMP's session manager`; `2026-10-26 - Legacy Host titles are dropped, not migrated`.
- **Not run:** a real-provider browser smoke was not run; this window's remaining budget was consumed by the contract/test migration, so the real-path evidence is the isolated Agent Service JSONL test plus Host route test, not a live Web UI observation. The OMP title path in the UI is covered by the focused unit/store suites only.
