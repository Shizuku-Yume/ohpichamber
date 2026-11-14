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

- [ ] Pass current host-tool enablement on every worker start path, including `reopenNative`.
- [ ] Change the full enabled tool set, not only the top-level active names, and keep the presentation partition.
- [ ] Reload persisted OMP settings into live session workers when the Chat recap controls change.
- [ ] Give workflow tool results the envelope the card expects (`{ok, action: 'workflow.run', data: {runId}}`), with one shared definition.
- [ ] Delete the legacy agent-memory client store, API, boot hydrator, sync and panel.
