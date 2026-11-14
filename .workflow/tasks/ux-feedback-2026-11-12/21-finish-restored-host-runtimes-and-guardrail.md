# 21: Finish the restored Host runtimes and tighten the merge-gap guardrail

**Effort:** ux-feedback-2026-11-12
**Task type:** bugfix
**Blocked by:** 01
**Covers:** W1, W2
**Files:** `packages/web/server/index.js`; `packages/web/server/lib/host/feature-routes-runtime.js`; `packages/web/server/lib/{auto-review,pr-watch}/`; the Host action contract and dispatcher for `pr.watch`/`pr.unwatch` (`packages/web/server/lib/openchamber-control/`, `packages/agent-contract/src/native-policy-protocol.ts`); the UI event dispatcher and `packages/ui/src/stores/useAutoReviewStore.ts`; `scripts/upstream-gaps.mjs`, `scripts/lib/upstream-gaps/`, `scripts/upstream-gaps.allowlist.tsv`
**Read first:** independent review of task 01, `/home/shizuku/Project/ohpichamber-omp-artifacts/ux-feedback-2026-11-13/independent-review/Review01.md` (all seven findings); `.workflow/done/ux-feedback-2026-11-12/01-*.md`; `packages/web/server/lib/event-stream/global-hub.js`; skills `ui-api-decoupling`, `sync-state-invariants`, `relay-transport`, `openchamber-change-discipline`
**Check:** run with the real composition, not substitutes. `bun run --cwd packages/web test -- server/lib/auto-review server/lib/pr-watch server/lib/host server/lib/openchamber-control` exits 0, with tests that build the runtimes the way `index.js` does. `node scripts/upstream-gaps.mjs --check` exits 0, and each of these makes it exit non-zero: deleting a tracker route handler, deleting the `setTerminalCloseOnExit` implementation while keeping its type, and deleting a `create*Runtime` call. Real path (Web, real provider, isolated data dir and `HOME`):
- a review flow starts an auto-review run that sends its review prompt and reports progress and completion in the strip;
- the agent creates a PR watch through the Host action, the strip appears, and a PR update wakes the session.

Save screenshots and the event log to `/home/shizuku/Project/ohpichamber-omp-artifacts/ux-feedback-2026-11-13/task21/`.

- [ ] Cut auto-review and PR watch over to the canonical owners. Session activity, prompt sends, history reads and events go through the Canonical Client and the global hub's canonical events. Delete their OpenCode-shaped URL builders, prompt and history routes, and the `event.translated()` handling.
- [ ] Add `pr.watch` and `pr.unwatch` to the Host action contract and dispatcher, and pass `prWatch` into the control service.
- [ ] Pass the real `broadcastUiEvent` to the auto-review runtime, and route `openchamber:auto-review.updated` into `useAutoReviewStore`.
- [ ] Guardrail: count only real mounted handlers as route coverage (not 404 fallbacks), match HTTP methods, detect store setters by their implementation, report `create*` constructors that exist only upstream, and separate an import from a call.
- [ ] Remove the blanket allowlist rows (around the auto-review callbacks). Every remaining row cites a specific decision or OMP owner.
