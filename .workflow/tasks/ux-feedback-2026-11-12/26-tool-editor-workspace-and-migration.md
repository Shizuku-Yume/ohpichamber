# 26: Tool-permission editor: legacy profiles, workspace scope and availability

**Effort:** ux-feedback-2026-11-12
**Task type:** bugfix
**Blocked by:** 13
**Covers:** W8
**Files:** `packages/agent-contract/src/session.ts`; `packages/agent-service/src/worker/{catalog-agents,stateless,session}.ts`, the native agents projection, and Host authorization (the `permission.preset` chain); `packages/ui/src/components/sections/agents/{AgentsPage,AgentPermissionsEditor}.tsx`, `groups.ts`; locale keys
**Read first:** independent review `/home/shizuku/Project/ohpichamber-omp-artifacts/ux-feedback-2026-11-13/independent-review/Review13.md` (all eight findings); `.workflow/done/ux-feedback-2026-11-12/13-*.md`; skills `ui-api-decoupling`, `locale-ui-patterns`, `sync-state-invariants`
**Base commit:** 903457f7205fce607e30a735de8243547ed5c799
**Status:** active
**Check:** all of these tests exit 0, and `bun run lint` exits 0:
- A worker and catalog test loads a profile YAML that still carries `permissionPresetId`. The catalog lists it, and workers start.
- The stateless workspace catalog reports runtime tool metadata and real tiers (`ast_grep` is read, `ast_edit` is write), including enabled Host and MCP tools.
- UI tests show:
  - the editor uses the workspace selected in Settings, even when a chat in another project is current;
  - a failed catalog load disables editing and never autosaves an empty list;
  - unavailable or unknown tools cannot be selected and are excluded from "Show all".
Real path (Web, real provider): in a profile with "Show all", start a task subagent with it. The task completes through the provider, and the screenshot shows the finished subagent result. Save evidence to `/home/shizuku/Project/ohpichamber-omp-artifacts/ux-feedback-2026-11-13/task26/`.

- [x] Drop the retired field at the persisted-data boundary, before strict parsing.
- [x] Remove the remaining `permissionPresetId`, `permissionPresetIds` and `permission.preset` chain end to end.
- [x] Resolve tools for the Settings workspace. Fall back to the workspace endpoint, and show an unavailable state on failure.
- [x] Unknown saved tools become unavailable entries. Bulk selection and row toggles use only tools whose availability the service reports.
- [x] Build the workspace fallback from the session's registration and metadata owner.
- [x] Localize the section-toggle labels and the group descriptions in all locales.

## Progress

- Dropped retired `permissionPresetId` at the persisted YAML boundary in `NativeAgents.project()` before strict `ProfileMetadataSchema` / `AgentSchema` parsing. Added tests in `catalog-agents.test.ts` verifying that existing YAML files carrying `permissionPresetId` load successfully into the catalog and workers start.
- Removed remaining `permissionPresetId`, `permissionPresetIds`, and `permission.preset` protocol / authorization chain end-to-end across `agent-service` protocols (`native-policy-protocol.ts`, `protocol.ts`, `supervisor/host-authorization-protocol.ts`), worker policy snapshots and sessions (`worker/native-policy-snapshot.ts`, `worker/session.ts`), Host authorization (`worker-operation-authorizer.js`, `DOCUMENTATION.md`), contracts documentation (`.workflow/omp-migration/contracts.md`), and tests.
- Rebuilt workspace tool resolution in `AgentsPage.tsx`: resolves tools for the Settings-selected workspace (`settingsDirectory`) first, using session tools only when session ownership matches that workspace, falling back to `/api/agent/v1/workspaces/:workspaceId/tools`. On catalog load failure, shows an unavailable banner with a retry button, disables editor controls, and strictly preserves configured tools without autosaving empty lists.
- Hardened `AgentPermissionsEditor.tsx`: unknown saved tools become unavailable entries (`availability: false`); bulk "Show all" enables only available tools (`availability === true`); row toggle strictly guards against unavailable tools; group section headers render localized group descriptions.
- Upgraded stateless workspace catalog (`stateless.ts`) to report accurate runtime tool metadata (labels, descriptions) and real tiers (`ast_grep` is `read`, `ast_edit` is `write`). Host tool enablement now reaches the catalog through a required Host dependency: `createHostAgentRuntime` takes `resolveHostTools` as a declared parameter (it previously guarded an undeclared identifier with `typeof`, so a missing wiring silently admitted every workspace with worker-default enablement) and `admitWorkspace` always sends its result in the workspace registration body. Tested in `stateless.test.ts` and `agent-runtime.test.js` without monkey-patching the unit under test.
- Workspace MCP tools in `GET /api/agent/v1/workspaces/:workspaceId/tools` come from the workspace's saved configuration, not from a session snapshot: a new stateless `discover` operation stages a real isolated handshake per enabled server in `WorkerMcp`, `CatalogCoordinator.workspaceMcpTools` runs it through `CatalogCoordinatorOptions.discoverMcpTools`, and the route appends the resulting tools with `availability: true`. The newest ready session snapshot may only add tools discovery did not report, chosen deterministically by readiness, applied/catalog revisions, worker generation, then root session id. The obsolete `CompletionWorkerBootstrap.mcpTools` path, its identity comparison, and the duplicated stateless catalog branch were deleted. Proven by `service-surface-routes.test.ts` 'workspace tools catalog reports enabled MCP tools with no session worker', which drives the repo's stdio fixture `scripts/omp-m0/mcp-fixture-server.mjs` through the real HTTP surface with no session admitted.
- Localized section toggle aria labels (`expandSection`, `collapseSection`) and group descriptions in `agent-tool-permissions.i18n.ts` and `groups.ts` across all 15 locales (with Chinese copy writing "Token").
- Added UI tests in `AgentsPage.test.tsx` verifying Settings workspace precedence over current chat, unconditional disabled controls and autosave preservation during catalog failure (verified via mutation check), and unavailable/unknown tool exclusion.
- Subagent admission: tracked child session admission in Host routes (`routes.js`) so child subagent runs carry the profile `agentId` without being rejected by root prompt admission rules. Reverted whitespace churn in `canonical-runtime.js`. Added protection tests in `routes.test.js` and `runtime.test.js` verifying that root prompts carrying `agentId` are refused with 400 while child session prompts carrying `agentId` are admitted.
- Anti-slop ratchet: cleaned all type assertions, `typeof` checks, and open dictionary types across `catalog-agents.ts`, `stateless.ts`, `AgentPermissionsEditor.tsx`, `groups.ts`, and test files.

Check after:
- `bun test packages/agent-service/src/supervisor/service-surface-routes.test.ts`: 3 pass, 0 fail, including 'workspace tools catalog reports enabled MCP tools with no session worker', which admits only a workspace (no session) and reads a tool discovered from the real stdio fixture `scripts/omp-m0/mcp-fixture-server.mjs`.
- `bun test packages/agent-service/src/worker/catalog-agents.test.ts packages/agent-service/src/worker/stateless.test.ts packages/agent-service/src/worker/stateless-mcp.test.ts packages/agent-service/src/supervisor/catalog-mcp.test.ts packages/agent-service/src/supervisor/workspace-routes-settings.test.ts packages/agent-service/src/supervisor/workspaces-catalog-reads.test.ts`: 30 pass, 0 fail.
- `bun run --cwd packages/agent-service type-check` and `bun run --cwd packages/agent-contract type-check`: 0 errors.
- `node scripts/run-isolated-tests.mjs packages/ui/src/components/sections/agents`: 1/1 test files passed, exit 0 at `2f11671e6e`.
- `bunx oxlint` on the twelve changed agent-service files: exit 0.
- `bun test packages/agent-service/src/worker/catalog-agents.test.ts packages/agent-service/src/worker/stateless.test.ts`: 10 pass, 0 fail (recorded at the branch commit that added them).
- `VITEST_MAX_WORKERS=2 bun --cwd packages/web test server/lib/host/agent-runtime.test.js server/lib/message-queue/runtime.test.js server/lib/openchamber-sessions/routes.test.js`: 59 pass, 0 fail at `5e195d6d9f`.
- `bun test packages/ui/src/components/sections/agents/AgentsPage.test.tsx`: 13 pass, 0 fail (recorded at the branch commit that added them).
- `bun run lint`: exit 0 across all workspaces (only pre-existing `react-hooks` warnings).
- Anti-slop ratchet, `bun run check:changed -- --base 903457f7205fce607e30a735de8243547ed5c799`: `No new findings.` at `2f11671e6e`.
- Type checks: `bun check` reports `✓ No type errors in 3,860 files across 5 projects`. The aggregate step exits 1 only on two repo-wide audit steps. Both pre-exist: the same command in a detached worktree at base `903457f720` (with this worktree's `node_modules` linked in) printed the identical `3/5 steps passed` and `failed: upstream-drift (exit 1), upstream-gaps (exit 1)` (`/tmp/task26checks/check-changed-base2.log` vs `check-changed-head2.log`).
- `bun run dead-code`: exit 1 on the pre-existing knip backlog (43 unused files, 124 findings). The base worktree printed 124 findings with the same symbols (`NativeApprovalGrantSchema`, `intentOf`, `detectSystemOmpRuntime`, …), so the task adds no finding (`dead-code-base.log` vs `dead-code-head2.log`).
- Real path at HEAD `2f11671e6e` (Web port 4126, CLIProxyAPI / claude-haiku-5-5 because the gemini pool is externally paused with `TOS_VIOLATION`, isolated HOME and `OPENCHAMBER_DATA_DIR` under `/tmp`, provider env from `omp-m0-provider.env` with `OMP_SOURCE_DIR` unset):
  - Host tool enablement reaches the live catalog. With `agentWebToolEnabled: false` in the seed settings, `GET /api/agent/v1/workspaces/:id/tools` reported `web availability=false` and `notify availability=true` (`workspace-tools-web-disabled.json`); after `PUT /api/config/settings {"agentWebToolEnabled":true}` the same endpoint reported `web availability=true` (`workspace-tools-web-enabled.json`).
  - Profile `task26-agent` saved through the Agents editor after "Show all": all 22 workspace tools, including `web` and the MCP-capable list.
  - The root agent executed the `task` tool with `agent: "task26-agent"` (`chat-history.json`), then `wait`. The subagent (`CommonCobra`) reached `status: completed` in the roster and returned `56088` through the provider.
  - `03-session-task-success.png` (1440×960, opened and inspected) shows the finished chat; `03-session-task-success.txt` is the same render as text (`document.body.innerText`) and contains `56088`, `task26-agent`, and the `Subagents (1)` panel, so the claim is inspectable without a vision model.
  - `real-path-summary.json` records `head: 2f11671e6e63f5321f7d78681f422317e3f01f1d`, `runCompleted: true`, the model, and the completed `task26-agent` subagent. The script is kept as `real-path-task26.mjs` in the same directory. All server and Chrome processes were stopped; the temporary root was removed.

Review: pending