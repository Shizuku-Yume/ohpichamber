# 26: Verify installed MCP configuration and transports

**Effort:** omp-through-m3
**Task type:** spike
**Base commit:** <commit-sha>
**Question:** What does the installed SDK actually do on MCP configuration/schema changes, HTTP/SSE auth challenges and connection loss?
**Time box:** One disposable loopback transport/configuration prototype; no repeated stdio-baseline suite or external SaaS.

**Delivers:** Answer to the missing SDK MCP configuration/transport/recovery questions with persistence, runtime apply and recovery outcomes kept separate for gate 03.

**Blocked by:** 02
**Files:** `.workflow/omp-migration/m0/mcp-transports-config.json`; this task; disposable external consumer/loopback fixture state only

**Read first:** `.workflow/specs/omp-through-m3.md` M0/W1; implementation-plan MCP evidence boundary; archived task 24 and `source-install.json`; installed MCP manager, HTTP/SSE transports, tool bridge and configuration exports
**Covers:** W1

**Check:** Run a disposable Bun prototype from the coordinator-prepared installed consumer against a real loopback JSON-RPC MCP fixture. Change enabled/config/schema state, discover/call tools, exercise HTTP and SSE plus a controlled auth challenge, interrupt a live connection and observe recovery. Record the exact public/exported owner, invocation, results, timeout/exit and process/socket cleanup. Distinguish file persistence, explicit apply, manual reconnect and automatic recovery; local challenge behavior is not authentic remote OAuth proof.

- [ ] Reuse task-24 immutable source-derived packages/lock/patches without rebuilding, acquiring another revision or importing the source workspace.
- [ ] Run with private owned HOME/agent directory/workspace/environment and loopback-only listeners; keep shared package payloads and application source read-only.
- [ ] Observe changed configuration and tool schema through the installed owner, including enable/disable and failure after a valid catalog. Report SDK catalog loss if observed; do not pretend a future service transaction already exists.
- [ ] Exercise both HTTP and SSE JSON-RPC paths and a controlled auth challenge/reconnect. Retain any missing remote IdP/token/refresh/scope requirement as unresolved, not passed by the fixture.
- [ ] Interrupt the actual transport and record whether automatic recovery happens without a manual reconnect call. Explicit reconnect remains separately identified.
- [ ] Record sanitized per-operation outcomes and limits, no secrets/raw prompt data; close owned connections/processes/listeners and remove disposable state.
- [ ] Keep throwaway prototype off main; parent owns shared evidence, review, archive and landing. Completed investigation does not accept M0.
