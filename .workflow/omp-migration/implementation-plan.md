# Implementation plan

This plan assumes the OMP-only boundary in [scope.md](./scope.md), the runtime topology in [architecture.md](./architecture.md), and the Canonical API draft in [contracts.md](./contracts.md). It is a migration plan, not a promise that the current repository already implements any item.

## Prerequisite: refresh upstream and re-audit the fork

The [latest-upstream rebaseline](../specs/upstream-rebaseline.md) has pinned and adopted the coherent application/runtime/dependency/build source. Its prerequisite closed at the source/document boundary under the recorded maintainer decision; unavailable W3 runtime certification remains unverified, not passed. Earlier selective-import exclusions do not constrain the adopted source, and inheriting the current OpenCode integration passes no OMP gate. M0 gate 03 remains the prerequisite to M1.

The source-aware additions are recorded in [scope.md](scope.md#refreshed-source-traceability). Use [development.md](../development.md) for actual checks and external blockers rather than treating source presence as acceptance. Historical investigations remain comparison inputs, not current runtime guarantees.


## Delivery rules

1. Make one runtime boundary authoritative before moving its callers. Do not add an OpenCode fallback or publish a two-engine mode.
2. Keep the existing OpenChamber host services in place while the Agent Service is introduced. Host behavior is not a reason to rewrite unrelated filesystem, Git, PTY, browser, relay, or authentication code.
3. Every process, network, and persistence contract needs an observable failure state. An unavailable agent, an empty result, and an unsupported capability are different outcomes.
4. Cut over each owner as soon as its replacement is proven. Do not keep dead compatibility code until the end of the project.
5. A milestone is complete only when its gate has evidence. A type-check or static read is not evidence for streaming, process teardown, approval safety, reconnect, or mobile behavior.

## M0: verify OMP capabilities and freeze the contract

### Work

- Use earlier 18.7.0 inspection only as a comparison reference. The chosen M0 runtime inputs are the pinned-source 18.8.9 artifacts in [source-install.json](m0/source-install.json), not same-version registry packages. Task 24 established their installable closure; task 08 must preserve immutable identities and re-establish application dependency owners. Reuse earlier SDK observations only for unchanged exercised owners.
- Run a disposable Bun probe against the SDK and exercise session creation, prompt lifecycle, abort, history loading, branch behavior, subagent events, approvals, questions, model discovery, MCP, skills, and shutdown.
- Measure whether multiple `AgentSession` instances can safely coexist in one service process. Do not infer this from TypeScript types.
- Measure the cost and cleanup behavior of one worker per session or project if shared-process concurrency is not safe.
- Confirm which OMP auth and model configuration APIs are usable by a long-lived service and which operations write to disk (specifically SQLite `agent.db` at `getAgentDbPath()` for `AuthStorage`).
- Define the first version of the records and events in [contracts.md](./contracts.md), including unsupported capabilities.
- Mark the exact existing routes, stores, imports, and package boundaries that will be removed or replaced.
- Establish Guest Shell command start/output/stop/terminal behavior, exit codes, output bounds and concurrent worker ownership through the SDK. The real execution owner is `BashTool` / native `executeBash` / `AsyncJobManager`, inspected and cancelled through worker-local `AgentSession`. Preserve the original reconnect and scope-isolation requirements: SDK agent-owner filtering is not project authorization, and canonical reconnect/output cursors and Guest capability enforcement require task 12 service evidence.
- Probe stateless text and structured completion for every small-model caller, without creating a persisted conversation or retaining OpenCode-shaped routes/fallbacks.
- Verify concurrent cwd and resolved environment isolation, outer request versus model-turn completion, and raw event density/order. Decide any batching only after measuring the exercised SDK.
- Verify each supported credential format against that SDK's AuthStorage APIs. The refreshed host accesses OpenCode credentials through its secret-bearing credential API; the old auth-file assumption alone cannot define the one-time importer.

### Gate

A disposable probe report must cover every SDK capability listed above, including process exit, persistence paths, cwd ownership, pending cleanup, event ordering and concurrency. Gate 03 compares those original requirements and the architecture risk table against actual artifacts and recorded maintainer decisions. Unknown required SDK behavior remains a gate, not a contract claim or automatic reassignment to M2. Service-only contracts are explicitly future M2 acceptance and cannot be passed using SDK fixtures. The original failed 100 MiB target is addressed only by the existing maintainer acceptance of the measured Linux limitation; it is not relabelled passed.

### Evidence boundaries for gate 03

The owning observation record is [development.md](../development.md#m0-fixture-evidence); detailed outcomes remain in the linked artifacts. This table preserves distinctions that matter to the M0 evidence-to-requirement review, without declaring that review passed.

| Required area | Existing evidence and unresolved boundary |
|---|---|
| Session lifecycle, history, branch, subagent and completion | Existing lifecycle/capability fixtures retain their observed outcomes. Raw lifecycle names are snake_case; the measured run had 31 events, 5 fragments, 2 `turn_end` and 1 terminal `agent_end`. Canonical dotted events, request IDs and resumable cursors are service design, not fixture observations. Controlled stateless text/structured/cancel/error operations do not prove every retained Host caller or a public endpoint. |
| Installed runtime and discovery | Task 24 exercised public factory creation/disposal, caller-owned AuthStorage close and native token/width/diff actions with `modelSelected=false`; no prompt was submitted. Its exit 1 and 12 denied discovery fetch attempts remain unchanged. Exact fetch arguments and Rust source-build equivalence are unestablished identity/observation limits, not newly invented gates. Long-lived auth/model configuration and unexercised discovery behavior must be compared with the original M0 requirement, not inferred from factory creation. |
| Credentials | Auth path cases prove isolated owned SQLite paths, not conversion. All seven stored-format records have `authenticationStatus=unavailable` and `migrationStatus=unknown`. The real-provider completion used an independently exported API key, not a stored AuthStorage record. Provider conversion, OAuth refresh and scopes, including the original Anthropic/OpenAI feasibility requirement, remain unresolved. A syntactic round trip is not successful migration. |
| MCP | Workspace stdio discovery/tool call, two tool-list refresh calls and manual reconnect were observed; reconnect created a new process and the replaced process exited. Changed-config reload remains `unknown`; HTTP/SSE, remote OAuth, automatic crash recovery and schema-change behavior were not exercised. Retained dynamic enable/disable and immediate service apply are not waived: task 12 must implement and prove them through the chosen OMP runtime boundary, while gate 03 separately accounts for missing required SDK facts. |
| Skills | Agent-directory globals and `.omp/skills` discovery/filtering plus explicit `buildSkillPromptMessage` → `AgentSession.prompt` were exercised. Direct slash expansion is unsupported only in that lower-level fixture. Full factory system-prompt generation and retained `.agents/skills` discovery remain unexercised SDK feasibility questions. CLI handling is an unexercised descriptive limitation, not an additional M0 gate: the original direct-SDK probe rejects CLI/RPC substitution. Host installation/service expansion remain required, and task 15 owns product Composer mentions/slash acceptance. |
| Permissions and restart | Direct fixture request/resolve/cancel and pending-worker cleanup retain their partial limits; complete built-in permission coverage is not established. The restart fixture had no cross-worker handle and recorded stale resolution unavailable, not rejected. Atomic approval/question CAS, request generations, restart expiry and reconnect recovery require task 10 service proof. |
| Workers and Shell | Dedicated-worker isolation passed; shared-process cwd/env and original 100 MiB idle target failed. ADR-03 preserves exact RSS and existing Linux limitation acceptance. Original non-Linux/macOS resource evidence is unavailable; gate 03 must account for it, not infer a waiver. Nine Guest Shell SDK probes and dedicated Linux runner orphan cleanup are not proof of Host PTY cleanup, cross-project authorization or service reconnect/retention. |
| Host risk probes and owner correction | Higher-authority `SCOPE-6.3` places the target Host Gatekeeper in M2; no target tool-interception Gatekeeper is implemented. Architecture's old blanket “M0” table header was contradictory. Gate 03 records this owner correction, not a passed primitive benchmark or silent deferral of SDK facts. `PROBE-05` retains 10,000 actual Host-boundary file accesses in M2 task 10/gate 23, with no speculative cache/TTL prescribed before measurement. Existing Host PTY does exist: `PROBE-06` tab-close complex-tree proof remains a reachable original M0 requirement with unavailable evidence. Per-tab process-group cleanup and whole-Host shutdown's 20-second tracker sweep are different owners; neither dedicated SDK runner cleanup nor Host shutdown alone substitutes for tab-close proof. |

Atomic snapshots, bounded replay, stream invalidation after headers and Host metadata revisions are intentional service/Host contracts in [contracts.md](contracts.md), not additional raw SDK acceptance. Rebaseline certification remains unverified, without moving retained requirements: Board provider grants/reads remain Host M1 and canonical launches M3 (`SCOPE-14.6`); isolated-space execution/security integration is M2 with real Docker release certification M5; Electron/mobile/updater and final Guest navigation certification remain M5. Existing Web/PWA navigation limits stay explicit and no replacement port is granted after unapproved self-navigation. No unavailable result is silently marked passed or required M0 fact silently deferred.


## M1: host boundary and VS Code removal

### Work

- Keep Web/PWA, Electron, Capacitor mobile, and the Guest SDK in the supported product matrix.
- Remove the VS Code extension from the supported build and release matrix. Remove its package, workflow, root scripts, documentation routes, and source references only after all references are inventoried.
- Preserve host ownership of filesystem, Git, worktree, PTY, browser broker, auth, pairing, relay, notification, voice, and guest sandbox code.
- Extract retained owners from `packages/web/server/lib/opencode/`, migrate their callers and remove extraction aliases. Host configuration, project-directory validation, settings persistence and startup behavior must not disappear with engine code. Keep still-used lifecycle/proxy execution owners until the coordinated M3 retirement; this is extraction, not final removal.
- M1 task 05 implements authenticated explicit user intent and provider-specific credential preflight. Service absence is an explicit unavailable result, not imported or successful conversion. Do not read/stage credential secrets before the real service is ready, write SDK AuthStorage from Node, or invent an early SDK worker. Original M0 provider feasibility remains gate-03 evidence; actual one-time handoff/write/read-reload acceptance belongs to task 22 with the real M2 service.
- Add Canonical Server health and capabilities without exposing credentials or absolute paths. Report an absent/unavailable Agent Service honestly; a running Host or advertised port is not agent readiness.

### Gate

Task 21 proves Host extraction, migrated retained callers, VS Code retirement, metadata ownership and truthful health/credential preflight, including absent-service refusal without secret access or staging. It does not require SDK credential import before the Bun owner exists or report migration passed. Actual provider-specific import/re-authentication results remain mandatory at task 22/M2 gate 23. Extracted Host modules do not import their old mixed-owner location. Still-used execution lifecycle/proxy code is retained until task 17; final retirement is M3, not a circular M1 prerequisite.

## M2: OMP Agent Service execution loop

### Work

- Add the proposed Bun Agent Service and its private OMP SDK integration.
- Implement the service supervisor, startup readiness, capability discovery, graceful shutdown, crash classification, and bounded restart policy.
- Implement canonical session creation, prompt submission, abort, history page loading, and event streaming.
- Add the session worker isolation chosen by the M0 probe. A worker must have an explicit cwd, session identity, lifecycle owner, and cleanup path.
- Resolve directory-scoped host environment overlays before worker spawn; keep secrets out of client records and logs, and prove cross-session isolation.
- Map Guest Shell lifecycle to the execution owner verified in M0. Preserve scoped running/ended snapshots, output/stop behavior and capability enforcement without an empty placeholder store.
- Implement the intentional Host-owned queue persistence cutover from atomic JSON to the target SQLite queue, preserving revisions/ordering, attachments, leases, corruption reporting and failure isolation.
- Implement the canonical message/part projector with OMP as sole transcript authority. Host task 20 owns goals, recap, context delivery cursors, pins and other operational metadata; the service only projects it. Service event cursors are distinct from Host delivery/metadata revisions, not a duplicate transcript.
- Implement model/catalog reads through OMP-backed service functions. Do not make the browser read OMP config files or auth stores.
- Implement approval and question records with CAS versions, epoch and worker-generation identity. Reconnect preserves pending requests; worker/service/Host restart expires old requests and removes their handles, never automatically replaying approval. Task 10 proves stale/competing resolution and single-winner execution.
- Implement the OMP host-tool bridge for OpenChamber-owned browser and control actions. Every host tool must pass the existing host authorization boundary.
- Implement MCP runtime apply/reconnect and skill discovery/expansion through the OMP boundary, with Host-owned catalog installation. Persisted MCP writes are not applied-runtime success; an apply failure reports failure and preserves the usable catalog. Unexercised dynamic SDK behavior remains explicit without dropping retained configuration, transport, OAuth or skill requirements.
- Migrate server execution consumers in task 22 before M2 gate 23 and task 17 activation. Queue dispatch, permissions, routing, goals/recap, notifications and small-model callers must not keep a second execution authority.
- Task 22 completes the explicit one-time credential handoff through the real Bun service: no startup import; privately obtain only user-selected available Host records/files, perform verified SDK AuthStorage write/read-reload, and return per-provider imported/unsupported/re-auth-required/unavailable results without secrets. M2 gate 23 requires those real results before task 17 removes importer and legacy readers. An unavailable provider is not imported; missing required acceptance stays open.

### Gate

A disposable service test can create a session in a temporary cwd, submit a prompt with a controlled model/fixture, observe ordered canonical events, abort, load history, close the worker and prove no publication after closure. Approval/question requests fail closed and expire on restart. Task 22 also proves explicit one-time handoff through the real SDK owner, AuthStorage write/read-reload and provider-specific imported or explicit unsupported/re-authentication results, without startup import/secret staging. Missing required handoff acceptance blocks gate 23 and final task 17; M1 preflight cannot substitute.

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
- After server and UI consumers, Host metadata migration and explicit credential handoff are ready, task 17 activates the OMP-only runtime and removes obsolete OpenCode lifecycle/proxy/config/auth readers, importer, dependencies, aliases and engine-specific callers. Preserve all retained product criteria and existing enterprise execution policy; no dual-engine release or deferred M5 cleanup path.

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
- Certify that task 17's OpenCode package, environment, config/auth/importer, route, lifecycle, UI, documentation, test and workflow retirement remains complete in release artifacts; M5 is not permission to keep those owners after M3.
- Certify absence of the VS Code extension artifacts/references retired in M1 while retaining supported external editor launching and theme import.
- Verify the completed Host-owned metadata migration and explicit one-time credential handoff results; do not rerun a removed importer or silently import OpenCode transcripts/credentials. A desired transcript importer requires separate versioned scope.
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
