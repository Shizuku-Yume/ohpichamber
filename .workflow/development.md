# Development progress and lessons

Read this record before implementation, together with the [agent guide](../AGENTS.md) and [migration index](omp-migration/README.md). Product scope and protocol decisions belong to the migration documents; this file records observed progress and reusable findings.

## Current state

The [rebaseline effort](specs/upstream-rebaseline.md) has adopted the pinned upstream application source. [Task 01](done/upstream-rebaseline/01-baseline-and-fork-inventory.md) is archived after both independent review briefs passed; [Task 02](done/upstream-rebaseline/02-update-and-restore.md) is complete at the source/document boundary; and [Task 03](done/upstream-rebaseline/03-reaudit-documents.md) records the source-aware documentation audit. W3 runtime certification remains explicitly unexercised where credentials or platforms are unavailable. M0 remains open.

This status was source-checked on 2026-10-11. The retained host still runs the inherited OpenCode integration; `packages/agent-service`, a canonical contract package and `/api/agent/v1` implementation are absent. Host-owned code remains mixed into `lib/opencode`, and `packages/vscode` still participates in source, root scripts and release workflows. Retirement is a target, not a completed deletion.

The assembled frozen installation, workspace build, type-check, lint and dead-code checks passed under isolated Node 24.14.0. Connected Host Gateway, Guest lifecycle/action/command transport, scoped Electron bridge, unsaved-move UI and Xvfb Quake/shortcut smoke passed. The isolated-space route test passed only with a stand-in; live Docker containment remains unverified. The early Guest bootstrap ordering is source-tested and the chosen handoff passed protocol-level review; Web/PWA self-navigation still lacks a browser pre-navigation hook and remains a documented confidentiality limit. The root `bun run test` now passes after replacing stale window-message fixtures with real Guest ports in WorkStatus, GuestHosts and SDK examples.


| Work | Status | Evidence and limits |
|---|---|---|
| Fork-specific agent guidance | Completed, documentation checked | Root `AGENTS.md` identifies the OMP-only target, required reading, inherited-rule precedence, and Host Gateway versus Agent Service boundary. Local document links and anchors were checked. No runtime behavior was changed or exercised by that documentation task. |
| Migration index alignment | Completed, documentation checked | `omp-migration/README.md` delegates design precedence to `scope.md` and aligns worker isolation with architecture ADR-03. This is a design correction, not concurrency evidence. |
| Persistent development record | Established | `AGENTS.md` routes implementation tasks here and requires progress and reusable findings to be maintained with meaningful changes. |
| Development-focused repository cleanup | Completed, static checks passed | Removed upstream contribution templates, ownership assignment, nine collaboration bot workflows, their obsolete commands, two queue-triage skills and aliases, and 84 unreferenced review images. Root README now keeps development setup and technical references. Ten build/test/release workflows remain; their YAML parses. |
| Selective upstream synchronization | Implemented, historical focused verification | Portable tooling, host, Electron/mobile, UI, SDK/guest, Git, locale, settings and notification changes were selected from upstream v2.1.1. OpenCode 2, new GitLab/enterprise scope and VS Code expansion were excluded. Recorded earlier runs passed 142 host CLI/guest/Git tests, 241 settings/i18n/SDK tests, 106 UI regressions, hashes for 15 SDK examples, and UI/web/Electron type-checks. Additional earlier checks covered 37 notification tests, 7 native push tests and rebase recovery. Native builds were not verified because the earlier environment lacked Android SDK and Xcode; availability was not rechecked here. |
| Runtime smoke limits | Historical partial smoke | The earlier standalone Vite browser smoke loaded the UI/logo but had no host backend. `/api/project/current` returned HTTP 500 and the UI remained server-unavailable. This does not prove a connected host session. Earlier dead-code reports were non-blocking inventory, not cleanup evidence. |
| OMP migration gate | Additional M0 evidence recorded; gate open | Existing lifecycle/capability/isolation/restart results retain their actual statuses. Task 01's normal Guest Shell path passed 9 probes; the reproduced interrupted native orphan was fixed and its affected quality/security reviews passed. Task 19 established auth paths and the source/published mismatch. Task 24 must establish an installable source-derived dependency closure before contract freeze and gate 03. The original 100 MiB RSS target remains failed with explicit maintainer acceptance as an M0 limitation. No Agent Service, client cutover or platform certification is claimed. |
| Historical upstream assessment | Reviewed, not applied; selective policy superseded | [upstream-review.md](upstream-review.md) retains the v2.1.1-to-pinned-main investigation and source references. Its old pick/exclude/defer choices are not current import constraints. The new effort refreshes upstream and adopts its coherent baseline rather than protecting the old runtime. |
| Isolated spaces | Refreshed inherited routes, dispatcher and journey UI adopted; live acceptance open | Source includes code transfer, dispatcher, preview/OAuth and journey integration beyond the earlier unwired library. The owning design records must be re-audited. No Docker daemon is available here; live containment, network and escape-test acceptance is unverified. |
| Workflow ownership | Implemented, historical workflow/link smoke and reviews passed | Development records and design references live under `.workflow`; `flow-start` is the conversation entrypoint. The earlier completed task validated recovery/archival and resolved 102 local links across 35 documents; both review briefs passed. See the [archived task](done/workflow-alignment/01-upstream-and-docs.md). Its `next` result of no tasks predates the new rebaseline todo. No application, Docker, native or OMP verification was performed by that document task. |
| Latest-upstream rebaseline | Task 02 complete at source/document boundary | Whole-source adoption wrote 3,043 pinned paths and removed 95 obsolete files while preserving inventoried fork customization, private configuration and read-only release notes. Frozen install, build, type-check, lint and dead-code passed. Host/UI, Guest, scoped Electron, Xvfb Quake and unsaved-move smoke passed. Connected Board navigation proves route/tab rendering only, not authenticated Board reads or item actions. The space route test used a stand-in, not Docker. W3 platform/credential evidence remains open and is not represented as completed. |
| Source-aware documentation audit | Completed, documentation checked | Current feature, owner, API, lifecycle and configuration claims were traced to the assembled source. Historical records remain labeled; W3 platform, credential, Docker and Web/PWA Guest navigation limits remain explicit. Local links, workflow validation, task discovery and docs validation passed. |

## OMP source preparation

On 2026-10-11, the maintainer selected the latest official OMP repository source for the next step, rather than the earlier package research baseline. The source snapshot is retained outside this application's workspace.

- Repository: `https://github.com/can1357/oh-my-pi`, branch `main`.
- Pinned revision: `c9de2b02b997f37cc89639282ed35dec86f139e8`, the latest entry in the public commit feed at acquisition; its timestamp is `2026-10-11T04:38:09Z`.
- Acquisition: the repository API returned HTTP 403, so the public Atom feed supplied the revision and the SHA-addressed codeload archive supplied the source. This is a source snapshot without Git history, not a Git clone.
- Archive SHA-256: `06b6a671af953f5cdefe95cbd44271a5c20d9b9e951173af7d10d71e1b0dc150`. All 8,962 extracted regular files matched their archive contents; the archive contained no symlinks.
- The acquired `packages/coding-agent/package.json` declares `@oh-my-pi/pi-coding-agent` version `18.8.9`; this is source metadata, not an installed or exercised SDK version.
- The current shell reports Node `24.18.0` and Bun `1.4.2`, meeting this application's declared toolchain requirements.

No OMP dependencies were installed, build or runtime was launched, application dependencies were changed, or Git commands were run during source acquisition. The M0 fixture evidence and contract reconciliation are recorded below; they do not close the M0 gate.

## M0 fixture evidence

On 2026-10-11, the pinned OMP 18.8.9 source at revision `c9de2b02...` was exercised on Linux x64 with fixture runs. The [lifecycle artifact](omp-migration/m0/lifecycle.json) passed 9 probes, and the [capabilities artifact](omp-migration/m0/capabilities-fixture.json) recorded 8 passed and 5 partial probes. The [isolation artifact](omp-migration/m0/isolation-artifact.json) passed dedicated workers but failed all shared-process cwd/env modes and failed the 100 MiB idle RSS budget. Focused runner/process-group/pidfd cleanup tests passed.

The real provider smoke then ran as part of the capability suite: the [capabilities real-provider artifact](omp-migration/m0/capabilities-real-provider.json) records 9 passed and 5 partial probes, including one authenticated `openai-completions` probe with `stopReason: "stop"` and reported usage. The provider base URL requires the `/v1` suffix; the bare host returns HTTP 404. The run environment installed the source dependencies and needed the prebuilt native addon binaries, which the pinned snapshot does not include.

The [restart-pending artifact](omp-migration/m0/restart-pending.json) records source identity and cleanup as passed, with approval and question behavior partial. Both requests were pending before the old worker received SIGKILL, with measured tool execution and answer counts of zero. A distinct worker created a real OMP fixture session and completed one newly approved tool call and one new question answer. The event count rose from 2 to 7; the old worker's event count stayed at 2 through the 100 ms observation window. The fresh worker exited with code 0, all worker descendants exited, and the sandbox was removed.

The direct fixture seam exposes no cross-worker request handle. It therefore records `staleResolution.status: "unavailable"` and `staleResolutionRejected: null`, not an observed rejection. The suite exits with code 1 because two parent probes remain partial. This proves the exercised process boundary and measured fixture behavior, not RPC reply handling, durable request recovery, CAS or Agent Service restart semantics.

The [restart-pending task](done/omp-m0-restart-gate/01-restart-pending.md) is archived after both independent review briefs and the security review passed. Its [spec](specs/omp-m0-restart-gate.md) is done after maintainer acceptance, with closure recorded in the [retrospective](done/omp-m0-restart-gate/retrospective.md). The broader M0 gate remains open.

M0 remains open. The fixture results do not prove non-Linux behavior, stale-request reply handling or recovery, external network behavior, mobile/Electron/host relay integration, or other non-exercised gates. The artifacts retain the observed passed, partial, failed, unavailable and unknown boundaries without copying raw event, prompt or response data.

### Guest Shell and installable SDK evidence

The [Guest Shell artifact](omp-migration/m0/guest-shell.json) records 9 passed SDK probes through the real OMP `BashTool`, `AsyncJobManager` and `AgentSession` inspection/cancellation methods. Live output, exits 0/42, inline truncation and raw artifacts, distinct agent-owner filtering, cancellation, configured retention expiry and disposal were exercised. Quality review then identified a worker-group-only cleanup gap. A real reproduction confirmed that native `sleep` in a separate POSIX session survived worker SIGKILL while old cleanup reported all exited. The dedicated Linux runner now adopts detached orphans as a subreaper and uses pidfd birth-identity signaling. Corrected real SIGTERM smoke observed native exit, sandbox removal and an unrelated sibling surviving; runner exit 1 retained interruption and orphan-detection errors. Focused runner/pidfd tests passed 13 tests and 81 assertions; changed JS lint and dead-code passed. [Task 01](done/omp-through-m3/01-m0-guest-shell.md) is archived after requirements review and the affected quality/security reviews passed. Process-wide adoption is confined to this disposable single-worker executable, not a shared-host/service guarantee. The original normal artifact is preserved. The 16 MiB cap and default retention remain source-only; reconnect, cursors, authorization and ended-history retention remain service work.

The [installable identity artifact](omp-migration/m0/sdk-install-identity.json) proves that registry `@oh-my-pi/pi-coding-agent@18.8.9` is not the pinned source. It records 156 differing common coding-agent source files and changed exercised owners. Matching registry integrity and version do not authorize reusing source-based SDK results for that package. The decoded provenance revision is supporting metadata, not independently verified signature trust. The existing native addon hash matches in both scopes, but its source-build equivalence is not established and workspace loading bypasses release validation.

The [AuthStorage path artifact](omp-migration/m0/auth-paths.json) records ten final fresh-process cases across source and published imports. Each created and closed an isolated, owned SQLite database with mode `0600`. Default paths use `<HOME>/.omp/agent/agent.db`; XDG data applies when its `omp` directory exists, while environment and explicit-directory overrides were measured separately. No credentials or real user storage were accessed. These observations do not prove credential conversion or restart durability. [Task 19](done/omp-through-m3/19-m0-sdk-identity-paths.md) passed independent requirements, quality and security reviews and is archived as a completed investigation. Task 24 owns the unresolved installed-source artifact prerequisite; M0 stays open.

### Running the real provider smoke

To run the real provider test, load the local fish configuration and run the probe:

```fish
source ~/.config/ohpichamber/omp-m0-provider.env
bun run scripts/omp-m0/run.mjs --suite capabilities --fixture --real-provider --output /tmp/omp-m0-real-provider.json
```

`~/.config/ohpichamber/omp-m0-provider.env` is the operator-managed local configuration containing the already-approved provider settings. It stays outside the repository. The probe reads the exported values, sends one short completion request, and writes only the sanitized result to `/tmp/omp-m0-real-provider.json`.

## Next implementation step

The active [OMP-through-M3 effort](specs/omp-through-m3.md) remains in M0. Complete task 24's pinned-source installation experiment next. Tasks 01 and 19 are complete, not M0 acceptance. Task 02 and gate 03 still wait for the installed-source evidence; M1 does not start before gate 03 passes. The maintainer accepted the measured Linux fixture worker RSS as an M0 limitation in `decisions.md: 2026-10-11 - Accept measured worker memory as an M0 limitation`; the original 100 MiB result stays failed and M2 still requires actual service measurements. Platform, stale-request, relay, Docker, authenticated Board, updater and Web/PWA self-navigation limits remain unverified, with their exact milestone ownership settled by the M0 contract reconciliation.

## Reusable findings

### Inherited guidance is not the target architecture

The upstream guide required OpenCode SDK and VS Code support. Those requirements are not the final OMP target, but upstream runtime code may be inherited during the approved baseline refresh. Apply final engine retirement to the later cutover, not as a reason to keep the prerequisite update on 1.x. Preserve fork safety, workflow routing, and engineering rules throughout.

### Distinguish the host from agent execution

The inherited Electron sidecar prohibition concerns the embedded Node.js host. Applying it to all backend processes would contradict the separate Bun Agent Service design. Use the ownership and process boundaries in architecture ADR-02 and ADR-03; the documentation change does not prove packaging or lifecycle behavior.

### Historical inventory does not override current scope

The migration index previously called the baseline inventory the source of truth for feature decisions, while the scope, contracts, and architecture specified a different hierarchy. The index now points to the [scope hierarchy](omp-migration/scope.md#document-hierarchy). Keep precedence in that owner rather than introducing another ordering here.

### Classify automation by behavior, not filename

`oc-review.yml` runs build, type-check, lint, and tests, so it remains despite its review-oriented name. The OpenCode smoke and VS Code packaging workflows also remain until the corresponding runtime migration removes their consumers. Deleting collaboration automation is not the same as completing runtime retirement. Example skill names in product docs and test fixtures are sample data, not imports of the removed queue-triage skills.

### Upstream state is not fork state

The earlier selective comparison contains locally present behavior and intentionally omitted code. Keep those observations as historical input, then compare the actual refreshed source and fork differences before replacement. An upstream release number, sandbox stage table or benchmark does not establish local implementation, OMP compatibility or platform acceptance. A newer baseline requires a new ownership and feature audit, not unchanged conclusions from the old inventory.

### One workflow, separate records

Conversation routing and task recovery belong to `.workflow`. The development record owns current evidence, migration documents own target decisions, the upstream assessment owns historical comparison, the rebaseline spec owns the current update scope, and package documents own module behavior. Moving a reference does not advance a gate. Local Git work follows the landing rules in [standards.md](standards.md); GitHub commands still require explicit user instruction.
