# 01: Restore the failing root test suites

**Effort:** post-m3-hardening
**Task type:** bugfix
**Base commit:** f72010e3e
**Started:** 2026-10-23T12:00:00Z
**Status:** blocked

**Delivers:** The UI quota-store suites, the Web TTS suite and the Web suite's unhandled errors pass again at the `main` tip, with each fix addressing its cause.

**Blocked by:** None
**Files:** `packages/ui/src/stores/useQuotaStore.ts`, `useQuotaStore.test.ts`, `useQuotaStore.same-origin.test.ts`; `packages/web/server/lib/quota/providers/selected-credential.js`; `packages/web/server/lib/tts/service.test.js`; `packages/ui/src/stores/useAgentsStore.ts`

**Read first:** `.workflow/specs/post-m3-hardening.md`; `/home/shizuku/Project/ohpichamber-omp-artifacts/post-m3-review-2026-10-23/``GateRerun.md` findings 1-3 and `gate-test.log`, `gate-web.log`; `packages/ui/src/stores/DOCUMENTATION.md`; `.agents/skills/sync-state-invariants/SKILL.md`
**Covers:** H1

**Check:** `bun run test` and `bun run --cwd packages/web test` → both exit 0, 0 failed tests, 0 unhandled errors. Before the change: UI 6 failed tests in 2 files; Web 1 failed test plus 3 `TypeError: Cannot read properties of undefined (reading 'subscribe')`.

The three regressions came from post-gate follow-up commits `542b6a76a`, `ece761c88` and `d2d3d26de`; their focused checks skipped the dependent whole-file suites.

## Done when

- [ ] Each of the three causes is named in `## Progress` (CONVENTIONS §8).
- [ ] Quota tests express the workspace-scoped contract added by `542b6a76a` (`useQuotaStore.ts:217`) instead of the pre-workspace one.
- [ ] `requireSelectedCredential` keeps distinct outcomes for "invalid context" and "credential unavailable" (changed by `ece761c88`), or the TTS contract is consciously changed; every caller of the helper is checked.
- [ ] The `useAgentsStore.ts:320` module-level `queueMicrotask(() => useConfigStore.subscribe(...))` no longer runs against an undefined store under Vitest; the import cycle it worked around is resolved, not suppressed. Production boot still works (`bun run dev`, open the UI, composer agents load).
- [ ] No test, rule or `dangerouslyIgnoreUnhandledErrors` is weakened.

## Progress

Dirty at start: none (fresh worktree from `f72010e3e`).

Check before:
- `bunx vitest run src/DiffView.hunks.test.ts` in `packages/web` → 9 tests pass, `Errors 1`, `TypeError: Cannot read properties of undefined (reading 'subscribe')` at `useAgentsStore.ts:321`.
- Quota suites fail on the workspace gate: `useQuotaStore.test.ts` mocks only `isInitialized`, `useQuotaStore.same-origin.test.ts` sets no workspace. TTS expects the pre-`ece761c88` message.

Done so far (uncommitted on `post-m3-hardening/01-root-test-regressions`):
- `useQuotaStore.test.ts` / `useQuotaStore.same-origin.test.ts` now publish a workspace id and cover "no workspace yet" and "workspace changed" reloads; the same-origin expectation includes `?workspaceId=`. Focused run: 33 pass / 0 fail.
- `selected-credential.js` restores distinct outcomes: `CREDENTIAL_CONTEXT_REQUIRED` ("Selected credential context is required") versus `CREDENTIAL_UNAVAILABLE`; every caller (`quota/providers/index.js`, `quota/routes.js`, `tts/service.js`) was checked.
- New `selected-credential.test.js` covers the context, unavailable and resolution-failure outcomes; with `tts/service.test.js`: 12 pass / 0 fail.

Root cause of the unhandled TypeError: `useAgentsStore.ts` and `useConfigStore.ts` import each other. The deferred `queueMicrotask` was meant to outlive module evaluation, but under Vitest's async module loader it runs while `useConfigStore`'s binding is still undefined.

## Blocked

Assumed: task 01's `Files` list covers the whole fix. It does not. Resolving the cycle cleanly requires `packages/ui/src/stores/useConfigStore.ts`, which the spec's Lane A ownership does not include:
- move the connected-transition subscription into the store that owns `connectionPhase` (or register a late-bound config reader there), and
- let the agents store own only the retry it already exports.

The alternative that edits only `useAgentsStore.ts` is a dynamic import or a guard, which leaves the mutual dependency in place and only suppresses the failure the task says to resolve.

Decision needed: authorize Lane A to edit `packages/ui/src/stores/useConfigStore.ts` (about 15 lines), or assign that change to the file's owning lane and keep task 01 blocked.
