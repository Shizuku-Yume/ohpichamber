# Closeout: p1-debts

**Accepted:** 2026-11-04 by user ("现在并入main")

## Shipped

Resolution of all five registered P1 technical debts from `.workflow/technical-debt.md` end-to-end with zero scope reduction:

- **P1-1 Workspace listing error isolation & archive visibility (Task 01, W1):** Archived worktrees with removed checkout directories remain discoverable and project archived sessions via `agentScopeStore.listArchivedWorktreeWorkspaces()` and `isWorktreeArchived()` in `packages/web/server/lib/host/agent-scope-runtime.js` and `openchamber-sessions/routes.js`. In `useGlobalSessionsStore.ts`, partial workspace discovery errors degrade only failing workspaces via `discoveryErrors` rather than poisoning global status to `error`, preserving healthy workspaces with `ready`. In `useSidebarGroupStatus.ts`, sidebar groups degrade to `load-failed` only when their own workspace or directory encountered an error. In `ArchiveView.tsx`, archived sessions from healthy workspaces and removed checkouts render reliably, with an explicit error banner and retry action for failing scopes rather than an empty list.
- **P1-5 Relocation and worktree archive mutual fence (Task 02, W2):** In `WorkerRegistry` (`packages/agent-service/src/supervisor/workers.ts`), added active relocation fence tracking (`acquireRelocationFence`, `releaseRelocationFence`) and mutual lease validation (`assertWorktreeLeaseAllows`). In `SessionRegistry.prepareRelocation` (`registry.ts`), pre-move lease verification ensures destination/source allow relocation before any disk moves occur, and registers active relocation fences so concurrent `acquireWorktreeLease` calls return 409 `COMMAND_IN_FLIGHT`. Verified rollback and failure cleanup release fences cleanly.
- **P1-4 Parent session linkage (Task 03, W3):** Extended `SessionCreateRequestSchema` (`packages/agent-contract/src/session.ts`), `WorkerBootstrapSchema`, and `HostSessionBootstrapSchema` (`packages/agent-service/src/protocol.ts`) with optional `parentSessionId`. Enforced same-workspace and same-project validation in `openchamber-sessions/routes.js` `create`. Persisted `parentSessionId` across `SessionRegistry` runtime entries, references journal, reopen, cold snapshots, and session listings.
- **P1-2 Host tool ProblemCode preservation (Task 04, W4):** Extended `HostActionResultSchema` with optional `detail?: string` (`packages/agent-service/src/native-policy-protocol.ts`). In `openchamber-control/service.js`, mapped tool execution error statuses onto canonical `ProblemCode` codes (`INVALID_REQUEST` for 400/404, `UNAUTHORIZED` for 403, `METADATA_CONFLICT` for 409, `SERVICE_UNAVAILABLE` for 499/503, `INTERNAL_ERROR` for others), preserving error messages in `detail` through `worker-authorization-channel.js` into `WorkerHostActions.settle` `ProjectionError`.
- **P1-3 Turn stats true duration (Task 05, W5):** Updated `getLatestCompletedTurnStats` in `packages/ui/src/components/chat/work-status/telemetry.ts` and `WorkStatusTelemetrySection.tsx` to read canonical `Turn.startedAt` and `Turn.finishedAt` boundaries and skip intermediate `virtualUser` step messages, correctly displaying true elapsed duration (e.g. `1.2s`) rather than `0.0s`.

## Key decisions & plan changes

- Pre-move lease assertion: Enforce worktree lease compatibility and acquire relocation fence before any filesystem mutation during session relocation.
- Scoped workspace degradation: Isolate discovery failures to per-workspace `discoveryErrors` while keeping the global store `ready` when healthy workspaces exist.
- Non-breaking contract extension: Added optional `parentSessionId` and `detail` preserving backwards compatibility across schemas.

## Remaining debt & follow-ups

None for P1 technical debts. All five registered P1 items in `.workflow/technical-debt.md` are resolved and verified. Lower-priority debt items in `.workflow/technical-debt.md` remain tracked.
