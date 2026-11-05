# Implementation plan

This plan records milestones, work packages, gates, and acceptance evidence for the OMP-only boundary in [scope.md](./scope.md), the runtime topology in [architecture.md](./architecture.md), and the Canonical API contract in [contracts.md](./contracts.md). Implemented status and observed evidence live in [development.md](../development.md); milestone text is not itself acceptance.

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

A disposable probe report must cover every SDK capability listed above, including process exit, persistence paths, cwd ownership, pending cleanup, event ordering and concurrency. Gate 03 compares those original requirements and the architecture risk table against actual artifacts and recorded maintainer decisions. Unknown required SDK behavior remains a gate unless the maintainer explicitly accepts it as a release limit; it is never a passed observation or automatic reassignment to M2. The M1-only release limits are recorded in `decisions.md: 2026-10-12 - Leave unavailable platform evidence outside the M0 release condition` and `decisions.md: 2026-10-12 - Enter M1 with the observed provider path and explicit OAuth limitation`. Service-only contracts remain M2 acceptance and cannot be passed using SDK fixtures. The original failed 100 MiB target retains the existing acceptance of the measured Linux limitation; it is not relabelled passed.

### Evidence boundaries for gate 03

The owning observation and current handoff record is [development.md](../development.md#m0-fixture-evidence); detailed outcomes remain in the linked artifacts. The table below preserves the evidence-to-requirement boundaries. Task29 is archived with a valid corrected measured receipt and its defective disposable source discarded without reuse. Task31 supplied the final required online model discovery evidence through a reviewed public installed-SDK run. Gate03 accepts the M0 handoff for M1 after validation and archival. Accepted provider/platform limits and unchanged evidence/reviews remain reusable, not an implemented Host/service/runtime claim.

| Required area | Existing evidence and unresolved boundary |
|---|---|
| Session lifecycle, history, branch, subagent and completion | Existing lifecycle/capability fixtures retain their observed outcomes. Raw lifecycle names are snake_case; the measured run had 31 events, 5 fragments, 2 `turn_end` and 1 terminal `agent_end`. Canonical dotted events, request IDs and resumable cursors are service design, not fixture observations. Controlled stateless text/structured/cancel/error operations do not prove every retained Host caller or a public endpoint. |
| Installed runtime and discovery | Task24 exercised public factory creation/disposal, caller-owned AuthStorage close and native token/width/diff actions with `modelSelected=false`; no prompt was submitted. Its exit1 and12 denied discovery fetch attempts remain unchanged. Exact fetch arguments and Rust source-build equivalence are unestablished identity/observation limits, not newly invented gates. Task31 separately observed real public installed-SDK online discovery from cold empty state through the approved provider's actual HTTP response to fresh matching registry publication, followed by owned cleanup. Its reviewed artifact satisfies this original M0 requirement without rerunning completion; it does not alter task24's failed strict guard or establish an application catalog. |
| Credentials | Auth path cases and all seven historical stored-format records retain their original unavailable authentication/unknown migration status. Task 29 separately observed the approved custom-proxy stored API key through public persistence, close, cold-reopen, reload and real installed factory prompt completion; [development.md](../development.md#additional-m0-reachable-evidence) owns the corrected run and review state. Official-provider conversion and OAuth refresh/scopes/account selection remain unverified, explicitly accepted for M1 only by the cited decision. A syntactic round trip or this narrow proxy run cannot replace task-22 real service handoff and per-provider outcomes at gate 23. |
| MCP | Earlier stdio refresh/manual reconnect observations remain unchanged. Task 26 separately observed installed loopback HTTP/SSE discovery/calls, explicit schema refresh, disable/disconnect/re-enable/config apply, local auth-challenge handling, manual SSE reconnect and HTTP transport-close callback recovery. Its injected config loader was not default discovery or a file watcher; no list-changed notification, remote OAuth or abrupt network outage was exercised. Failed replacement after explicit disconnect lost the prior catalog; no last-good transaction/rollback was proved. Task 12 must implement and prove retained dynamic enable/disable, immediate service apply and failure preservation, not treat stored config as applied runtime. |
| Skills | Agent-directory globals and `.omp/skills` discovery/filtering plus explicit `buildSkillPromptMessage` → `AgentSession.prompt` were exercised. Task 25 also observed full-factory system-prompt generation, retained `.agents/skills` discovery and public skill delivery. Direct slash expansion is unsupported only in that lower-level fixture. CLI handling is an unexercised descriptive limitation, not an additional M0 gate: the original direct-SDK probe rejects CLI/RPC substitution. Host installation/service expansion remain required, and task 15 owns product Composer mentions/slash acceptance. |
| Permissions and restart | Task 28 observed installed full-factory built-in `write` approval/deny, `bash` selector cancellation and headless refusal with requested/resolved events, side-effect checks and cleanup. The restart fixture still had no cross-worker handle and recorded stale resolution unavailable, not rejected. Atomic approval/question CAS, request generations, restart expiry and reconnect recovery require task 10 service proof. |
| Workers and Shell | Dedicated-worker isolation passed; shared-process cwd/env and original 100 MiB idle target failed. ADR-03 preserves exact RSS and the existing Linux limitation acceptance. Task 30 was withdrawn as a mandatory M0 release condition under the cited platform decision; no platform probe ran, and non-Linux/macOS resources/isolation/cleanup remain unverified. Nine Guest Shell SDK probes and dedicated Linux runner orphan cleanup do not prove cross-project authorization or service reconnect/retention. Actual service resources and cleanup remain M2 requirements. |
| Host risk probes and owner correction | Higher-authority `SCOPE-6.3` places the target Host Gatekeeper in M2; no target tool-interception Gatekeeper is implemented. `PROBE-05` retains 10,000 actual Host-boundary file accesses in task 10/gate 23, without a speculative cache/TTL before measurement. Task 27's `host-pty-tab-close.json` separately passed one real Linux Host PTY tab-close background/subshell tree with all five original process births absent, its port refusing connections and an unrelated sibling alive. This is bounded existing-Host evidence, not unexercised signal-resistant/daemonized workloads, non-Linux cleanup or the whole-Host shutdown's 20-second tracker sweep. |

Atomic snapshots, bounded replay, stream invalidation after headers and Host metadata revisions are intentional service/Host contracts in [contracts.md](contracts.md), not additional raw SDK acceptance. Rebaseline certification remains unverified, without moving retained requirements: Board provider grants/reads remain Host M1 and canonical launches M3 (`SCOPE-14.6`); isolated-space execution/security integration is M2 with real Docker release certification M5; Electron/mobile/updater and final Guest navigation certification remain M5. Existing Web/PWA navigation limits stay explicit and no replacement port is granted after unapproved self-navigation. No unavailable result is silently marked passed or required M0 fact silently deferred.


## M1: host boundary and VS Code removal

### Work

- Keep Web/PWA, Electron, Capacitor mobile, and the Guest SDK in the supported product matrix.
- Remove the VS Code extension from the supported build and release matrix. Remove its package, workflow, root scripts, documentation routes, and source references only after all references are inventoried.
- Preserve host ownership of filesystem, Git, worktree, PTY, browser broker, auth, pairing, relay, notification, voice, and guest sandbox code.
- Extract the 19 retained modules named by [scope.md](scope.md#preserving-host-infrastructure-in-libopencode) from `packages/web/server/lib/opencode/`, migrate their callers and remove extraction aliases. Host configuration, project-directory validation, settings persistence and startup behavior must not disappear with engine code. Do not classify legacy SSE `watcher.js`, `.opencode` snippet CRUD `snippets.js`, or mixed execution shutdown `shutdown-runtime.js` as generic Host extraction. Keep still-used execution owners until their canonical replacement consumers and coordinated M3 retirement are ready.
- M1 task 05 implements authenticated explicit user intent and provider-specific credential preflight. Service absence is an explicit unavailable result, not imported or successful conversion. Do not read/stage credential secrets before the real service is ready, write SDK AuthStorage from Node, or invent an early SDK worker. The accepted M0 provider limitation releases M1 only; actual one-time handoff/write/read-reload acceptance remains mandatory in task 22 with the real M2 service.
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

**Current status (2026-10-22):** The M3 Canonical Client cutover, task 17 lifecycle retirement, PWA manifest fix, native child `yield` authorization, paired-result child link, and W8 projection fix (`f4e609dc1`) are integrated at source `8d179c4e2`. The a92 matrix on artifact `a92fbb36…` passes W7 visual sanity, W8, W9 packaged child/Board/Guest, W10 and PWA (`.workflow/omp-migration/m3/task57-a92-matrix-2026-10-22/`); W1-W6 reuse archived gates. Limits: packaged live-region at 400 ms is inconclusive while the Web announcement was observed; PWA auth proof is the Web Host with existing packaged state, not packaged Electron password auth; child snapshot 404 is the intentional history-only contract. The final root gate passed at `8d179c4e2` on 2026-10-22 (all seven phases exit 0; `.workflow/omp-migration/m3/task18-gate-final-2026-10-22.json`), and Task18/Task57 technical work is archived. The earlier `b9fbb4bb0` gate and `068a` artifacts are historical. The technical W1-W10 gate is complete and final maintainer acceptance is pending; the spec remains in progress. M4 orchestration and M5 release certification remain open, and this closure does not select or claim an M4 implementation.

## M4: OpenChamber orchestration features and OMP TUI parity

**Status (2026-11-05):** re-planned into [M4: Orchestration adaptation, OMP TUI parity, and feature verification](../specs/m4-orchestration.md) and tasks `.workflow/tasks/m4-orchestration/01`-`14` following the completed comparison audits (`.workflow/research/omp-opencode-openchamber-audit.md`, `crude-port-ledger.md`, and `.workflow/research/omp-tui-parity-audit.md`). Session Goals (`SCOPE-10.2`), Durable Message Queue (`SCOPE-10.4`), and Agent Todo (`SCOPE-11.4`) are already implemented and verified on `main`; M4 fixes the remaining adaptation defects in Workflows, Auto Routing, Small-Model role resolution, B3 settings/runtime truth, and `CP-09` branch revert, delivers full OMP 18.16.0 built-in TUI feature and display parity (`Tasks 06–13`), then executes end-to-end verification and removes the unverified M4 documentation banners (`Task 14`).

### Work

- **Agent Workflows (`SCOPE-12.4`, Task 01):** nest workflow branch sessions under the proposing session via `parentSessionId` and force `options.agentId: null` so workflow sends pass Host root-prompt admission.
- **Model and Intent Routing (`SCOPE-10.5`, Task 02):** keep policy ownership in OpenChamber; remove root `AgentSelector` / `agentId` overrides, drive category thinking controls from `model.reasoningOptions`, and write `options.reasoningEffort`.
- **Small-Model, Walkthrough, AI Git/PR, and Guest `generate` (`SCOPE-8.2`, `SCOPE-10.1`, `SCOPE-10.6`, Task 02):** resolve utility completions through OMP's `modelRoles` (`commit` for Git commit/PR generation, `smol` for Session Assist, Walkthrough, and auto-titling, falling back to `default`), and remove duplicate Host `smallModelOverride` / `walkthroughModelOverride` settings.
- **Prompt purity and single permission authority (Task 03):** remove first-message `<system-reminder>` response-style injection (`BehaviorPage.tsx`), remove the dead `agentToolsCodeMode` toggle, and retire Host `permissionDefaultMode` / `permission-auto-accept` in favor of OMP `tools.approvalMode`, ACP session permissions, and the Host Gatekeeper.
- **Worker LSP, unmanaged MCP configs, and branch revert (`CP-09`, Task 04):** remove the hardcoded `enableLsp: false` worker override so OMP `lsp.*` settings apply; project hand-written/unmanaged `.omp/mcp.json` files read-only without 500 `MCP_CONFIG_READ_FAILED`; and return non-fatal 409 errors on cancelled or cleanly rolled-back `selectBranch` operations without killing the worker.
- **Settings navigation and terminology (Task 05):** rename the `'opencode'` nav group key to `'agent'`, distinguish `Guest Extensions` from `OMP Plugins`, and label prompt templates `Prompt Templates`.
- **OMP 18.16.0 Built-in TUI Feature & Display Parity (Tasks 06–13):**
  - **Tool & Markdown Visuals (Task 06):** enable `out://` mid-turn replies (`ReplyWrite`); render inline ````svg```` figures and numeric Markdown table auto-charts; add `ast_edit` multi-file diffs and `ast_grep`/`eval`/`lsp`/`checkpoint`/`rewind` cards; group consecutive `read` calls (`ReadToolGroup`); and stream incremental tool arguments (`tool_stream_update`).
  - **Subagent Live HUD, Steer & Cancel (Task 07):** project `TASK_SUBAGENT_PROGRESS_CHANNEL` and `TASK_SUBAGENT_EVENT_CHANNEL` (live tool, tokens, cost, turn count, nested tree) and add `subagent.steer` and `subagent.cancel` controls.
  - **Timeline Notices, Compaction Divider & Context Gauge (Task 08):** project and render `todo_reminder`, `ttsr_triggered`, `auto_retry_start` / `retry_fallback_applied`, `served_model_mismatch`, and `cache_invalidation`; upgrade `session.compacted` with method, `tokensBefore → tokensAfter`, and summary; and add compaction/speculation threshold tick marks to `ContextUsageDisplay`.
  - **16 Model Roles, Presets & Settings (Task 09):** replace the raw JSON `modelRoles` textarea in `OmpSettingsPage.tsx` with visual model/effort selectors for all 16 OMP roles and expose `cycleOrder`, `modelPresets`, `modelRoleStorage`, `tier.*`, `out.enabled`, `tui.render*`, and tool/buffer settings.
  - **Slash Commands, Magic Keywords, Turn Budgets, URL Autocomplete & Prediction (Task 10):** allowlist headless OMP commands (`/handoff`, `/retry`, `/rename`, `/effort`, `/model`, `/switch`, `/fast`, `/slow`, `/prewalk`, `/force`, `/pin`, `/fresh`, `/clear`, `/dirs`, `/session`, `/memory`), support `ultrathink`/`orchestrate`/`workflowz`/`jevify` shimmer + notices and `+Nk!` turn budgets, add internal URL autocomplete, and wire optional idle ghost-text prompt prediction.
  - **Checkpoints/Rewind, `/btw` Branch Promotion & Plan Enhancements (Task 11):** wire `checkpoint`/`rewind` (`branchWithSummary`), add `branchFromBtw` and `<inject>` to `BtwPanel.tsx`, and support deferred mid-run Plan mode entry, `plan.autosave`, and execution model selection in `PlanReviewCard.tsx`.
  - **Background Jobs Sheet, `proc://` & Job Widgets (Task 12):** add `JobsSheetDialog.tsx` with full stdout/stderr, `proc://` pipe streams, stdin for named services, `JobCaptionWriter` summaries, and `JobWidgetRegistry` live metrics.
  - **Autonomous Loops, `/omfg`, `/cleanse`, `/tan`, `/seance` & Advisor Watchdog (Task 13):** wire `/loop` (`--until`/`--while`), `/omfg` TTSR rule synthesis, `/cleanse` parallel diagnostic repair board, `/tan` background session clone, `/seance` historical session consult, and Advisor watchdog (`AdvisorMessage` timeline cards).
- **End-to-end verification and documentation truth (Task 14):** verify all orchestration and OMP TUI parity features on the integrated runtime (including Session Goals `SCOPE-10.2`, SQLite Message Queue `SCOPE-10.4`, Project Context/Knowledge/Memory `SCOPE-11.1–11.3`, Agent Todo `SCOPE-11.4`, Session Assist `SCOPE-10.3`, Scheduled Tasks `SCOPE-12.1`, Multi-run/Fusion `SCOPE-12.2–12.3`, Notifications/Linear `SCOPE-14.2/14.4`, Browser Control `SCOPE-9.2/18.4`, and Quota/Usage `SCOPE-14.3`) and remove the unverified M4 banners from product docs across all 12 locales.

### Gate

The M4 spec's W1–W18 checks are the gate. Every retained orchestration and OMP TUI parity feature has focused automated and real-provider verification evidence under `/home/shizuku/Project/ohpichamber-omp-artifacts/m4-verification-<date>/`, no feature uses root `agentId` or reads OpenCode metadata/routes/configs, and the unverified M4 banners are removed from product documentation across all locales.

## M5: release and retained surfaces

**Status (2026-11-04):** re-planned and approved by [M5: Release and retained surfaces](../specs/m5-release-surfaces.md) and tasks `.workflow/tasks/m5-release-surfaces/01`-`09`. Task 26 is archived; the native leaf gate was resolved by task 29 accepting official registry leaves with SLSA provenance, unlocking the non-Linux release matrix while preserving unrun target runtime certification. Prerequisites `post-m3-hardening/13` and `38` are archived; surfaces can proceed as runner/device prerequisites resolve.

### Work

- Certify the retained desktop matrix: Electron macOS arm64/x64, Windows x64/arm64 and Linux x64/arm64. Each artifact installs, launches the embedded Host and Agent Service, completes a real-provider prompt, and verifies signing/notarization or update metadata.
- Certify Capacitor mobile on a physical Pixel 8 (Android 15/API 35, arm64-v8a) and a physical iPhone (iOS 26, TestFlight): pairing, canonical chat, reconnect, approval/question recovery, push-click routing and offline queue. Release stays blocked until both devices pass.
- Bundle the Agent Runtime into the packed `@openchamber/web` artifact using the Electron-verified staged payload, so a clean install starts the Host and Agent Service without a repository checkout, private workspace dependency or published OMP package.
- Keep Docker as a supported server path: the image starts the Host and Agent Service on linux/amd64 and linux/arm64 without OpenCode and the compose file mounts only retained OpenChamber paths.
- Keep isolated spaces unreleased. The server release gate refuses create, start, repair and model/login grants; no OpenCode runtime, config, credential row, readiness check or proxy remains. Building the OMP space runtime is a separate effort.
- Publish the Guest SDK version decided in `decisions.md: 2026-10-24 - Break the Guest SDK version for the private bootstrap transport`, and run the packaged `v2` bootstrap smoke. `contributes.tools` stays presentation metadata unless the Agent Service registers an executable OMP custom tool; no new Guest execution capability is claimed here.
- Certify that the OpenCode package, environment, config/auth/importer, route, lifecycle, UI, documentation, test and workflow retirement remains complete in release artifacts, and that no VS Code extension artifact returns. M5 is not permission to keep those owners.
- Verify the completed Host metadata migration and one-time credential handoff in the release candidate; do not rerun a removed importer or silently import OpenCode transcripts/credentials. A transcript importer requires separate versioned scope.
- Update user, install and developer documentation to describe only the rows the candidate certified.

### Gate

The M5 spec's R1-R10 checks are the gate. A release candidate built by `.github/workflows/release.yml` from one commit must produce every retained row, every row must have real runner, device or container evidence (or an explicit maintainer waiver naming the stand-in), and no artifact may contain an OpenCode runtime, VS Code extension or compatibility process. The Canonical Server and Agent Service start from the release package without a fallback engine.

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
