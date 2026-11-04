# 04: Preserve Host tool error codes and detail message

**Effort:** p1-debts
**Blocked by:** None
**Task type:** bugfix
**Covers:** W4
**Files:** packages/agent-service/src/native-policy-protocol.ts, packages/web/server/lib/openchamber-control/service.js, packages/web/server/lib/host/worker-authorization-channel.js, packages/agent-service/src/worker/host-actions.ts
**Read first:** .workflow/technical-debt.md:112-120, skill://ui-api-decoupling
**Check:** bun test packages/web/server/lib/openchamber-control/service.test.js packages/web/server/lib/host/worker-authorization-channel.test.js
- [x] Extend `HostActionResultSchema` with optional `detail?: string`.
- [x] In `openchamber-control/service.js` `invokeHostAction`, map HTTP status codes onto valid `ProblemCodeSchema` codes (`400`/`404` -> `INVALID_REQUEST`, `403` -> `UNAUTHORIZED`, `409` -> `METADATA_CONFLICT`, `499`/`503` -> `SERVICE_UNAVAILABLE`, other -> `INTERNAL_ERROR`), preserving `error.message` in `detail`.
- [x] Preserve `detail` across the worker authorization IPC channel in `worker-authorization-channel.js` and into `ProjectionError` in `WorkerHostActions.settle`.
- [x] Assert envelope and detail preservation in route and authorization channel tests.

## Progress

Check after: `bun test packages/web/server/lib/openchamber-control/service.test.js packages/web/server/lib/host/worker-authorization-channel.test.js` passed (15/15).
