# 04: Authorize OMP tools by tier and generalize the approval loop

**Effort:** ux-feedback-2026-11-12
**Task type:** bugfix
**Blocked by:** None
**Covers:** W4
**Files:** `packages/web/server/lib/host/{worker-operation-authorizer.js,agent-runtime.js}`; `packages/agent-service/src/worker/{session.ts,interaction.ts,native-bash-policy.ts,host-policy.ts}`; `packages/agent-service/src/supervisor/workers.ts`; `packages/agent-service/src/interaction/manager.ts`; `packages/agent-contract/src/` (approval grant schema)
**Read first:** `research/feedback-2026-11-12/01-permissions.md` (all of it); `decisions.md` 2026-11-13 "Host authorizes OMP tools by tier, not by a known-name list"; architecture ADR-05; skills `sync-state-invariants`, `isolated-space-boundary` (authorizer boundary rules)
**Check:** a new test loads OMP 18.18.0's built-in tool list from the pinned package and asserts the real authorizer returns a decision for every name that matches the tool's OMP tier; `bun run --cwd packages/web test -- server/lib/host` and `bun test --timeout 15000 src/worker src/supervisor src/interaction` in `packages/agent-service` exit 0. Real path (Web, real provider, isolated data dir): in `auto`, one turn uses `eval`, `find`, `ast_grep` and an MCP tool with no denial and no card; in `ask`, `eval` raises a card; reading a `/tmp` file raises a card in `ask` and passes in `auto`; writing outside the workspace is refused and the transcript shows the Host's reason; an LSP rename succeeds after approval. Receipts and screenshots go in the evidence directory.

- [ ] Replace the `toolRequests` fall-through with tier decisions: read tier allowed after the path check; write tier needs the workspace write grant; exec tier (`eval`, `debug`, `ida`, `github`) and `mcp__*` for policy servers return `approvalRequired`.
- [ ] A read outside the workspace returns `approvalRequired`; writes and edits outside it stay denied.
- [ ] Generalize the bash approve-then-reauthorize loop to any `approvalRequired` from the `tool_call` hook. Approval grants carry `{toolName, input}`, and `consumeApprovalGrant` and the supervisor attach them for any tool.
- [ ] The worker returns the authorizer's reason in `block.reason`.
- [ ] Fix the mode-independent denials: no current turn in `requestPermission` and `handleApprove`, tool matching by call id instead of the first observed tool, and the mode lookup's fail-closed `ask` gets a retry when the mode becomes known.
- [ ] Scope the profile `allowedTools` closure to the root session's own calls.
- [ ] Deletes: `toolRequests: []` and the deep-equal fall-through.
