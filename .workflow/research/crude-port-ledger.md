# Crude-port and capability ledger

**Date:** 2026-10-25
**Base:** `main` 369b8932d, OMP `@oh-my-pi/pi-coding-agent` 18.8.9
**Relation:** extends `omp-opencode-openchamber-audit.md` (service/contract level) with UI-level crude ports. GAP ids refer to that audit.
**Evidence:** `V` = read in source this pass; `S` = scout report, not yet re-read.

## A. Crude mechanical ports (fix)

| ID | Problem | Location | Evidence | Sev | Direction |
|---|---|---|---|---|---|
| CP-01 | Composer agent selector treats OMP task-subagent definitions as root personas; default `agents[0]`; custom `allowedTools` missing → 422 `UNSUPPORTED_CAPABILITY`, chat creation fails silently | `ui/stores/useConfigStore.ts:417`; `worker/session.ts:302-305`; `worker/catalog-agents.ts:127` | V | S1 | Replace with mode switcher (main / plan / vibe / goal), default main; agents only as `task` subagent config |
| CP-02 | `@agent` mention that differs from selected agent → 400 | `worker/session.ts:334` | V | S1 | Retire with CP-01 (or mention = subagent hint) |
| CP-03 | Effort picker reads `variants`, which is built only from `thinking.effortRouting`; contract already has `reasoningOptions` | `worker/catalog-models.ts:129-151`; `ui/components/chat/ModelControls.tsx` | V | S1 | UI drives effort from `reasoningOptions` → `setThinkingLevel` |
| CP-04 | Compact action sends literal `/compact` as a prompt; worker sets `runCommands:false` | `ui/components/chat/ChatInput.tsx:1849`; `worker/session.ts:380` | V | S1 | Canonical compact operation → `session.compact()` |
| CP-05 | Non-image attachment becomes hidden custom message `Attached file NAME: PATH`, no content | `worker/session.ts:365` | V (LLM visibility of custom msg: unverified) | S1 | Inline text files as user content with delimiters; others as explicit path for `read` |
| CP-06 | Status row tool buckets use OpenCode 2 names (`shell`, `subagent`, `question`, `codesearch`); OMP `bash`/`task`/`ask`/`find`/`todo` fall through | `ui/hooks/useAssistantStatus.ts:89-107` | V | S2 | Map OMP builtin names |
| CP-07 | OMP `todo` tool absent from `NATIVE_TOOLS`; no phase/blocker rendering; OpenCode todo priority keys remain | `ui/lib/toolHelpers.ts:4-16` | V | S2 | Todo card from OMP todo schema |
| CP-08 | Ask projection drops `preview`, recommended auto-select, timeout | `ui/components/chat/questionRequest.ts`; `worker/interaction.ts` | S (GAP-12) | S2 | Project fields; countdown UI |
| CP-09 | Revert simulated over `navigateTree(allowAskReopen:false)`; navigation failure → `fail()` kills worker | `worker/session.ts:382-435` | V (partial) | S2 | Branch-aware revert; non-fatal errors |
| CP-10 | "Plan" is an agent persona; PlanView is Host SQLite; OMP plan mode never engaged | `ui/components/views/PlanView.tsx`; worker | S (GAP-05) | S2 | Folded into mode switcher |
| CP-11 | Slash autocomplete ignores OMP commands/prompt templates (`runCommands`/`expandPromptTemplates` false) | `ui/components/chat/CommandAutocomplete.tsx`; `worker/session.ts:380` | V (flags) | S2 | Explicit allowlist of GUI-mapped OMP commands; templates expanded |
| CP-12 | `/btw` creates a full forked session; OMP has ephemeral side turn + `branchFromBtw` | `ui/stores/useBtwStore.ts` | S | S2 | Ephemeral turn RPC |
| SET-01 | Command editor binds agent/model per command → same 422 path | `ui/components/sections/commands/CommandsPage.tsx` | S | S2 | Drop agent binding |
| SET-02 | Permission default mode `ask/safety/auto` vs OMP approval `always-ask/write/yolo` | `sections/openchamber/PermissionDefaultModeField.tsx` | S (GAP-11, P0) | S2 | Keep Host fail-closed; relabel and map explicitly; never implicit allow |
| SET-03 | Behavior response style injected as synthetic `<system-reminder>` on first message; OMP personality/SYSTEM.md hidden | `sections/behavior/BehaviorPage.tsx`; `ChatInput.tsx` | S | S2 | Use OMP personality / system prompt |
| SET-04 | `smallModelOverride` and routing bypass OMP model roles | `sections/openchamber/DefaultsSettings.tsx`; routing | S (GAP-03) | S2 | Map to roles `smol`/`commit`/`plan` |
| SET-05 | Worker hard-codes `enableLsp:false`, `disableExtensionDiscovery:true` | `worker/session.ts:199` | V | S2 | Settings toggles (Linux first) |
| SET-06 | MCP managed file is strict and fail-closed; hand-written native `.omp/mcp.json` with env/headers → `MCP_CONFIG_READ_FAILED` | `worker/mcp.ts:55-117` | V (deliberate; whether path is user's file unverified) | S2 | Read-only display of unmanaged native file instead of hard failure |
| SET-07 | "Extensions" page = Guest apps; OMP extensions shown under Plugins and disabled | `sections/extensions`, `sections/plugins` | S | S2 | Rename, separate |
| SET-08 | Usage page shows only provider quota; OMP session stats ignored | `sections/usage` | S (GAP-20) | S2 | Add session token/cost |
| SET-09 | "Code Mode" toggle saved, never consumed | `sections/openchamber/OpenChamberToolsSettings.tsx` | S | S3 | Retire |
| SET-10 | "Snippets" = OMP prompt templates | `sections/snippets` | S | S3 | Rename |
| SET-11 | Settings nav key `opencode`; share i18n residue | `views/SettingsView.tsx`; i18n | S | S3 | Rename/delete |

## B. OMP capabilities not wired (adapt)

High value: plan/vibe/goal modes (GAP-05); thinking levels; ephemeral `/btw`; checkpoint/rewind; async jobs list/kill; compact/shake/handoff; model roles (GAP-03); todo HUD; ask re-answer on rewind; `/force` tool choice.
Medium: prewalk, fast/slow tiers, model presets, `/add-dir` (GAP-06), HTML export, provider usage reset credits, `/omfg` rule synthesis, memory backends (GAP-08), extensions/hooks (GAP-19), LSP.
Out of scope: TUI/CLI/ACP (GAP-15, GAP-21), `/collab`, `/share`.

## C. OpenChamber features to adapt for OMP

- Session goals → back with OMP goal mode instead of Host-only supervisor.
- Multi-run/fusion, scheduled tasks, auto router → keep Host-owned; route models via OMP roles.
- Commit/PR generation, recaps → OMP `commit`/`smol` roles.
- Isolated spaces → OMP worker in container (DF-04), later.
- Upstream v1.24.2→v2.5.1 new features: inventory not yet reliable; redo from `git log 336e19248f..upstream/main` during the upstream merge track.

## D. Fix batches

1. **B1 chat basics (S1):** CP-01/02/10 mode switcher, CP-03 effort, CP-04 compact, CP-05 attachments, SET-01.
2. **B2 rendering truth:** CP-06, CP-07, CP-08, CP-11.
3. **B3 settings truth:** SET-02/03/04/06/07/09/10/11.
4. **B4 OMP wiring:** btw, jobs, checkpoint/rewind, shake/handoff, roles, LSP/extensions.
5. **B5 upstream adoption:** after merge triage.
