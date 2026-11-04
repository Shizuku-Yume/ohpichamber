# P1 Technical Debts Resolution

**Status:** done
**Priority:** high

## What this is for

Resolve all five registered P1 technical debts from `.workflow/technical-debt.md` end-to-end with zero scope reduction:
- P1-1: Workspace session listing failure on removed checkouts, transient errors, or in-flight commands poisoning the global sessions store.
- P1-2: Host tool errors collapsing to `SERVICE_UNAVAILABLE` dropping status code and message detail.
- P1-3: Turn stats Elapsed displaying `0.0s` on multi-step turns with tool calls due to virtual user step timestamps.
- P1-4: Session create unable to set a `parentSessionId` link.
- P1-5: Session relocation racing worktree archive before admission pre-spawn fence.

## What it does

1. **P1-1 Workspace listing error isolation & archive visibility:**
   - In `openchamber-sessions/routes.js` and `agent-scope-runtime.js`: Archived worktrees with removed checkout directories remain discoverable and project archived sessions.
   - In `useGlobalSessionsStore.ts`: Partial workspace discovery errors degrade only the failing workspace(s) rather than setting global `status: 'error'`, preserving healthy workspaces with `status: 'ready'`.
   - In `useSidebarGroupStatus.ts`: Groups degrade to `load-failed` only when their own workspace or directory encountered an error.
   - In `ArchiveView.tsx`: Displays archived sessions from healthy workspaces and removed checkouts; surfaces an explicit error state with a Retry action when discovery errors occur, rather than an authoritative empty list.

2. **P1-5 Relocation and worktree archive mutual fence:**
   - In `WorkerRegistry`: Establish a mutual lease/fence protecting directories during relocation.
   - In `SessionRegistry.prepareRelocation`: Assert worktree lease allows destination (and source) BEFORE moving any session files on disk. Register active relocation fences so concurrent worktree lease acquisition is rejected with 409 `COMMAND_IN_FLIGHT`.
   - Rollback and failure cleanup preserve valid session state without racing archive removal.

3. **P1-4 Parent session linkage:**
   - Extend `SessionCreateRequestSchema` and `HostSessionBootstrapSchema` with optional `parentSessionId`.
   - Host validates that `parentSessionId` exists, belongs to the same authorized `workspaceId` and `projectId`, and is writable.
   - Persist `parentSessionId` on `SessionJournal`, `SessionReference`, `WorkerBootstrap`, and expose it in `RuntimeSession`.

4. **P1-2 Host tool ProblemCode preservation:**
   - Map tool execution errors in `openchamber-control/service.js` to valid `ProblemCodeSchema` codes (`INVALID_REQUEST` for 400/404, `UNAUTHORIZED` for 403, `METADATA_CONFLICT` for 409, `SERVICE_UNAVAILABLE` for 499/503, `INTERNAL_ERROR` for others).
   - Preserve error messages in `detail` field across the worker authorization IPC channel.

5. **P1-3 Turn stats true duration:**
   - Use canonical `Turn.startedAt` and `Turn.finishedAt` in `WorkStatusTelemetrySection.tsx` and `telemetry.ts` (or skip intermediate `virtualUser` step messages) so tool-call turns reflect actual elapsed execution duration.

## How it is built

- **Lane 1: Registry and Lifecycle (P1-1 & P1-5)**:
  - Task 01: `01-workspace-listing-isolation.md` (P1-1)
  - Task 02: `02-relocation-archive-fence.md` (P1-5)
- **Lane 2: Session Contract & Parent Support (P1-4)**:
  - Task 03: `03-parent-session-link.md` (P1-4)
- **Lane 3: Host Control & UI Telemetry (P1-2 & P1-3)**:
  - Task 04: `04-host-tool-error-mapping.md` (P1-2)
  - Task 05: `05-turn-stats-elapsed-duration.md` (P1-3)

## How we will know it works

- **W1.** When a worktree checkout directory is removed on disk, its archived sessions still appear in `GET /api/agent/v1/sessions` and render on the Archive page after reload; transient errors on one workspace do not mark healthy workspaces as `load-failed` in the sidebar; discovery errors render an explicit error banner with a Retry button on Archive view.
- **W2.** Real concurrent relocation and archive lease acquire cannot race: attempting relocation into a leased worktree fails with 409 before moving any files, and attempting archive lease acquire on a directory undergoing relocation fails with 409 `COMMAND_IN_FLIGHT`.
- **W3.** Creating a session with `parentSessionId` in the same workspace succeeds, persists in the runtime session and journal, and is exposed in session listings; mismatched workspace or foreign parent is rejected with 403/404.
- **W4.** Managed host tool errors (404, 409 conflict, cancelled) produce valid `ProblemCodeSchema` codes (`INVALID_REQUEST`, `METADATA_CONFLICT`, `SERVICE_UNAVAILABLE`) with error detail message preserved instead of being flattened to generic `SERVICE_UNAVAILABLE`.
- **W5.** Multi-step turns with tool calls compute elapsed time from true turn boundaries (`finishedAt - startedAt`), displaying formatted duration (e.g., `1.2s`) rather than `0.0s`.
