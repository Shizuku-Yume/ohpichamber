# 10: Defects observed in the task 08 acceptance run

**Effort:** omp-native-parity
**Task type:** bugfix
**Base commit:** 568c7526b3
**Started:** 2026-10-27T03:27:00Z
**Finished:** 2026-10-27T03:40:00Z

**Delivers:** A newly added project shows its existing sessions without a reload; a cold session's timeline makes no 404 requests; adding a non-repository project makes no `repository-context` 422; the add-project dialog logs no nested-button hydration error.

**Blocked by:** 09
**Files:** sidebar project/session loading in `packages/ui/src/` (refresh after project resolve); cold-session timeline callers of `GET /api/agent/v1/sessions/:id/events` and `/subagents` and their Host/Agent Service routes; the `GET /api/source-control/repository-context` route in `packages/web/server/lib/` and its UI caller; the add-project dialog component.

**Read first:** task 08 evidence `/home/shizuku/Project/ohpichamber-omp-artifacts/onp-acceptance-2026-10-26/evidence.md` section "Observations / non-blocking defects"; `.workflow/done/omp-native-parity/02-cold-reads-no-workers.md` and `07-approval-card-and-defects.md` (W10 binding fix, same pattern for repository-context); skills `sync-state-invariants`, `ui-api-decoupling`.
**Covers:** W2, W10

**Check:** Before: in the dev UI, add a project holding a CLI-created session (sidebar empty until reload), open a cold session (404s for `/events` and `/subagents` in the network log), add a non-repo project (two 422s), console shows a nested-button hydration error. After: tests for each fix, and the same browser run shows the session without reload, no 404 or 422 for those requests and no hydration error; network/console logs saved.

- [x] Sidebar refreshes the new project's sessions after it is added.
- [x] Cold session timeline reads cold events/subagents or skips the request; no worker starts.
- [x] repository-context skipped or answered empty for non-repo directories.
- [x] Add-project dialog has no nested buttons.

## Progress

- Base `568c7526b3` (integration tip after task 09). `Dirty at start: none`. Browser page 11 in isolated context `onp-f`; dev UI 5196, API 3926, data dir `/home/shizuku/Project/ohpichamber-omp-artifacts/onp-f-2026-10-27/data`.
- Check before (screenshot `before-defects.png`, network/console captured on the page): adding the `onp-f` project produced `GET /api/source-control/repository-context` 422 for the probed non-repository directory, two React nested-button errors from the add-project dialog, and opening a CLI-created cold session produced `GET /api/agent/v1/subagents?sessionId=...` 404 and `GET /api/agent/v1/sessions/.../events` 404. The session list did refresh in this run, so the task-08 "empty until reload" observation did not reproduce at the current tip; an explicit refresh was still added so the list request is part of project addition rather than later polling.
- Root causes: (1) project addition set the active project but never asked the global session store for the new directory; (2) a cold snapshot (`runtimeStatus: 'unavailable'`) was subscribed to the worker SSE, and `listSubagents` threw 404 for a listed native session that had no reference/live entry; (3) `useExistingRepositorySummary` called `repository-context` for every typed path; (4) the directory row was a `<button>` containing the select and quick-add `<button>`s.
- Fixes: `addProject`/`addProjects` refresh the global sessions for the added paths; the event pipeline skips SSE for unavailable snapshots; the registry returns no children for a listed cold native session; the repository probe first calls `git.checkIsGitRepository` and only then requests context; the row is now a keyboard-operable `div role="button"` with the nested controls still real buttons. Tests: event-pipeline cold-snapshot subscription, repository-probe skip (both pass).
- Check after: reloaded the app and reopened the same CLI session — zero `/events` and `/subagents` 404s in the network log; typing a non-repository path produced zero `repository-context` requests (previously 422); the add-project dialog produced no nested-button console error. The new project's OMP session appeared in the sidebar without a reload. Evidence: `before-defects.png`, `dev-server*.log`, this Progress.
- Review boundary: Base `568c7526b3` + the changed UI/Agent Service files; round 1; briefs: self-review + security pass; boundaries: session read/cold-stream selection and repository path probing; no new listener, credential path or provider egress. Findings: none blocking. No decisions requiring an entry; no technical debt added.
- Final checks at the integration tip `800a5e670f` (raw logs in the evidence directory): `bun run type-check` exit 0 (`integration-type-check.log`); `bun run lint` exit 0 with only the pre-existing `ChatInput.tsx` exhaustive-deps warning (`integration-lint.log`); `bun run test` exit 0, 7/7 suites (`integration-test.log`): scripts 22/22 files, sdk 23/23, UI 813/813, agent-contract 190 pass, agent-service 324 pass, electron 44/44, web 6051 passed/128 skipped. The first integration check attempt exited 127 because that worktree had no `node_modules`; `bun install --frozen-lockfile` succeeded and the rerun above is authoritative (`integration-checks-summary.log`).
