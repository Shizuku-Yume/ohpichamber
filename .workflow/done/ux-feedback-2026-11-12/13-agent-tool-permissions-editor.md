# 13: Agent tool-permission editor on a live tool catalog

**Effort:** ux-feedback-2026-11-12
**Blocked by:** 04, 11
**Covers:** W8
**Files:** `packages/agent-service/src/` (tool catalog read); `packages/agent-contract/src/` (tool catalog schema); `packages/ui/src/components/sections/agents/AgentsPage.tsx` and a new editor component; `packages/ui/src/lib/toolPresentation/`; locale keys
**Read first:** `research/feedback-2026-11-12/17-eval-permissions-plugins.md` ("#25, agent tool permissions"); upstream `bc50ba56a:packages/ui/src/components/sections/agents/AgentPermissionsEditor.tsx`; `PATTERNS.md`; skills `ui-api-decoupling`, `locale-ui-patterns`
**Check:** a service test returns the catalog (name, label, description, tier, availability) for a live session; a UI test shows that "Show all" selects only available tools; the agents section tests exit 0. Real path (Web): the editor groups tools into collapsible sections with header tri-state checkboxes, "N of M" counts and tier chips; enabling all and saving a profile, then starting a task with it, never fails with 422. Screenshots go in the evidence directory.
**Base commit:** 996990f95182d7e19864b4c57683efca8af700eb

- [x] Expose the session's registered tools with OMP tier from the service.
- [x] Rebuild the editor: fork-owned groups (files and search, execution, web and external, planning and memory, multi-agent, OpenChamber, MCP and extensions), `SettingsCheckboxRow` rows with label, one-line description and tier chip, quick actions as a chip group.
- [x] Delete `permissionPresetId` (field, input, schema, docs) unless it gains a runtime consumer in this task.
- [x] Deletes: the flat checkbox grid and "Show all" over `OMP_TOOL_NAMES`.

## Progress

- Exposing live tool catalog from Agent Service:
  - Added `SessionToolsCatalogSchema` and `ToolCatalogEntrySchema` to `@openchamber/agent-contract/catalogs.ts`.
  - Added `GET /api/agent/v1/sessions/:sessionId/tools` to session routes and `GET /api/agent/v1/workspaces/:workspaceId/tools` to supervisor workspace routes, mapped in Host `canonical-routes.js`.
  - In `WorkerSession`, `tools.catalog` inspects `this.session.getAllToolInfos()` with tool tiers (`read`, `write`, `exec`) and labels/descriptions.
  - In `StatelessWorker`, `tools.catalog` validates built-in tool availability against native workspace settings via `resolveBuiltinToolPlan` so unavailable capabilities carry `availability: false`.
- Rebuilt Agent tool permissions editor:
  - Created `AgentPermissionsEditor.tsx` replacing the flat 2-4 column checkbox grid.
  - Added 7 fork-owned tool groups (`files_and_search`, `execution`, `web_and_external`, `planning_and_memory`, `multi_agent`, `openchamber`, `mcp_and_extensions`) in `packages/ui/src/lib/toolPresentation/groups.ts`.
  - Rebuilt tool rows with `SettingsCheckboxRow`, name/label, one-line description, and tier chip (`read`, `write`, `exec`).
  - Implemented collapsible group sections with tri-state header checkboxes and "N of M" counts.
  - Added quick actions as a `SettingsChipGroup` ("All", "Recommended", "Read only", "None"), where "All" selects only available tools (`availability !== false`).
  - Added complete localization across all 15 supported locales in `agent-tool-permissions.i18n.ts` and dictionary messages (with Chinese copy writing "Token").
- Cleaned up dead `permissionPresetId`:
  - Removed dead `permissionPresetId` field from `AgentSchema`, `AgentDefinition`, form states, tests, and documentation.
- Check after:
  - Service test in `session-native.test.ts` asserts live session tool catalog with required fields, OMP tiers, and availability (`bun test packages/agent-service/src/worker/session-native.test.ts -t "service returns tool catalog"`: 1 pass, 0 fail).
  - UI test in `AgentPermissionsEditor.test.tsx` verifies that "Show all" selects only available tools and excludes unavailable tools.
  - All 10 tests in `packages/ui/src/components/sections/agents/` exit 0 (`bun test packages/ui/src/components/sections/agents/`: 10 pass, 0 fail).
  - Real path (Web port 4113): groups tools into collapsible sections with header tri-state checkboxes, N of M counts, tier chips; "Show all" selects only available tools; saving profile and starting task completes without 422. Screenshots (`01-agents-editor-groups.png`, `02-agents-show-all-saved.png`, `03-session-task-success.png`) and `real-path.log` in `/home/shizuku/Project/ohpichamber-omp-artifacts/ux-feedback-2026-11-13/task13/`.

Review: pass (base 996990f95182d7e19864b4c57683efca8af700eb)
- Self-review against base commit `996990f95182d7e19864b4c57683efca8af700eb`:
  - No AI signatures or placeholder comments.
  - Type checks exit 0 cleanly on all 4 touched packages.
  - Vendored oxlint anti-slop rules pass with 0 errors on all authored code.
  - Dead code analysis inspected and confirmed zero net-new findings.
  - All 15 locales translated with accurate strings.
  - No new external dependencies added.
