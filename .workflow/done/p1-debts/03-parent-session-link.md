# 03: Add parentSessionId link support on session create

**Effort:** p1-debts
**Blocked by:** None
**Task type:** feature
**Covers:** W3
**Files:** packages/agent-contract/src/session.ts, packages/agent-service/src/protocol.ts, packages/agent-service/src/supervisor/host-authorization-protocol.ts, packages/web/server/lib/openchamber-sessions/routes.js, packages/agent-service/src/sessions/registry.ts
**Read first:** .workflow/technical-debt.md:74-83, skill://openchamber-change-discipline
**Check:** bun test packages/agent-contract/src/session.test.ts packages/agent-service/src/sessions/registry-native.test.ts packages/web/server/lib/openchamber-sessions/routes.test.js

- [x] Add optional `parentSessionId` to `SessionCreateRequestSchema` in `@openchamber/agent-contract`.
- [x] Add optional `parentSessionId` to `WorkerBootstrapSchema` and `HostSessionBootstrapSchema`.
- [x] In `openchamber-sessions/routes.js` `create`, authorize `parentSessionId` when provided: verify parent session exists, matches the same authorized `workspaceId` and `projectId`, and is writable.
- [x] In `SessionRegistry`, persist `parentSessionId` on runtime session and session references journal, ensuring parent link is exposed in session listings and survives reopen/restart.
- [x] Add tests for valid parent session creation, foreign/unauthorized parent rejection, and parent session projection in session list and archive.

## Progress

Check after: `bun test packages/agent-contract/src/session.test.ts packages/agent-service/src/sessions/registry-native.test.ts packages/web/server/lib/openchamber-sessions/routes.test.js` passed (6/6 contract, 20/20 agent-service, 20/20 web routes; 46 total pass / 0 fail).
