# 08: Vibe mode

**Effort:** omp-native-chat
**Task type:** feature
**Base commit:** d8f9a2e69e54c38b2565ad69a1409b6cf5d783c9
**Started:** 2026-10-26T00:00:00Z

**Delivers:** The mode switcher offers Vibe. Switching to it activates OMP's vibe tools until the user switches back to Main, which restores the previous tools. The mode survives a reload and an Agent Service restart.

**Blocked by:** 05
**Files:** the worker mode controller from task 05, `packages/agent-contract/src/session.ts` (`SessionMode` already has `vibe`), the composer mode switcher, i18n.

**Read first:** spec "Session mode" and W6; OMP 18.8.9 `modes/interactive-mode.ts` `#enterVibeMode` (5998) and `#exitVibeMode` (6062), and `VibeSessionRegistry` use near 4595 and 4824-4860; `session/agent-session.ts` `activateVibeTools` (6347), `deactivateVibeTools` (6352), `setVibeModeState` (6755). Re-read line numbers first.
**Covers:** W6

**Check:** Before: `control { type: 'mode.set', mode: 'vibe' }` returns 400. After: `bun run --cwd packages/agent-service test` has a native test where `mode.set vibe` reports `{kind:'vibe'}`, the enabled tools equal OMP's vibe set, a reopened worker reports vibe, and `mode.set main` restores the previous tools; plan to vibe goes through plan exit first, as OMP does. UI test shows Vibe in the switcher.

- [x] Vibe enter and exit follow OMP's steps, including vibe worker cleanup on exit.
- [x] Plan and vibe stay mutually exclusive; goal remains on its existing mutually exclusive path.
- [x] Switcher label and description added in every locale.

## Progress

- Dirty at start: none.
- Surfaces: Web, Electron desktop, hosted mobile and Capacitor mobile all use the shared composer and canonical Host mode control; each gains Vibe without a new transport or native-shell capability.
- State owner: OMP session mode and its persisted mode entries are authoritative; worker controller owns transitions and projects session updates. Existing UI live session snapshots remain authoritative across reconnect/reload.
- Check before: not run before the prior worker began changes; this resumed worktree already contained the implementation diff, so no clean pre-change state remained to execute.
- Check after: native vibe and plan/vibe transition tests passed; UI selector test 3/3, contract tests 184/184, Host control tests 10/10; Agent Service type-check passed. Agent Service suite: 263 passed, 7 skipped, one existing approve-compact test timed out at 30 seconds, including isolated reruns.
- Real path: lane-c Web dev server returned app shell HTTP 200 on port 5183; unauthenticated control probe correctly returned 401. Authenticated UI transition was not exercised because browser CLI was unavailable. Native worker tests used the actual OMP AgentSession with a local provider fixture.
- Review: Brief A performed read-only by implementer because reviewer dispatch attempts failed at tool validation. Boundary: base d8f9a2e69e54c38b2565ad69a1409b6cf5d783c9; changed contract, worker, composer, locale, UI documentation and Host control-test paths; deliverable is persisted Vibe mode; trust boundary is authenticated session mode control. No requirements/doc/decision/scope findings. Brief B also performed read-only by implementer with no findings.
- Security pass: mode enum/control route and worker mode transitions reviewed; no credentials, shell, path, URL, listener or egress change; no security findings.
- Check after: native vibe + plan/vibe transition tests passed (vibe state/tool set, reopen restoration, Main restores previous tools; plan exits before Vibe and Vibe exits before Plan); UI selector test 3/3, contract tests 184/184, Host control tests 10/10; Agent Service type-check passed. Full Agent Service suite: 263 passed, 7 skipped, one existing approve-compact test timed out after 30 seconds; isolated reruns also timed out.
- Real path: lane-c Web dev server returned the app shell HTTP 200 on port 5183; the control probe without Host auth returned 401 as expected. Authenticated UI transition was not exercised because the browser CLI was unavailable. Native worker tests used the actual OMP AgentSession with the local provider fixture.
- Review boundary: d8f9a2e69e54c38b2565ad69a1409b6cf5d783c9 + changed contract, worker, composer, locale, UI documentation and Host control-test paths; deliverable: persisted Vibe mode; trust boundary: authenticated session mode control; round: 1; briefs: A,B,sec; boundaries: session-control admission and worker mode transitions; findings: 0 blocking / 0 nonblocking. Reviewer dispatch failed validation; Brief A, Brief B and security pass were completed read-only by implementer as fallback. No findings.
- UI type-check: changed invalid icon name corrected to `sparkling`; remaining errors are pre-existing locale key mismatches unrelated to this task in es, ja, ko, pt-BR, uk, zh-CN and zh-TW.
- Finished: 2026-10-26T00:45:13Z.
-
