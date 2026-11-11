# 22: Boot hydration registry, unknown state and same-source freshness (R4)

**Effort:** ux-v270-omp-alignment
**Blocked by:** 19
**Covers:** W5
**Files:** `packages/ui/src/stores/serverStateBoot.ts` (new); `packages/ui/src/stores/{permissionStore,useAgentMemoryStore,useGitIdentitiesStore,useQuotaStore,useWebSearchStore,useSessionFoldersStore,useAdvisorStore,useCleanseStore}.ts`; `packages/ui/src/sync/{sync-context.tsx,event-reducer.ts,permission-mode-sync.ts,host-session-status-seed.ts}`; `packages/ui/src/lib/{sessionAssistMetadata,sessionWorkMetadata}.ts`; `packages/ui/src/utils/permissionAutoAccept.ts`; `packages/ui/src/App.tsx`; `packages/ui/src/apps/{MobileApp,ElectronMiniChatApp}.tsx`; `packages/ui/src/components/chat/ChatInput.tsx` (draft permission default only); `packages/ui/src/lib/runtimeEndpointReset.ts`; `packages/agent-service/src/worker/session.ts` (`scheduleAutoTitle`)
**Read first:** `research/ux-v270-systemic-review.md` R4; `packages/ui/src/sync/DOCUMENTATION.md`; `packages/ui/src/stores/DOCUMENTATION.md`; skill `sync-state-invariants`
**Check:** `VITEST_MAX_WORKERS=2 bunx vitest run packages/ui/src/stores packages/ui/src/sync packages/ui/src/lib && bun --cwd packages/agent-service test && bun run lint` → exit 0, with the boot-registry test, the unknown-entity reducer test and the auto-title re-arm test passing; real path: restart with default permission mode `auto` → the composer shield shows auto before any click; a new session's generated title reaches the sidebar without reload; a next-prompt suggestion survives touching the session file
**Base commit:** 8327e6403f13f040ecc09b10b26ff7a2201b2d14
**Status:** active

- [x] Add a boot registry: each store projecting server or global config declares its hydrator and reset. Boot runs the hydrators on every app root (main, mobile, mini-chat), and `runtimeEndpointReset` uses the same registry instead of its hand list.
- [x] Store state carries `unknown | ready | error`. Consumers render a neutral affordance while unknown instead of `'ask'`, `0` or `false`. The new-session draft takes the configured default permission mode. `resolvePermissionMode` stops returning `ask` for "not read".
- [x] Reducers upsert or buffer `session.updated` and metadata events for sessions they do not hold yet.
- [x] Freshness checks compare same-source ordering only. No Host `Date.now()` against native file mtime, and no client clock against a server revision.
- [x] `scheduleAutoTitle` re-arms (commit ff7f4a80a, `session-auto-title.test.ts`) after a superseding prompt, so an untitled session always gets a title.
- [x] Add guardrails: a boot-registry test enumerating server-config stores; an unknown-entity test applying each canonical event to an empty state; a lint rule against `>= session.updatedAt`-style cross-source comparisons.
- [x] Deletes: `permission-mode-sync.ts` as an orphan path (folded into the registry), the second readers of `defaultGitIdentityId` and quota selections, and per-store "hydrate when the Settings page mounts" paths.

## Progress

**Check before:** `node scripts/run-isolated-tests.mjs packages/ui/src/stores packages/ui/src/sync packages/ui/src/lib` passed on the base tree, but the acceptance defects were present: `packages/ui/src/sync/permission-mode-sync.ts` had no production importer (`grep -rn subscribePermissionPolicySync packages/` found only its own definition and one test), so `usePermissionStore` was never hydrated in production; `resolvePermissionMode` returned `'ask'` for an unread policy; `session.assist.generatedAt >= session.updatedAt` and `writtenAt >= session.updatedAt` compared a Host clock with the native file mtime; `buildHostStatusSeedSnapshots` compared `Date.now()` with the same mtime; `applyDirectoryEvent` returned `resnapshot` and `installSessionMetadata` returned the unchanged state for any session the directory did not hold.

**Check after:**

- `node scripts/run-isolated-tests.mjs packages/ui/src` → `1225/1225 test files passed` (the whole UI tree, including `stores/serverStateBoot.test.ts`, `sync/event-reducer.unknown-entity.test.ts`, the per-store phase tests, the freshness regressions and the component tests whose mount-time readers were removed).
- `VITEST_MAX_WORKERS=2 bunx vitest run packages/ui/src/stores packages/ui/src/sync packages/ui/src/lib` → **not usable here**: vitest spawns one worker per file and every file fails with `Cannot find package 'bun:test'` (578/578 failed, "Tests no tests"). The repo's tests in these roots are `bun:test`; the isolated runner above is the same set of files run with the canonical runner.
- `bun run lint` → exit 0 (only the pre-existing `react-hooks/exhaustive-deps` warnings).
- `bun run --cwd packages/ui type-check` → `No type errors in 3,511 files across 2 projects`.
- `bunx oxlint -c oxlint.config.ts packages/ui/src tools/oxlint --report-unused-disable-directives` → no findings from `openchamber/no-cross-source-time-compare`, no unused disables.
- `bunx oxlint -c oxlint.anti-slop.config.ts` on the authored files (`serverStateBoot.ts`, `loadPhase.ts`, `sessionSourceClock.ts`, `no-cross-source-time-compare.ts`) → clean; `sync/event-reducer.ts` holds 16 findings, identical to its pre-change count.
- `bun run dead-code` → exit 1 for the repo's pre-existing report (158 entries already under `packages/ui/src/lib` etc.); it lists nothing from `serverStateBoot.ts`, `loadPhase.ts`, `sessionSourceClock.ts` or the lint rule (checked: `grep -E "serverStateBoot|loadPhase|sessionSourceClock|no-cross-source|hostReviewOfferAt"` → no output).
- `bun --cwd packages/agent-service test` → exit 0: `471 pass, 10 skip, 0 fail`, 3,308 expect() calls, 481 tests across 66 files (348.9 s). The auto-title re-arm is covered by `session-auto-title.test.ts` in that run.
- Real path on port 4122 (built `packages/web/dist`, provider env loaded, default permission mode `auto`):
  - **Check 1 (passes):** after `permissionDefaultMode: "auto"` on the instance and a full page reload, the composer shield reads `权限：全部接受` (auto) with no click. Before this change the store was never hydrated, so it read `ask`.
  - **Check 2 (passes):** a new session sent "Say hello in one short sentence."; the greeting reply appeared and the row showed the generated title `Hello there` in the Chat sidebar without a reload.
  - **Check 3 (not observed in the built UI, freshness rule covered by tests):** with the assist payload written through the Host's own metadata route (`/api/openchamber/sessions/:id/metadata`, revision 7, `forMessageID` = the current transcript head, `generatedAt` later than `openchamber.workbench.lastIdleAt`), the suggestion chip did not render on screen — `document.body.innerText` never contained the suggestion text and `list_console_messages` showed no client error. The freshness rule itself is covered by `lib/sessionAssistMetadata.test.ts` (including the case where `updatedAt` moves far ahead of the Host stamps and the payload must stay). The remaining gap is a rendering/reception path outside this task's files (`SessionSuggestionChip` read of the session record); it is not the cross-clock purge this task fixes.
  - Server closed afterwards (`port4122=000`), browser page closed.

**Costly choices** are recorded in `.workflow/decisions.md` (`2026-11-12 - The boot registry owns server-owned reads; freshness compares one clock`); they are appended there, never rewritten.
