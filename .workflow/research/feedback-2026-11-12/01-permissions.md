## Item 1: denials and approval prompts under YOLO

### Observed
The composer shield is blue with a check, which is `auto` mode (`PermissionAutoAcceptButton.tsx`). In that state:
- **#1:** `Read /tmp/pelican_day.png` fails with `Host policy refused the tool operation`. The model's own thinking says the file is outside the workspace.
- **#24:** The `eval` call itself (not a nested `tool.*` call) fails with the same message. The model then probes "eval without tool calls", which also hits `eval` and is [INFERENCE] denied too.

Neither failure comes from the shield. Under `auto`, approval cards are answered automatically. These are hard denials from a different layer, and `auto` never gets a chance to apply.

### Where the message comes from (verified)
`packages/agent-service/src/worker/session.ts:446-452`, in the `tool_call` hook:
```ts
try { await authorizeTool(...) } catch { return { block: true, reason: 'Host policy refused the tool operation' }; }
```
This catch swallows every Host refusal, so the user and the model never see why. The Host's real reason is in `error.message`. It is a fixed, generic sentence of at most 300 characters, so it is safe to show.

I ran the real `createWorkerOperationAuthorizer` with the production policy shape (`toolRequests: []`, `fileTools: ['read','write']`):

| Request | Result |
|---|---|
| `eval`, `find`, `ast_grep`, `ast_edit`, `debug`, `mcp__srv_tool` | denied: "The workspace policy does not allow this tool request" |
| `read /tmp/x.png` | denied: "The operation targets a path outside the authorized workspace" |
| `read` inside the workspace | allowed |
| `bash` without a grant | `approvalRequired` (becomes a card, which the mode can auto-answer) |
| `lsp rename` | `approvalRequired`, and nothing ever grants it |
| `task` | allowed |

### Root cause of #24: default-deny list out of sync with OMP's tool set
`packages/web/server/lib/host/worker-operation-authorizer.js:203` is the fall-through:
```js
return policy.toolRequests.some(c => isDeepStrictEqual(c, request)) ? allowed : denied('The workspace policy does not allow this tool request');
```
`packages/web/server/lib/host/agent-runtime.js:88` hard-codes `toolRequests: []`, so the fall-through always denies. The tools handled before it are only:
- `read`, `write`, `edit`, `grep`, `glob`, `bash`, `lsp`, `provider.use`
- `ask`, `yield`, `goal`, `todo`, `wait`, `task`, `permission.preset`

Host tools and `web_search` are handled earlier, in the worker.

OMP 18.18's built-ins that still fall through (`tools/index.ts:552-589`) are:
- `eval`, `find`, `ast_grep`, `ast_edit`
- `debug`, `ida`, `github`, `security_scan`
- `checkpoint`, `rewind`, `context_notes`, `new_context`
- `memory_edit`, `retain`, `recall`, `reflect`, `learn`, `manage_skill`
- `think`, and every `mcp__*` tool [INFERENCE for MCP; same code path, not run]

The fork advertises these tools, renders cards for them (Task 06), and then refuses them. The old audit (GAP-17) marked them "Deferred / not exposed", but nothing strips them from the active tool set.

Nested calls inside `eval` re-enter the same hook. OMP's `ExtensionToolWrapper.execute` emits `tool_call` for dispatches the loop did not emit (`wrapper.ts:268`), and `eval/js/tool-bridge.ts:299` calls the wrapped tool. So `tool.bash`, `tool.read` and the rest get the same gates as direct calls. Even if `eval` were allowed, `tool.read('/tmp/...')` would still hit the path boundary.

### Root cause of #1: path boundary
`worker-operation-authorizer.js:98-104,169-171` (`pathAllowed`) allows only paths under the project directory. Every other absolute path is refused with "outside the authorized workspace". The only exceptions are `xd://` device paths and `internalReadUrls`. This applies to `read`, `write`, `edit`, `grep`, `glob`, `lsp`, and to the `cwd` argument of `bash`.

It is also inconsistent with `bash`. In the same screenshot `bash` created and removed `/tmp` files, because bash is gated by an approval card, not by path.

### All deny and ask sources, classified

**Correct security boundaries, must stay**
- Workspace validation, including the root/`$HOME` repository-root block (`authorizer:73-81`).
- Exact-deny approval policy rows (`authorizer:90`, `manager.ts:172,299`). These are user-chosen "always deny" rules.
- Enterprise refusal of web search and provider entry (`authorizer:105-108`).
- MCP server and OAuth allow-list (`:110-120`).
- Isolated or unsafe `task` delegation (`:158-163`).
- OMP user policies `tools.approval.<tool>: deny` and bash deny patterns. These are surfaced as "blocked by user policy" or as a rejected prompt, not as the Host message.
- Path containment itself. ADR-05 and SCOPE-6.3 say the Gatekeeper rejects paths outside the workspace. The behaviour is by design, but the opacity and the lack of an escalation path are bugs.
- Safety-mode holds and `ask` mode. These are not YOLO.

**Intentional per-agent allowlist (works as designed, but sloppy)**
- `session.ts:430` returns "Selected agent profile does not permit this tool" when the profile's `allowedTools` omits a tool. That is a different message from the screenshots.
- The allowlist closure is shared by subagents. OMP rebinds the parent's extension factories into child sessions (`executor.ts:4338`), and the closure reads the root's `admission.profile` with no agent identity. So a root profile with an explicit allowlist would also block a child's `bash`, `edit` or `yield` [INFERENCE, not run].
- The profile's `permissionPresetId` is never read at runtime. It is a dead field and cannot affect approvals. Settings #25 exposes it as a free-text input.

**Mode-independent bugs**
1. **`session.ts:448,452`:** the catch drops the Host's reason, so a refusal reads as a mystery.
2. **`authorizer:203` plus `agent-runtime.js:88`:** the default-deny list is out of sync with OMP's inventory. This is the cause of #24.
3. **LSP mutations** (`rename`, `rename_file`, `format`, `code_actions apply`): `authorizer:193` requires an `approvalGrant`, but `supervisor/workers.ts:1041` only attaches one for `bash`. Nothing in the worker runs an approval flow for `lsp`, so these are always refused regardless of mode. The refusal is thrown from `authorizeTool` in the `tool_call` hook (`session.ts:451`), which is not the bash extension path.
4. **`interaction.ts:207-208,124-127`:**
   - `requestPermission` and `handleApprove` return cancelled or deny when there is no current turn, for example async or background work after the turn ends. This is a mode-independent denial.
   - `handleApprove` and `select` pick `[...observed.values()][0]` instead of matching the tool call, which mismatches under parallel eval fan-out [INFERENCE].
   - A `select` with no observed tool becomes a question card that is not auto-answerable (`:144-151`).
5. **Mode lookup fails closed to `ask`:**
   - On a 20 s timeout or error (`host-policy.ts:84-91`).
   - When `scopes` is cleared on a service restart (`agent-service-supervisor.js:489,571`).
   - For unknown lineage (`runtime.js:188-215`).

   The card then shows and is not retried. Only a mode change triggers `reconsiderPending`. [INFERENCE] for restart.
6. **New-session draft shield:** the mode is applied after creation by a fire-and-forget PUT. A failure is only `console.warn`'d (`session-ui-store.ts:1154-1163`). This can make a first approval flash.
7. **`settings-ui.ts:53`:** OMP `tools.approvalMode` is hidden as a "duplicate" of the shield, but the shield never writes it. The user's `config.yml` value stays live and unreachable. A non-yolo value gives extra OMP prompts, which the Host answers via `requestApproval`. Do not "fix" this by forcing `yolo`: that would make OMP skip the ACP gate (`session-tools.ts:970,1065`), which is currently the only source of Host cards for `edit` delete and move.

**Subagents and restarts, verified OK**
- Approvals from children surface through the root worker with the root session id, so they follow the shield (`workers.ts:1029`).
- The mode lives in Host settings by session id (`permission-auto-accept/runtime.js`), so it survives a worker restart and a cold resume.
- `NativePermissionBridge` caches and `executionGrants` are cleared on restart. That is correct.

### Fix
1. **Show the Host reason** (`session.ts:448,452`). Return `block: true` with `reason: error instanceof ProjectionError ? error.message : 'Host policy refused the tool operation'`. This is small, safe, and gives the model something to act on.

2. **Replace the fall-through by tier.** Pass the tool's OMP tier, or use per-tool sets, in the authorizer:
   - **Read tier** (`find`, `ast_grep`, `checkpoint`, `rewind`, `context_notes` read, `think`, `recall`, `reflect`): allow after the descriptor path check.
   - **Write tier** (`ast_edit`, `new_context`, `manage_skill`, memory writes): path-check destinations, allow when the workspace grants `fileTools` write.
   - **Exec tier** (`eval`, `debug`, `ida`, `github`): return `approvalRequired`.
   - **`mcp__*`:** allow when the server is in `policy.mcpServers`, with the exec-tier approval per call.

3. **Generalise the bash approve-then-reauthorize loop** (`native-bash-policy.ts:28-41`) so any `NativeApprovalRequired` from the `tool_call` hook opens a card via `requestApproval`. Those cards are `permissionRequest: true`, so `auto` accepts them silently and `ask` and `safety` behave as for bash. This needs:
   - `consumeApprovalGrant` (`manager.ts:338-350`, currently `bash`/`command`-only) and `workers.ts:1041` to carry `{toolName, input}`.
   - `NativeApprovalGrantSchema` to allow a non-command grant.

   This also fixes LSP mutations.

4. **Scope the profile allowlist to the root session's own calls.** Key it by agent identity, or skip it for subagent events.

### Decisions for the maintainer
- **A (recommended):** tier-aware authorizer plus the generalised approval loop. This keeps ADR-05, since `eval` is arbitrary code execution, same as bash, so `ask` mode must still prompt.
- **B:** add `eval` and the others to the "allowed without descriptor" list, like `ask`, `todo` and `wait`. This is one line, but `eval` then bypasses `ask` and `safety` completely, because OMP's own `approvalMode` defaults to yolo. Not recommended.
- **C:** strip these tools from the active set. This is inconsistent with the Eval card work and item 17.

For paths outside the workspace:
- **P1 (recommended):** keep write and edit hard-denied. For read-only targets outside the workspace, return `approvalRequired` (card, auto-answered under `auto`). Bash can already read those files, so the hard deny adds no security.
- **P2:** keep the hard deny but give an actionable message ("outside the workspace; copy it in or use bash").
- **P3:** add allow-listed read-only roots (`os.tmpdir()`, the agent directory).

### Class
This is a pattern: the Host allowlist was written for the tools the fork knew about at the time. `task`, `yield` and `web_search` were each patched one at a time (Task 15, 57 and 63 notes), and every new OMP tool falls through the same way. The test fixtures use a fake authorizer, so no worker test runs the real authorizer against an unlisted tool. Add a test that every name in `BUILTIN_TOOL_NAMES` has a decision, and that the real authorizer's decision on a tool agrees with OMP's declared tier.

I changed no repository files. My temporary probe script is deleted.