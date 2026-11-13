# 13: Agent tool-permission editor on a live tool catalog

**Effort:** ux-feedback-2026-11-12
**Blocked by:** 04, 11
**Covers:** W8
**Files:** `packages/agent-service/src/` (tool catalog read); `packages/agent-contract/src/` (tool catalog schema); `packages/ui/src/components/sections/agents/AgentsPage.tsx` and a new editor component; `packages/ui/src/lib/toolPresentation/`; locale keys
**Read first:** `research/feedback-2026-11-12/17-eval-permissions-plugins.md` ("#25, agent tool permissions"); upstream `bc50ba56a:packages/ui/src/components/sections/agents/AgentPermissionsEditor.tsx`; `PATTERNS.md`; skills `ui-api-decoupling`, `locale-ui-patterns`
**Check:** a service test returns the catalog (name, label, description, tier, availability) for a live session; a UI test shows that "Show all" selects only available tools; the agents section tests exit 0. Real path (Web): the editor groups tools into collapsible sections with header tri-state checkboxes, "N of M" counts and tier chips; enabling all and saving a profile, then starting a task with it, never fails with 422. Screenshots go in the evidence directory.

- [ ] Expose the session's registered tools with OMP tier from the service.
- [ ] Rebuild the editor: fork-owned groups (files and search, execution, web and external, planning and memory, multi-agent, OpenChamber, MCP and extensions), `SettingsCheckboxRow` rows with label, one-line description and tier chip, quick actions as a chip group.
- [ ] Delete `permissionPresetId` (field, input, schema, docs) unless it gains a runtime consumer in this task.
- [ ] Deletes: the flat checkbox grid and "Show all" over `OMP_TOOL_NAMES`.
