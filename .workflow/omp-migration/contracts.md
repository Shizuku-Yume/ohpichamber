# Canonical Agent API v1 contract

This document defines the proposed Canonical Agent API v1 protocol (`/api/agent/v1`). It establishes the contract between OpenChamber client surfaces (Web, Desktop, Mobile, Guest extensions) and the Agent Service running on top of the Oh My Pi (OMP) SDK.

This contract is a proposed design specification. The TypeScript schemas and endpoint structures in this document are design models, not yet exported interfaces in the repository. The proposed target packages `packages/agent-contract` and `packages/agent-service` do not exist yet; the current `packages/sdk` owns the implemented Guest extension contract, including panel, lifecycle, file-editor, storage and service-provider APIs, rather than the proposed canonical agent contract.

The [latest-upstream rebaseline](../specs/upstream-rebaseline.md) has adopted the application source. The [refreshed-source traceability](scope.md#refreshed-source-traceability) identifies additional consumers of this proposed protocol. M0 must establish actual OMP session, execution, approval, credential and completion behavior before these draft schemas become exported contracts.

Related migration documents:
- Scope and boundaries: [scope.md](scope.md)
- Deployment and process architecture: [architecture.md](architecture.md)
- Staged migration plan: [implementation-plan.md](implementation-plan.md)
- Baseline inventory and gap analysis: [feature-inventory.md](feature-inventory.md)
- Migration roadmap index: [README.md](README.md)

## Authority and precedence

When requirements conflict, documents follow this strict hierarchy:
1. Explicit user instructions.
2. [scope.md](scope.md) (product boundaries and retained surfaces).
3. [contracts.md](contracts.md) (protocol semantics and wire contracts).
4. [architecture.md](architecture.md) (process topology and deployment ownership).
5. [implementation-plan.md](implementation-plan.md) (milestone sequencing).
6. [feature-inventory.md](feature-inventory.md) (historical baseline analysis).

## Core invariants

1. **OMP Target Only.** The protocol targets OMP directly. It contains no OpenCode compatibility layer, no legacy OpenCode field aliasing, and no dual-engine selectors.
2. **Single State Authority.** OMP owns the conversation transcript and execution artifacts. The OpenChamber Host Gateway owns the durable prompt queue, session goals, and routing. The OpenChamber Agent Service owns session runtime projection and metadata. OpenChamber never builds a second duplicate transcript store.
3. **Fail-Closed Security.** OMP tool approval coverage is unverified. Any tool execution or capability request with missing, ambiguous, or incomplete permission definitions must halt and require explicit approval.
4. **No Silent Empty Success.** Unsupported endpoints, missing sessions, or invalid capability negotiations must return explicit HTTP error codes and structured failure envelopes. A server must never return HTTP 200 with an empty body (`{}` or `[]`) to mask unsupported features.
5. **JSON-Safe Projections.** Raw OMP SDK objects, Circular references, Symbols, and Node.js or Bun stream handles must never cross process or network boundaries. The Agent Service projects SDK state into plain, JSON-serializable Data Transfer Objects (DTOs).
6. **Path Isolation.** Client-facing payloads, attachments, and internal URIs must never expose host absolute filesystem paths. All files use opaque identifiers or repository-relative paths.

## Refreshed-source obligations before contract freeze

- Guest Shell subscriptions include scoped running and ended snapshots, output tails, stopping and terminal status. The current UI consumes OpenCode Shell events and output APIs. Verify OMP lifecycle/output ownership in M0 and define its canonical projection without copying OpenCode Shell shapes or publishing guessed endpoints. Preserve `packages/sdk` as the separate Guest contract.
- Stateless completion serves Git/PR generation, titles, goals and walkthrough through current small-model callers. Probe text and structured completion, cancellation, model selection and errors before assigning canonical commands. The M0 capability fixture observed text, structured, cancellation and failure completion through controlled OMP mock/custom dispatch. That is SDK behavior only, not evidence for a public endpoint contract; canonical commands remain proposed. Host services must not become a second direct-provider engine. [M0 capability artifact](m0/capabilities-fixture.json)
- SourceBoard session/worktree launch and environment overlays need directory-bound execution. The M0 isolation fixture passed dedicated workers but failed all shared-process cwd/env modes. Shared process is unsafe for ambient cwd/env in this observed fixture, so dedicated workers are the current evidence-backed boundary direction. This evidence does not change ADR-03 or any API schema. [M0 isolation artifact](m0/isolation-artifact.json)
- The inherited bridge translates OpenCode text, reasoning, tool and execution events. Their names and 50 ms delta batching are not canonical contracts. Measure OMP ordering and fragment density; retain canonical cursors and authoritative resync semantics regardless of transport batching.
- Isolated-space dispatch currently forwards the inherited runtime. Its tokens, untrusted identity/events, quarantined code transfer, and gatekeeper grants need an OMP mapping with live boundary evidence. Source import alone does not establish it.
- Atomic JSON queue persistence is current source behavior. The target SQLite queue and its leases are a deliberate migration. Neither queue may duplicate the engine transcript or reinterpret fetch failure as authoritative empty state.


---

## Route matrix

All agent endpoints reside under the canonical prefix `/api/agent/v1`.

Clients reach this API through the OpenChamber Host Service (Node.js/Electron), which handles authentication, rate limiting, and session cookie validation. The Host Gateway forwards valid requests over a local loopback connection to the internal Agent Service (Bun) using short-lived internal credentials. The internal Agent Service is never exposed directly to external networks.

### Endpoints

| Method | Path | Summary | Auth | Idempotent | Mode |
|---|---|---|---|---|---|
| `GET` | `/api/agent/v1/health` | Service health status | Optional | Yes | JSON |
| `GET` | `/api/agent/v1/ready` | Readiness and OMP SDK probe | Optional | Yes | JSON |
| `GET` | `/api/agent/v1/capabilities` | Negotiate capabilities and features | Required | Yes | JSON |
| `GET` | `/api/agent/v1/models` | List available models and modalities | Required | Yes | JSON |
| `GET` | `/api/agent/v1/sessions` | List sessions for a directory | Required | Yes | JSON |
| `POST` | `/api/agent/v1/sessions` | Create a new session | Required | Yes (Key) | JSON |
| `GET` | `/api/agent/v1/sessions/:sessionId` | Get session metadata and status | Required | Yes | JSON |
| `PATCH` | `/api/agent/v1/sessions/:sessionId` | Update session metadata | Required | Yes | JSON |
| `DELETE` | `/api/agent/v1/sessions/:sessionId` | Delete session and child sessions | Required | Yes | JSON |
| `GET` | `/api/agent/v1/sessions/:sessionId/history` | Paginated message and turn history | Required | Yes | JSON |
| `POST` | `/api/agent/v1/sessions/:sessionId/runs` | Start a new agent execution run | Required | Yes (Key) | JSON |
| `POST` | `/api/agent/v1/sessions/:sessionId/runs/:runId/abort` | Abort an active run | Required | Yes | JSON |
| `POST` | `/api/agent/v1/sessions/:sessionId/steer` | Inject prompt into running turn | Required | Yes (Key) | JSON |
| `POST` | `/api/agent/v1/sessions/:sessionId/follow-up` | Stage prompt for next turn | Required | Yes (Key) | JSON |
| `GET` | `/api/agent/v1/sessions/:sessionId/queue` | List durable queued prompts | Required | Yes | JSON |
| `POST` | `/api/agent/v1/sessions/:sessionId/queue` | Append prompt to durable queue | Required | Yes (Key) | JSON |
| `DELETE` | `/api/agent/v1/sessions/:sessionId/queue/:queueItemId` | Remove prompt from queue | Required | Yes | JSON |
| `POST` | `/api/agent/v1/sessions/:sessionId/queue/reorder` | Reorder queued prompts | Required | Yes | JSON |
| `GET` | `/api/agent/v1/sessions/:sessionId/approvals` | List pending tool approvals | Required | Yes | JSON |
| `POST` | `/api/agent/v1/sessions/:sessionId/approvals/:approvalId/respond` | Resolve approval (CAS versioned) | Required | Yes (CAS) | JSON |
| `GET` | `/api/agent/v1/sessions/:sessionId/questions` | List pending human questions | Required | Yes | JSON |
| `POST` | `/api/agent/v1/sessions/:sessionId/questions/:questionId/respond` | Submit question answer | Required | Yes (CAS) | JSON |
| `GET` | `/api/agent/v1/sessions/:sessionId/events` | SSE event stream | Required | Yes | SSE |
| `POST` | `/api/agent/v1/attachments` | Upload attachment or media file | Required | No | Multi/JSON |
| `GET` | `/api/agent/v1/attachments/:attachmentId` | Download attachment content | Required | Yes | Binary |
| `GET` | `/api/agent/v1/subagents` | List subagents for a session | Required | Yes | JSON |

### Capability negotiation

Because OMP capabilities, model providers, and platform plugins vary, clients must negotiate capabilities at startup.

Endpoint: `GET /api/agent/v1/capabilities`

The client may send query parameters or headers describing client-supported features:
`GET /api/agent/v1/capabilities?clientFeatures=streaming,cas_approval,subagents`

Response payload:
```json
{
  "version": "1.0.0",
  "engine": "omp",
  "capabilities": {
    "streaming": true,
    "casApprovals": true,
    "midTurnSteering": true,
    "followUpQueue": true,
    "subagents": true,
    "sessionBranching": true,
    "reasoningParts": true,
    "documentExtraction": true
  },
  "limits": {
    "maxAttachmentSizeBytes": 20971520,
    "maxQueueDepth": 50,
    "streamCatchupBufferSize": 1000
  },
  "experimental": {}
}
```

If a client attempts an action requiring an unsupported capability, the server returns HTTP 501 (`NOT_IMPLEMENTED`) or HTTP 400 (`UNSUPPORTED_CAPABILITY`). It never accepts the call silently.

### Standard error schema

All error responses adhere to RFC 7807 structured problem details:

```json
{
  "error": {
    "code": "APPROVAL_CONFLICT",
    "message": "Approval request was already resolved by another client.",
    "status": 409,
    "retryable": false,
    "details": {
      "approvalId": "appr_9872",
      "currentStatus": "approved",
      "resolvedBy": "desktop-client-main",
      "expectedVersion": 2,
      "actualVersion": 3
    }
  }
}
```

Standard error codes:
- `SESSION_NOT_FOUND`: Session does not exist or was deleted.
- `RUN_ACTIVE`: Cannot start a new run while another run is active. Use `/steer`, `/follow-up`, or `/queue`.
- `RUN_NOT_FOUND`: Referenced run ID does not exist.
- `APPROVAL_NOT_FOUND`: Approval request does not exist or expired.
- `APPROVAL_CONFLICT`: Approval version mismatch during CAS resolution.
- `APPROVAL_EXPIRED`: Approval expired due to timeout or runtime restart.
- `IDEMPOTENCY_CONFLICT`: Command ID reused with conflicting payload parameters.
- `RESYNC_REQUIRED`: Client event cursor is too old or epoch mismatched; full state reload required.
- `INVALID_CURSOR`: Pagination or stream cursor cannot be parsed.
- `UNSUPPORTED_CAPABILITY`: Requested feature is not enabled or not supported by OMP.
- `SESSION_RESTORE_FAILED`: Session could not be restored because the saved model is unavailable or incompatible.
- `PAYLOAD_TOO_LARGE`: Upload or input exceeds size limit.
---

## Identity and domain models

The following TypeScript schemas represent the proposed wire contracts. These models are strict DTOs.

```typescript
// Proposed types for packages/agent-contract

export type EntityId = string;

export interface Session {
  sessionId: EntityId;
  projectId: EntityId;
  directory: string; // Absolute path on Host, normalized; not exposed over public relay
  title: string;
  parentSessionId?: EntityId; // Present if spawned as a subagent
  rootSessionId: EntityId;    // Equal to sessionId for root sessions
  createdAt: number;
  updatedAt: number;
  archivedAt?: number;
  epoch: string;              // Current runtime epoch
  headSequence: number;       // Latest event sequence number
  metadata: SessionMetadata;
}

export interface SessionMetadata {
  folder?: string;
  isPinned?: boolean;
  color?: string;
  icon?: string;
  goal?: string;
  notes?: string;
}

export type TurnStatus =
  | "pending"
  | "running"
  | "awaiting_approval"
  | "awaiting_input"
  | "completed"
  | "failed"
  | "cancelled";

export interface Turn {
  turnId: EntityId;
  sessionId: EntityId;
  status: TurnStatus;
  userMessageId: EntityId;
  assistantMessageIds: EntityId[];
  startedAt: number;
  finishedAt?: number;
  error?: string;
}

export interface Message {
  messageId: EntityId;
  sessionId: EntityId;
  turnId: EntityId;
  role: "user" | "assistant" | "system";
  createdAt: number;
  parts: Part[];
}

export type Part =
  | TextPart
  | ReasoningPart
  | ToolCallPart
  | ToolResultPart
  | AttachmentPart
  | StepSummaryPart;

export interface TextPart {
  type: "text";
  partId: EntityId;
  content: string;
}

export interface ReasoningPart {
  type: "reasoning";
  partId: EntityId;
  content: string;
  signature?: string; // Optional cryptographic proof or provider token
}

export type ToolStatus =
  | "pending_approval"
  | "approved"
  | "running"
  | "completed"
  | "failed"
  | "denied"
  | "cancelled";

export interface ToolCallPart {
  type: "tool_call";
  partId: EntityId;
  toolCallId: EntityId;
  toolName: string;
  input: Record<string, unknown>;
  status: ToolStatus;
  approvalId?: EntityId;
}

export interface ToolResultPart {
  type: "tool_result";
  partId: EntityId;
  toolCallId: EntityId;
  toolName: string;
  output?: unknown;
  error?: string;
  isError: boolean;
}

export interface AttachmentPart {
  type: "attachment";
  partId: EntityId;
  attachmentId: EntityId;
  name: string;
  mediaType: string;
  size: number;
  uri: string; // e.g. "attachment://att_4920"
}

export interface StepSummaryPart {
  type: "step_summary";
  partId: EntityId;
  title: string;
  durationMs?: number;
}

export interface ApprovalRequest {
  approvalId: EntityId;
  sessionId: EntityId;
  turnId: EntityId;
  toolCallId: EntityId;
  toolName: string;
  actionType: "bash_command" | "file_write" | "network_request" | "custom_tool";
  commandSummary: string;
  details: Record<string, unknown>;
  version: number; // Monotonic counter for CAS
  status: "pending" | "approved" | "rejected" | "revoked" | "expired";
  requestedAt: number;
  resolvedAt?: number;
  resolvedBy?: string;
}

export interface QuestionRequest {
  questionId: EntityId;
  sessionId: EntityId;
  turnId: EntityId;
  prompt: string;
  schema?: Record<string, unknown>; // JSON schema for structured responses
  status: "pending" | "answered" | "cancelled";
  response?: unknown;
  requestedAt: number;
  answeredAt?: number;
}

export interface Attachment {
  attachmentId: EntityId;
  name: string;
  mediaType: string;
  size: number;
  uri: string; // "attachment://<id>"
  createdAt: number;
}

export interface Model {
  modelId: string;
  provider: string;
  name: string;
  modalities: Array<"text" | "image" | "audio" | "embedding">;
  contextWindow: number;
  reasoningEffortSupported: boolean;
}

export interface Subagent {
  subagentId: EntityId;
  parentSessionId: EntityId;
  childSessionId: EntityId;
  role: string;
  solutionSpace?: string; // Characterizes task openness, aligned with OMP task tool
  status: "idle" | "running" | "completed" | "failed";
}
```

---

## Streaming protocol and catch-up

The streaming protocol delivers real-time execution events to client interfaces over Server-Sent Events (SSE). WebSocket connections use identical event frames.

### Event Format

Each event contains standard SSE fields:
```text
id: ep_98a7:42
event: message.delta
data: {"sessionId":"sess_102","epoch":"ep_98a7","sequence":42,"timestamp":1774201002000,"partId":"prt_4","delta":"Updating"}
```

### Cursor and Epoch Semantics

- **Epoch (`epoch`)**: A unique string identifying the server runtime lifecycle. A new epoch is minted whenever the Agent Service restarts or resets its memory buffer.
- **Sequence (`sequence`)**: A monotonically increasing 64-bit integer per session event stream, beginning at 1.
- **Cursor (`cursor`)**: The formatted string `${epoch}:${sequence}` passed in the `Last-Event-ID` header or `?cursor=` query parameter.

### Event Catch-Up and Invalidation Flow

```
Client                                      Host Gateway / Agent Service
  |                                                      |
  |--- GET /api/agent/v1/sessions/:id/events ----------->|
  |    (Header: Last-Event-ID: ep_98a7:40)               |
  |                                                      |
  |    [Case 1: Epoch Matches & Sequence in Buffer]      |
  |<-- 200 OK (text/event-stream) -----------------------|
  |<-- event: message.delta (seq: 41) -------------------|
  |<-- event: message.delta (seq: 42) -------------------|
  |    [Normal live streaming continues]                 |
  |                                                      |
  |    [Case 2: Epoch Mismatch or Buffer Overflow]       |
  |<-- event: resync_required ---------------------------|
  |    data: {"epoch":"ep_b120","reason":"EPOCH_MISMATCH"}|
  |                                                      |
  |--- GET /api/agent/v1/sessions/:id/history ---------->|
  |<-- 200 OK (Full snapshot of messages and state) -----|
  |--- Reconnect stream with new cursor ---------------->|
```

Rules for catch-up and deduplication:
1. **Client Deduplication.** Clients track the highest observed sequence for the active epoch. If an event arrives with `sequence <= lastSeenSequence` under the same epoch, the client drops the event immediately.
2. **Buffer Bounds.** The Agent Service retains a ring buffer of the last 1,000 events per active session.
3. **Resync Required.** If the client requests a cursor older than the ring buffer boundary or presents an outdated epoch, the server emits `event: resync_required` and closes the stream with status 410 (`GONE`). The client must clear optimistic state, fetch a fresh history snapshot, and open a new stream.

---

## Commands, idempotency, and delivery guarantees

Clients issue mutating commands to initiate runs, steer active execution, or manage the queue.

### No Distributed Exactly-Once Delivery

In distributed systems and multi-process architectures, crashes can occur at three distinct points:
1. Before the request reaches the server (action never executes).
2. During server execution before disk commit or state save (partial failure).
3. After server execution and commit, but before the network acknowledgment reaches the client (action executed, but client receives network error or timeout).

Because network acknowledgments and server crashes are decoupled, physical **exactly-once execution is impossible**. The Canonical protocol provides **at-least-once transport with at-most-once execution** via persistent idempotency keys.

### Idempotency Key Semantics

All mutating endpoints (`/runs`, `/steer`, `/follow-up`, `/queue`, `/sessions`) accept an `Idempotency-Key` HTTP header containing a client-generated UUIDv4.

1. **Storage.** The Gateway records processed idempotency keys in persistent storage with an expiration window of 24 hours.
2. **Replay Detection.** If a request arrives with an existing key:
   - If the original request is still processing, the server returns HTTP 409 (`CONFLICT`) with `code: "COMMAND_IN_FLIGHT"`.
   - If the original request completed successfully, the server returns the cached response status and payload without re-running the command.
   - If the original request failed with a deterministic client error (HTTP 4xx), the server returns the same error response.
3. **Payload Mismatch.** If the incoming payload differs from the recorded payload for the same key, the server rejects the call with HTTP 400 (`IDEMPOTENCY_CONFLICT`).

### Single Delivery Owner

Prompt delivery has one single owner: the Host Gateway.

```
Client UI ---> Host Gateway (Single Delivery Owner) ---> Agent Service (OMP)
                   |
                   +-- Durable Prompt Queue (FIFO)
                   +-- Mid-Turn Steering Router
                   +-- Follow-Up Stage
```

- **Immediate Run (`/runs`)**: Sent to the Agent Service only if the session runtime is idle.
- **Mid-Turn Steer (`/steer`)**: Injects guidance into an active OMP execution step. Only valid when the session turn status is `running` or `awaiting_approval`.
- **Follow-Up (`/follow-up`)**: Held by the Gateway and dispatched to the Agent Service immediately when the current run transitions to a terminal state.
- **Durable Queue (`/queue`)**: Persisted by the Gateway in disk storage. Items are dequeued sequentially only when the session is completely idle and no follow-up is pending.

The Agent Service never implements a secondary queue. It processes runs dispatched by the Gateway.

---

## Lifecycle and terminal state separation

A critical invariant of the Canonical protocol is the strict separation between **Run terminal states** and **Tool terminal states**.

### Tool Failure Does Not Fail the Run

A tool call failure (e.g. non-zero bash exit code, missing file, or permission denial) terminates only that tool call:
- Tool terminal states: `completed`, `failed`, `denied`, `cancelled`.

When a tool finishes with `failed` or `denied`, the Agent Service injects a `tool_result` part containing the failure details back into the agent context. The LLM observes the error and can choose to explain the issue to the user, try a different approach, or ask a question. The outer Run remains active and in state `running`.

### Run Terminal States

A Run represents the entire multi-step conversation cycle initiated by a user prompt.
- Run terminal states: `completed`, `failed`, `cancelled`.

The Run reaches `failed` only if the model execution itself crashes unrecoverably (e.g. context window exhaustion, provider quota error, or internal agent panic).

### OMP turn_end semantics

OMP emits `turn_end` internally at the end of each reasoning cycle. In an agentic loop, one user request may generate multiple internal reasoning cycles, multiple tool calls, and multiple OMP turns.

**Observed fixture distinction:** OMP emits `turn_end` internally at the end of each reasoning cycle, and terminal `agent_end` is a distinct event. The canonical `run.completed` event remains proposed until an Agent Service projection exists. Clients and gateway adapters must never treat OMP's internal `turn_end` as completion of the outer user request. [M0 lifecycle artifact](m0/lifecycle.json)

---

## Approvals, questions, and human-in-the-loop

Tool approvals and human questions halt model execution until a user or automated rule provides feedback.

### Multi-client compare-and-swap (CAS)

Multiple client surfaces (e.g. desktop window, mobile phone, and web browser) can observe the same session simultaneously. To prevent race conditions and conflicting actions:
1. Every approval object carries a monotonic integer `version`.
2. Resolving an approval requires sending the expected version:
   ```json
   POST /api/agent/v1/sessions/:sessionId/approvals/:approvalId/respond
   {
     "decision": "approved",
     "version": 1
   }
   ```
3. If Client A approves while Client B rejects, the first request increments the version and succeeds. The second request fails with HTTP 409 (`APPROVAL_CONFLICT`) and receives the updated record.

### Pending approvals on restart

If the Agent Service, Host, or OMP runtime restarts while approvals are pending:
1. Pending approvals are marked `expired` or `revoked`.
2. Silent auto-approval across restart is strictly prohibited.
3. Upon reconnect, the agent must either re-evaluate whether the action is still required or report that execution was interrupted.

### Fail-closed tool approval

OMP permission rule evaluation is not assumed to be fully verified.
- If a tool requires approval and no matching rule explicitly allows it, execution halts.
- If approval configuration is corrupt, missing, or references an unknown tool name, the system fails closed and prompts the user for approval.

### Interactive questions via OMP ask tool

The M0 capability fixture observed direct approval/question request, resolve and cancel behavior that supports fail-closed fixture semantics. The separate restart-pending fixture observed pending requests, worker termination, a distinct fresh OMP session, and measured tool/answer/event counts. Its direct UI seam exposes no cross-worker response handle, so stale resolution is explicitly unavailable and approval/question parent probes remain partial. Neither fixture verifies CAS, RPC stale replies, durable request recovery or Agent Service restart semantics. The CAS and restart rules above remain proposed. See the [capability artifact](m0/capabilities-fixture.json), [restart-pending artifact](m0/restart-pending.json), and [development evidence](../development.md#m0-fixture-evidence).
---

## Session topology, branching, and deletion

### Branching versus filesystem rewind

The protocol treats conversation history branching and filesystem modifications as completely separate concerns:

1. **Branching.** Branching forks the message transcript at an earlier turn. The Agent Service creates a new linear history path from that turn.
2. **No Filesystem Rollback.** Branching does not rewind files, delete created files, or revert Git commits made by tools in abandoned turns.
3. **Explicit Host Operations.** If a user wishes to restore previous file states, they must execute explicit Host Git operations (e.g. `git restore` or worktree branch switching) through Host APIs.

### History Pagination Across Branch Versions

The history endpoint retrieves linear history leading up to a specific branch leaf:

`GET /api/agent/v1/sessions/:sessionId/history?leafTurnId=turn_881&limit=50&cursor=cur_10`

Query parameters:
- `leafTurnId` (optional): Identifies the leaf turn of the desired branch. If omitted, the session's active head is used.
- `limit` (optional): Number of messages to return (default 50, maximum 100).
- `cursor` (optional): Opaque pagination cursor.

The response returns messages ordered chronologically along the selected branch path, ensuring sibling branch messages are never interleaved.

### Session Deletion Hierarchy

Session deletion follows a strict hierarchy without heuristic guessing:

```
Project
  └── Worktree
        └── Root Session (sessionId)
              └── Subagent Session A (childSessionId)
              └── Subagent Session B (childSessionId)
```

Rules:
1. **Cascade to Children.** Deleting a Root Session automatically cascades to delete all associated child subagent sessions and active runs.
2. **Worktree Protection.** Deleting a session never deletes repository files or worktree directories on disk unless an administrative parameter `purgeWorkspaceFiles: true` is explicitly provided.
3. **Active Run Guard.** Attempting to delete a session with an active run returns HTTP 409 (`RUN_ACTIVE`) unless `force: true` is set, which aborts the run first.

---

## Attachments, media, and URI privacy

To preserve privacy across remote web surfaces, mobile connections, and cloud relays:

1. **Zero Host Path Leakage.** File attachments must never include absolute host paths (e.g. `/home/user/code/file.txt` or `C:\Users\...`).
2. **Opaque URIs.** Uploaded files receive an opaque identifier and URI format: `attachment://att_a8f902`.
3. **Workspace-Relative Paths.** Files referenced from the active repository use `workspace://relative/path/to/file.ts`.
4. **Content Negotiation.** Large documents (Office documents, PDFs) are validated and converted to sanitized text projections by the Host before submission to OMP, respecting the 500,000 character limit.

---

## Metadata sidecar and transcript ownership

OpenChamber maintains a single-writer metadata sidecar alongside the OMP transcript.

- **OMP Storage**: Stores message history, tool invocations, execution steps, and subagent transcripts.
- **OpenChamber Sidecar (`session-meta.json` or SQLite)**: Stores user-facing metadata, including custom title, folder assignment, pinned status, session goals, and assist suggestions.

The metadata sidecar never mirrors or caches conversation messages or tool outputs. This prevents split-brain inconsistencies between OpenChamber and OMP.

---

## Representative JSON payloads

### 1. Capabilities Response

`GET /api/agent/v1/capabilities`
Status: 200 OK

```json
{
  "version": "1.0.0",
  "engine": "omp",
  "capabilities": {
    "streaming": true,
    "casApprovals": true,
    "midTurnSteering": true,
    "followUpQueue": true,
    "subagents": true,
    "sessionBranching": true,
    "reasoningParts": true,
    "documentExtraction": true
  },
  "limits": {
    "maxAttachmentSizeBytes": 20971520,
    "maxQueueDepth": 50,
    "streamCatchupBufferSize": 1000
  },
  "experimental": {}
}
```

### 2. Run Creation Request and Response

`POST /api/agent/v1/sessions/sess_alpha/runs`
Headers:
- `Idempotency-Key: c9a3e264-9721-4f9e-a81d-8f2e604f3219`
- `Content-Type: application/json`

Request body:
```json
{
  "input": {
    "text": "Analyze why the authentication middleware fails on expired tokens.",
    "attachments": [
      {
        "attachmentId": "att_8812",
        "uri": "attachment://att_8812"
      }
    ]
  },
  "options": {
    "modelId": "claude-3-7-sonnet",
    "reasoningEffort": "medium"
  }
}
```

Response:
Status: 202 Accepted
```json
{
  "runId": "run_9012",
  "sessionId": "sess_alpha",
  "turnId": "turn_301",
  "status": "pending",
  "createdAt": 1774201000100
}
```

### 3. Server-Sent Events Sequence

`GET /api/agent/v1/sessions/sess_alpha/events`
Headers:
- `Last-Event-ID: ep_1a:10`

Stream output:
```text
event: session.status
data: {"sessionId":"sess_alpha","epoch":"ep_1a","sequence":11,"timestamp":1774201000200,"status":"running"}

event: turn.started
data: {"sessionId":"sess_alpha","epoch":"ep_1a","sequence":12,"timestamp":1774201000250,"turnId":"turn_301","userMessageId":"msg_u1"}

event: message.created
data: {"sessionId":"sess_alpha","epoch":"ep_1a","sequence":13,"timestamp":1774201000300,"messageId":"msg_a1","turnId":"turn_301","role":"assistant"}

event: part.started
data: {"sessionId":"sess_alpha","epoch":"ep_1a","sequence":14,"timestamp":1774201000350,"part":{"type":"text","partId":"prt_t1","content":""}}

event: part.delta
data: {"sessionId":"sess_alpha","epoch":"ep_1a","sequence":15,"timestamp":1774201000400,"partId":"prt_t1","delta":"Checking the token expiration logic in src/auth.ts."}

event: tool.started
data: {"sessionId":"sess_alpha","epoch":"ep_1a","sequence":16,"timestamp":1774201001000,"toolCallId":"tc_read1","toolName":"read","input":{"path":"src/auth.ts"}}

event: tool.completed
data: {"sessionId":"sess_alpha","epoch":"ep_1a","sequence":17,"timestamp":1774201001200,"toolCallId":"tc_read1","isError":false,"output":"export function verifyToken..."}

event: run.completed
data: {"sessionId":"sess_alpha","epoch":"ep_1a","sequence":18,"timestamp":1774201002000,"runId":"run_9012","turnId":"turn_301","finishedAt":1774201002000}
```

### 4. Approval Request and CAS Resolution

Event emitted on stream:
```text
event: approval.requested
data: {"sessionId":"sess_alpha","epoch":"ep_1a","sequence":19,"timestamp":1774201002100,"approval":{"approvalId":"appr_55","sessionId":"sess_alpha","turnId":"turn_301","toolCallId":"tc_sh1","toolName":"bash","actionType":"bash_command","commandSummary":"npm test auth","details":{"command":"npm test auth"},"version":1,"status":"pending","requestedAt":1774201002100}}
```

Resolution request:
`POST /api/agent/v1/sessions/sess_alpha/approvals/appr_55/respond`
Request body:
```json
{
  "decision": "approved",
  "version": 1
}
```

Success response:
Status: 200 OK
```json
{
  "approvalId": "appr_55",
  "status": "approved",
  "version": 2,
  "resolvedAt": 1774201003500
}
```

Conflict response (if already resolved):
Status: 409 Conflict
```json
{
  "error": {
    "code": "APPROVAL_CONFLICT",
    "message": "Approval request was already resolved.",
    "status": 409,
    "retryable": false,
    "details": {
      "approvalId": "appr_55",
      "currentStatus": "rejected",
      "expectedVersion": 1,
      "actualVersion": 2
    }
  }
}
```

### 5. Structured Error: Unsupported Capability

Request to an unsupported experimental endpoint:
`POST /api/agent/v1/sessions/sess_alpha/fork-replay`

Response:
Status: 501 Not Implemented
```json
{
  "error": {
    "code": "UNSUPPORTED_CAPABILITY",
    "message": "Fork replay is not supported by the active OMP runtime.",
    "status": 501,
    "retryable": false,
    "details": {
      "requestedFeature": "fork-replay",
      "engine": "omp",
      "documentation": ".workflow/omp-migration/contracts.md#capability-negotiation"
    }
  }
}
```
