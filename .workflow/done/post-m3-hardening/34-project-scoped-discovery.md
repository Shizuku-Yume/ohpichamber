# 34: Preserve sessions when discovery reports a project-scoped error

**Effort:** post-m3-hardening
**Task type:** bugfix
**Base commit:** 342c8182e20c8843176a5b714101f2f0696a5ea9
**Started:** 2026-10-24T22:19:14+08:00
**Finished:** 2026-10-24T22:29:29+08:00

**Delivers:** A discovery error keyed by `projectId` prevents that project's cached sessions from being replaced as an authoritative empty result, at the same scope documented for session and workspace failures.

**Blocked by:** None
**Files:** `packages/ui/src/stores/globalSessions.ts` (`isSessionDiscoveryFailed`); `packages/ui/src/stores/useGlobalSessionsStore.ts` (`replaceSessionsForDirectories`); their tests

**Read first:** `.workflow/tasks/post-m3-hardening/07-review-findings-triage.md` Findings item 3; `packages/ui/src/sync/DOCUMENTATION.md` lines 46-49; `UIReview.md` finding 3

**Check:** A store or predicate regression: with `errors: { [projectId]: 'failed' }` and a cached session in that project, the session is kept; the current predicate returns false and the replacement removes it.

## Done when

- [x] `isSessionDiscoveryFailed` treats a session's `projectId`-keyed error as a failure.
- [x] A project-scoped failure blocks destructive replacement only for sessions in that project.
- [x] The regression fails before the change and passes after it.

## Progress

- Dirty at start: none. Branch `post-m3-hardening/34-project-scoped-discovery` was cut from exact `main` `342c8182e20c8843176a5b714101f2f0696a5ea9` in `/home/shizuku/.omp/wt/tf5ef37303/m`; `main` was not checked out or moved.
- Check before: `cd packages/ui && bun test src/stores/globalSessions.test.ts src/stores/useGlobalSessionsStore-races.test.ts` produced 37 pass and 2 fail. `isSessionDiscoveryFailed` returned `false` for `{ pro_one: 'SERVICE_UNAVAILABLE' }`, and the store regression showed the cached `ses_failed` was removed (`[]` instead of `['ses_failed']`).
- Root cause: `isSessionDiscoveryFailed` (`packages/ui/src/stores/globalSessions.ts`) recognised only `sessionId` and `workspaceId`. The Host workspace-scope enumeration can report a read failure keyed by `projectId` (`packages/web/server/lib/host/agent-scope-runtime.js` `errors[root.projectId]`, surfaced through `listWorkspaceScopes()` and `client.listSessions()`), so destructive replacement treated the failed project's missing records as an authoritative empty success.
- Fix: the predicate now also matches `session.projectId`. `replaceSessionsForDirectories` keeps cached sessions in the failed project while sessions outside that scope are still replaced by their successful directory results; `loadSessions`' retained set and `host-session-status-seed.ts` inherit the same project scope. The sync document sentence that named `mergeHostSession` as the preserver now names `isSessionDiscoveryFailed` and the three scopes.
- Check after: the same focused command produced 40 pass, 0 fail and 100 expect calls, including the new `loadSessions` project-scope regression. The neighbouring global-session and status-seed selection produced 75 pass and 0 fail across 7 files before that test was added.
- Real path: the production transitions `useGlobalSessionsStore.refreshSessionsForDirectories` and `loadSessions` ran the real store reconciliation; only the canonical discovery transport was a `SessionDiscoveryResult` stand-in in these tests, so no live Host was needed to exercise the scope rule.
- Validation: `bun run --cwd packages/ui type-check` passed. ESLint on the changed files passed. Full `bun run --cwd packages/ui lint` reports only the three pre-existing `react-refresh/only-export-components` errors in `packages/ui/src/components/onboarding/LegacyDataNotice.tsx`, a file this task does not touch; that is the base-tree state.
- Review boundary: `342c8182e20c8843176a5b714101f2f0696a5ea9` + the five changed paths; round: 1; briefs: A,B; boundaries: discovery-error scope classification (`SessionList.errors` → `isSessionDiscoveryFailed`) and destructive global-session replacement (`replaceSessionsForDirectories`, `loadSessions`, host status seed); trust boundaries: none; findings: 0 blocking / 0 nonblocking.
- Brief A: pass, 0 findings. Requirements, evidence shape, documents, decisions and scope were clean; the full root gate remained the only owed check.
- Brief B: pass, 0 findings. It first raised an ID-namespace collision at the new project match as blocking; after evidence that the colliding path is pre-existing (`sessionId`/`workspaceId` matches predate Task34), the new branch matches only sessions in the failed project, and Host-generated namespaces are disjoint (`pro_`/`ws_`/`agd_`/`ses_`), the reviewer reclassified it to 0 blocking / 0 nonblocking. No code change was made for it.
- Security pass: CONVENTIONS §7 does not apply. The change classifies typed in-memory discovery results and touches no authentication, credential, shell, query, path, URL, process, listener or permission boundary.
- Full root gate: not completed on this candidate; the coordinator reserved root-gate slots after several lanes collided, so the gate is deferred to its assigned slot. A first full run on the same source tree at functional commit `821eccb02` reached 6/7 suites; the only failure was the pre-existing `scripts/omp-m0/runner.test.mjs` worker-descendant `/proc` ESRCH race under load (`21/22` scripts files), and that file passed alone (`9 pass, 0 fail`). Focused regressions, UI type-check and changed-file lint pass. The candidate is ready for the assigned root gate.
