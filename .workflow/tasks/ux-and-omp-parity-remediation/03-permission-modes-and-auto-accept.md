# 03: Restore permission auto-accept routes and bridge session permission modes to Agent Service

**Effort:** ux-and-omp-parity-remediation
**Task type:** bugfix
**Blocked by:** None
**Covers:** W2
**Files:** `packages/web/server/index.js`; `packages/web/server/lib/host/feature-routes-runtime.js`; `packages/web/server/lib/permission-auto-accept/runtime.js`; `packages/agent-service/src/interaction/manager.ts`; `packages/agent-service/src/worker/native-permission-bridge.ts`; `packages/ui/src/stores/permissionStore.ts`
**Read first:** `.workflow/specs/ux-and-omp-parity-remediation.md`; `.agents/skills/sync-state-invariants/SKILL.md`; `.agents/skills/ui-api-decoupling/SKILL.md`
**Check:** `bun test packages/agent-service/src/interaction/ packages/agent-service/src/worker/native-permission-bridge.test.ts && npx vitest run packages/web/server/lib/` → exits 0 and verifies `GET/PUT /api/permission-auto-accept` and `ask / safety / auto` enforcement.

- [ ] Restore the Host permission auto-accept runtime and routes (`GET /api/permission-auto-accept` and `PUT /api/permission-auto-accept/sessions/:sessionId`) and broadcast `permission-policy` control events on mode changes so `usePermissionStore.getState().setSessionMode` and the composer permission shield cycle cleanly without 404/parse errors.
- [ ] Bridge session permission modes (`ask`, `safety`, `auto`) to Agent Service `InteractionManager` / `NativePermissionBridge`: in `auto` mode, automatically approve tool execution requests without blocking on a user card; in `safety` mode, evaluate requests through the Jev safety classifier and only hold unsafe requests for user approval; in `ask` mode, prompt the user via the approval dock.
- [ ] Wire `setSessionAutoAccept` in `packages/web/server/index.js` for scheduled tasks (`task.execution.permissionAutoAccept`) and new-session default permission mode initialization.
