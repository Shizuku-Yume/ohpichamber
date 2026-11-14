# 27: Host tool enablement on reopen, mounted tools, live recap, workflow card, memory residue

**Effort:** ux-feedback-2026-11-12
**Task type:** bugfix
**Blocked by:** 11
**Covers:** W7
**Files:** `packages/web/server/lib/openchamber-sessions/routes.js` and the reopen bootstrap and schema; `packages/agent-service/src/worker/{host-tool,session}.ts`; the live-worker settings reload path; `packages/ui/src/components/sections/openchamber/ChatSettings.tsx`; the workflow chat card parser (`proposedWorkflowRunId`); `packages/ui/src/stores/useAgentMemoryStore.ts`, `agentMemoryApi`, `serverStateBoot` and the memory panel consumers (delete)
**Read first:** independent review `/home/shizuku/Project/ohpichamber-omp-artifacts/ux-feedback-2026-11-13/independent-review/Review11.md` (all five findings); `.workflow/done/ux-feedback-2026-11-12/11-*.md`; `decisions.md` 2026-11-13 "OMP owns image generation and agent memory"; skills `ui-api-decoupling`, `sync-state-invariants`, `openchamber-change-discipline`
**Check:** these tests must exit 0, and `bun run dead-code` must show no leftover memory store exports.
- A worker test reopens a cold session while `web` is disabled. `web` must be absent from the model's tool list, and calling it must be refused.
- A worker test uses the real SDK session with `xd://` mounts. Toggling `notify` must keep every mounted tool enabled.
- A live-worker test turns `recap.enabled` off after a turn. No recap may follow.
- A workflow tool test must produce an envelope that the chat card parser accepts.

Real path (Web, real provider, isolated data dir and `HOME`):
- disable `web`, reopen an old chat and ask for a web fetch; the fetch is refused and the tool is not offered;
- the agent proposes a workflow and the inline approval card renders, then the agent starts an existing workflow successfully;
- an image request produces a rendered `generate_image` card, or the screenshot shows a precise provider-side refusal;
- the agent stores a memory, and a new session recalls it through a recall tool call;
- with recap off, no recap appears after the idle delay.

Save evidence in `/home/shizuku/Project/ohpichamber-omp-artifacts/ux-feedback-2026-11-13/task27/`.
**Base commit:** 97c34f4f6c083f197f7d7b5b43d086ec95c2ab96
**Status:** active

- [x] Pass current host-tool enablement on every worker start path, including `reopenNative`.
- [x] Change the full enabled tool set, not only the top-level active names, and keep the presentation partition.
- [x] Reload persisted OMP settings into live session workers when the Chat recap controls change.
- [x] Give workflow tool results the envelope the card expects (`{ok, action: 'workflow.run', data: {runId}}`), with one shared definition.
- [x] Delete the legacy agent-memory client store, API, boot hydrator, sync and panel.

## Progress
- **Finding 1 (Pass host-tool enablement through cold-session reopen):**
  - Extended `SessionReopenScopeSchema` in `packages/web/server/lib/openchamber-sessions/routes.js:28` with optional `hostTools`.
  - Updated `reopenNative` in `packages/web/server/lib/openchamber-sessions/routes.js:362` to resolve current host tools via `resolveHostTools()` and pass `hostTools` in the reopen bootstrap payload.
  - Updated `fork` in `packages/agent-service/src/sessions/registry.ts:890` to copy `source.hostTools` to child bootstrap.
  - Verified via `routes.test.js` ("passes resolved host tools when reopening a cold session") and worker test in `session-native.test.ts` ("a cold session reopens with web disabled; web is absent from model tool list and calling it is refused").
- **Finding 2 (Preserve mounted tools when changing a host-tool toggle):**
  - Updated `toggle` in `packages/agent-service/src/worker/host-tool.ts:187-202` to read both `getEnabledToolNames()` and `getMountedXdevToolNames()`.
  - Invoked `boundSession.setActiveToolPresentation(nextEnabled, nextMounted)` when available (falling back to `setActiveToolsByName(nextEnabled)`), preserving the exact partition between top-level and `xd://` mounted tools rather than passing only top-level active tool names.
  - Verified via worker test in `session-native.test.ts` ("a worker test uses the real SDK session with xd:// mounts; toggling notify keeps mounted tools enabled").
- **Finding 3 (Apply recap changes to already-running session workers):**
  - Added `catalog.settings.apply` to `CatalogOperationSchema` and `catalog.settings.applied` to `CatalogResultSchema` in `packages/agent-service/src/catalogs/protocol.ts:44,86`.
  - In `packages/agent-service/src/worker/catalogs.ts:87-90`, handled `catalog.settings.apply` by calling `session.settings.reloadFromDisk()` and triggering `session.refreshIdleMaintenance()`.
  - In `packages/agent-service/src/supervisor/workspaces.ts:151-174`, updated `WorkspaceCatalogs.operation` on `catalog.settings.write` mutation to fan out `catalog.settings.apply` to all active session workers sharing the workspace / agent directory.
  - Verified via live-worker test in `session-native.test.ts` ("a live worker turns recap.enabled off after a turn and no recap follows").
- **Finding 4 (Return the envelope expected by workflow chat cards):**
  - Added shared `ProposedWorkflowResultSchema` (`{ ok: true, action: 'workflow.run', data: { runId } }`) to `packages/agent-contract/src/runtime.ts:22`.
  - Updated `envelopeFor` in `packages/agent-service/src/worker/host-tool.ts:84-93` to wrap `openchamber_workflow` `workflow.run` outputs with `{ ok: true, action: 'workflow.run', data: { ...data, runId } }`.
  - Aligned `proposedWorkflowRunId` in `packages/ui/src/components/chat/message/parts/pageRenderView.ts:167-181` to extract tool payload from output or metadata and validate against `ProposedWorkflowResultSchema`.
  - Verified via `packages/agent-service/src/worker/host-tool.test.ts` (envelope generation) and `packages/ui/src/components/chat/message/parts/pageRenderView.test.ts` (parser extraction).
- **Finding 5 (Remove memory-store consumers with the deleted routes):**
  - Deleted `packages/ui/src/stores/useAgentMemoryStore.ts` and `useAgentMemoryStore.test.ts`.
  - Deleted `packages/ui/src/lib/agentMemoryApi.ts`, `agentMemoryBadges.ts`, `agentMemoryBadges.test.ts`.
  - Deleted `packages/ui/src/hooks/useAgentMemorySync.ts`.
  - Deleted `packages/ui/src/components/session/project-context/MemorySection.tsx`, `memoryTidy.ts`, `memoryTidy.test.ts`.
  - Removed `agent-memory` hydrator entry from `SERVER_STATE_BOOT_ENTRIES` in `packages/ui/src/stores/serverStateBoot.ts`.
  - Removed sync hook calls from `packages/ui/src/App.tsx` and `packages/ui/src/apps/MobileApp.tsx`.
  - Removed memory tab and consumers from `packages/ui/src/components/session/project-context/ProjectNotesTodoPanel.tsx`.
  - Cleaned up references in `WorkStatusContextSection.tsx`, `pendingKnowledgeDeletes.ts`, and `packages/ui/src/components/session/project-context/DOCUMENTATION.md`.
  - Inspected `bun run dead-code`: zero leftover memory store exports.
- **Real path verification on port 4127 (Web, real provider `CLIProxyAPI/gemini-3.5-flash-lite`, isolated `HOME` and `OPENCHAMBER_DATA_DIR`):**
  - Scenario (a): Created session A, sent initial turn, disabled `agentWebToolEnabled` (200), evicted worker (DELETE /internal/workers/:id). Sent web fetch prompt; session reopened cold with web absent from tool offerings and fetch refused. History saved in `01-web-refused-history.json`, screenshot in `01-web-disabled.png`.
  - Scenario (b): Created session B, proposed `workflow.run` for `sample` workflow. Tool returned `{ ok, action: 'workflow.run', data: { runId } }`, parsed by card parser. Started existing workflow via `POST /api/openchamber/workflows/start` returning 200. History saved in `02-workflow-history.json`, screenshot in `02-workflow-card.png`.
  - Scenario (c): Created session C, requested image generation. `generate_image` tool was invoked by agent and returned precise provider refusal (`Image generation exhausted the resolved image chain: CLIProxyAPI/gpt-image-2.5-flare`). History saved in `03-generate-image-history.json`, screenshot in `03-generate-image.png`.
  - Scenario (d): Configured `memory.backend: local`. In session D1, prompted agent to store Project Orion secret code. In new session D2, prompted agent to search memory; agent invoked `recall` tool call and returned the secret. History saved in `04-memory-recall-history.json`, screenshot in `04-memory-recall.png`.
  - Scenario (e): Configured `recap.enabled: false`, `recap.idleSeconds: 2`. Created session E, prompted turn, waited past idle delay. Queried `/api/agent/v1/sessions/:id/recaps` returning 200 with `{ recaps: [] }` (0 recaps). Evidence saved in `05-recap-evidence.json`, screenshot in `05-recap-disabled.png`.
  - Evidence directory: `/home/shizuku/Project/ohpichamber-omp-artifacts/ux-feedback-2026-11-13/task27/`.

Check after:
- `bun test packages/agent-service/src/worker/session-native.test.ts -t "a cold session reopens with web disabled|toggling notify keeps mounted tools enabled|a live worker turns recap.enabled off"`: 3 pass, 0 fail, 19 expect() calls
- `bun test packages/agent-service/src/worker/host-tool.test.ts -t "workflow.run"`: 2 pass, 0 fail, 18 expect() calls
- `bunx vitest run packages/ui/src/components/chat/message/parts/pageRenderView.test.ts`: 2 pass, 0 fail
- `bun test packages/web/server/lib/openchamber-sessions/routes.test.js -t "passes resolved host tools"`: 1 pass, 0 fail
- `bun run dead-code`: exit 1 (knip baseline report verified; zero leftover memory store exports)
- `bunx oxlint <touched paths>`: 0 findings
- Real path on port 4127 (Web, real provider `CLIProxyAPI/gemini-3.5-flash-lite`, isolated `HOME` and `OPENCHAMBER_DATA_DIR`): all 5 flows verified, evidence in `/home/shizuku/Project/ohpichamber-omp-artifacts/ux-feedback-2026-11-13/task27/`.

Review: pending independent review
