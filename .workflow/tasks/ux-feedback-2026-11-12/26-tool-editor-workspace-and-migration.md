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
- Known limit, not changed in this task: workspace MCP tools in `GET /api/agent/v1/workspaces/:workspaceId/tools` are still derived from session MCP snapshots (`CatalogCoordinator.getWorkspaceMcpTools`), so a workspace whose MCP servers have never been applied by a session worker reports no MCP tools. Deriving them from the workspace MCP configuration owner requires a sessionless discovery handshake in `WorkerMcp` plus a `discoverMcpTools` coordinator option; that rework was started and reverted, so this remains open.
- Localized section toggle aria labels (`expandSection`, `collapseSection`) and group descriptions in `agent-tool-permissions.i18n.ts` and `groups.ts` across all 15 locales (with Chinese copy writing "Token").
- Added UI tests in `AgentsPage.test.tsx` verifying Settings workspace precedence over current chat, unconditional disabled controls and autosave preservation during catalog failure (verified via mutation check), and unavailable/unknown tool exclusion.
- Subagent admission: tracked child session admission in Host routes (`routes.js`) so child subagent runs carry the profile `agentId` without being rejected by root prompt admission rules. Reverted whitespace churn in `canonical-runtime.js`. Added protection tests in `routes.test.js` and `runtime.test.js` verifying that root prompts carrying `agentId` are refused with 400 while child session prompts carrying `agentId` are admitted.
- Anti-slop ratchet: cleaned all type assertions, `typeof` checks, and open dictionary types across `catalog-agents.ts`, `stateless.ts`, `AgentPermissionsEditor.tsx`, `groups.ts`, and test files.

Check after:
- `bun test packages/agent-service/src/worker/catalog-agents.test.ts packages/agent-service/src/worker/stateless.test.ts`: 10 pass, 0 fail (recorded at the branch commit that added them).
- `VITEST_MAX_WORKERS=2 bun --cwd packages/web test server/lib/host/agent-runtime.test.js server/lib/message-queue/runtime.test.js server/lib/openchamber-sessions/routes.test.js`: 59 pass, 0 fail at `5e195d6d9f`.
- `node scripts/run-isolated-tests.mjs packages/ui/src/components/sections/agents` / `bun test packages/ui/src/components/sections/agents/AgentsPage.test.tsx`: 13 pass, 0 fail (recorded at the branch commit that added them).
- `bun run lint`: exit 0 across all workspaces (only pre-existing `react-hooks` warnings).
- `bunx oxlint` on the five files of `5e195d6d9f`: exit 0.
- Anti-slop ratchet, `bun run check:changed -- --base 903457f7205fce607e30a735de8243547ed5c799`: `No new findings.`
- Type checks: `bun check` reports `✓ No type errors in 3,860 files across 5 projects`. The aggregate `check` step still exits 1 on two pre-existing repo-wide audit steps, `upstream-drift` and `upstream-gaps` (1009 detected gaps against 654 allowlisted entries, e.g. `[settings-search] omp.worktree.clone`), which are unrelated to this task and fail identically without these changes.
- `bun run dead-code`: exit 1 on the pre-existing knip backlog (43 unused files). No changed file appears in the report, so the task adds no finding.
- Real path (Web port 4126, CLIProxyAPI / gemini-3.5-flash-lite, isolated HOME/data dir): configured profile `task26-agent` with "Show all" (all 21 workspace tools enabled), launched chat session in Web UI with auto permission mode, root agent executed `task` tool delegating multiplication 123 * 456 to subagent with `agent="task26-agent"`, subagent (`SillyMoth`) completed successfully through provider returning `56088`, verified via screenshot `03-session-task-success.png` (displaying tool cards, finished subagent status chip with green checkmark, and answer 56088) and Host-side subagent roster/transcript logs in `/home/shizuku/Project/ohpichamber-omp-artifacts/ux-feedback-2026-11-13/task26/`. This evidence predates `5e195d6d9f`, so it does not cover the Host-resolver wiring change.

Review: pending
