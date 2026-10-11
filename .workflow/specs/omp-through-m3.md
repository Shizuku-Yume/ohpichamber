# OMP migration through M3

**Status:** in progress
**Priority:** high

## What this is for

The adopted upstream application still executes through OpenCode. The Agent Service, canonical contract package and `/api/agent/v1` are absent. The maintainer requested a planned migration through M3 acceptance, using concurrent OMP sessions where task boundaries permit it and avoiding repeated checks or speculative defensive code.

Existing M0 reports prove some SDK behavior, not an implemented service or client cutover. [Development progress](../development.md) remains the owner of observed evidence. This effort continues that work rather than acquiring upstream source or repeating accepted probes.

## What it does

Web and Electron use OMP through the Host Gateway. A user can create a session, submit an attached prompt, observe reasoning and tool execution, answer approvals and questions, abort, retry, reload and reopen the transcript. Reconnecting obtains an authoritative snapshot and resumes from its cursor without duplicating parts. A runtime switch cannot publish responses from the previous runtime.

Retained consumers use canonical commands and records. This includes the sidebar and Board launch, composer commands and skills, provider/model/agent/MCP settings, Guest Shell observation, and utility generation. Host filesystem, Git, worktree, PTY, authentication, pairing, relay, notification and voice capabilities keep their existing owners.

M3 acceptance does not claim M4 autonomous-feature certification or M5 packaged/mobile/Docker release certification. Their existing callers still require a coherent canonical execution dependency where needed to retire the old client. No retained caller may rely on an OpenCode fallback.

## How it is built

### Authorities

Product decisions remain in [scope](../omp-migration/scope.md), protocol behavior in [contracts](../omp-migration/contracts.md), topology in [architecture](../omp-migration/architecture.md), and milestone gates in the [implementation plan](../omp-migration/implementation-plan.md). This spec owns execution boundaries and checks through M3, not a second protocol definition.

The existing prerequisite was closed at its source/document boundary by `decisions.md: 2026-10-11 - Rebaseline task closes at source and document boundary`. Its unexercised certification is not silently marked passed.

### M0 evidence and contract reconciliation

Use the pinned official OMP 18.8.9 source and existing identity/evidence records as the comparison input. Task 19 observed that the published package and exercised first-party owners differ from that source. Task 24 established an installable source-derived dependency closure; its strict probe exit 1 remains recorded and no prompt was submitted. Task 08 must preserve those identities and re-establish application owners before dependency acceptance. Keep authored TypeScript, generated assets, native wrappers and prebuilt addon identities distinct; a matching version number is not source identity.

Task 01 completed the real SDK Guest Shell command probe through the OMP execution owner, observing start, output, exit status, cancellation and retention limits. Service reconnect, byte cursors, retained terminal history and capability-enforced scope isolation remain task 12 acceptance, not SDK guarantees. Reuse existing lifecycle, completion, MCP and isolation reports only for unchanged exercised owners.

Before exporting types, reconcile draft contradictions and unsupported assumptions with source and measurements. These include public absolute directory paths, event naming, snapshot/cursor atomicity, stream error status before versus after headers, metadata ownership, credential and skills storage paths, and question/approval resolution versions. Service-only behavior such as stale reply rejection still needs service evidence; a direct SDK fixture is not a substitute.

Task 19 measured isolated default/XDG AuthStorage paths separately from explicit agent-directory override; task 24 established the source-derived installed identity. Neither proves stored-credential conversion or model discovery. Task 02's [evidence boundaries](../omp-migration/implementation-plan.md#evidence-boundaries-for-gate-03) identify remaining original M0 requirements for task 03 to judge.

Tasks 25, 26, 27 and the narrow task 28 fill reachable original M0 gaps before gate 03: installed public-factory/auth/skills/permission paths, MCP configuration/transports, actual Host PTY tab close, and the remaining full-factory interactive permission seam. They reuse task 24's immutable package inputs and unchanged earlier evidence. Each investigation records its actual failures and limits; archiving an investigation does not accept the capability or release M1. External provider/OAuth and non-Linux requirements remain for the gate review and any necessary maintainer decision.

A failed resource target remains failed until a measured design change or explicit maintainer decision addresses it. The maintainer accepted the measured Linux fixture worker RSS as a known M0 limitation in `decisions.md: 2026-10-11 - Accept measured worker memory as an M0 limitation`; the original 100 MiB probe remains failed and actual service resources still require M2 evidence. Other unavailable platform/provider behavior retains its actual status. Do not close M0 by renaming missing required evidence as a later task.

### M1 host boundary

Move host-owned settings, theme, project, tunnel, process registry and startup code out of `lib/opencode`, updating callers without re-exports. Preserve modules already owned by filesystem, Git, terminal, environment, guests and source-control integrations.

Inventory VS Code references before retirement. Remove extension entrypoints, package/build/release paths and UI-specific bridges while preserving external editor launching and VS Code theme import. Generated release notes remain read-only.

Expose canonical health/capability state through the Host, preserving authentication and per-window runtime URLs. M1 task 05 implements authenticated explicit credential-handoff intent/preflight and provider-specific boundaries. Without the real service it reports unavailable, reads/stages no secrets and claims no import; no Node SDK AuthStorage write or ad-hoc pre-M2 worker is allowed. Actual handoff remains mandatory in task 22 after M2 SDK integration.

Deletion follows replacement dependencies. Task 21's M1 gate proves Host extraction, metadata/handoff ownership and extension retirement, not final execution-owner deletion. Task 22 migrates server execution consumers before M2 gate 23. Task 17 performs coordinated M3 lifecycle/proxy/config/auth retirement only after service, server and UI consumers plus explicit credential handoff are ready. M1 extraction cannot require the service whose implementation it unlocks; final retirement acceptance remains mandatory at M3.

### M2 service and host integration

The Node Host Gateway supervises a private Bun Agent Service. Dedicated SDK workers own their session cwd, resolved environment and cleanup. OMP remains the only transcript writer. Host-owned metadata and SQLite delivery state do not duplicate conversation history.

A shared canonical contract package contains JSON-safe records, command responses and ordered events without SDK or OpenCode types. A single service projector supplies history and live records with stable IDs. Host authorization applies to host-tool access independently of client visibility.

Before enabling the canonical runtime, migrate server execution consumers and browser callers; no second authority remains. Move goals/recap/context cursor/pins to Host metadata before removing their source. M2 task 22 completes the explicit credential handoff through the real Bun service, proving SDK AuthStorage write/read-reload and provider-specific imported/unsupported/re-authentication outcomes. Host obtains only selected credentials after service readiness, sends them privately, stages no secrets and never imports at startup. Gate 23 requires actual handoff evidence; task 17 removes importer and legacy readers at cutover.

Implement actual approval/question request handles and versioned resolution. A worker restart invalidates old requests; an old response cannot resolve a new request. Implement the durable Host queue cutover, scoped Shell projection, catalogs/configuration, and stateless completion through their verified owners. No empty-success stand-ins.

### M3 client cutover

Replace OpenCode input to sync and loaders with the Canonical Client. Migrate records, reducers and all dependent components directly; do not disguise legacy fields behind aliases. Preserve useful rendering and directory/global scope separation.

Cut over composer submission, attachments, abort, retry, steering, follow-up and queue operations. Update registry/settings consumers and remove engine-specific controls. Cut over Board, Guest Shell, utility-generation and execution-dependent retained callers. Host-owned user filesystem APIs stay separate from agent tools.

After dependent callers move, remove the old UI client, translators, runtime selectors, config/auth/lifecycle routes and imports made obsolete by the cutover. Later M5 work remains explicit rather than represented as passed by a Linux development run.

### Parallel ownership

Each implementation task owns an isolated worktree and one bounded set of files. The coordinator owns shared package manifests, lockfile, gateway composition, shared protocol changes and integration. Read-only sessions may share a tree.

Implementation advances through gates 03 (M0), 21 (M1 extraction/preflight), 23 (M2 real service/server consumers/credential handoff), then 18 (M3). Tasks 01/19 are independent investigations; task 24 resolves source-install identity before task 02; independent evidence tasks 25, 26, 27 and 28 follow 02 before gate 03. M1 extension retirement can run independently of extraction; metadata and health/preflight follow extraction, without premature SDK import. M2 interaction/queue/catalogs follow projection; task 22 then performs server migration and actual handoff before gate 23. M3 caller slices follow core client/composer; task 17 activates and retires obsolete owners. No stage advances past an unmet gate; coordinator resolves shared-contract changes before dependent slices land.

The maintainer has authorized all future local Git operations for this repository and the necessary OMP SDK dependencies. GitHub commands and pushing remain outside this request. Pre-existing worktree changes remain separate until their ownership/landing is settled.

### Verification policy

Each boundary gets one focused proof that exercises its real path. Keep permanent regression tests for plausible observable failures, especially duplicate parts, stale responses, cross-worker environment, request resolution and queue recovery. Do not add tests for imports, forwarding or incidental wording.

Run package checks after a slice lands, not from each concurrent worker. Run workspace type-check, lint, affected builds and dead-code once after the cross-workspace integration. Re-run only the checks invalidated by a subsequent fix. Final Web and Electron scenarios may cover multiple acceptance IDs in one connected run.

## What it must not do

- Add OpenCode-shaped adapters, field aliases, dual-engine selectors, a fallback engine or automatic transcript/credential import.
- Reimplement unrelated host services, redesign the UI, add unrequested frameworks, or change release notes.
- Add speculative retry, cache, pooling or policy abstractions. Preserve required process, state, authorization and data-loss invariants with the existing owner.
- Claim a provider, OS, relay, packaged updater, mobile or Docker boundary passed without running it.
- Replace retained functionality with unsupported flags merely to obtain a green M3 check. SDK limitations require explicit product handling through the existing scope hierarchy.

## What was considered and rejected

- **Replace only the primary chat client.** It yields an early chat demo, but leaves settings, Board, Shell, utility generation and retained execution callers on the old engine. It cannot satisfy the M3 unreachable-old-client gate.
- **Keep an OpenCode adapter during cutover.** It reduces immediate component edits, but conflicts with the selected clean cutover and embeds legacy types in the new contract.
- **Repeat every historical smoke after each task.** It produces more runs without proving new behavior. Focused owner checks and one integrated acceptance run provide evidence at the boundary that changed.
- **Serialize independent implementation in one shared tree.** It avoids merge coordination, but does not use the requested concurrency. Isolated worktrees with a single integration owner preserve both concurrency and ownership.

## How we will know it works

Each task Check names the existing package runner or the new executable owned by that task. Temporary real-path smoke scripts are removed after recording their observations; do not add permanent smoke command infrastructure solely to make planning checks look concrete. Resolve focused file selections from the actual changed owners. Documentation validation is not behavioral acceptance.

- **W1.** M0 evidence identifies the exercised installable SDK, answers scoped Shell and contract-freeze questions, and retains every failed/partial/unavailable observation without fabricated passage. Only unresolved prerequisites required by the authoritative gate block freezing.
- **W2.** The running host preserves settings/theme/project/auth/FS/Git/PTY owners after extraction. VS Code extension runtime/build/release references are removed; external editor and theme import remain.
- **W3.** Through authenticated Host routes, create a session in a temporary workspace, stream a prompt, abort another run, read/reopen history and close the worker. Observe ordered canonical records, sibling-worker isolation and no publication after closure.
- **W4.** Resolve one real pending approval and question through canonical requests; competing replies cannot both succeed, reconnect preserves pending state, and a restart expires old handles without executing the rejected action.
- **W5.** Busy/offline queue commands survive a host restart, preserve attachments/order/revisions, dispatch once through their delivery owner and report storage failure without erasing unrelated valid queues.
- **W6.** Service-backed model/provider/agent/MCP/skill commands and Shell/completion operations work through the Host Gateway. Configuration failure stays distinct from empty/unconfigured state; secrets stay off public responses.
- **W7.** Web and Electron can create, stream, abort, reload and reopen a session using the actual Canonical Client. Timeline reasoning/tool/attachment/error rendering and composer inputs use canonical types.
- **W8.** A disconnected client recovers snapshot plus cursor without duplicate parts. Epoch gaps force resync; stale responses from a previous runtime cannot mutate the selected runtime.
- **W9.** Settings/composer catalogs, sidebar metadata/folders/retention, Board session launch, Guest Shell and every utility-generation caller use the canonical owner. Host FS editing and dirty-file moves remain independent of agent execution.
- **W10.** The integrated affected package checks pass, retained UI cannot reach the old OpenCode client, and the host has no obsolete agent lifecycle/proxy consumer. Record remaining M4/M5 work separately. Workflow and local documentation validation pass.

W7-W10 require the integrated application and are rerun at effort closure. Earlier focused runs can satisfy multiple IDs; do not duplicate them solely because several task files mention the same evidence.

## Open questions

The first M0 task and protocol reconciliation settle SDK facts, not user preferences. Current milestone wording and incomplete reports require a source-backed gate review before claiming M0 or choosing an execution order. Any required unavailable platform/resource acceptance remains open until the maintainer decides or its evidence becomes reachable.

The maintainer authorized the assembled migration baseline in `decisions.md: 2026-10-11 - Continue from the assembled migration baseline`. M0 worktrees use the committed workflow and probe inputs. Later application worktrees must also include the assembled application source; the old HEAD does not contain it.

## Notes

Planning read the root manifest, host composition imports and host module documentation, sync imports and sync/store documentation, Web/Electron READMEs, existing M0 spec/fixtures/runner, migration design and development record. The known UI search returned 460 matching files including tests, not 460 production call sites.

Tasks are under `../tasks/omp-through-m3/`. This effort is complete only when its checks and the authoritative M3 gate have current-state evidence. Planning or partial M0 progress does not complete the maintainer's objective.

Execution order and gate tasks:

1. M0: 01 and 19; 24 follows 19; then 02; independent evidence tasks 25, 26, 27 and 28; gate 03.
2. M1: 04 and 06; 05 and 20 follow 04; gate 21 follows all M1 work.
3. M2: 07, 08, 09; 10, 11 and 12 follow 09; server consumers 22, then gate 23.
4. M3: 13, 14; independent caller slices 15 and 16; coordinated runtime cutover 17, then acceptance gate 18.

Existing M0 evidence is reused only for unchanged SDK behavior. Gates 03, 21, 23 and 18 remain unarchived on any unresolved required item; a well-written blocker report does not release the next stage.
