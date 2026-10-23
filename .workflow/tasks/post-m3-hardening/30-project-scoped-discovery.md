# 30: Preserve sessions when discovery reports a project-scoped error

**Effort:** post-m3-hardening
**Task type:** bugfix
**Base commit:** <commit-sha>

**Delivers:** A discovery error keyed by `projectId` prevents that project's cached sessions from being replaced as an authoritative empty result, at the same scope documented for session and workspace failures.

**Blocked by:** None
**Files:** `packages/ui/src/stores/globalSessions.ts` (`isSessionDiscoveryFailed`); `packages/ui/src/stores/useGlobalSessionsStore.ts` (`replaceSessionsForDirectories`); their tests

**Read first:** `.workflow/tasks/post-m3-hardening/07-review-findings-triage.md` Findings item 3; `packages/ui/src/sync/DOCUMENTATION.md` lines 46-49; `UIReview.md` finding 3

**Check:** A store or predicate regression: with `errors: { [projectId]: 'failed' }` and a cached session in that project, the session is kept; the current predicate returns false and the replacement removes it.

## Done when

- [ ] `isSessionDiscoveryFailed` treats a session's `projectId`-keyed error as a failure.
- [ ] A project-scoped failure blocks destructive replacement only for sessions in that project.
- [ ] The regression fails before the change and passes after it.
