# 01: Restore the failing root test suites

**Effort:** post-m3-hardening
**Task type:** bugfix
**Base commit:** f72010e3e
**Started:** 2026-10-23T04:00:00Z

**Delivers:** The UI quota-store suites, the Web TTS suite and the Web suite's unhandled errors pass again at the `main` tip, with each fix addressing its cause.

**Blocked by:** None
**Files:** `packages/ui/src/stores/useQuotaStore.ts`, `useQuotaStore.test.ts`, `useQuotaStore.same-origin.test.ts`; `packages/web/server/lib/quota/providers/selected-credential.js`; `packages/web/server/lib/quota/providers/selected-credential.test.js`; `packages/web/server/lib/tts/service.test.js`; `packages/ui/src/stores/useAgentsStore.ts`; `packages/ui/src/stores/useConfigStore.ts`; `packages/ui/src/stores/agentConfigBridge.ts`; `packages/ui/src/stores/DOCUMENTATION.md`

**Read first:** `.workflow/specs/post-m3-hardening.md`; `/home/shizuku/Project/ohpichamber-omp-artifacts/post-m3-review-2026-10-23/``GateRerun.md` findings 1-3 and `gate-test.log`, `gate-web.log`; `packages/ui/src/stores/DOCUMENTATION.md`; `.agents/skills/sync-state-invariants/SKILL.md`
**Covers:** H1

**Check:** `bun run test` and `bun run --cwd packages/web test` → both exit 0, 0 failed tests, 0 unhandled errors. Before the change: UI 6 failed tests in 2 files; Web 1 failed test plus 3 `TypeError: Cannot read properties of undefined (reading 'subscribe')`.

The three regressions came from post-gate follow-up commits `542b6a76a`, `ece761c88` and `d2d3d26de`; their focused checks skipped the dependent whole-file suites.

## Done when

- [x] Each of the three causes is named in `## Progress` (CONVENTIONS §8).
- [x] Quota tests express the workspace-scoped contract added by `542b6a76a` (`useQuotaStore.ts:217`) instead of the pre-workspace one.
- [x] `requireSelectedCredential` keeps distinct outcomes for "invalid context" and "credential unavailable" (changed by `ece761c88`), or the TTS contract is consciously changed; every caller of the helper is checked.
- [x] The `useAgentsStore.ts:320` module-level `queueMicrotask(() => useConfigStore.subscribe(...))` no longer runs against an undefined store under Vitest; the import cycle it worked around is resolved, not suppressed. Production boot still works (`bun run dev`, open the UI, composer agents load).
- [x] No test, rule or `dangerouslyIgnoreUnhandledErrors` is weakened.

## Progress

Dirty at start: none (fresh worktree from `f72010e3e`). The task was blocked on the store-ownership boundary, then resumed on 2026-10-23 after the maintainer authorized `useConfigStore.ts`. A concurrent session archived the task and rewrote the stores mid-run; this session re-inspected the worktree, supplied the missing `agentConfigBridge.ts` module its edit referenced, and reran every check on the final files.

Check before:
- `bunx vitest run src/DiffView.hunks.test.ts` in `packages/web` → 9 tests pass, `Errors 1`, `TypeError: Cannot read properties of undefined (reading 'subscribe')` at `useAgentsStore.ts:321`.
- Quota suites fail on the workspace gate: `useQuotaStore.test.ts` mocks only `isInitialized`, `useQuotaStore.same-origin.test.ts` sets no workspace. TTS expects the pre-`ece761c88` message.

Causes (CONVENTIONS §8):
1. `542b6a76a` gated quota loading on `isInitialized && workspaceId`, but both quota test mocks still published only `isInitialized`.
2. `ece761c88` gave invalid context the same `Selected credential unavailable` message as a missing credential (the code stayed `CREDENTIAL_RESOLUTION_FAILED`), while the TTS contract still expects `Selected credential context is required`.
3. `d2d3d26de` added a module-level `queueMicrotask(() => useConfigStore.subscribe(...))` to `useAgentsStore`. The stores are connected through `session-ui-store`, so the microtask ran before the config store's export binding was initialized under Vitest's async module loader.

Fixes:
- `useQuotaStore.test.ts` / `useQuotaStore.same-origin.test.ts` publish a workspace id and cover "no workspace yet" and "workspace changed" reloads; the same-origin expectation includes `?workspaceId=`.
- `selected-credential.js` restores distinct outcomes: `CREDENTIAL_CONTEXT_REQUIRED` ("Selected credential context is required") versus `CREDENTIAL_UNAVAILABLE`; every caller (`quota/providers/index.js`, `quota/routes.js`, `tts/service.js`) was checked and keeps its configured/unconfigured behavior.
- New `selected-credential.test.js` covers context, unavailable and resolution-failure outcomes.
- `agentConfigBridge.ts` carries the selection reader and readiness listener registrations and imports neither store. `useConfigStore` registers the reader and the readiness subscription because it owns `isInitialized`/`connectionPhase`; it calls the bridge at runtime, never into a store that may still be evaluating.
- `useAgentsStore` no longer imports the config module. Its module-level `queueMicrotask` is gone; it reads selection through the bridge and registers its readiness recovery listener. The `session-ui-store` import graph remains cyclic, but no store calls the other during module evaluation, so evaluation order cannot leave a binding undefined.
- Ownership records updated: Task 01 `Files` and the spec's Lane A `Owns` column name `useConfigStore.ts` and `agentConfigBridge.ts`.

Check after (all rerun on the final files, including the bridge's explicit registration checks; tested source commit `eb07cdfd6`, worktree `/home/shizuku/Project/ohpichamber-worktrees/post-m3-hardening-lane-a`):
- Bridge adoption: copied the exact preserved main-worktree `agentConfigBridge.ts` (sha256 `44c4546b389617102eeb0005a40537706c3920cee3a6ebdd729cd61e1af084f6`) over the branch copy; both hashes verified identical. `useAgentsStore.test.ts` 22/22, UI type-check exit 0 (forced rebuild, then the package command), and the full root suite below were rerun on the adopted file.
- `bun run test` → exit 0: scripts 22/22 files, sdk 23/23, ui 804/804, electron 44/44, web 371 passed / 9 skipped files and 6095 passed / 135 skipped tests, 0 unhandled errors.
- `bun run --cwd packages/web test` → exit 0: 371 passed / 9 skipped files, 6095 passed / 135 skipped tests, 0 unhandled errors (separate rerun). The root chain ran the exact `bun run --cwd packages/web test` step (`vitest run`) and it passed.
- `bun run --cwd packages/ui type-check` → exit 0.
- `bun test src/stores/useAgentsStore.test.ts` → 22 pass / 0 fail, 111 expect() calls.
- `bun test src/stores/useQuotaStore.test.ts src/stores/useQuotaStore.same-origin.test.ts` → 11 pass / 0 fail, 35 expect() calls.
- Focused Web regression (`server/lib/tts/service.test.js`, `server/lib/quota/providers/selected-credential.test.js`, `src/DiffView.hunks.test.ts`) → 3 files / 21 tests passed; the final root run re-ran the full Web suite after the store changes.
- ESLint on the changed UI files → exit 0. `oxlint` on `selected-credential.js` reports four pre-existing `anti-slop(no-runtime-typeof)` findings (two on untouched lines 1 and 3, two on unchanged conditions); no finding was introduced by this task.
- `bun run dead-code` → not runnable: knip tried to download package manifests and failed without network access. No conclusion from it.
- Real path (final files, rerun 2026-10-23T05:46Z): `bun run dev` on isolated ports 5193/3913. UI returned 200 (26,545 bytes), `/health` reported `agentService.phase: ready`, `/api/agent/v1/ready` returned 200, and in Chrome the config store reached `isInitialized: true` / `connectionPhase: connected` / `lastInitFailure: null` with workspace `ws_b678f717-d575-47d8-85fe-cc99c31a5ee6`, the composer agent catalog loaded (`writer`, `scout`, `reviewer`, `security-reviewer`, `task`, `sonic`) and no catalog error. Evidence: `/home/shizuku/Project/ohpichamber-omp-artifacts/task01-2026-10-23/` (`receipt.json`, `ui-boot-final-verify.png`).

Review boundary: `f72010e3e` + task archive, spec row, `useAgentsStore.ts`, `useConfigStore.ts`, `agentConfigBridge.ts`, `stores/DOCUMENTATION.md`, both quota tests, `selected-credential.js`, `selected-credential.test.js`; round: 1; briefs: A, B (run as in-session self-review because this harness has no spawnable reviewer agent); boundaries: credential resolution and error classification, provider quota/TTS error responses; findings: 0 blocking / 1 nonblocking. Nonblocking: `requireSelectedCredential` classifies a non-function `resolveCredential` as context-required rather than a separate programmer error; callers treat it as a configured failure and no secret path is affected. Security pass: credential boundary reviewed with all three callers, no secret in any message, no check moved to the client, and no new egress.

Final delta review (comparison point `eb07cdfd6` plus the task-record delta): Brief B passed with 0 findings; Brief A raised 4 blocking record findings — unrecorded tested commit, incomplete `Files` ownership, inaccurate pre-fix credential-code wording, and inverted start/finish timestamps. All four are fixed in this record and the receipt now names `eb07cdfd6`, the worktree, and the evidence paths.

Landing: `main` fast-forwarded from `eb07cdfd6` after `bun run test` passed at the landing commit (root chain: scripts 22/22, sdk 23/23, ui 804/804, electron 44/44, web 371 files / 6095 tests, 0 unhandled). The task implementation commit is `eb07cdfd6`; this commit carries the evidence update.

**Finished:** 2026-10-23T05:50:00Z
