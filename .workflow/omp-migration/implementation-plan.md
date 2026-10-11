# Implementation plan

This plan assumes the OMP-only boundary in [scope.md](./scope.md), the runtime topology in [architecture.md](./architecture.md), and the Canonical API draft in [contracts.md](./contracts.md). It is a migration plan, not a promise that the current repository already implements any item.

## Prerequisite: refresh upstream and re-audit the fork

The [latest-upstream rebaseline](../specs/upstream-rebaseline.md) has pinned and adopted the coherent application/runtime/dependency/build source. Its assembled runtime acceptance and documentation review must close before OMP implementation. Earlier selective-import exclusions do not constrain this prerequisite, and inheriting the current OpenCode integration passes no OMP gate.

The source-aware additions are recorded in [scope.md](scope.md#refreshed-source-traceability). Use [development.md](../development.md) for actual checks and external blockers rather than treating source presence as acceptance. Historical investigations remain comparison inputs, not current runtime guarantees.


## Delivery rules

1. Make one runtime boundary authoritative before moving its callers. Do not add an OpenCode fallback or publish a two-engine mode.
2. Keep the existing OpenChamber host services in place while the Agent Service is introduced. Host behavior is not a reason to rewrite unrelated filesystem, Git, PTY, browser, relay, or authentication code.
3. Every process, network, and persistence contract needs an observable failure state. An unavailable agent, an empty result, and an unsupported capability are different outcomes.
4. Cut over each owner as soon as its replacement is proven. Do not keep dead compatibility code until the end of the project.
5. A milestone is complete only when its gate has evidence. A type-check or static read is not evidence for streaming, process teardown, approval safety, reconnect, or mobile behavior.

## M0: verify OMP capabilities and freeze the contract

### Work

- Use the earlier inspected `@oh-my-pi/pi-coding-agent@18.7.0` as a source-comparison reference. Select and record the exact package version exercised by the disposable probe in its workflow task; recheck proposed contracts against that version before freezing them.
- Run a disposable Bun probe against the SDK and exercise session creation, prompt lifecycle, abort, history loading, branch behavior, subagent events, approvals, questions, model discovery, MCP, skills, and shutdown.
- Measure whether multiple `AgentSession` instances can safely coexist in one service process. Do not infer this from TypeScript types.
- Measure the cost and cleanup behavior of one worker per session or project if shared-process concurrency is not safe.
- Confirm which OMP auth and model configuration APIs are usable by a long-lived service and which operations write to disk (specifically SQLite `agent.db` at `getAgentDbPath()` for `AuthStorage`).
- Define the first version of the records and events in [contracts.md](./contracts.md), including unsupported capabilities.
- Mark the exact existing routes, stores, imports, and package boundaries that will be removed or replaced.
- Probe scoped command start/output/stop/terminal events for the Guest Shell contract, including exit codes, output bounds, reconnect and concurrent sessions. Determine the execution owner before defining a canonical shell projection.
- Probe stateless text and structured completion for every small-model caller, without creating a persisted conversation or retaining OpenCode-shaped routes/fallbacks.
- Verify concurrent cwd and resolved environment isolation, outer request versus model-turn completion, and raw event density/order. Decide any batching only after measuring the exercised SDK.
- Verify each supported credential format against that SDK's AuthStorage APIs. The refreshed host accesses OpenCode credentials through its secret-bearing credential API; the old auth-file assumption alone cannot define the one-time importer.

### Gate

A disposable probe produces a report covering every capability listed above. The report includes process exit behavior, session persistence paths, cwd ownership, pending approval cleanup, event ordering, and concurrent-session observations. Unknown behavior remains a gate, not a documented guarantee.

## M1: host boundary and VS Code removal

### Work

- Keep Web/PWA, Electron, Capacitor mobile, and the Guest SDK in the supported product matrix.
- Remove the VS Code extension from the supported build and release matrix. Remove its package, workflow, root scripts, documentation routes, and source references only after all references are inventoried.
- Preserve host ownership of filesystem, Git, worktree, PTY, browser broker, auth, pairing, relay, notification, voice, and guest sandbox code.
- Split `packages/web/server/lib/opencode/` by ownership before deleting it. Host configuration, project-directory validation, settings persistence, and server startup behavior must not disappear merely because OpenCode lifecycle code is removed.
- Implement the required M1 user-triggered, one-time credential importer with an explicit provider-by-provider feasibility gate and result. Unsupported provider formats report failure and prompt for re-authentication rather than promising conversion. It must not run at startup, read OpenCode configuration broadly, or remain as a runtime compatibility path.
- Add a Canonical Server health and capability response. It must report the Agent Service state without exposing OMP credentials or local absolute paths.

### Gate

The supported surface matrix has no VS Code release or runtime path. Web, Electron, mobile, and Guest flows still have named owners. The removed OpenCode lifecycle files are not imported by any retained runtime, and host-owned modules have replacement locations documented.

## M2: OMP Agent Service execution loop

### Work

- Add the proposed Bun Agent Service and its private OMP SDK integration.
- Implement the service supervisor, startup readiness, capability discovery, graceful shutdown, crash classification, and bounded restart policy.
- Implement canonical session creation, prompt submission, abort, history page loading, and event streaming.
- Add the session worker isolation chosen by the M0 probe. A worker must have an explicit cwd, session identity, lifecycle owner, and cleanup path.
- Resolve directory-scoped host environment overlays before worker spawn; keep secrets out of client records and logs, and prove cross-session isolation.
- Map Guest Shell lifecycle to the execution owner verified in M0. Preserve scoped running/ended snapshots, output/stop behavior and capability enforcement without an empty placeholder store.
- Implement the intentional Host-owned queue persistence cutover from atomic JSON to the target SQLite queue, preserving revisions/ordering, attachments, leases, corruption reporting and failure isolation.
- Implement the canonical message and part projector. Keep OMP transcript entries authoritative; store only OpenChamber metadata and an event cursor outside OMP.
- Implement model/catalog reads through OMP-backed service functions. Do not make the browser read OMP config files or auth stores.
- Implement canonical approval and question requests. Pending requests must survive reconnect but must be invalidated on worker restart unless the service can prove that the underlying request still exists.
- Implement the OMP host-tool bridge for OpenChamber-owned browser and control actions. Every host tool must pass the existing host authorization boundary.
- Implement MCP and skill operations only through the OMP-owned configuration/runtime boundary. Unsupported dynamic reload must be explicit rather than presented as successful empty state.

### Gate

A disposable service test can create a session in a temporary cwd, submit a prompt with a controlled test model or fixture, observe ordered canonical events, abort a running turn, load history, close the worker, and prove no event is published after closure. Approval and question requests fail closed and are removed or marked expired on restart.

## M3: client data-layer cutover

### Work

- Replace the OpenCode `SyncProvider` input with a Canonical Client backed by `/api/agent/v1`.
- Replace OpenCode-specific session, message, part, permission, question, status, and history stores with canonical records and event reducers.
- Keep the existing chat rendering components where their inputs can be supplied by canonical records. Remove OpenCode-only fields and tool-name assumptions rather than adding aliases.
- Replace composer submission, abort, retry, steering, follow-up, and queue dispatch with Canonical API commands.
- Replace provider, model, agent, MCP, and skills stores with service-backed contracts.
- Cut over Board session launch, Guest Shell observation/output/stop, and all small-model/utility-generation callers to their verified canonical contracts. Remove obsolete OpenCode calls rather than preserving compatibility aliases.
- Keep all host APIs on their current ownership path. Agent `read`/`write` tools must not replace user filesystem APIs.
- Add runtime generation and event cursor checks. A response from an old service connection must not mutate the new runtime.

### Gate

Web and Electron can create, stream, abort, reload, and reopen a session through the Canonical Client. A reconnect performs snapshot plus cursor recovery without duplicate message parts. The full affected UI package checks pass, and the old OpenCode client is no longer reachable from retained UI code.

## M4: OpenChamber orchestration features

### Work

Migrate one feature at a time, keeping its existing product behavior where the inventory says retain:

- Session Goals: use canonical turn completion and continuation commands.
- Session Assist: read canonical history and call the OMP-backed small-model service.
- Message Queue: keep server ownership, leases, captured attachments, idempotency, and ordered delivery.
- Routing: keep policy ownership in OpenChamber; send the selected OMP model/agent/thinking options through Canonical API.
- Project Context, Session Knowledge, and Agent Memory: inject through canonical prompt/message parts without duplicating the OMP transcript.
- Agent Todo: use the canonical todo contract and OMP task state where supported.
- Scheduled Tasks: reuse the scheduler and replace only the execution owner.
- Multi-run and Fusion: create canonical sessions and dispatch prompts through the service.
- Walkthrough and AI Git/PR generation: replace small-model calls with the OMP-backed completion function.
- Notifications and Linear progress: consume canonical lifecycle events.
- Guest `generate`: consume the canonical model service. Keep guest capabilities and filesystem/network/service grants unchanged.

### Gate

Each feature has a focused behavior check covering normal completion, failure, reconnect, and unsupported capability behavior. No feature reads OpenCode metadata, events, config, credentials, or route names.

## M5: retained surfaces and release cutover

### Work

- Finish Electron Agent Service startup, shutdown, packaging, and update handling.
- Finish Capacitor mobile reconnect, push-click session routing, approval/question recovery, and offline queue behavior.
- Exercise Quake show/hide/close and Mini Chat shortcut conflicts on the real desktop; preserve unsaved-buffer moves and capability-granted Guest file editors. Keep current explicit unsupported Guest surfaces until their planned implementation is proven.
- Revalidate isolated-space dispatcher, credentials, allowed-operation controls and escape attempts against the final OMP runtime on real Docker. A source/build check does not close this boundary.
- Finish Guest tool/service integration. Treat `contributes.tools` as presentation metadata unless the Agent Service explicitly registers an executable OMP custom tool.
- Remove residual OpenCode package dependencies, environment variables, config readers, route names, lifecycle code, UI copy, docs, tests, and release workflows.
- Remove VS Code artifacts and package references after the inventory confirms that no retained product surface imports them.
- Migrate only explicitly supported OpenChamber metadata. Run only the explicit one-time importer defined in M1; never silently import OpenCode transcripts or credentials. If a transcript import is desired, specify a separate versioned importer.
- Update user and developer documentation to describe OMP-only setup and the canonical service.

### Gate

A clean build of the supported product matrix completes without OpenCode or VS Code packages. Web, Electron, mobile, Guest, authentication, Git, terminal, browser, relay, queue, approval, and session recovery smoke scenarios have evidence. The release package starts the Canonical Server and Agent Service without a compatibility process.

## Cross-cutting evidence checklist

For every migration workflow task, record:

- affected owner and retained callers;
- routes, events, persisted files, and IDs changed;
- stale response and runtime-switch behavior;
- process and child-process cleanup evidence;
- approval and path-safety evidence;
- mobile or Electron evidence when the shared contract crosses that runtime;
- explicit unsupported behavior;
- removed OpenCode/VS Code references, where applicable.
