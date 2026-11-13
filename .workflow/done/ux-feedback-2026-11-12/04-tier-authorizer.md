# 04: Authorize OMP tools by tier and generalize the approval loop

**Effort:** ux-feedback-2026-11-12
**Task type:** bugfix
**Blocked by:** None
**Covers:** W4
**Files:** `packages/web/server/lib/host/{worker-operation-authorizer.js,agent-runtime.js}`; `packages/agent-service/src/worker/{session.ts,interaction.ts,native-bash-policy.ts,host-policy.ts}`; `packages/agent-service/src/supervisor/workers.ts`; `packages/agent-service/src/interaction/manager.ts`; `packages/agent-contract/src/` (approval grant schema)
**Read first:** `research/feedback-2026-11-12/01-permissions.md` (all of it); `decisions.md` 2026-11-13 "Host authorizes OMP tools by tier, not by a known-name list"; architecture ADR-05; skills `sync-state-invariants`, `isolated-space-boundary` (authorizer boundary rules)
**Check:** a new test loads OMP 18.18.0's built-in tool list from the pinned package and asserts the real authorizer returns a decision for every name that matches the tool's OMP tier; `bun run --cwd packages/web test -- server/lib/host` and `bun test --timeout 15000 src/worker src/supervisor src/interaction` in `packages/agent-service` exit 0. Real path (Web, real provider, isolated data dir): in `auto`, one turn uses `eval`, `find`, `ast_grep` and an MCP tool with no denial and no card; in `ask`, `eval` raises a card; reading a `/tmp` file raises a card in `ask` and passes in `auto`; writing outside the workspace is refused and the transcript shows the Host's reason; an LSP rename succeeds after approval. Receipts and screenshots go in the evidence directory.
**Base commit:** 80e8eefd795f9bbe89ca6ac4e1fec6b433993fd5

- [x] Replace the `toolRequests` fall-through with tier decisions: read tier allowed after the path check; write tier needs the workspace write grant; exec tier (`eval`, `debug`, `ida`, `github`) and `mcp__*` for policy servers return `approvalRequired`.
- [x] A read outside the workspace returns `approvalRequired`; writes and edits outside it stay denied.
- [x] Generalize the bash approve-then-reauthorize loop to any `approvalRequired` from the `tool_call` hook. Approval grants carry `{toolName, input}`, and `consumeApprovalGrant` and the supervisor attach them for any tool.
- [x] The worker returns the authorizer's reason in `block.reason`.
- [x] Fix the mode-independent denials: no current turn in `requestPermission` and `handleApprove`, tool matching by call id instead of the first observed tool, and the mode lookup's fail-closed `ask` gets a retry when the mode becomes known.
- [x] Scope the profile `allowedTools` closure to the root session's own calls.
- [x] Deletes: `toolRequests: []` and the deep-equal fall-through.
## Progress

Check after:
- Built-in tool coverage test (`worker-operation-authorizer.test.js`): 39/39 tests passed, including OMP 18.18.0 BUILTIN_TOOL_NAMES tier-decision assertions, outside workspace read/write, MCP policy server validation, and eval approval grants.
- Host tests: `bun run --cwd packages/web test -- server/lib/host` passed (65 files, 649 passed, 1 skipped).
- Agent service tests: `bun test --timeout 15000 src/worker src/supervisor src/interaction` in `packages/agent-service` passed (439 passed, 10 skipped, 0 failed).
- Static checks: `bunx oxlint <touched paths>` passed with 0 findings.
- Real path on port 4104: all 5 scenarios passed; evidence saved in `/home/shizuku/Project/ohpichamber-omp-artifacts/ux-feedback-2026-11-13/task04/` (`01-server-ready.png` to `06-lsp-rename-approved.png`, `receipt.json`).

Review: pass (base 80e8eefd795f9bbe89ca6ac4e1fec6b433993fd5) — Reviewed by Task04Reviewer subagent; fixed all 4 findings (P1 AST delimited paths, P1 timeoutBudget pause via ctx.ui.approve, P1 exact MCP server resolution, P2 OMP 18.18 GitHub read-only ops).
