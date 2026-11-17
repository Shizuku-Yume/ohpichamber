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

## Per-session warming has no Agent Service implementation

- **Where:** Agent Service session warming (the canonical `GET/PUT /api/agent/v1/workspaces/:workspaceId/cache-warming` covers the workspace), `packages/ui/src/components/sections/openchamber/`
- **Added:** 2026-10-29
- **Priority:** worth-doing
- **Problem:** The refresh adopted upstream's per-session warming (a server keep-alive loop over OpenCode's session endpoints plus a Settings field and a session-menu toggle). It was unmounted, unreachable behind a 404, and pointed at deleted endpoints, so it was deleted (`decisions.md: 2026-10-29 - Delete upstream's per-session warming instead of rewiring it`). The fork can now warm a whole workspace (`off`/`streaming`/`idle`) but cannot keep one chosen session warm, which upstream's users had.
- **Impact:** Anyone relying on "keep this one long session warm without paying for pings on throwaway ones" loses that control after the refresh; the canonical workspace mode is the only choice, applied to every active worker in the workspace.
- **Solution:** Add a canonical session-level warming route and state on the Agent Service (revision CAS, per-session apply outcome, native `AgentSession.setCacheWarmingMode` per session), then rebuild the Settings choice and the session toggle against it; no Host-side timer loop.
- **Cost:** New contract and route in `packages/agent-contract` and `packages/agent-service`, worker-level session application, a store and sync subscriber in the UI, and 15 locales of copy; the workspace control and its tests must keep passing.

## Cold new-chat first token waits on OMP session construction

- **Where:** `packages/agent-service/src/supervisor/workers.ts` (spare pool), `packages/agent-service/src/worker/session.ts`
- **Added:** 2026-11-15
- **Priority:** only-if-grows
- **Problem:** a new chat that skips `prepare` reaches its first `part.delta` in ~720–800 ms against the 600 ms W11 budget (waived 2026-11-15). Even with each spare worker isolated in its own process, `createAgentSession` in `@oh-my-pi/pi-coding-agent` couples workspace graph discovery with bootstrap-bound `SessionManager` persistence/breadcrumbs/closures, `AgentRegistry.global()` `sessionFile`, `mcpManager` wiring, and construction-time `getApiKey`, memory, LSP, and skill-compression side effects, so a spare cannot prebuild the session graph before `WorkerBootstrapMessage` (`decisions.md: 2026-11-18 - Keep spare workers at runtime prewarm until OMP splits session-graph preparation from session binding`).
- **Impact:** paths that create a session without a draft (API callers, some automation) see roughly 200 ms more latency than the prepared path.
- **Solution:** add an upstream `@oh-my-pi/pi-coding-agent` two-phase session-graph seam (`prepareSessionGraph` / `hydrateSessionGraph` or late-bindable `SessionManager`, `MCPManager`, and `AgentRegistry` attachment without pre-bootstrap side effects), then prebuild the workspace session graph in spare workers (`decisions.md: 2026-11-18 - Keep spare workers at runtime prewarm until OMP splits session-graph preparation from session binding`).
- **Cost:** requires an upstream `@oh-my-pi/pi-coding-agent` SDK API change.
