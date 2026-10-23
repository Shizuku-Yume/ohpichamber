# OMP, OpenCode and OpenChamber adaptation audit

**Effort:** omp-opencode-comparison
**Task:** `omp-opencode-comparison/01`
**Audit type:** read-only source and existing-artifact comparison
**Audit start:** `main` = `f72010e3ef453a5218c3464b674b86c0ccc00a04` (the task text's `7b495354bd6c744f1c9ea924dd71af21afaf25d9` is an ancestor and was not the audit tip)
**Report scope:** implications only. This report makes no product decision and proposes no implementation.

## 1. Purpose and limits

This pass answers how the pinned OMP runtime, the pinned OpenCode package baseline and the current OhPiChamber fork differ in product and runtime semantics; which current behavior is inherited OpenCode adaptation rather than fork- or host-specific work; which capabilities need OMP-specific redesign instead of a mechanical port; which OMP capabilities are absent or unadapted here; and what adaptation, defer or retirement order follows.

Limits of this pass:

- No application run, build, test, probe or network access. Existing runtime receipts are cited only for the boundary they exercised.
- Source presence is not runtime acceptance. A file's existence is evidence class `S`; it is never recorded as `verified` behavior.
- OpenCode 2.0.25 is available as installed packages and `bun.lock` integrity, not as a proven repository checkout. Its revision is therefore `unproven`.
- The audit does not open `.env*`, credential stores, tokens or session data.
- The report does not extend the pass when a cell is unresolved. Unresolved cells carry a `GAP-*` id in the GAP register.

## 2. Revision and evidence ledger

Every citation in this report resolves through the aliases below.

| Alias | Identity and how it was proven | Location |
|---|---|---|
| `OMP` | `@oh-my-pi/pi-coding-agent` 18.8.9 from source revision `c9de2b02b997f37cc89639282ed35dec86f139e8`; authored fingerprint `b70a2f4afd9fd8fa9ec20094e9658b528e943eff52608d296af2366b80241ad1` over 3,499 files; proven by `.workflow/omp-migration/m0/source-identity.json` and `source-install.json`. The vendored directory holds 13 immutable tarballs, `copy-manifest.json` and `dependency-owners.json`; it is not a Git checkout. Citations resolve as `OMP:<member under package/src/>:<line>` inside `vendor/omp/c9de2b02/tarballs/oh-my-pi-pi-coding-agent-18.8.9.tgz`. The application patch changes only `src/sdk.ts`, `src/async/job-manager.ts` and `src/tools/bash.ts`. | `vendor/omp/c9de2b02/`; M0 artifacts |
| `OMP-AI` | `@oh-my-pi/pi-ai` 18.8.9 from the same pinned revision and artifact set. Citations resolve as `OMP-AI:<member under package/src/>:<line>` inside `vendor/omp/c9de2b02/tarballs/oh-my-pi-pi-ai-18.8.9.tgz`. The coding-agent package's `session/auth-storage.ts` is a re-export only; `OMP-AI:auth-storage.ts` is the implementation cited for credential semantics. | `vendor/omp/c9de2b02/tarballs/oh-my-pi-pi-ai-18.8.9.tgz`; `M0:source-install.json` |
| `OCS` | `@opencode/schema` 2.0.25, integrity `sha512-z064XvBBmdDQLCUYjBinGeCqdbDK3DZ49raFFrzE95eIth3qBkU2Q872VLSqCCLLgDcwKZuRNrwSFNtcc4xvcw==`; `bun.lock:1540`. The installed copy was read from the dependency-installed main checkout `/home/shizuku/Project/ohpichamber` at `node_modules/.bun/@opencode+schema@2.0.25/node_modules/@opencode/schema/dist`; the Lane E worktree has no `node_modules`. `repository` names `github.com/anomalyco/opencode`, but the package carries no commit identity, so `revision: unproven`. | `OCS:<file>:<line>` |
| `OCC` | `@opencode/client` 2.0.25, integrity `sha512-ur/LTb/1ANOskbGM3ZMDurpK8q0BIQuWys/MD499/Eodv6PzybM9hJY4cKJMyD2lNqu9v3349IsV1mj7gCdt7w==`; `bun.lock:1536`. The installed copy was read from the dependency-installed main checkout `/home/shizuku/Project/ohpichamber` under `node_modules/.bun/@opencode+client@2.0.25+11eac7cfbf53fc55/node_modules/@opencode/client/dist/promise`; the Lane E worktree has no `node_modules`. Revision `unproven`. | `OCC:<file>:<line>` |
| `OCP` | `@opencode/protocol` 2.0.25, integrity `sha512-A2fbaIc1OOIe9wE0P9dMFD7xxUXS0kyd635l4dS3jfvWAzNTNP24PPtMMw07NKfFh4neEmCh2vvZB5zKP383Fg==`; `bun.lock:1538`. The installed copy was read from the dependency-installed main checkout `/home/shizuku/Project/ohpichamber` under `node_modules/.bun/@opencode+protocol@2.0.25/node_modules/@opencode/protocol/dist` (60 generated route groups); the Lane E worktree has no `node_modules`. Revision `unproven`. | `OCP:<file>:<line>` |
| `OCB` | OhPiChamber at audit start `f72010e3e` (worktree `lane-e/omp-opencode-comparison`), plus adopted upstream application revision `1f9320062c9a3c70925cf3243f1ee0c6e5f16765`, metadata version 2.2.0, from `.workflow/upstream-baseline.json`. The historical v1.24.2 / `336e19248fa0bc0bd9d3bd843e1057d4e2cf62e7` inventory is comparison input, not current state. | `OCB:<path>:<line>` |
| `HIST` | Historical feature inventory at v1.24.2 / `336e19248...`; explicitly a dated baseline. | `.workflow/omp-migration/feature-inventory.md` |
| `DOC-SCOPE` / `DOC-ARCH` / `DOC-CON` / `DOC-IMPL` | Adopted design authorities under their document hierarchy. | `.workflow/omp-migration/{scope,architecture,contracts,implementation-plan}.md` |
| `DEV` | Development progress and accepted limits. | `.workflow/development.md` |
| `M0:<name>` | Existing M0 artifact under `.workflow/omp-migration/m0/`, cited for its exercised boundary only. | `.workflow/omp-migration/m0/<name>` |

Evidence classes used in every domain table: `S` = pinned source-level, `R` = existing runtime receipt naming only the exercised boundary, `I` = inference from a cited premise. `S/R` means the row has pinned-source evidence plus a separately cited existing receipt for only the exercised boundary; the receipt is named in the same row. Every `I` row carries a GAP id. `verified` is reserved for an `R` boundary that the cited receipt exercised exactly; an `S` row is `implemented-unverified` until such a receipt exists.

Identity conclusions:

- The registry package `@oh-my-pi/pi-coding-agent@18.8.9` is **not** the pinned source. `M0:sdk-install-identity.json` records 156 differing common source files and changed exercised owners. Matching version and integrity do not authorize reusing source results for the registry package.
- OpenCode 2.0.25 is a different architecture from the OpenCode 1.x SDK that the historical inventory described. It is event-sourced, uses durable event definitions and an inbox/delivery model, and its package exposes `agent`, `command`, `config`, `event`, `generate`, `integration`, `mcp`, `model`, `plugin`, `permission`, `provider`, `reference`, `websearch`, `session`, `skill`, `vcs` and `worktree` APIs (`OCC:api.d.ts:2-18`). The old `session.prompt`/`message.part.delta` mental model is historical, not the current package contract.

## 3. Direct answers

### 3.1 How do the three sides differ in product and runtime semantics?

OMP is an embeddable single-process agent runtime. `createAgentSession` owns the agent loop, transcript, compactions, tools, model registry and credentials; `AgentSession.prompt`, `steer`, `followUp`, `abort`, `fork`, `branch`, `compact` and `switchSession` are in-process methods (`OMP:sdk.ts:534`, `OMP:session/agent-session.ts:7266`, `:8237`, `:8260`, `:9692`, `:9949`, `:11790`). Turn and request completion are distinct: `turn_end` closes one model cycle, while `agent_end` carries `isTerminal` and `awaitingAsyncWork` (`OMP:session/agent-session-events.ts:15-31`; `OMP:session/agent-session.ts:5030-5064`). The canonical service preserves that distinction in `turn.completed` and `run.*` (`OCB:packages/agent-service/src/worker/projection.ts:420-469`; `OCB:packages/agent-contract/src/events.ts:43-84`).

OpenCode 2.0.25 is a session-service contract: sessions, inbox deliveries, permissions, events, credentials and catalogs are distinct schema families with durable event envelopes and generated route groups (`OCS:session.d.ts:31`; `OCS:session-inbox.d.ts:3`; `OCS:event.d.ts:23`; `OCP:groups/`). Its permission reply vocabulary is `once | always | reject` (`OCS:permission.d.ts:38`), and its ruleset effect vocabulary is `allow | deny | ask` (`OCS:permission.d.ts:297-311`). Its session schema includes parent/fork identity, agent/model selection, revert and metadata (`OCS:session.d.ts:31-120`; `OCS:session-revert.d.ts:2`; `OCS:session-fork.d.ts:3`).

OhPiChamber is neither. It is a Host Gateway plus a Bun Agent Service plus per-root SDK workers. The Host owns filesystem, Git, worktrees, PTY, auth, pairing, relay, notifications, voice, Board and Guest boundaries; the service owns OMP execution and canonical projection; OMP alone owns the transcript (`DOC-ARCH` ADR-01–ADR-05; `DOC-CON` core invariants 1-6). Its canonical event vocabulary is transport-normalized (`stream.invalidated`, `run.*`, `turn.*`, `approval.*`, `question.*`) rather than either engine's native vocabulary (`DOC-CON` "Canonical event vocabulary").

### 3.2 Which OpenChamber behavior is inherited OpenCode adaptation, and which is fork- or host-specific?

Inherited OpenCode adaptation, even where the UI was restyled: chat/sync/event reducers, session/message/part records, tool cards and tool-name assumptions, permission/question interaction UI, slash-command and skill delivery, provider/model/agent/MCP settings, the durable message-queue shape, small-model calls, and Guest Shell observation. The historical inventory names these dependencies explicitly (`HIST` §§4-6, 10, 13, 16). The current source has replaced most of their data plane with canonical records, but the interaction shapes remain recognizable adaptations.

Fork-specific OpenChamber behavior: goals, assist, walkthrough, routing policy, multi-run/fusion, scheduled tasks, project context/plans, session knowledge/pins, folders/retention, multi-session sidebar, and the OpenChamber-specific small-model callers. The inventory classifies them as OpenChamber assets (`HIST` §§10-12).

Host-specific behavior (ownership independent of the agent engine): filesystem, the Git/worktree service, PTY, browser broker, auth/passkey, pairing, relay/tunnels, notifications, TTS/STT, Board/source control, environments, Quake and the Guest SDK. Ownership is separate from execution lineage: OMP task-isolation/worktree semantics are OMP-required (WS-06), while the Host Git/worktree service is host-specific; isolated spaces are Host-owned and unreleased, while their current runtime is inherited OpenCode (DF-04). These boundaries follow `DOC-SCOPE` "Preserving host infrastructure" and the `DOC-ARCH` module ownership matrix.

OMP-native requirements, not ports: approval-mode semantics, model roles/fallbacks, agent definitions and spawn policy, task isolation/worktrees, memory backends, plan mode, checkpoint/rewind, RPC/ACP/print modes, plugin and extension hooks, and MCP prompt/resource behavior. Treating these as OpenCode features would reproduce the wrong abstraction.

### 3.3 Which capabilities require OMP-specific redesign rather than a mechanical port?

The P0/P1 register in §7 names them individually. The structural reasons are:

1. **Completion model.** Copying OpenCode's `session.idle`/`session.busy` or a single "turn completed" signal would violate the OMP invariant: `turn_end` is not outer-run completion (`OMP:session/agent-session-events.ts:15-31`; `DOC-ARCH` "Turn lifecycle semantics"). The canonical service already projects `run.*` and `turn.*` separately (`OCB:packages/agent-service/src/worker/projection.ts:420-469`).
2. **Approval authority.** OMP's approval modes are user-facing policy (`always-ask`, `write`, `yolo`) with per-tool `allow|deny|prompt` (`OMP:tools/approval.ts:16-80`); OpenCode's model is `once|always|reject` over permission requests (`OCS:permission.d.ts:13-38`); OhPiChamber's canonical model is fail-closed CAS with epoch/generation expiry (`OCB:packages/agent-service/src/interaction/manager.ts:70-260`). A mechanical port in either direction changes who is allowed to execute what.
3. **State ownership.** OMP writes JSONL session files and artifacts (`OMP:session/session-storage.ts:1282`; `OMP:session/session-paths.ts:215`), OpenCode has its own event log/inbox, and OhPiChamber has Host SQLite metadata plus queue (`OCB:packages/web/server/lib/host/metadata-sqlite.js`; `OCB:packages/web/server/lib/message-queue/sqlite-store.js:56-64`). Any second transcript or second queue is a design violation (`DOC-ARCH` ADR-04).
4. **Process isolation.** OMP's SDK carries process-level cwd/env/registry state; the M0 isolation artifact passed dedicated workers and failed every exercised shared-process cwd/env mode (`M0:isolation-artifact.json`). OhPiChamber therefore runs one dedicated worker per active root session (`OCB:packages/agent-service/src/supervisor/workers.ts:80-161`), which is not an OpenCode proxy-and-port model.

### 3.4 Which OMP capabilities are absent or unadapted in OpenChamber?

The list is in §6. The largest clusters are: OMP's TUI/print/RPC/ACP surfaces; plan mode and checkpoint/rewind; model roles and retry-fallback policy beyond model selection; provider account pools, health and usage through the native owner; MCP prompts/resources; OMP's extension/hook/plugin semantics; memory backends; advisor/autolearn/autoresearch/cleanse loops; and OMP's eval/computer/IDA/LSP/debug/security-scan tools. Some are intentionally replaced by host-owned equivalents (goals, routing, browser, voice, notifications); those are marked "host-owned unchanged", not gaps.

### 3.5 What adaptation, defer or retirement order follows?

The P0-P3 register in §7 is ordered by the invariant it protects, not by code size. P0 work protects the canonical contract and service invariants: run/turn completion, approval authority, request generation expiry, bounded replay, queue delivery, transcript authority and credential isolation. P1 work protects retained workflows during an OMP-only port: worker crash recovery, environment allowlisting, MCP/skills apply, fork/branch/revert, task isolation, provider restore errors and process cleanup. P2 is parity work for retained M4/M5 surfaces. P3 is explicit retire/defer with no migration work.

## 4. Domain matrices

**Origin labels.** `Origin` describes the lineage of the requirement or interaction shape, not the present owner. `inherited-OpenCode` = the product shape came from OpenCode; `OpenChamber fork` = a feature this fork added; `host-specific` = a Host capability independent of the engine; `OMP-required` = the semantics come from OMP and need redesign. `Current status`, `Adaptation` and the path columns describe the present owner. For example, the queue and the skill catalog have OpenCode lineage while the Host and OMP own their present data planes.

### 4.1 Domain 1 — Agent, session, model and delegation

**Semantics**

| ID | Capability | OMP semantics | OMP evidence | OpenCode semantics | OpenCode evidence | OpenChamber behavior | OpenChamber path | Class | Divergence |
|---|---|---|---|---|---|---|---|---|---|
| AG-01 | Root identity | One `AgentSession` per root; registry entry `Main` per generation; private registry injectable | `OMP:sdk.ts:811`, `:2203`, `:4063` | `Session.Info` has a brand ID, optional parent and fork identity | `OCS:session.d.ts:31` | Canonical UUID plus OMP session id/worker generation; one worker per active root | `OCB:packages/agent-service/src/worker/session.ts:196`; `OCB:packages/agent-service/src/sessions/registry.ts:43` | S | Canonical identity is Host-visible; OMP identity stays worker-private |
| AG-02 | Agent/profile selection | Agent definitions carry model, spawn policy, efforts, advisor and permissions | `OMP:task/types.ts:227-242`; `OMP:discovery/agents.ts:177` | `Agent.Info` carries id/name/model and request settings | `OCS:agent.d.ts:10-70` | Native `AgentCatalog`; model/allowed-tools/permission preset; no second catalog | `OCB:packages/agent-service/src/worker/catalog-agents.ts:77`; `DOC-CON` "Agent roster" | S | OMP agent definitions are richer than the canonical roster; unexposed fields are GAP-02 |
| AG-03 | Subagent spawn and depth | `task` tool; `spawns`, `maxRecursionDepth`, task/isolation settings | `OMP:task/types.ts:218-242`; `OMP:task/settings.ts:25` | No equivalent task-first subagent contract in this package surface | `OCS:session.d.ts:31` (parent only) | Canonical `Subagent` projection and child navigation; children stay in parent worker | `OCB:packages/ui/src/api/canonicalClient.ts:216-220`; `OCB:packages/agent-service/src/worker/projection.ts` | S | OMP spawn policy is not projected as a canonical control; GAP-02 |
| AG-04 | Model roles | 15 built-in roles (`default`, `smol`, `slow`, `vision`, `plan`, `commit`, `tiny`, `memory`, `task`, `advisor`, `image`, `web`, `speech`, `dictation`, `judge`) | `OMP:config/model-roles.ts:56-90` | Provider/model/variant selection on session and agent | `OCS:session.d.ts:31`; `OCS:model.d.ts:76` | Canonical model list plus thinking level; Host routing policy owns intent selection | `OCB:packages/agent-service/src/worker/catalogs.ts`; `OCB:packages/ui/src/api/canonicalClient.ts` | S | OMP role semantics are mostly unexposed; canonical model selection is not role-complete (GAP-03) |
| AG-05 | Model fallback/retry | Role fallback chains, retry-fallback application and re-clamping | `OMP:session/retry-fallback-chains.ts`; `OMP:session/agent-session.ts:10103` | Retry represented as an event/state in the session contract | `OCS:session-event.d.ts` (`session.retry.scheduled`) | Canonical `run.failed` and retry are not a separate public policy surface | `OCB:packages/agent-contract/src/events.ts:43-84` | I | OMP fallback behavior is not a canonical contract; GAP-04 |
| AG-06 | Turn vs run completion | `turn_end` closes a model cycle; `agent_end.isTerminal` closes the outer request; `awaitingAsyncWork` keeps it open | `OMP:session/agent-session-events.ts:15-31`; `OMP:session/agent-session.ts:5030-5064` | `session.execution.started/succeeded/failed/interrupted` plus step events | `OCS:session-event.d.ts` | Canonical `run.*` and `turn.*`; projection treats non-terminal/async ends as not complete | `OCB:packages/agent-service/src/worker/projection.ts:420-469`; `OCB:packages/agent-contract/src/events.ts:43-51` | S | Correctly redesigned; no mechanical equivalence |
| AG-07 | Steering, follow-up, abort | In-process `steer`, `followUp`, `abort` | `OMP:session/agent-session.ts:8237`, `:8260`, `:9692` | Session inbox delivery modes `steer`/`queue`; separate control routes | `OCS:session-inbox.d.ts:3`; `OCP:groups/` | Canonical `/steer`, `/follow-up`, `/runs/:id/abort` with idempotency and epoch checks | `OCB:packages/ui/src/api/canonicalClient.ts:273-285`; `OCB:packages/agent-service/src/worker/projection.ts` | S | Canonical shape is closer to OpenCode's inbox than to OMP's method calls; the semantics are OMP |
| AG-08 | Session switch and plan mode | `switchSession`; plan-mode guard and plan approval | `OMP:session/agent-session.ts:11357`; `OMP:tools/plan-mode-guard.ts` | Session selection is a route; no plan-mode contract in the package surface | `OCS:session.d.ts:31` | Canonical reopen/switch exists; plan mode is absent | `OCB:packages/agent-service/src/sessions/registry.ts` | S | OMP plan mode is an unadapted capability (GAP-05) |
| AG-09 | Child ownership | Subagents share the parent worker/registry and event bus | `OMP:session/agent-session.ts` (subagent event bus); `M0:isolation-artifact.json` | Child sessions are parent-linked records | `OCS:session.d.ts:31` | Child sessions are projected under the root worker generation; a worker replacement invalidates old child handles | `OCB:packages/agent-service/src/sessions/registry.ts:473`; `OCB:packages/agent-service/src/interaction/manager.ts:101` | S/R | Bounded by M0/M2 evidence, not a full cross-platform proof |

**Disposition**

| ID | Origin | Current status | Adaptation | Final target | Risk | Migration implication |
|---|---|---|---|---|---|---|
| AG-01 | OMP-required | implemented-unverified | Contract or projection redesign | Canonical root id mapped to one OMP session and worker generation; OMP identity private | P0 | Preserve one-worker-per-root; no shared registry across roots (`DOC-ARCH` ADR-03; `M0:isolation-artifact.json`) |
| AG-02 | OMP-required | implemented-unverified | Contract or projection redesign | Native agents exposed as canonical agents with model/allowed-tools/preset only | P1 | Do not clone OMP agent definitions into a second catalog; unexposed fields stay private (`DOC-CON`) |
| AG-03 | OMP-required | implemented-unverified | Contract or projection redesign | Canonical subagent records with parent/tool-call identity; OMP task remains execution owner | P1 | Child projection must not parse legacy tool output (`DEV` Task 32) |
| AG-04 | OMP-required | implemented-unverified | Contract or projection redesign | Canonical model records; Host routing owns policy; no second role system | P2 | OMP roles are a source for routing, not a public compatibility surface |
| AG-05 | OMP-required | absent | OMP-native replacement | Keep OMP fallback inside the worker; expose only terminal outcomes | P2 | A canonical retry API is not implied; GAP-04 |
| AG-06 | OMP-required | implemented-unverified | Contract or projection redesign | `turn.completed` never means run completion; terminal run is authoritative | P0 | Any UI/queue/notification completion must key off `run.completed`, not `turn.completed` |
| AG-07 | OMP-required | implemented-unverified | Contract or projection redesign | Canonical control commands with idempotency and run binding | P1 | OpenCode inbox semantics are not a compatibility contract |
| AG-08 | OMP-required | absent | Deferred | OMP plan mode and checkpoint/rewind if retained by M4/M5 | P2 | No mechanical port from OpenCode plan/approval UI; GAP-05 |
| AG-09 | OMP-required | implemented-unverified | Contract or projection redesign | Child sessions owned by the root worker; replacement expires old handles | P0 | Preserve generation/epoch checks on child reads (`OCB:packages/agent-service/src/interaction/manager.ts:101-121`) |

### 4.2 Domain 2 — Project, workspace and context

**Semantics**

| ID | Capability | OMP semantics | OMP evidence | OpenCode semantics | OpenCode evidence | OpenChamber behavior | OpenChamber path | Class | Divergence |
|---|---|---|---|---|---|---|---|---|---|
| WS-01 | Working directory | `cwd` binds discovery and tools; explicit per session | `OMP:sdk.ts:534-538` | Session has a project and location context | `OCS:session.d.ts:31`; `OCS:location.d.ts:3-49` | Worker cwd is the authorized workspace/session directory | `OCB:packages/agent-service/src/worker/session.ts:196-197` | S | One cwd per worker; relocation requires worker replacement (`DOC-CON` branch/relocation) |
| WS-02 | Additional directories | `additionalDirectories` expands multi-root discovery | `OMP:sdk.ts:536-538` | Project/workspace ID mapping is service-owned | `OCS:project.d.ts:36`; `OCS:workspace.d.ts` | Canonical `workspaceId`/`projectId`; no per-session additional-roots control | `OCB:packages/ui/src/api/canonicalClient.ts:246-255` | S | OMP multi-root is not exposed; GAP-06 |
| WS-03 | Project instructions | Discovers `AGENTS.md`, `CLAUDE.md`, `GEMINI.md` and agent-dir variants with depth scope | `OMP:capability/context-file.ts:4-44`; `OMP:discovery/agents.ts:297` | Instructions have hashes/deltas and a session instruction event | `OCS:instruction.d.ts:3-12`; `OCS:session-event.d.ts` (`session.instructions.updated`) | Host-owned context/obligatory messages; canonical prompt assembly | `OCB:packages/web/server/lib/context-obligatory`; `OCB:packages/ui/src/lib/contextObligatoryMessages.ts` | S | Two discovery owners; Host must not duplicate OMP context files without an explicit contract (GAP-07) |
| WS-04 | Imports/rules | At-imports, rules, rule buckets and source precedence | `OMP:discovery/at-imports.ts`; `OMP:capability/rule.ts`; `OMP:capability/rule-buckets.ts` | Instruction delta model only | `OCS:instruction.d.ts` | Project context/knowledge; no OMP rule-bucket projection | `OCB:packages/web/server/lib/project-context`; `OCB:packages/web/server/lib/session-knowledge` | S | OMP rule semantics are unadapted; GAP-07 |
| WS-05 | Memory | Backends: `off`, `local`, `hindsight`, `mnemopi`, `sharpshooter`; recall/retain/reflect tools | `OMP:memory-backend/settings.ts:12-17`; `OMP:tools/memory-recall.ts:18` | No native memory contract in this package surface | `OCS:index.d.ts` (no memory module) | Host-owned agent memory CRUD and prompt injection | `OCB:packages/web/server/lib/agent-memory`; `OCB:packages/ui/src/stores/useAgentMemoryStore.ts` | S | Two memory systems; canonical contract does not choose between them (GAP-08) |
| WS-06 | Worktree binding | Task isolation and worktree settings; session worktree state | `OMP:task/settings.ts:38-205`; `OMP:session/session-worktree.ts` | Worktree API is separate | `OCS:worktree.d.ts`; `OCC:client.d.ts:218` | Host Git/worktree owner; session workspace binding | `OCB:packages/web/server/lib/git`; `OCB:packages/agent-service/src/sessions/registry.ts` | S | OMP task worktrees and Host worktrees are distinct owners; GAP-09 |
| WS-07 | Workspace identity | No opaque workspace entity; cwd and agent dir | `OMP:sdk.ts:534-538` | Project ID is a branded entity | `OCS:project.d.ts:36` | Canonical opaque `projectId`/`workspaceId` resolved by Host | `OCB:packages/ui/src/api/canonicalClient.ts:246-255` | S | OhPiChamber adds an authorization layer absent from OMP; this is intentional |
| WS-08 | Environment overlays | Settings provenance includes an environment layer; tool shells start from a cached, filtered spawn environment rather than live `process.env` | `OMP:config/settings.ts:64`; `OMP:session/bash-runner.ts:98-103` | Connection/location context only | `OCS:connection.d.ts`; `OCS:location.d.ts` | Host environment overlays resolved before worker spawn; worker receives a copy of the service environment plus the overlay | `OCB:packages/web/server/lib/environment`; `OCB:packages/agent-service/src/supervisor/workers.ts:216-220` | S | Only the internal token is removed; other Host variables remain inherited (GAP-10) |
| WS-09 | Project context/plans | No equivalent | `OMP` source has no plan/notes store of this shape | No equivalent | `OCS:index.d.ts` | Notes, plans and project todos under Host storage | `OCB:packages/web/server/lib/project-context`; `OCB:packages/ui/src/components/session/project-context` | S | Fork-specific; keep Host ownership |
| WS-10 | Session knowledge/pins | No equivalent | `OMP:session/context-notes.ts` is a different, session-local note mechanism | No equivalent | `OCS:index.d.ts` | Knowledge delivery receipts, pinned context, compaction re-injection | `OCB:packages/web/server/lib/session-knowledge` | S | Fork-specific; injection must remain canonical prompt/part work |

**Disposition**

| ID | Origin | Current status | Adaptation | Final target | Risk | Migration implication |
|---|---|---|---|---|---|---|
| WS-01 | OMP-required | implemented-unverified | Host-owned unchanged | One authorized cwd per worker; relocation is an explicit worker transition | P1 | No shared cwd across roots (`DOC-ARCH` ADR-03) |
| WS-02 | OMP-required | absent | Deferred | Multi-root only if a retained surface proves it | P2 | Do not infer it from OpenCode project IDs; GAP-06 |
| WS-03 | OMP-required | implemented-unverified | Contract or projection redesign | One instruction owner; canonical prompt assembly references it | P1 | Avoid a second context-file expander; GAP-07 |
| WS-04 | OMP-required | absent | OMP-native replacement | OMP rules remain engine inputs, not a canonical catalog | P2 | Do not port rule buckets into Host settings |
| WS-05 | OMP-required | implemented-unverified | Host-owned unchanged | Host memory UI; OMP memory only if explicitly selected | P2 | Two backends are not a compatibility layer; GAP-08 |
| WS-06 | OMP-required | implemented-unverified | Host-owned unchanged | Host worktree owner; OMP task isolation stays engine-internal | P1 | No second worktree registry; GAP-09 |
| WS-07 | host-specific | implemented-unverified | Contract or projection redesign | Opaque Host authorization scope | P0 | Client paths must never expose host absolutes (`DOC-CON` invariant 6) |
| WS-08 | host-specific | implemented-unverified | Contract or projection redesign | Resolved environment before spawn; allowlist excludes Host secrets | P0 | Hardening 04 owns the allowlist; current code copies `process.env` and deletes only the internal token (GAP-10) |
| WS-09 | OpenChamber fork | implemented-unverified | Host-owned unchanged | Host-owned plans/notes with atomic writes | P2 | Not OMP transcript; do not mirror into session files |
| WS-10 | OpenChamber fork | implemented-unverified | Contract or projection redesign | Host metadata and canonical prompt parts; no second transcript | P1 | Re-injection after compaction must stay explicit |

### 4.3 Domain 3 — Tools, approval and security

**Semantics**

| ID | Capability | OMP semantics | OMP evidence | OpenCode semantics | OpenCode evidence | OpenChamber behavior | OpenChamber path | Class | Divergence |
|---|---|---|---|---|---|---|---|---|---|
| TL-01 | Built-in tool inventory | 30 public tools plus hidden `yield`, `goal`, `think`; MCP tools use `mcp__` | `OMP:tools/builtin-names.ts:1-45` | Tool calls are session message content; permission source points at a tool call | `OCS:permission.d.ts:7-13` | Canonical tool parts with native display; Host/worker policy | `OCB:packages/ui/src/components/chat` (ToolPart); `OCB:packages/agent-service/src/worker/host-tool.ts` | S | Names and availability are OMP-native; UI must not keep an OpenCode whitelist |
| TL-02 | Tool state and diff output | Tool execution events and structured results | `OMP:session/agent-session-events.ts`; `OMP:tools/tool-result.ts` | Step/tool events in session stream | `OCS:session-event.d.ts` | Canonical `tool.started/completed` and ToolPart states | `OCB:packages/agent-contract/src/events.ts`; `OCB:packages/agent-service/src/worker/projection.ts` | S | Canonical terminal states must cover denied/cancelled, not only success/error |
| TL-03 | Approval tiers/modes | `always-ask`, `write`, `yolo`; per-tool `allow`/`deny`/`prompt`; missing settings fail closed | `OMP:tools/approval.ts:16-80` | `once`/`always`/`reject`; rulesets `allow`/`deny`/`ask` | `OCS:permission.d.ts:38`, `:297-311` | Host approval policy plus canonical approval records | `OCB:packages/web/server/lib/host/approval-policy-store.js`; `OCB:packages/agent-service/src/interaction/manager.ts:70` | S | The three vocabularies are not equivalent; canonical fail-closed policy is authoritative (GAP-11) |
| TL-04 | Approval lifecycle | Approval request/response around tool execution | `OMP:extensibility/extensions/wrapper.ts:247-396`; `M0:public-factory-permissions.json` | Permission request/reply with source and resources | `OCS:permission.d.ts:13-38` | CAS version, epoch/generation, expiry, single-winner execution | `OCB:packages/agent-service/src/interaction/manager.ts:185-223` | S/R | Canonical CAS is stricter than either engine |
| TL-05 | Ask/question | `ask` tool with options, multi-select, timeout and recommended option | `OMP:tools/ask.ts:1-80` | Separate question prompt/answer schema | `OCS:question.d.ts:3-15` | Canonical question request/resolution distinct from approval | `OCB:packages/agent-service/src/interaction/manager.ts:238-260` | S | OMP ask timeout semantics are not fully projected (GAP-12) |
| TL-06 | Host gatekeeper | OMP tools mutate with the process's authority; no Host path jail | `OMP:tools/bash.ts`; `OMP:tools/write.ts` | Service-side permission only | `OCS:permission.d.ts` | Host Gatekeeper remains authoritative for path/command/Git/PTY | `DOC-ARCH` ADR-05; `OCB:packages/web/server/lib/security` | S | OMP approval is not a substitute for Host authorization |
| TL-07 | Tool interception | Extension wrapper, hooks and custom tools | `OMP:sdk.ts:662`; `OMP:extensibility/extensions/wrapper.ts` | Plugin/tool contracts distinct | `OCS:plugin.d.ts` | Worker host-tool bridge plus native policy extension | `OCB:packages/agent-service/src/worker/host-tool.ts`; `OCB:packages/agent-service/src/worker/native-policy-descriptor.ts` | S | Host tool authority is checked before invocation; engine hooks cannot widen it |
| TL-08 | Shell/PTY ownership | `bash` tool and `AsyncJobManager`; interactive PTY separate | `OMP:tools/bash.ts`; `OMP:async/job-manager.ts`; `M0:guest-shell.json` | Shell API is service-owned | `OCS:shell.d.ts:8-39`; `OCC:client.d.ts:208` | Host PTY owns interactive terminals; Guest Shell uses worker OMP bash | `DOC-SCOPE` SCOPE-16.1; `OCB:packages/agent-service/src/worker/shell.ts` | S/R | Two shell owners by design; no fake unified shell store |
| TL-09 | Browser ownership | OMP has a browser tool and relay/tab supervisor | `OMP:tools/browser.ts`; `OMP:tools/browser/relay/server.ts` | No browser contract in schema | `OCS:index.d.ts` | Host Browser Broker/CDP and Electron pane | `OCB:packages/web/server/lib/browser-control`; `DOC-SCOPE` SCOPE-9.2 | S | OMP browser is not adapted; Host broker remains authoritative |
| TL-10 | Environment allowlist | Tool shells start from a cached, filtered spawn environment, not live `process.env` | `OMP:session/bash-runner.ts:98-103`; `OMP:exec/non-interactive-env.ts:6` | Connection-scoped | `OCS:connection.d.ts` | Worker environment is `{...process.env, ...input.env}` with only `OHPICHAMBER_INTERNAL_SECRET` deleted | `OCB:packages/agent-service/src/supervisor/workers.ts:216-220` | S | Host secrets other than the internal token remain inherited; the allowlist is a hardening 04 gap (GAP-10) |
| TL-11 | Extension/MCP tool trust | MCP tools and extension tools enter the same loop with approval policy | `OMP:mcp/tool-bridge.ts`; `OMP:extensibility/extensions/wrapper.ts` | Plugin/MCP APIs separate | `OCS:mcp.d.ts`; `OCS:plugin.d.ts` | Canonical plugin/MCP catalogs plus Host gatekeeper | `OCB:packages/agent-service/src/worker/mcp.ts`; `OCB:packages/web/server/lib/guests` | S | MCP/plugin trust is broader than the Guest manifest boundary; do not conflate |

**Disposition**

| ID | Origin | Current status | Adaptation | Final target | Risk | Migration implication |
|---|---|---|---|---|---|---|
| TL-01 | OMP-required | implemented-unverified | Contract or projection redesign | OMP-native tool identity in canonical parts; no OpenCode whitelist | P1 | Remove tool-name assumptions where retained UI still encodes them |
| TL-02 | OMP-required | implemented-unverified | Contract or projection redesign | Canonical terminal states including denied/cancelled | P0 | No silent success on missing tool result |
| TL-03 | OMP-required | implemented-unverified | Contract or projection redesign | Host fail-closed policy; OMP approval is one input | P0 | Do not map `yolo` or `always` into an implicit allow (`DOC-CON` invariant 3) |
| TL-04 | OMP-required | implemented-unverified | Contract or projection redesign | CAS + epoch/generation expiry; single winner | P0 | Preserve `M0:restart-pending.json` limitation: no cross-worker handle |
| TL-05 | OMP-required | implemented-unverified | Contract or projection redesign | Question separate from approval; explicit expiry | P1 | Ask timeout/recommended behavior needs a GAP-12 answer |
| TL-06 | host-specific | implemented-unverified | Host-owned unchanged | Host Gatekeeper authoritative for every mutation | P0 | PROBE-05 remains owed (`DOC-IMPL` gate 23) |
| TL-07 | OMP-required | implemented-unverified | Contract or projection redesign | Host-authorized host tools; engine hooks stay worker-local | P0 | Never let an extension bypass worker authorization |
| TL-08 | host-specific | implemented-unverified | Host-owned unchanged | Host PTY and worker bash keep separate identities | P1 | Guest Shell must not publish an empty lifecycle store (`DOC-SCOPE` SCOPE-16.1) |
| TL-09 | host-specific | implemented-unverified | Host-owned unchanged | Host browser broker; OMP browser deferred | P2 | Do not expose OMP browser as a second broker |
| TL-10 | host-specific | implemented-unverified | Contract or projection redesign | Allowlisted worker environment; no Host secret or internal token | P0 | Current source deletes the internal token but inherits the rest of `process.env`; hardening 04 owns the proof (`OCB:packages/agent-service/src/supervisor/workers.ts:216-220`) |
| TL-11 | OMP-required | implemented-unverified | Contract or projection redesign | MCP/plugin tools through canonical catalogs and Host authorization | P1 | Keep Guest capability checks independent of MCP tool trust |

### 4.4 Domain 4 — Provider, auth and settings

**Semantics**

| ID | Capability | OMP semantics | OMP evidence | OpenCode semantics | OpenCode evidence | OpenChamber behavior | OpenChamber path | Class | Divergence |
|---|---|---|---|---|---|---|---|---|---|
| PV-01 | Model registry | `ModelRegistry` with providers, catalog, discovery and availability | `OMP:config/model-registry.ts:297`; `OMP:session/auth-storage.ts:23` | Provider/model/variant schemas | `OCS:provider.d.ts:96-170`; `OCS:model.d.ts:76-161` | Service model catalog; Host provider catalog | `OCB:packages/agent-service/src/worker/catalogs.ts`; `OCB:packages/ui/src/stores/useAgentsStore.ts` | S | OMP availability filtering and OpenCode catalog shape differ; canonical is the broker |
| PV-02 | Custom providers | Model config with base URL, protocol, headers and discovery | `OMP:config/models-config.ts`; `OMP:config/model-provider-discovery.ts` | Provider request/info with settings/overlays | `OCS:provider.d.ts:147-170` | Canonical provider configuration with write-only headers | `OCB:packages/agent-service/src/worker/provider-oauth.ts`; `DOC-CON` "Provider accounts" | S | Secret fields must remain write-only; no header readback |
| PV-03 | Auth storage | SQLite `agent.db`, multi-account, OAuth refresh, usage, pools | `OMP-AI:auth-storage.ts:87-268`; `M0:auth-paths.json` | Credential schema and credential events | `OCS:credential.d.ts`; `OCS:event-manifest.d.ts` (`credential.updated/switched`) | Worker-owned AuthStorage; Host never writes it at startup | `OCB:packages/agent-service/src/worker/native-runtime.ts`; `DOC-ARCH` ADR-01 | S/R | Handoff is explicit and one-time; M0 provider limits remain |
| PV-04 | Credential precedence | Runtime → config → OAuth → login key → env → stored key | `OMP-AI:auth-storage.ts:6-9` | Credential selection is evented/service-owned | `OCS:credential.d.ts` | Canonical provider accounts/OAuth; Host does not reproduce the cascade | `OCB:packages/agent-service/src/worker/provider-accounts.test.ts`; `OCB:packages/agent-service/src/worker/provider-oauth.ts` | S | A Host reimplementation would create a second credential authority |
| PV-05 | OAuth/accounts | OAuth login, account pools, refresh, usage-aware ranking | `OMP-AI:auth-storage.ts:87-150`; `M0:provider-oauth-feasibility.json` | Provider OAuth through protocol groups | `OCP:groups/` (provider/credential) | Canonical provider OAuth with flow/generation and account roster | `OCB:packages/ui/src/api/canonicalClient.ts`; `OCB:packages/agent-service/src/worker/provider-oauth.ts` | S/R | Official-provider/OAuth conversion remains unverified (`DEV`) |
| PV-06 | Secrets boundary | Keys live in AuthStorage; provider egress is the only outbound use | `OMP-AI:auth-storage.ts:87-120` | Credentials are schema records with events | `OCS:credential.d.ts` | No secret in DTOs/logs; private Host→service handoff | `DOC-ARCH` "Detailed credential boundaries" | S | Enterprise provider-entry refusal remains a Host boundary |
| PV-07 | Settings precedence | Global/project/overlay/runtime layers; env provenance | `OMP:config/settings.ts:64`, `:299`, `:3899` | Config document/patch schema | `OCS:config.d.ts:84-106` | Four-tier settings engine in Host | `OCB:packages/web/server/lib/host`; `DOC-SCOPE` SCOPE-13.1 | S | Two settings systems by design; canonical settings must not imply OMP config ownership |
| PV-08 | Quota/usage | AuthStorage usage service and provider usage rows | `OMP-AI:auth-storage.ts:87-150`; `OMP:session/session-stats.ts` | No quota contract in schema | `OCS:index.d.ts` | Host quota providers; canonical credential presence | `OCB:packages/web/server/lib/quota`; `OCB:packages/web/server/lib/host` | S | Credential source is canonical/OMP; do not read legacy files |
| PV-09 | Web search | Web-search tool/role and provider settings | `OMP:config/model-roles.ts:56-90`; `OMP:tools` (web search) | Websearch API/protocol group | `OCS:websearch.d.ts`; `OCP:groups/` | Canonical web-search config; Host authorizes egress | `OCB:packages/agent-service/src/worker/catalog-websearch.ts`; `OCB:packages/web/server/lib/security` | S | Provider fallback and enterprise refusal must stay explicit |

**Disposition**

| ID | Origin | Current status | Adaptation | Final target | Risk | Migration implication |
|---|---|---|---|---|---|---|
| PV-01 | OMP-required | implemented-unverified | Contract or projection redesign | Canonical model catalog backed by OMP availability | P1 | Do not expose unavailable models as empty success (`DOC-CON` invariant 4) |
| PV-02 | OMP-required | implemented-unverified | Contract or projection redesign | Provider config with write-only secrets and explicit discovery | P0 | Header values must never round-trip to clients |
| PV-03 | OMP-required | implemented-unverified | OMP-native replacement | Worker-owned AuthStorage; Host explicit handoff only | P0 | No startup import; no Node AuthStorage write (`DOC-ARCH` credential boundary) |
| PV-04 | OMP-required | implemented-unverified | Deferred | Keep OMP's cascade inside the worker | P1 | A canonical precedence engine is not required; GAP-13 |
| PV-05 | OMP-required | implemented-unverified | Contract or projection redesign | Canonical flow/generation; per-provider outcomes | P1 | Official-provider conversion remains unverified; do not claim it |
| PV-06 | OMP-required | implemented-unverified | Contract or projection redesign | Secret-free DTOs/logs; private loopback handoff | P0 | Security review must precede any provider write |
| PV-07 | OpenChamber fork | implemented-unverified | Host-owned unchanged | Four-tier Host settings; OMP settings stay worker-local | P1 | Do not mirror OMP settings into Host as a second source |
| PV-08 | OpenChamber fork | implemented-unverified | Host-owned unchanged | Host quota reads canonical credential presence | P2 | Remove any legacy credential-file path |
| PV-09 | OpenChamber fork | implemented-unverified | Contract or projection redesign | Canonical web-search config with Host egress authorization | P1 | Keep enterprise refusal at the crossing |

### 4.5 Domain 5 — Sessions, history, branch and queue

**Semantics**

| ID | Capability | OMP semantics | OMP evidence | OpenCode semantics | OpenCode evidence | OpenChamber behavior | OpenChamber path | Class | Divergence |
|---|---|---|---|---|---|---|---|---|---|
| SH-01 | Persistence format | JSONL session file plus artifacts; cwd-derived session directory | `OMP:session/session-storage.ts:1282`; `OMP:session/session-paths.ts:215` | Durable event log and session inbox records | `OCS:event-log.d.ts`; `OCS:session-inbox.d.ts` | OMP transcript plus Host SQLite metadata/queue; no second transcript | `OCB:packages/web/server/lib/host/metadata-sqlite.js`; `DOC-ARCH` ADR-04 | S | Correct single-writer split; Host must not cache transcript as authority |
| SH-02 | Transcript authority | `SessionManager` writes messages/entries/compactions | `OMP:session/session-manager.ts:849`; `:2380`; `:4055` | Service owns event log | `OCS:event-log.d.ts` | Service projects OMP history; Host stores operational metadata only | `OCB:packages/agent-service/src/worker/projection.ts`; `DOC-CON` "Metadata sidecar" | S | Projection IDs must stay stable across reopen (`DEV` Task 09) |
| SH-03 | Session metadata | Session entries include title/model/thinking/mode | `OMP:session/session-entries.ts` | Session metadata and events | `OCS:session.d.ts:31`; `OCS:session-metadata.d.ts` | Host-owned metadata with independent revision | `OCB:packages/web/server/lib/host/metadata-sqlite.js`; `DOC-CON` metadata ownership | S | Two revisions; no cross-owner atomicity promised |
| SH-04 | Fork/branch | `fork` copies a session; `branch` moves the live session to a leaf | `OMP:session/agent-session.ts:9949`, `:11790`; `OMP:session/session-manager.ts:2380` | Fork boundary before/through a message; session fork event | `OCS:session-fork.d.ts:3`; `OCS:session.d.ts:17-30` | Canonical branch select/fork with branch version and leaf | `OCB:packages/agent-service/src/sessions/registry.ts:473`; `OCB:packages/ui/src/api/canonicalClient.ts:234-271` | S | OMP branch replaces the live session file; canonical branch is a projected selection |
| SH-05 | Revert | OMP uses branch/fork semantics, not an OpenCode revert record | `OMP:session/agent-session.ts:11790` | Staged/committed/cleared revert | `OCS:session-revert.d.ts:2-51`; `OCS:session-event.d.ts` | Canonical `branch` action with `revert` result | `OCB:packages/ui/src/api/canonicalClient.ts:234-240` | S | Revert is an OpenCode concept; canonical must not imply OMP staging |
| SH-06 | Compaction | `compact()` and automatic compaction methods | `OMP:session/agent-session.ts:6529`; `OMP:session/compact-modes.ts` | Compaction events and session.compacted | `OCS:session-event.d.ts` (`session.compaction.*`) | Canonical compaction events and transcript projection | `OCB:packages/agent-contract/src/events.ts:43-84`; `OCB:packages/agent-service/src/worker/projection.ts` | S | OMP owns compaction history; canonical event names are intentional |
| SH-07 | Resume/recovery | `SessionManager.open` restores a transcript; cold reopen is supported | `OMP:session/session-manager.ts:4055`; `M0:lifecycle.json` | Session service recovery/event replay | `OCS:event-log.d.ts`; `OCS:snapshot.d.ts` | Snapshot + cursor, cold reopen, stable IDs | `OCB:packages/agent-service/src/projection/journal.ts:120`; `DEV` Task 09 | S/R | Canonical snapshot is stricter than OMP's file reopen |
| SH-08 | History pagination | Session listing/history loaders | `OMP:session/session-listing.ts`; `OMP:session/session-loader.ts` | Session message/history contract | `OCS:session.d.ts`; `OCP:groups/` | Canonical history page with branch-bound cursor | `OCB:packages/ui/src/api/canonicalClient.ts` (`getHistory`); `OCB:packages/agent-service/src/projection/journal.ts:96-108` | S | Cursor binds branch identity, not just offset |
| SH-09 | Durable queue | Queued messages and follow-ups inside the session | `OMP:session/queued-messages.ts`; `OMP:session/agent-session.ts:8260` | Inbox delivery with `steer`/`queue` and envelopes | `OCS:session-inbox.d.ts:3-166` | Host SQLite queue with leases, revisions, idempotent delivery | `OCB:packages/web/server/lib/message-queue/sqlite-store.js:56-64`; `OCB:packages/web/server/lib/message-queue/canonical-runtime.js:19-197` | S | Host owns delivery; OMP owns execution |
| SH-10 | Deletion hierarchy | Session delete removes file and artifacts | `OMP:session/session-storage.ts:1281-1292` | Session delete event | `OCS:session-event.d.ts` (`session.deleted`) | Canonical delete cascades child sessions and Host metadata | `OCB:packages/agent-service/src/sessions/registry.ts:759` | S | Host metadata deletion must not orphan OMP transcripts |
| SH-11 | Pending expiry | M0 restart fixture: old worker requests have no cross-worker handle | `M0:restart-pending.json` | Permission/question lifecycle | `OCS:permission.d.ts:13-38`; `OCS:question.d.ts` | Invalidate on generation/epoch change; never replay approval | `OCB:packages/agent-service/src/interaction/manager.ts:101-121` | S/R | M0 recorded stale resolution as unavailable, not rejected; service CAS is the stronger owner |
| SH-12 | Snapshot/cursor | OMP has no public resumable cursor | `OMP:session/agent-session-events.ts` (events only) | Event sequence/durable envelope | `OCS:event.d.ts:13-23` | Canonical epoch/sequence/replay with invalidation | `OCB:packages/agent-contract/src/snapshot.ts:7-19`; `OCB:packages/agent-service/src/projection/journal.ts:120-160` | S | Service-only contract; not an OMP feature |

**Disposition**

| ID | Origin | Current status | Adaptation | Final target | Risk | Migration implication |
|---|---|---|---|---|---|---|
| SH-01 | OMP-required | implemented-unverified | OMP-native replacement | OMP transcript plus Host metadata; no second transcript | P0 | Queue/metadata must never become transcript authority |
| SH-02 | OMP-required | implemented-unverified | Contract or projection redesign | Stable projection IDs over OMP history | P0 | Cold reopen must prove identical IDs (`DEV` Task 09) |
| SH-03 | host-specific | implemented-unverified | Host-owned unchanged | Host metadata revisions independent of runtime cursor | P1 | Never merge revisions into one atomic promise |
| SH-04 | OMP-required | implemented-unverified | Contract or projection redesign | Canonical branch/fork over OMP fork/branch | P1 | Branch version and leaf identity are required |
| SH-05 | inherited-OpenCode | implemented-unverified | Contract or projection redesign | Canonical revert only if a retained surface needs it | P2 | Do not port OpenCode staged revert semantics into OMP |
| SH-06 | OMP-required | implemented-unverified | Contract or projection redesign | Canonical compaction events over OMP compaction | P2 | Compaction summaries stay OMP-owned |
| SH-07 | OMP-required | implemented-unverified | Contract or projection redesign | Snapshot + cursor with cold reopen | P0 | Resnapshot on epoch/replay gap, never silent resume |
| SH-08 | OpenChamber fork | implemented-unverified | Contract or projection redesign | Branch-bound paginated history | P1 | History cursors never enter the live SSE cursor |
| SH-09 | inherited-OpenCode | implemented-unverified | Host-owned unchanged | Host durable queue; OMP executes delivered prompts | P0 | FIFO, lease expiry and idempotency are Host invariants |
| SH-10 | OpenChamber fork | implemented-unverified | Contract or projection redesign | Cascade deletion with explicit metadata/transcript outcomes | P1 | One failed child must not erase unrelated complete children |
| SH-11 | OMP-required | implemented-unverified | Contract or projection redesign | Expire on generation/epoch change; fail closed | P0 | Approval replay after restart is forbidden |
| SH-12 | OMP-required | implemented-unverified | Contract or projection redesign | Bounded replay and `stream.invalidated` | P0 | SSE backpressure is hardening 06, not yet evidenced |

### 4.6 Domain 6 — Skills, extensions and MCP

**Semantics**

| ID | Capability | OMP semantics | OMP evidence | OpenCode semantics | OpenCode evidence | OpenChamber behavior | OpenChamber path | Class | Divergence |
|---|---|---|---|---|---|---|---|---|---|
| EX-01 | Skill roots | User/project `.agent(s)/skills`, `.omp/skills`, agent-dir `skills`, plugins and managed skills | `OMP:discovery/agents.ts:177`; `OMP:discovery/builtin.ts:296`; `OMP:extensibility/skills.ts:279` | Skill info with directory/url/embedded sources | `OCS:skill.d.ts:7-29` | Host catalog installs; service discovers/expands through OMP | `OCB:packages/agent-service/src/worker/catalog-skills.ts:175-188` | S | Host must not invent a parallel skill discovery |
| EX-02 | Skill parsing/expansion | `SKILL.md` frontmatter, name collisions, token expansion | `OMP:extensibility/skills.ts:243-466`; `OMP:capability/skill.ts:1-60` | Skill source records | `OCS:skill.d.ts:19-29` | Canonical skill catalog/expand; public text sanitizes roots | `OCB:packages/agent-service/src/worker/catalog-skills.ts:59-66` | S | Host root sanitization is required; OMP paths are absolute |
| EX-03 | Slash commands | File commands, custom TS commands, skills and prompt templates | `OMP:extensibility/slash-commands.ts:72-124`; `OMP:capability/slash-command.ts` | Command info/event | `OCS:command.d.ts:3-9` | Canonical commands/prompt templates and expand-text | `OCB:packages/ui/src/api/canonicalClient.ts` (`fileResources`) | S | `.opencode/commands` is retired; OMP command sources are not |
| EX-04 | Prompt templates | Discovered templates | `OMP:config/prompt-templates.ts`; `OMP:sdk.ts:1247` | No separate template contract in this surface | `OCS:command.d.ts` | Canonical prompt templates in `.omp/prompts`/agent dir | `OCB:packages/agent-service/src/worker/catalog-resources.ts:51` | S | Host authoring scope is `.omp`, not `.opencode` |
| EX-05 | Extensions/hooks | Extension factories, events, hooks, UI context, custom commands/tools | `OMP:extensibility/extensions/types.ts`; `OMP:extensibility/hooks/types.ts` | Plugin API | `OCS:plugin.d.ts` | Native plugin loader plus Guest SDK; different trust domains | `OCB:packages/agent-service/src/worker/native-plugin-loader.ts`; `OCB:packages/sdk` | S | Guest extension contract is not an OMP extension |
| EX-06 | Custom tools | `customTools` in `createAgentSession`; extension-owned tools | `OMP:sdk.ts:662`; `OMP:sdk.ts:2480-2623` | No custom-tool schema in this surface | `OCS:index.d.ts` | Worker host-tool extension only; no arbitrary client tool injection | `OCB:packages/agent-service/src/worker/host-tool.ts` | S | Mechanical port of Guest `contributes.tools` would be wrong; it is display metadata |
| EX-07 | Plugins/marketplace | Native plugin discovery/load and settings | `OMP:extensibility/plugins`; `OMP:discovery/omp-plugins.ts` | Plugin API | `OCS:plugin.d.ts` | Canonical plugin catalog/install/apply with root restart | `OCB:packages/agent-service/src/worker/catalog-plugins.test.ts`; `OCB:packages/agent-service/src/supervisor/catalog.ts` | S | Apply/restart semantics are service-owned |
| EX-08 | MCP config/transports | stdio/http/sse, project/global config, reconnect policy | `OMP:mcp/types.ts:107-148`; `OMP:mcp/manager.ts:646-902` | MCP server config/status/resources | `OCS:mcp.d.ts:22-101` | Canonical MCP catalog/config/apply/reconnect | `OCB:packages/agent-service/src/worker/mcp.ts`; `OCB:packages/agent-service/src/supervisor/catalog.ts` | S | OMP runtime apply is not a persisted write |
| EX-09 | MCP OAuth/resources | OAuth flow, credentials, prompts/resources, reconnect | `OMP:mcp/manager.ts:1448`; `OMP:mcp/oauth-flow.ts`; `OMP:mcp/tool-bridge.ts` | MCP resource catalog | `OCS:mcp.d.ts:81-128` | Canonical MCP OAuth/status and apply; resources not obviously projected | `OCB:packages/agent-service/src/worker/mcp-credentials.ts` | S | Resource/prompt projection is GAP-14 |
| EX-10 | Guest SDK | No equivalent | `OMP:extensibility/extensions` is a different contract | No equivalent | `OCS:index.d.ts` | Iframe sandbox, one-shot MessageChannel, manifest permissions, services | `OCB:packages/sdk`; `OCB:packages/web/server/lib/guests` | S | Keep separate from OMP/MCP tools |

**Disposition**

| ID | Origin | Current status | Adaptation | Final target | Risk | Migration implication |
|---|---|---|---|---|---|---|
| EX-01 | inherited-OpenCode | implemented-unverified | Contract or projection redesign | Host installs; OMP discovers/expands the selected roots | P1 | No second skill registry or `.opencode` target |
| EX-02 | OMP-required | implemented-unverified | Contract or projection redesign | Parsed/expanded by OMP; public DTO sanitizes absolute roots | P1 | Do not return `filePath`/`baseDir` to clients |
| EX-03 | inherited-OpenCode | implemented-unverified | Contract or projection redesign | Native OMP commands/skills; Host-authored files in `.omp` | P1 | Retire `.opencode/commands` references (task 09 scans UI text) |
| EX-04 | OpenChamber fork | implemented-unverified | Host-owned unchanged | Host file authoring with canonical revision | P2 | Keep command/template revisions distinct from skill revisions |
| EX-05 | OMP-required | implemented-unverified | OMP-native replacement | Native plugins inside the worker; Guest SDK outside | P1 | Do not conflate plugin permissions with Guest capabilities |
| EX-06 | OMP-required | implemented-unverified | Contract or projection redesign | Host tools only through authorization; no arbitrary Guest tool injection | P1 | Guest `contributes.tools` remains display metadata (`DOC-ARCH`) |
| EX-07 | OMP-required | implemented-unverified | Contract or projection redesign | Canonical plugin catalog with explicit apply outcomes | P2 | `RELOAD_REQUIRED` must not be reported as applied |
| EX-08 | OMP-required | implemented-unverified | Contract or projection redesign | Persisted config plus explicit runtime apply | P1 | A stored config is not applied-runtime success |
| EX-09 | OMP-required | absent | OMP-native replacement | MCP resources/prompts only if a retained surface needs them | P2 | GAP-14 |
| EX-10 | host-specific | implemented-unverified | Host-owned unchanged | Guest SDK stays a separate contract | P1 | Mobile has no Guest runtime until M5 |

### 4.7 Domain 7 — TUI, CLI, API and runtime surfaces

**Semantics**

| ID | Capability | OMP semantics | OMP evidence | OpenCode semantics | OpenCode evidence | OpenChamber behavior | OpenChamber path | Class | Divergence |
|---|---|---|---|---|---|---|---|---|---|
| RT-01 | Interactive TUI | Full terminal UI with composer, overlays and commands | `OMP:modes/interactive-mode.ts`; `OMP:modes/controllers` | No TUI contract | `OCS:index.d.ts` | No terminal agent UI; Web/Electron/mobile only | `OCB:packages/ui`; `DOC-SCOPE` surface matrix | S | OMP TUI is unadapted (expected) |
| RT-02 | Print/headless | `-p`, `--mode json`, single-shot | `OMP:modes/print-mode.ts:1-25`; `OMP:main.ts:1819` | Headless service API | `OCC:api.d.ts` | Host/agent-service HTTP/SSE, not a CLI agent | `OCB:packages/agent-service/src/index.ts` | S | No mechanical port; canonical API is the surface |
| RT-03 | RPC | JSON stdin/stdout, one active session, host-tool round trips | `OMP:modes/rpc/rpc-mode.ts:1-15`; `OMP:modes/rpc/rpc-types.ts` | RPC client API | `OCC:api.d.ts` (`RpcClient`) | Internal supervisor↔worker IPC, not a public agent RPC | `OCB:packages/agent-service/src/supervisor/workers.ts:266-280` | S | OMP RPC is not exposed; canonical HTTP/SSE is |
| RT-04 | ACP | ACP client bridge and session factory | `OMP:modes/acp/acp-mode.ts:1-35` | No ACP contract | `OCS:index.d.ts` | Absent | none (no owning module) | S | GAP-15 |
| RT-05 | CLI commands | Large command surface (`agents`, `worktree`, `models`, `mcp`, `skill`, `ps`, `stats`, `usage`, `ssh`, `collab`, etc.) | `OMP:commands`; `OMP:cli.ts` | Separate generated route groups | `OCP:groups/` | Host CLI (`openchamber serve`) plus Electron; no OMP command surface | `OCB:packages/web/bin`; `OCB:packages/electron` | S | OMP CLI is not adapted (expected) |
| RT-06 | Event/stream protocol | `AgentSessionEvent` stream; raw names are private | `OMP:session/agent-session-events.ts:1-94` | Durable/ephemeral event definitions with IDs/seq/version | `OCS:event.d.ts:1-63`; `OCS:event-manifest.d.ts` | Canonical SSE/WS events with epoch/sequence | `OCB:packages/agent-contract/src/events.ts:43-84`; `DOC-CON` streaming | S | Correct redesign; raw names never public |
| RT-07 | Server/API embedding | SDK library or CLI; no canonical multi-tenant API | `OMP:sdk.ts:1686` | Generated service routes | `OCP:groups/` | Host Gateway `/api/agent/v1`; private loopback to Bun | `OCB:packages/web/server/lib/host/canonical-routes.js`; `DOC-ARCH` | S | OhPiChamber owns the public contract |
| RT-08 | Process topology | One process per CLI/session; shared process state | `OMP:sdk.ts:2203`; `M0:isolation-artifact.json` | Service process model | `OCS:connection.d.ts` | Node Host + Bun service + per-root workers | `OCB:packages/agent-service/src/supervisor/workers.ts:80-161`; `DOC-ARCH` ADR-02/03 | S/R | Dedicated workers are evidence-backed, not an OMP guarantee |
| RT-09 | Remote access | CLI over SSH/tunnels only | `OMP:commands/ssh.ts`; `OMP:tools/browser/relay` | Connection/location schemas | `OCS:connection.d.ts`; `OCS:location.d.ts` | Pairing, relay, tunnels, PWA/mobile | `OCB:packages/web/server/lib/relay`; `OCB:packages/web/server/lib/tunnels`; `OCB:packages/mobile` | S | Host-specific; OMP has no equivalent |
| RT-10 | Multi-session concurrency | Multiple SDK sessions require care due to process state | `M0:isolation-artifact.json`; `OMP:sdk.ts:2203` | Service-oriented session concurrency | `OCS:session.d.ts` | One worker per active root; siblings isolated | `OCB:packages/agent-service/src/supervisor/workers.ts:80-161` | S/R | Cross-platform isolation remains unverified |
| RT-11 | Hosted/enterprise assumptions | Local process, local credentials, filtered non-interactive tool environment | `OMP:exec/non-interactive-env.ts:6`; `OMP:session/bash-runner.ts:98-103` | Service routes with credential events | `OCS:credential.d.ts` | Loopback-only, enterprise policy at each crossing | `DOC-ARCH` "Retained enterprise enforcement" | S | Enterprise behavior is Host-owned; do not infer from OMP |

**Disposition**

| ID | Origin | Current status | Adaptation | Final target | Risk | Migration implication |
|---|---|---|---|---|---|---|
| RT-01 | OMP-required | absent | Deferred | Not a supported OhPiChamber surface | P3 | No TUI port |
| RT-02 | OMP-required | absent | Deferred | Headless behavior exists through canonical HTTP, not OMP print mode | P3 | Do not expose OMP CLI as the runtime |
| RT-03 | OMP-required | absent | OMP-native replacement | Internal worker IPC only | P2 | OMP RPC is not a public compatibility surface |
| RT-04 | OMP-required | absent | Deferred | ACP only if a retained client requires it | P2 | GAP-15 |
| RT-05 | OMP-required | absent | Deferred | Host CLI remains the command surface | P3 | OMP commands are not a migration target |
| RT-06 | OMP-required | implemented-unverified | Contract or projection redesign | Canonical event vocabulary only | P0 | Raw OMP/OpenCode names stay private |
| RT-07 | OMP-required | implemented-unverified | Contract or projection redesign | Host `/api/agent/v1` with private loopback dispatch | P0 | No public exposure of the Bun service |
| RT-08 | OMP-required | implemented-unverified | OMP-native replacement | Dedicated worker per root; bounded restart/cleanup | P0 | Hardening 05/13 own restart and descendants |
| RT-09 | host-specific | implemented-unverified | Host-owned unchanged | Pairing/relay/tunnels unchanged | P1 | No OMP remote assumption |
| RT-10 | OMP-required | implemented-unverified | Contract or projection redesign | Sibling isolation and generation ownership | P0 | Shared-process pooling is not an option without evidence |
| RT-11 | host-specific | implemented-unverified | Host-owned unchanged | Enterprise enforcement at each crossing | P1 | OMP policy is not a substitute for Host policy |

### 4.8 Domain 8 — OpenChamber differentiators

**Semantics**

| ID | Capability | OMP semantics | OMP evidence | OpenCode semantics | OpenCode evidence | OpenChamber behavior | OpenChamber path | Class | Divergence |
|---|---|---|---|---|---|---|---|---|---|
| DF-01 | Board/source control | GitHub tools only; no Board model | `OMP:tools/gh.ts`; `OMP:tools/github-cache.ts` | No Board in schema | `OCS:index.d.ts` | GitHub/GitLab/Linear Board, issues, checks, worktree launch | `OCB:packages/ui/src/components/sourceBoard`; `OCB:packages/web/server/lib/source-control` | S | Host-specific; OMP has no equivalent |
| DF-02 | Environments | No environment overlay model | `OMP` source has cwd/env only | No environment schema | `OCS:index.d.ts` | User/project environment overlays and private values | `OCB:packages/web/server/lib/environment` | S | Host-specific |
| DF-03 | Quake | No windowing | `OMP:modes/interactive-mode.ts` | No windowing | `OCS:index.d.ts` | Electron global shortcut and dropdown | `OCB:packages/electron`; `OCB:packages/ui/src/components/sections/openchamber/DesktopQuakeModeSettings.tsx` | S | Host-specific |
| DF-04 | Isolated spaces | No sandbox runtime | `OMP:task/isolation-runner.ts` is subagent isolation only | Space runtime still runs OpenCode CLI/plugin | `OCB:packages/web/server/lib/spaces/space-server.js`; `OCB:packages/web/server/lib/spaces/layout.js:99-100`; `OCB:packages/web/server/lib/spaces/tools.js:56-82` | Unreleased spaces with code transfer, dispatcher, preview | `OCB:packages/web/server/lib/spaces`; `OCB:packages/ui/src/lib/spaces/release.ts` | S | The only place OpenCode still executes; hardening 08 owns the decision |
| DF-05 | Goals | OMP has goal prompts/tools and goal mode state | `OMP:prompts/goals`; `OMP:goals/state.ts`; `OMP:session/agent-session.ts` goal mode | No goal contract | `OCS:index.d.ts` | Host-owned goal supervisor with small-model audit | `OCB:packages/web/server/lib/session-goal` | S | Two goal systems; Host supervisor is fork-specific |
| DF-06 | Assist/walkthrough | No equivalent | `OMP` source has advisor/autolearn, not these products | No equivalent | `OCS:index.d.ts` | Host recap/suggestion and diff walkthrough | `OCB:packages/web/server/lib/session-assist`; `OCB:packages/web/server/lib/walkthrough` | S | Fork-specific; calls canonical completion |
| DF-07 | Routing/fusion/multi-run | No intent router; model roles/fallbacks only | `OMP:config/model-roles.ts`; `OMP:session/retry-fallback-chains.ts` | No equivalent | `OCS:index.d.ts` | Jev classifier, auto model rewrite, multi-run and fusion | `OCB:packages/web/server/lib/routing`; `OCB:packages/ui/src/lib/multirun` | S | Fork-specific; Host policy before dispatch |
| DF-08 | Scheduled tasks | No cron/scheduler contract | `OMP` source has no scheduler of this shape | No equivalent | `OCS:index.d.ts` | `.agents/loops` scheduler with claims and canonical launch | `OCB:packages/web/server/lib/scheduled-tasks` | S | Fork-specific |
| DF-09 | Pairing/relay/tunnels | SSH/browser relay only | `OMP:commands/ssh.ts`; `OMP:tools/browser/relay` | Connection/location schemas | `OCS:connection.d.ts`; `OCS:location.d.ts` | Passkey, pairing v2, E2EE relay, Cloudflare/ngrok | `OCB:packages/web/server/lib/ui-auth`; `OCB:packages/web/server/lib/relay`; `OCB:packages/web/server/lib/tunnels` | S | Host-specific |
| DF-10 | Notifications/voice | TTS vocalizer and speech roles; no push | `OMP:tts/vocalizer.ts`; `OMP:config/model-roles.ts` | No notification contract | `OCS:index.d.ts` | Web Push/VAPID, APNs, Electron, TTS/STT | `OCB:packages/web/server/lib/notifications`; `OCB:packages/web/server/lib/tts`; `OCB:packages/web/server/lib/dictation` | S | Host-specific; OMP speech roles can be a model source only |
| DF-11 | Guest extensions | No equivalent | `OMP:extensibility/extensions` is different | No equivalent | `OCS:index.d.ts` | Guest SDK iframes, services, storage, capabilities | `OCB:packages/sdk`; `OCB:packages/web/server/lib/guests` | S | Host-specific; keep separate |
| DF-12 | PWA/mobile | No packaged mobile/PWA | `OMP` CLI only | No mobile contract | `OCS:index.d.ts` | PWA, Capacitor shell, push, pairing | `OCB:packages/mobile`; `OCB:packages/ui/src/apps` | S | Host-specific |
| DF-13 | Engine/instance switching | Single engine | `OMP:sdk.ts:1686` | Service connection model | `OCS:connection.d.ts` | Desktop host switcher replaces the old OpenCode instance switcher | `OCB:packages/ui/src/components/sections/openchamber`; `OCB:packages/ui/src/lib/i18n/messages/en.ts:3667` | S | OpenCode engine switching is retired; host switching is not an engine selector |

**Disposition**

| ID | Origin | Current status | Adaptation | Final target | Risk | Migration implication |
|---|---|---|---|---|---|---|
| DF-01 | host-specific | implemented-unverified | Host-owned unchanged | Board remains Host-owned and launches canonical sessions | P2 | No OMP Board model; provider grants stay Host |
| DF-02 | host-specific | implemented-unverified | Host-owned unchanged | Resolve environment before worker spawn | P1 | One project's overlay must not reach another worker |
| DF-03 | host-specific | implemented-unverified | Host-owned unchanged | Electron Quake unchanged | P2 | Keep transient bounds out of saved geometry |
| DF-04 | inherited-OpenCode | implemented-unverified | Retire or OMP-native replacement only after a decision | Spaces unreleased; OpenCode execution removed only after decision | P0 | Task 08 must answer; no automatic OpenCode fallback (`DOC-SCOPE`) |
| DF-05 | OpenChamber fork | implemented-unverified | Contract or projection redesign | Host goals supervisor over canonical completion | P2 | Goal continuation must use `run.completed`, not turn end |
| DF-06 | OpenChamber fork | implemented-unverified | Contract or projection redesign | Host recap/walkthrough over canonical history/completion | P2 | Do not read OMP internals directly |
| DF-07 | OpenChamber fork | implemented-unverified | Contract or projection redesign | Host routing policy before canonical dispatch | P2 | Model/agent rewrite must remain visible and reversible |
| DF-08 | OpenChamber fork | implemented-unverified | Contract or projection redesign | Host scheduler launches canonical sessions | P2 | Claims and duplicate prevention are Host invariants |
| DF-09 | host-specific | implemented-unverified | Host-owned unchanged | Auth/pairing/relay unchanged | P1 | Never expose internal loopback beyond the policy boundary |
| DF-10 | host-specific | implemented-unverified | Host-owned unchanged | Notifications/voice unchanged; OMP speech role optional | P2 | Suppression and provider egress policies stay Host-owned |
| DF-11 | host-specific | implemented-unverified | Host-owned unchanged | Guest SDK contract unchanged | P1 | Guest `generate` uses canonical model service |
| DF-12 | host-specific | implemented-unverified | Host-owned unchanged | PWA/mobile unchanged; M5 certifies | P2 | Mobile has no local Agent Service |
| DF-13 | inherited-OpenCode | absent | Retire | No engine selector; Host switcher only | P3 | Remove residual OpenCode instance wording (task 09) |

## 5. OpenChamber-adapted-from-OpenCode trace

The trace below separates "shape inherited from OpenCode" from "current owner". A feature can be inherited in interaction shape and still be correctly served by canonical data. `Current OpenChamber owner` names the present data-plane owner; the verdict records whether the OpenCode schema is replaced or retired.

| Feature | OpenCode origin evidence | Current OpenChamber owner | Verdict |
|---|---|---|---|
| Chat timeline, sync, reconnect | Historical OpenCode SSE names `session.status`, `permission.asked`, `question.asked`, `message.part.delta` (`HIST` §4.1) | `OCB:packages/ui/src/sync`; `OCB:packages/agent-service/src/projection` | Shape inherited; data plane redesigned to canonical |
| Session/message/part records | OpenCode session/message schemas (`OCS:session.d.ts:31`; `OCS:session-message.d.ts`) | `OCB:packages/agent-contract/src/session.ts`; `OCB:packages/agent-contract/src/messages.ts`; `OCB:packages/agent-contract/src/events.ts` | Inherited concepts; canonical schemas now own the wire |
| OpenCode session/event schema | `OCS:session.d.ts:31`; `OCS:session-event.d.ts`; `OCS:event.d.ts:23`; `OCS:event-manifest.d.ts` | `OCB:packages/agent-contract/src/events.ts`; `OCB:packages/agent-contract/src/snapshot.ts`; `OCB:packages/agent-service/src/projection/journal.ts` | Retired as a wire schema; canonical session/event records replace it |
| OpenCode agent identity/profile schema | `OCS:agent.d.ts:10-70` | `OCB:packages/agent-service/src/worker/catalog-agents.ts`; `OCB:packages/agent-contract/src/catalogs.ts` | Replaced by native AgentCatalog over OMP agent definitions; OpenCode profile schema is not used |
| Tool cards and tool names | OpenCode tool names and part rendering (`HIST` §4.3) | `OCB:packages/ui/src/components/chat` | Shape inherited; OMP tool inventory is the source |
| Permission/question UI | OpenCode permission rules and `once/always/reject` (`OCS:permission.d.ts:13-38`) | `OCB:packages/ui/src/stores/permissionStore.ts`; `OCB:packages/agent-service/src/interaction` | Inherited interaction; canonical CAS/expiry is new |
| Slash commands and skills | OpenCode command/skill routes and `.opencode/commands` (`HIST` §5.2) | `OCB:packages/agent-service/src/worker/catalog-resources.ts`; `OCB:packages/agent-service/src/worker/catalog-skills.ts` | Inherited product; OMP native discovery replaces OpenCode |
| Provider/model/agent/MCP settings | OpenCode config, provider, agent, MCP schemas (`HIST` §13; `OCS:config.d.ts`) | `OCB:packages/agent-service/src/worker/catalogs.ts`; `OCB:packages/agent-service/src/worker/catalog-credentials.ts` | Inherited UI; canonical service is the authority |
| Custom-provider endpoint schema | `OCS:provider.d.ts:147-170`; `OCP:groups/` (provider) | `OCB:packages/agent-service/src/worker/provider-oauth.ts`; `OCB:packages/agent-service/src/worker/catalog-credentials.ts` | Replaced by canonical provider config over OMP ModelRegistry/AuthStorage; OpenCode endpoint schema retired |
| MCP config schema | `OCS:mcp.d.ts:22-46` | `OCB:packages/agent-service/src/worker/mcp.ts`; `OCB:packages/agent-service/src/supervisor/catalog.ts` | Replaced by canonical MCP config plus OMP MCP loader; OpenCode MCP schema retired |
| Durable message queue | OpenCode session inbox/delivery (`OCS:session-inbox.d.ts`) | `OCB:packages/web/server/lib/message-queue` | Inherited requirement; Host SQLite is a redesign |
| Small-model calls | Historical OpenCode stateless generation route (`HIST` §10) | `OCB:packages/web/server/lib/small-model` | Caller shape inherited; canonical completion replaces route |
| Guest Shell | OpenCode shell observation (`HIST` §16) | `OCB:packages/agent-service/src/worker/shell.ts`; `OCB:packages/sdk` | Contract inherited; OMP `BashTool` execution |
| Session share | OpenCode `session.share` | none | Retired; no replacement cloud relay (`DOC-SCOPE`) |
| VS Code extension | Upstream `packages/vscode` | absent | Retired; external editor launch and theme import retained |
| OpenCode proxy/lifecycle/port probing | `proxy.js`, lifecycle, port probing (`HIST` §17.1) | `OCB:packages/web/server/lib/opencode/proxy.js` (unregistered) | Retired in behavior; residual dead file remains (GAP-16) |
| OpenCode config/auth importer | `opencode.json`, `auth.json` readers (`HIST` §17.2) | absent from production paths | Retired; one-time explicit handoff is OMP AuthStorage |
| `.opencode/commands` | Legacy snippet/command paths (`HIST` §5.2) | At audit start, frontmatter/Git helpers in `OCB:packages/web/server/lib/opencode/shared.js` were imported by `packages/web/server/lib/scheduled-tasks/loops.js`; hardening task 10 relocated the file to Host-owned `packages/web/server/lib/host/shared.js` and loops import it there. No `.opencode/commands` reader remains at `7cc282d08504afc88d1531b6ba527009de3b0794`. | Retired; the helper relocation removed the OpenCode path name |
| OpenCode LSP cleanup | `<file_diagnostics>` stripping and LSP renderer (`HIST` §17.3) | residual i18n key `chat.toolPart.lspErrors` (`OCB:packages/ui/src/lib/i18n/messages/en.ts:2607`) | Residual naming, not execution; task 09 |
| Engine/instance switcher | OpenCode multi-instance switcher (`HIST` §3.1) | Desktop host switcher, not an engine selector | Retired as an engine feature |
| Isolated spaces | OpenCode CLI/plugin/config inside space | `OCB:packages/web/server/lib/spaces` | Still OpenCode; unreleased; task 08 decision |

## 6. OMP capability-gap list

| Gap | OMP capability | OMP evidence | OpenChamber status | Implication |
|---|---|---|---|---|
| GAP-02 | Agent definition fields: spawns, advisor, efforts, account pools, compaction overrides | `OMP:task/types.ts:227-242` | Not in canonical agent catalog | Engine-internal unless a retained agent editor needs them |
| GAP-03 | Built-in model roles and custom role metadata | `OMP:config/model-roles.ts:56-90` | Canonical model list only | Host routing cannot currently address every OMP role |
| GAP-04 | Retry/fallback chains and re-clamping | `OMP:session/retry-fallback-chains.ts` | Not a public contract | Outcome is visible through `run.failed`; policy is not |
| GAP-05 | Plan mode, checkpoint/rewind, transcript forking controls | `OMP:tools/plan-mode-guard.ts`; `OMP:tools/checkpoint.ts:53-121` | Absent | Candidate M4/M5 parity work; no current UI |
| GAP-06 | `additionalDirectories` multi-root discovery | `OMP:sdk.ts:536-538` | Absent per session | Workspace model covers roots at Host level, not engine level |
| GAP-07 | Context files, at-imports, rule buckets and their precedence | `OMP:capability/context-file.ts`; `OMP:discovery/at-imports.ts`; `OMP:capability/rule-buckets.ts` | Host context/knowledge only | Risk of double injection or missing OMP rules |
| GAP-08 | Memory backends (`local`, `hindsight`, `mnemopi`, `sharpshooter`) | `OMP:memory-backend/settings.ts:12-17` | Host agent memory only | Two memory systems can diverge |
| GAP-09 | Task isolation backends and worktree merge/apply semantics | `OMP:task/settings.ts:38-205`; `OMP:task/isolation-runner.ts` | Host worktree owner; no task isolation UI | OMP task isolation is invisible to users |
| GAP-10 | Worker environment allowlist | `OMP:session/bash-runner.ts:98-103` (OMP filters its tool spawn env); `OCB:packages/agent-service/src/supervisor/workers.ts:216-220` copies `process.env` and deletes only `OHPICHAMBER_INTERNAL_SECRET`; `DEV` review | Implemented-unverified; hardening 04 pending | Host secrets other than the token remain inherited |
| GAP-11 | Approval-mode mapping and per-tool policies | `OMP:tools/approval.ts:16-80` | Canonical fail-closed + Host policy | OMP `yolo` default cannot be copied |
| GAP-12 | Ask timeout, recommended option and multi-select projection | `OMP:tools/ask.ts:1-80` | Canonical question basic fields | UX parity gap |
| GAP-13 | Credential precedence and account pools | `OMP-AI:auth-storage.ts:6-9`, `:87-150` | Worker-owned; canonical only exposes accounts | Fine while worker owns resolution |
| GAP-14 | MCP prompts/resources and transport-close behavior | `OMP:mcp/manager.ts`; `OMP:mcp/tool-bridge.ts`; `M0:mcp-transports-config.json` | Tools/config/apply; resource projection unclear | Retained MCP surface may be narrower than OMP |
| GAP-15 | ACP client mode and session factory | `OMP:modes/acp/acp-mode.ts:1-35` | Absent | Third-party ACP clients cannot connect |
| GAP-16 | Residual OpenCode proxy file | `OCB:packages/web/server/lib/opencode/proxy.js:219` | Unregistered proxy; former `shared.js` consumers are Host-owned at `packages/web/server/lib/host/shared.js` after task 10 | Unregistered proxy is dead weight; the OpenCode shared-helper name is gone |
| GAP-17 | OMP browser/computer/eval/IDA/debug/LSP/security-scan tools | `OMP:tools/builtin-names.ts:1-34`; `OMP:tools/browser.ts`; `OMP:tools/computer.ts` | Not exposed | Host broker/editor owns overlapping capabilities; OMP equivalents unadapted |
| GAP-18 | OMP skills from `.agents`/`.agent` and managed skills | `OMP:discovery/agents.ts:177`; `OMP:extensibility/skills.ts:279` | Canonical skill catalog tests only selected roots | `.agents/skills` support depends on OMP discovery; service tests must prove it |
| GAP-19 | OMP plugin/extension event and hook model | `OMP:extensibility/extensions/types.ts`; `OMP:extensibility/hooks/types.ts` | Native plugin loader only | Guest SDK and OMP hooks are different trust models |
| GAP-20 | OMP usage/stats and provider health | `OMP-AI:auth-storage.ts:87-150`; `OMP:session/session-stats.ts` | Host quota/usage; canonical credential presence | Provider-health signals are not projected |
| GAP-21 | OMP TUI/print/RPC/CLI command surface | `OMP:modes`; `OMP:commands` | Absent by design | Deferred, not a migration defect |

## 7. Prioritized adaptation/defer/retire register

Risk meaning: **P0** blocks freezing a canonical contract or service invariant; **P1** breaks a retained workflow if mechanically ported at M3; **P2** is a parity/quality gap for retained M4/M5 surfaces; **P3** is explicit defer or retire with no migration work.

| Priority | Item | Evidence | Disposition | Implication |
|---|---|---|---|---|
| P0 | Turn vs run completion | AG-06; `OMP:session/agent-session-events.ts:15-31`; `OCB:packages/agent-service/src/worker/projection.ts:420-469` | Contract or projection redesign | Every completion consumer keys off `run.completed`; `turn.completed` is not a request end |
| P0 | Approval authority and modes | TL-03; `OMP:tools/approval.ts:16-80`; `OCS:permission.d.ts:38` | Contract or projection redesign | Host fail-closed policy; OMP approval is one input; never map `yolo`/`always` to implicit allow |
| P0 | Request CAS, epoch/generation expiry | TL-04; SH-11; `OCB:packages/agent-service/src/interaction/manager.ts:185-223` | Contract or projection redesign | Old worker/service responses cannot resolve new requests |
| P0 | Transcript and metadata ownership | SH-01; SH-02; `DOC-ARCH` ADR-04 | OMP-native replacement | No second transcript; Host metadata revisions stay independent of the runtime cursor |
| P0 | Durable queue FIFO/lease/idempotency | SH-09; `OCB:packages/web/server/lib/message-queue/sqlite-store.js:56-64` | Host-owned unchanged | Queue is Host delivery authority; OMP execution is downstream |
| P0 | Snapshot/replay/invalidation | SH-12; `OCB:packages/agent-service/src/projection/journal.ts:120-160` | Contract or projection redesign | Bounded replay, `stream.invalidated`, no silent gap |
| P0 | Worker environment allowlist | TL-10; WS-08; GAP-10; `OCB:packages/agent-service/src/supervisor/workers.ts:216-220` | Contract or projection redesign | Current code inherits `process.env` except the internal token; hardening 04 owns the allowlist proof |
| P0 | Dedicated worker isolation and sibling ownership | AG-01; RT-10; `M0:isolation-artifact.json` | OMP-native replacement | No shared-process pooling without new evidence |
| P0 | Isolated spaces OpenCode execution | DF-04; `OCB:packages/web/server/lib/spaces/layout.js:99-100` | Retire or OMP-native replacement only after decision | The only place OpenCode still executes; unreleased |
| P1 | Agent Service crash restart and health | RT-08; `OCB:packages/web/server/lib/host/agent-service-supervisor.js:217-319`; `DEV` review | Contract or projection redesign | Current supervisor has start/stop/restart, not bounded auto-restart; hardening 05 |
| P1 | Subagent projection and child ownership | AG-03; AG-09 | Contract or projection redesign | Child records must expire with the worker generation |
| P1 | Model/role/fallback visibility | AG-04; AG-05; GAP-03; GAP-04 | Deferred | Canonical model list is the surface; role policy stays internal |
| P1 | Context/instruction ownership | WS-03; WS-04; GAP-07 | Contract or projection redesign | One discovery owner; avoid double injection |
| P1 | Worktree/task isolation ownership | WS-06; GAP-09 | Host-owned unchanged | Host Git/worktree and OMP task isolation are separate |
| P1 | Memory ownership | WS-05; GAP-08 | Host-owned unchanged | Host memory UI and OMP memory are not a compatibility layer |
| P1 | MCP apply, OAuth and reconnect | EX-08; EX-09; GAP-14 | Contract or projection redesign | Persisted write ≠ applied runtime |
| P1 | Skill roots and expansion | EX-01; EX-02; GAP-18 | Contract or projection redesign | Host installs; OMP discovers/expands; `.agents` support must be proven |
| P1 | Fork/branch/revert semantics | SH-04; SH-05 | Contract or projection redesign | Branch version/leaf binding; do not copy OpenCode staged revert |
| P1 | History pagination vs live cursor | SH-08; SH-12 | Contract or projection redesign | History cursors never enter SSE |
| P1 | Deletion cascade | SH-10 | Contract or projection redesign | Partial failure must not erase unrelated sessions |
| P1 | Provider credential handoff | PV-03; PV-04; PV-05 | OMP-native replacement | Worker-owned AuthStorage; explicit one-time handoff; no startup import |
| P1 | Custom provider secret fields | PV-02; PV-06 | Contract or projection redesign | Write-only headers; never read back |
| P1 | Settings ownership | PV-07 | Host-owned unchanged | Host four-tier settings; OMP settings stay worker-local |
| P1 | Web-search egress policy | PV-09 | Contract or projection redesign | Host authorizes egress; enterprise refusal stays at crossing |
| P1 | Plugin apply/restart semantics | EX-07 | Contract or projection redesign | Report actual application, not intended config |
| P1 | Guest tool semantics | EX-06; EX-10 | Host-owned unchanged | `contributes.tools` is display metadata; Guest permissions separate |
| P1 | Process cleanup on all platforms | RT-08; GAP-10 | Deferred | Hardening 13 owns macOS/Windows behavior |
| P1 | Legacy OpenCode residue | GAP-16; DF-13; trace | Retire | Dead proxy and engine wording are cleanup, not compatibility |
| P2 | Plan mode/checkpoint/rewind | AG-08; GAP-05 | Deferred | Only if M4/M5 retains those workflows |
| P2 | OMP roles/advisor/autolearn/autoresearch/cleanse | GAP-02; GAP-03 | Deferred | No current product surface |
| P2 | OMP RPC/ACP | RT-03; RT-04; GAP-15 | Deferred | Not a public surface |
| P2 | OMP TUI/CLI | RT-01; RT-02; RT-05; GAP-21 | Retire/Defer | No port |
| P2 | OMP memory backends | WS-05; GAP-08 | Host-owned unchanged | Host memory remains the product surface |
| P2 | OMP browser/computer/eval/IDA/LSP/debug/security-scan | TL-09; GAP-17 | Deferred | Host broker/editor owns the retained capability |
| P2 | MCP resources/prompts | EX-09; GAP-14 | Deferred | Only if a retained surface needs them |
| P2 | Usage/quota/provider health | PV-08; GAP-20 | Host-owned unchanged | Host quota reads canonical credential presence |
| P2 | Goals/assist/walkthrough/routing/fusion/scheduled | DF-05–DF-08 | Contract or projection redesign | Host features over canonical completion/history |
| P2 | Board/environments/Quake | DF-01–DF-03 | Host-owned unchanged | No OMP equivalent |
| P2 | Notifications/voice/PWA/mobile | DF-10; DF-12 | Host-owned unchanged | M5 certification |
| P3 | VS Code extension | trace; `DOC-SCOPE` | Retire | Package removed; external editor/theme import retained |
| P3 | OpenCode cloud session sharing | trace; `DOC-SCOPE` | Retire | No cloud relay, local export only |
| P3 | OpenCode proxy/lifecycle/port probing | GAP-16 | Retire | `proxy.js` is unregistered dead weight |
| P3 | `opencode.json`/`auth.json` importers | trace | Retire | One-time OMP handoff is the only path |
| P3 | `.opencode/commands` and LSP cleanup names | trace; `OCB:packages/ui/src/lib/i18n/messages/en.ts:2607` | Retire | Naming cleanup; task 09 owns UI text |
| P3 | OpenCode agent/session/event/custom-provider/MCP schemas | trace; `OCS:agent.d.ts:10-70`; `OCS:session.d.ts:31`; `OCS:provider.d.ts:147-170`; `OCS:mcp.d.ts:22-46` | Retire | Canonical and OMP owners replace them; no compatibility layer or field aliases |
| P3 | Engine/instance switcher | DF-13 | Retire | Host switcher is not an engine selector |

## 8. Runtime-evidence and GAP register

Existing runtime evidence and its limits:

| Receipt | Boundary exercised | Limit |
|---|---|---|
| `M0:lifecycle.json` | 9 lifecycle probes | Fixture; not service or provider behavior |
| `M0:capabilities-fixture.json` / `capabilities-real-provider.json` | SDK capability probes and one authenticated completion | Provider-specific; not every caller |
| `M0:isolation-artifact.json` | Dedicated workers pass; shared-process cwd/env fails; 100 MiB idle target fails | Linux x64; service resources remain M2 |
| `M0:restart-pending.json` | Old worker killed; fresh worker completes; no cross-worker handle | Stale resolution recorded unavailable, not rejected |
| `M0:public-factory-permissions.json` | Built-in write approve/deny, bash selector cancel, headless refusal | Not Host authorization or service CAS |
| `M0:provider-oauth-feasibility.json` | Stored API key persist → cold reopen → completion through custom proxy | Official-provider/OAuth conversion unverified |
| `M0:model-discovery.json` | Public online discovery from cold state | One provider |
| `M0:guest-shell.json` | OMP `BashTool`/`AsyncJobManager` start/output/exit/stop/retention | Service reconnect and authorization remain separate |
| `M0:mcp-transports-config.json` | Installed loopback HTTP/SSE discovery/calls/reconnect | Default discovery, notification refresh, remote OAuth, abrupt outage unverified |
| `M0:auth-paths.json` | Default/XDG/explicit AuthStorage paths, owned 0600 DB | No credential conversion or restart durability |
| `M0:host-pty-tab-close.json` | Linux Host PTY tab close cleans five births | Signal-resistant/daemonized and non-Linux unverified |

Unresolved cells and their GAPs:

| GAP | Question left open | Evidence tried | Consequence |
|---|---|---|---|
| GAP-02 | Does any current canonical surface project OMP's agent-definition fields beyond model/allowed-tools, including spawn policy and advisor/effort fields? | `OMP:task/types.ts`; canonical agent schema; `OCB` catalog source; no runtime query | Agent parity P1/P2 |
| GAP-03 | Is every OMP built-in role addressable by Host routing? | `OMP:config/model-roles.ts`; `OCB:packages/web/server/lib/routing` | Routing parity |
| GAP-04 | Is retry/fallback policy observable to the client? | `OMP:session/retry-fallback-chains.ts`; canonical event list | Completion/failure only |
| GAP-05 | Is plan mode retained in M4/M5? | `DOC-SCOPE`/`DOC-IMPL` M4/M5 text; no current UI | Deferred |
| GAP-06 | Does any retained surface need engine-level multi-root? | `OMP:sdk.ts`; canonical workspace contract | Deferred |
| GAP-07 | Who owns context files: Host or OMP? | `OMP:capability/context-file.ts`; `OCB:packages/web/server/lib/context-obligatory` | Double-injection risk |
| GAP-08 | Which memory backend is the product surface? | `OMP:memory-backend`; `OCB:packages/web/server/lib/agent-memory` | Two memory systems |
| GAP-09 | Are OMP task worktrees visible or purely internal? | `OMP:task/settings.ts`; Host git; no canonical task-isolation UI | Invisible capability |
| GAP-10 | Does the worker environment exclude Host secrets and the internal token? | `OCB:packages/agent-service/src/supervisor/workers.ts:216-220` copies `process.env` + overlay and deletes only `OHPICHAMBER_INTERNAL_SECRET`; `DEV` review | Host secrets other than the token remain inherited; hardening 04 |
| GAP-11 | How should OMP `write`/`yolo` map to canonical fail-closed? | `OMP:tools/approval.ts`; `OCB:packages/agent-service/src/interaction` | Policy decision |
| GAP-12 | Are OMP ask timeout/recommended/multi-select projected? | `OMP:tools/ask.ts`; canonical question schema | UX parity |
| GAP-13 | Is OMP's credential cascade exposed anywhere? | `OMP-AI:auth-storage.ts`; canonical provider accounts | Keep worker-private |
| GAP-14 | Are MCP prompts/resources projected? | `OMP:mcp/manager.ts`; canonical MCP routes | Surface narrower than OMP |
| GAP-15 | Is ACP required by any retained client? | `OMP:modes/acp`; scope matrix | Deferred |
| GAP-16 | Is `proxy.js` reachable in production? | `OCB:packages/web/server/lib/opencode/proxy.js:219`; no production import found | Dead weight |
| GAP-17 | Are OMP browser/computer/eval/IDA/debug/LSP/security-scan retained? | `OMP:tools/builtin-names.ts`; scope matrix | Deferred |
| GAP-18 | Does the service prove `.agents/skills` discovery? | `OMP:discovery/agents.ts:177`; `OCB:packages/agent-service/src/worker/catalog-skills.ts` | Skill parity |
| GAP-19 | Should OMP hooks be exposed to third parties? | `OMP:extensibility/hooks/types.ts`; Guest SDK | Separate trust models |
| GAP-20 | Are provider health and native usage projected? | `OMP-AI:auth-storage.ts`; Host quota | Opaque provider health |
| GAP-21 | Is any OMP CLI/TUI surface a product requirement? | `OMP:modes`; `OMP:commands`; scope matrix | Deferred |
| GAP-22 | Does OpenCode 2.0.25 ship a proven source revision? | `package.json` repository only; `bun.lock` integrity | `revision: unproven`; comparisons are package-level only |
| GAP-23 | Is the `@opencode/protocol` route group set stable for this package version? | `OCP:groups/`; `bun.lock:1538` | Package-level only |
| GAP-24 | Does the historical inventory's OpenCode 1.x behavior still describe 2.0.25? | `HIST`; `OCS`/`OCC`/`OCP` | No; only concept-level inheritance is claimed |
| GAP-25 | Does any current UI still name OpenCode in user-visible text? | Review-verified `OCB` scan: 1,509 matching lines / 1,836 occurrences in `packages/ui/src`, mostly comments and i18n keys | Task 09 owns the truth pass |

## 9. Review record

- Review chronology: the initial Brief A and Brief B reports both returned `blocked`; the blocking and straightforward nonblocking findings were fixed in this report. The final Brief A report had no blockers and one provenance note (where the installed OpenCode package copies were read), now fixed in §2. The final Brief B report passed clean.
- Earlier corrections retained: section references, package-qualified OMP citations, full OCB paths, schema trace/disposition coverage, column escaping, counts, citation ranges, origin-label semantics, GAP merge, `S/R` definition, M3 evidence removal, and the review-coverage claim.
- Reviewed boundary: the earlier Brief A/B review covers the report-only comparison at audit-start `f72010e3ef453a5218c3464b674b86c0ccc00a04`; rebasing moved those report commits onto `ecdeb110d835d09defa60d4e91b0e1dbecf8a3df`. This evidence-only update changes §9, not the matrices, source claims, or trust boundaries; it reconciles the captured root gate with its exact receipt and reruns narrow document checks. It is not a new source or runtime review.
- Ownership: the template task record remains untouched under its explicit `Files` ownership; it is not edited or archived, and no landing or completion claim is made.
- Scope: one read-only evidence pass plus this report-only correction. Only `.workflow/research/omp-opencode-openchamber-audit.md` was written; no task record, spec, decision, glossary or package file was changed.
- Source identity: OMP revision/fingerprint and OpenCode package versions/integrities recorded; OpenCode revision explicitly `unproven`. `OMP-AI` resolves the separate `pi-ai` tarball; coding-agent `session/auth-storage.ts` is a re-export.
- Matrices: eight domains, each with a semantics table and a linked disposition table sharing IDs; every required cell filled or `absent`/`unknown` with a GAP. Origin labels describe lineage, not present ownership.
- Evidence classes: `S` for source, `R` for the cited receipt boundary, `I` for inference; `S/R` is pinned source plus a separately cited receipt for only the exercised boundary; every `I` row carries a GAP. No `S` row promotes to `verified`.
- Retirement coverage: VS Code, cloud sharing, config/auth importers, lifecycle/proxy/port probing, LSP cleanup, `.opencode/commands`, engine identity, agent identity/profile schema, session/event schema, custom-provider endpoint schema, MCP config schema and engine switching are accounted for in §5, §7 and GAP-16/GAP-25.
- Runtime limits: existing M0 receipts and the development record only; no new run, build, test, probe or network access in the evidence pass. M3 runtime evidence is excluded from the register.
- Landing gate: not landed and not archived. The one coordinator-authorized full `bun run test` ran in Lane E worktree `/home/shizuku/Project/ohpichamber-worktrees/lane-e-audit`, branch `lane-e/omp-opencode-comparison`, HEAD `1739fd0da40b553cc399c926bf7e171e3ac4a3f1`, base and exact merge-base `ecdeb110d835d09defa60d4e91b0e1dbecf8a3df`; it exited 1. No further root test was run.
- Root gate totals: 0/7 suites passed: scripts 17/22 test files (5 failed); SDK 12/23 (11 failed); UI 252/804 (552 failed); agent-contract 0/22 (22 failed, 22 errors); agent-service 0/36 (36 failed, 36 errors); Electron 38/44 (6 failed); Web could not start (`vitest` not found, exit 127). The log evidences missing dependencies/modules (`zod`, `tsx/cjs`, `@legendapp/list/react`, OMP/workspace packages, and `vitest`); Electron's `ensure-electron` test also failed its `resolveElectronPackageDir` assertion while the Electron package was unavailable. These indicate setup/environment failures; no report-specific defect is evidenced, but the acceptance gate remains failed and this does not establish that source tests pass.
- Exact combined stdout/stderr log, exit code, and receipt: `/home/shizuku/Project/ohpichamber-omp-artifacts/lane-e-root-gate-20261023.qtML76/root-test.stdout-stderr.log`, `/home/shizuku/Project/ohpichamber-omp-artifacts/lane-e-root-gate-20261023.qtML76/root-test.exit`, and `/home/shizuku/Project/ohpichamber-omp-artifacts/lane-e-root-gate-20261023.qtML76/receipt.txt`; fresh per-run `TMPDIR` was `/home/shizuku/Project/ohpichamber-omp-artifacts/lane-e-root-gate-20261023.qtML76/tmp`.
- Validation: after this rebase, `.workflow/bin/workflow validate` exits 0 with `Workflow is valid (120 task files)`. Narrow report checks found 22 tables with 0 column-count mismatches; 8 domains whose semantics/disposition tables pair exactly (85 IDs); 0 inference rows without a GAP; 9 `S/R` rows all naming an M0 receipt in the same row; 300 concrete citations resolved with 0 unresolved; 6 ledger placeholder patterns excluded; and 0 cited line ranges beyond file bounds. Receipt: `/home/shizuku/Project/ohpichamber-omp-artifacts/lane-e-root-gate-20261023.qtML76/rebase-doc-checks.json`. The earlier pre-rebase validator warning belonged to `.workflow/done/post-m3-hardening/03-m3-gate-at-tip.md` and is resolved by this rebase without editing that record.
- Decision boundary: no product decision or implementation is recorded; the P0-P3 register states implications and owners only.
- Follow-up documents/tasks suggested by this audit (not created here): a maintainer decision on isolated spaces (hardening 08), a security proof for the worker environment (04), a completion-consumer audit (06), and a UI text truth pass (09).
