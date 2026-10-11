# 26: Verify installed MCP configuration and transports

**Effort:** omp-through-m3
**Task type:** spike
**Base commit:** edfdf096316b92775b55410a532f61fa8aa62de9
**Started:** 2026-10-12
**Finished:** 2026-10-12
**Question:** What does the installed SDK actually do on MCP configuration/schema changes, HTTP/SSE auth challenges and connection loss?
**Time box:** One disposable loopback transport/configuration prototype; no repeated stdio-baseline suite or external SaaS.

**Delivers:** Answer to the missing SDK MCP configuration/transport/recovery questions with persistence, runtime apply and recovery outcomes kept separate for gate 03.

**Blocked by:** 02
**Files:** `.workflow/omp-migration/m0/mcp-transports-config.json`; this task; disposable external consumer/loopback fixture state only

**Read first:** `.workflow/specs/omp-through-m3.md` M0/W1; implementation-plan MCP evidence boundary; archived task 24 and `source-install.json`; installed MCP manager, HTTP/SSE transports, tool bridge and configuration exports
**Covers:** W1

**Check:** Run a disposable Bun prototype from the coordinator-prepared installed consumer against a real loopback JSON-RPC MCP fixture. Change enabled/config/schema state, discover/call tools, exercise HTTP and SSE plus a controlled auth challenge, interrupt a live connection and observe recovery. Record the exact public/exported owner, invocation, results, timeout/exit and process/socket cleanup. Distinguish file persistence, explicit apply, manual reconnect and automatic recovery; local challenge behavior is not authentic remote OAuth proof.

- [x] Reuse task-24 immutable source-derived packages/lock/patches without rebuilding, acquiring another revision or importing the source workspace.
- [x] Run with private owned HOME/agent directory/workspace/environment and loopback-only listeners.
- [ ] Keep installed package payloads strictly read-only; diagnostics briefly wrote and removed one uniquely named resolution probe, as recorded in the artifact.
- [x] Observe changed configuration and tool schema through the installed owner, including enable/disable and failure after a valid catalog. Report SDK catalog loss if observed; do not pretend a future service transaction already exists.
- [x] Exercise both HTTP and SSE JSON-RPC paths and a controlled auth challenge/reconnect. Retain any missing remote IdP/token/refresh/scope requirement as unresolved, not passed by the fixture.
- [x] Interrupt the actual transport and record whether automatic recovery happens without a manual reconnect call. Explicit reconnect remains separately identified.
- [x] Record sanitized per-operation outcomes and limits, no secrets/raw prompt data; close owned connections/processes/listeners and remove disposable state.
- [x] Keep throwaway prototype off main; parent owns shared evidence, review, archive and landing. Completed investigation does not accept M0.
## Progress

- Dirty at start: many unrelated pre-existing assembled paths across `.agents/`, `.github/`, `.workflow/`, docs and application packages, including `.workflow/development.md` and task 27. Task 26 and its artifact were clean; none of those paths were touched.
- Check before: skipped for this spike; the previous stdio baseline was not repeated.
- Reused `/tmp/ohpi-m0-evidence-consumer` and task-24 immutable source-derived inputs; Bun 1.4.2. Artifact-set SHA256 `d4652edea9d0b09c76c793a2ef54efb0331a89b770def0cc42b9ae849d31da34`; consumer lock SHA256 `03981eeabb92a06eb59ebbacd0139abe92ce00854b396e461daf9c70f9df6847`. No install, rebuild, revision acquisition, source-workspace import or retained artifact mutation.
- Check after: `bun run ./mcp-transports-probe.ts` from the prepared consumer with private HOME, OMP_AGENT_DIR, XDG_CONFIG_HOME, TMPDIR and minimal PATH; one 127.0.0.1 ephemeral Bun listener with HTTP and legacy SSE JSON-RPC routes. Command timeout 120 seconds; exit 0, stderr empty. No broad tests, build, lint, formatter or old suite was run.
- Cleanup: `MCPManager.disconnectAll()` left zero connections; fixture streams were zero; the ephemeral listener was stopped; no subprocess was created. Removed the owned workspace, private HOME/agent/TMPDIR and probe scripts after writing the artifact. No application/source-workspace edits were made.
- Read-only deviation: during diagnostics I briefly created `node_modules/@oh-my-pi/pi-coding-agent/src/resolve-nested.ts` inside the installed consumer package to inspect resolution, then removed it before the final probe/cleanup. It is absent now and no retained source artifact was changed, but package payloads were not strictly read-only throughout diagnostics; the strict read-only checklist item remains open for parent review.
- Exact runtime output, installed owner paths, per-operation status, cleanup, observed limits and non-acceptance boundary are recorded in `.workflow/omp-migration/m0/mcp-transports-config.json`.
Review: Requirements Brief A passed with the read-only diagnostic deviation retained as an explicit limitation. Quality Brief B and the security review passed with no findings. This investigation does not accept M0 or gate 03.

## Findings

- Installed owner: `@oh-my-pi/pi-coding-agent@18.8.9`, pinned source revision `c9de2b02b997f37cc89639282ed35dec86f139e8`, package SHA256 `dde740cca56c27cec0c946d3c67beb50d253c034965c063b5d0f4eea58555c6d`. Public export `@oh-my-pi/pi-coding-agent/mcp` maps to `src/mcp/index.ts`, which re-exports `MCPManager`, config/client/transport owners and MCP types. Exercised `MCPManager`, `callTool`, `refreshServerTools`, explicit connect/disconnect and reconnect. Relevant source paths are manager.ts, client.ts, config.ts, types.ts, transports/http.ts and transports/sse.ts under installed `src/mcp/`.
- The temporary `.mcp.json` was read through a fixture-injected config loader; this tested the installed manager and transport owners without ambient discovery. It does not establish default loader path precedence or a config file watcher. File write, loader visibility, explicit apply and manual reconnect were separate operations. `enabled:false` excluded the entry and explicit disconnect removed its tool; explicit connect after re-enable restored it with zero errors.
- Initial tool discovery/call succeeded over Streamable HTTP and legacy SSE. A local 401 with `WWW-Authenticate` surfaced as `MCPTransportError`; explicit `reconnectServer` with `MCPAuthChallenge` invoked the fixture auth handler and the next call succeeded. This proves no remote OAuth, IdP consent, stored credential, token refresh or scope behavior.
- A changed schema was observed only after explicit `MCPManager.refreshServerTools`; no `tools/list_changed` notification or file watcher was used. This successful refresh kept the catalog valid.
- Calling `close()` on the connected HTTP transport invoked the manager's automatic `onClose` reconnect path without a direct reconnect call; a new connection and follow-up tool call succeeded. A separate explicit manual SSE reconnect also returned a new connection and succeeded. No server-side HTTP SSE GET stream was active at the automatic interruption, so this is not an abrupt network outage proof.
- The failed loopback reconfiguration began with one valid tool, but required explicit `disconnectServer` before connecting the changed URL; that disconnect removed the catalog before the failed connect (one error). Restoring the valid config succeeded and restored one tool. This is observed catalog loss after disconnect, not transactional-apply rollback evidence or an SDK last-good guarantee.
- The local fake auth values and config stayed in private temporary state and were not emitted. Missing remote OAuth/auth requirements remain unresolved. Investigation does not accept M0 or release gate 03.
