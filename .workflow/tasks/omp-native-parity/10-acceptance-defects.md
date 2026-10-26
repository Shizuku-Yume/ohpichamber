# 10: Defects observed in the task 08 acceptance run

**Effort:** omp-native-parity
**Task type:** bugfix
**Base commit:** <commit-sha>

**Delivers:** A newly added project shows its existing sessions without a reload; a cold session's timeline makes no 404 requests; adding a non-repository project makes no `repository-context` 422; the add-project dialog logs no nested-button hydration error.

**Blocked by:** 09
**Files:** sidebar project/session loading in `packages/ui/src/` (refresh after project resolve); cold-session timeline callers of `GET /api/agent/v1/sessions/:id/events` and `/subagents` and their Host/Agent Service routes; the `GET /api/source-control/repository-context` route in `packages/web/server/lib/` and its UI caller; the add-project dialog component.

**Read first:** task 08 evidence `/home/shizuku/Project/ohpichamber-omp-artifacts/onp-acceptance-2026-10-26/evidence.md` section "Observations / non-blocking defects"; `.workflow/done/omp-native-parity/02-cold-reads-no-workers.md` and `07-approval-card-and-defects.md` (W10 binding fix, same pattern for repository-context); skills `sync-state-invariants`, `ui-api-decoupling`.
**Covers:** W2, W10

**Check:** Before: in the dev UI, add a project holding a CLI-created session (sidebar empty until reload), open a cold session (404s for `/events` and `/subagents` in the network log), add a non-repo project (two 422s), console shows a nested-button hydration error. After: tests for each fix, and the same browser run shows the session without reload, no 404 or 422 for those requests and no hydration error; network/console logs saved.

- [ ] Sidebar refreshes the new project's sessions after it is added.
- [ ] Cold session timeline reads cold events/subagents or skips the request; no worker starts.
- [ ] repository-context skipped or answered empty for non-repo directories.
- [ ] Add-project dialog has no nested buttons.
