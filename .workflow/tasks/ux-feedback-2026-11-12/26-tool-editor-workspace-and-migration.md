# 26: Tool-permission editor: legacy profiles, workspace scope and availability

**Effort:** ux-feedback-2026-11-12
**Task type:** bugfix
**Blocked by:** 13
**Covers:** W8
**Files:** `packages/agent-contract/src/session.ts`; `packages/agent-service/src/worker/{catalog-agents,stateless,session}.ts`, the native agents projection, and Host authorization (the `permission.preset` chain); `packages/ui/src/components/sections/agents/{AgentsPage,AgentPermissionsEditor}.tsx`, `groups.ts`; locale keys
**Read first:** independent review `/home/shizuku/Project/ohpichamber-omp-artifacts/ux-feedback-2026-11-13/independent-review/Review13.md` (all eight findings); `.workflow/done/ux-feedback-2026-11-12/13-*.md`; skills `ui-api-decoupling`, `locale-ui-patterns`, `sync-state-invariants`
**Check:** all of these tests exit 0, and `bun run lint` exits 0:
- A worker and catalog test loads a profile YAML that still carries `permissionPresetId`. The catalog lists it, and workers start.
- The stateless workspace catalog reports runtime tool metadata and real tiers (`ast_grep` is read, `ast_edit` is write), including enabled Host and MCP tools.
- UI tests show:
  - the editor uses the workspace selected in Settings, even when a chat in another project is current;
  - a failed catalog load disables editing and never autosaves an empty list;
  - unavailable or unknown tools cannot be selected and are excluded from "Show all".

Real path (Web, real provider): in a profile with "Show all", start a task subagent with it. The task completes through the provider, and the screenshot shows the finished subagent result. Save evidence to `/home/shizuku/Project/ohpichamber-omp-artifacts/ux-feedback-2026-11-13/task26/`.

- [ ] Drop the retired field at the persisted-data boundary, before strict parsing.
- [ ] Remove the remaining `permissionPresetId`, `permissionPresetIds` and `permission.preset` chain end to end.
- [ ] Resolve tools for the Settings workspace. Fall back to the workspace endpoint, and show an unavailable state on failure.
- [ ] Unknown saved tools become unavailable entries. Bulk selection and row toggles use only tools whose availability the service reports.
- [ ] Build the workspace fallback from the session's registration and metadata owner.
- [ ] Localize the section-toggle labels and the group descriptions in all locales.
