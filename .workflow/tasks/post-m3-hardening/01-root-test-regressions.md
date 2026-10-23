# 01: Restore the failing root test suites

**Effort:** post-m3-hardening
**Task type:** bugfix
**Base commit:** <commit-sha>

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
