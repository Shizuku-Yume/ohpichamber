# Technical Debt

Code that makes the next change expensive, one entry per finding, so reviews don't
rediscover it and the reason it wasn't fixed yet is kept. `flow-architect` adds
entries; any skill that finds debt may add one.

## Format

Each entry is a level-2 heading naming the concrete symptom, under `## Entries`.
Refer to an entry by its heading.

```markdown
## Order total computed in three places

- **Where:** <files or modules>
- **Added:** <YYYY-MM-DD>
- **Priority:** fix-now | worth-doing | only-if-grows
- **Problem:** <what is wrong, with evidence>
- **Impact:** <what gets harder while it stays>
- **Solution:** <the change, in plain terms>
- **Cost:** <what the fix risks, how big it is>
```

An entry leaves this file in one of two ways:

- Fixed: the task that fixes it deletes the entry in its own commit.
- Declined by the user: delete the entry and append a decision entry to
  `decisions.md` (Decided: not fixing <symptom>; Instead of: fixing it; Because;
  Mine: no; Revisit when), so reviews don't re-propose it.

## Entries



## Cold new-chat first token waits on OMP session construction

- **Where:** `packages/agent-service/src/supervisor/workers.ts` (spare pool), `packages/agent-service/src/worker/session.ts`
- **Added:** 2026-11-15
- **Priority:** only-if-grows
- **Problem:** a new chat that skips `prepare` reaches its first `part.delta` in ~720–800 ms against the 600 ms W11 budget (waived 2026-11-15). Even with each spare worker isolated in its own process, `createAgentSession` in `@oh-my-pi/pi-coding-agent` couples workspace graph discovery with bootstrap-bound `SessionManager` persistence/breadcrumbs/closures, `AgentRegistry.global()` `sessionFile`, `mcpManager` wiring, and construction-time `getApiKey`, memory, LSP, and skill-compression side effects, so a spare cannot prebuild the session graph before `WorkerBootstrapMessage` (`decisions.md: 2026-11-18 - Keep spare workers at runtime prewarm until OMP splits session-graph preparation from session binding`).
- **Impact:** paths that create a session without a draft (API callers, some automation) see roughly 200 ms more latency than the prepared path.
- **Solution:** add an upstream `@oh-my-pi/pi-coding-agent` two-phase session-graph seam (`prepareSessionGraph` / `hydrateSessionGraph` or late-bindable `SessionManager`, `MCPManager`, and `AgentRegistry` attachment without pre-bootstrap side effects), then prebuild the workspace session graph in spare workers (`decisions.md: 2026-11-18 - Keep spare workers at runtime prewarm until OMP splits session-graph preparation from session binding`).
- **Cost:** requires an upstream `@oh-my-pi/pi-coding-agent` SDK API change.

## A user-scope credential reference breaks every other workspace's MCP save

- **Where:** `packages/agent-service/src/worker/mcp-credentials.ts:12-20` (provider name hashes the writing workspace), `packages/agent-service/src/worker/mcp.ts:313-393` (the user MCP file is shared by every workspace), `packages/agent-service/src/worker/stateless.ts:220-223` (save resolves every reference before writing)
- **Added:** 2026-11-16
- **Effort:** ux-feedback-2026-11-15
- **Priority:** worth-doing
- **Problem:** a catalog entry installed at user scope writes its token as a workspace credential (`mcp_<uuid>`) and stores that reference in `~/.omp/agent/mcp.json`, which every workspace shares. `NativeMcpCredentials` prefixes the stored provider with a hash of the writing workspace, so another workspace that loads and saves that file fails the resolution check with 403 `MCP credential does not belong to this workspace`. Task 06 hit this for environment values and now forces project scope when any `envInputs` value is filled (`.workflow/decisions.md` 2026-11-16); token entries at user scope are unchanged and keep the hazard.
- **Impact:** installing any token catalog entry (Linear, Sentry, …) at user scope can make unrelated workspaces unable to save MCP configuration until the reference is removed by hand.
- **Solution:** either force project scope for every credential-carrying catalog install, or make user-file references resolvable from any workspace (workspace-independent provider name) while keeping project-file references workspace-scoped. Whichever path is chosen, add a save-from-another-workspace test.
- **Cost:** small in the UI (same scope guard as env installs); the credential-name change touches the store's provider naming and needs a migration story for existing refs.
