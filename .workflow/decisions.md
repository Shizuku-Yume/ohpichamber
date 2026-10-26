# Decisions

Every choice that mattered, with the option it beat. Newest last.

This file exists so the same argument is not had twice. A decision recorded here
is settled. The file is strictly append-only: to reverse or reopen a decision,
append a new entry that cites the old one. The one exception is below. Git merges
it with the union driver (`.gitattributes`), so parallel branches can each append.

## Why the runner-up is required

A decision recorded without the alternative it beat will be reopened next session:
the reader cannot see why the obvious option was rejected.

Draft entries during `flow-grill`, while the options are fresh. Write the strongest
honest case for each alternative. If writing "Instead of" feels like inventing a
strawman, that option was never real; find the real one, or accept the decision was
obvious and doesn't need logging.

## Format

This is the only copy of the format; other documents point here. Each entry is a
level-2 heading `## <YYYY-MM-DD> - <title>` under `## Entries`. Subsections (`###`),
fenced code blocks and comments are not entries. Cite an entry by its heading text:
`decisions.md: <date> - <title>`.

Every entry has all five fields, none empty:

- **Decided:** what was chosen
- **Instead of:** the real alternative that was seriously considered
- **Because:** the constraint, measurement, or reasoning that eliminated it
- **Mine:** yes if an agent decided, no if the user decided
- **Revisit when:** the observation that would make this wrong

Optional fields:

- **Effort:** the effort slug this decision belongs to. Find one effort's entries
  with `grep -n 'Effort:\*\* <slug>' .workflow/decisions.md`. Omit it when the
  decision is not tied to one effort.
- **Supersedes:** the heading of the entry this one reverses. The only edit allowed
  to an old entry is then appending one line to it: `**Superseded by:** <new
  heading>`. An entry with `Superseded by` is history: follow the pointer before
  acting on it.

```markdown
## 2026-01-31 - Retries capped at 3, no backoff

- **Decided:** three immediate retries, then fail.
- **Instead of:** exponential backoff with jitter.
- **Because:** the only caller retries within a single user request; a 30-second
  backoff would outlive the request it is serving.
- **Mine:** no (asked the user).
- **Revisit when:** a background job starts calling this.
```

Field names stay in English for `workflow validate`; their content can be in any
language.

`Mine` shows which calls came from an agent: still real decisions, but ones the
user may overturn on sight. `Revisit when` of "never" is allowed but suspicious;
`flow-close` reads it for every entry of the effort it closes.

## Entries

## 2026-10-10 - Workflow owns development routing and records

- **Decided:** use `.workflow` as the default conversation process and home for development records, migration design and inherited sandbox design.
- **Instead of:** leaving development material under `docs` with workflow as an optional appended entrypoint.
- **Because:** the maintainer requested one workflow for future conversations and development documentation. Product/operational guides and module contracts retain their separate owners.
- **Mine:** no
- **Revisit when:** the maintainer changes the development process or a document's audience changes.
- **Effort:** workflow-alignment

## 2026-10-10 - Latest upstream first then restore the fork

- **Decided:** make the latest upstream repository the next code baseline, preserve and restore OhPiChamber customization, then re-audit project/migration documents before OMP implementation. This conversation changes documentation and queues the effort for a new conversation; application source is not updated now. After the refreshed baseline is verified, remove obsolete application-version statements from project documents rather than leaving hard-coded old-baseline labels.
- **Instead of:** preserving the old 1.x runtime and selectively importing features, deferring runtime-bound additions until OMP, or replacing the fork wholesale and discarding its investigations.
- **Because:** the maintainer wants the current upstream repository as the starting point, not a permanently old fork with individually backported features. Earlier research remains useful but must be checked against the new source.
- **Mine:** no
- **Revisit when:** the maintainer changes the baseline strategy or a verified preservation conflict needs a product decision.
- **Effort:** upstream-rebaseline

## 2026-10-11 - Guest bridge uses a private early bootstrap

- **Decided:** use an SDK-owned early bootstrap script with a private per-document `MessageChannel` for Web/PWA and Electron Guests. The host sends the normal SDK port over that private channel; direct and relay HTML share the same bootstrap source.
- **Instead of:** create an isolated guest-serving origin and gate capability transfer on origin equality.
- **Because:** the maintainer selected reuse of the existing direct/relay HTML rewriting with minimal changes and no new deployment boundary; the private port authenticates the current bootstrapped document without a URL-readable nonce, and iframe `load` is not document authentication.
- **Mine:** no
- **Revisit when:** either Guest loader cannot keep replacement documents from obtaining a new SDK port, the CSP fail-closed contract cannot be maintained, or deployment requirements change enough to justify an isolated guest origin.
- **Effort:** upstream-rebaseline

## 2026-10-11 - Rebaseline task closes at source and document boundary

- **Decided:** close upstream-rebaseline task 02 after coherent source adoption, fork restoration, source-level verification, and documentation adaptation; keep connected W3 certification as an explicit follow-up boundary rather than expanding this task.
- **Instead of:** keeping task 02 open until authenticated Board actions, live Docker/native/provider checks, packaged updater behavior, and every platform review are available.
- **Because:** the maintainer clarified that this task is the repository update and document adaptation, not a full cross-platform certification effort; the unavailable runtime checks are already recorded without fabricated success.
- **Mine:** no
- **Revisit when:** the maintainer starts the separately scoped W3 runtime-certification effort or changes the acceptance boundary.
- **Effort:** upstream-rebaseline

## 2026-10-11 - Accept measured worker memory as an M0 limitation

- **Decided:** retain the dedicated-worker isolation direction and accept the observed Linux fixture idle RSS of 270,200,832 and 274,202,624 bytes as a known M0 resource limitation. The original 100 MiB probe remains failed; it is not a hard prerequisite for advancing after the other M0 requirements pass. Measure the actual service footprint and cleanup in M2.
- **Instead of:** retaining 100 MiB as a hard M0 gate and requiring a measured SDK worker memory reduction before M1.
- **Because:** the maintainer explicitly accepted the observed cost rather than blocking the migration on that hypothesis. Shared-process cwd/env isolation failed, so removing process isolation is not an accepted memory optimization.
- **Mine:** no
- **Revisit when:** the real service measurements or expected concurrent-session workload show unacceptable memory pressure, or another supported platform differs materially.
- **Effort:** omp-through-m3

## 2026-10-11 - Continue from the assembled migration baseline

- **Decided:** use the current assembled application source and existing M0/workflow files as migration input, preserving a separate local baseline where isolated worktrees need it. Subsequent task commits contain only task-owned changes; unrelated pre-existing changes remain untouched and no push is authorized.
- **Instead of:** allowing only new independent evidence files and refusing to modify any existing uncommitted migration source.
- **Because:** the maintainer explicitly authorized continuing this assembled migration baseline. The old HEAD predates the assembled source and cannot provide correct inputs to independent implementation worktrees.
- **Mine:** no
- **Revisit when:** ownership of a specific pre-existing change conflicts with a migration task or the maintainer changes the baseline boundary.
- **Effort:** omp-through-m3

## 2026-10-12 - Keep provider and platform evidence as M0 prerequisites

- **Decided:** run one bounded provider/OAuth evidence investigation against the operator-managed approved environment without retaining secrets, and require actual non-Linux/macOS worker-resource evidence before releasing M0; keep gate 03 closed while either result is missing or unresolved.
- **Instead of:** accepting the Linux-only worker measurement and the unresolved stored-format/OAuth records as sufficient to begin M1.
- **Because:** task 28 closed the reachable full-factory permission gap, but it did not answer provider conversion feasibility or cross-platform resource behavior. The maintainer explicitly requires those boundaries to be measured or retained as blockers rather than relabeled as later work.
- **Mine:** no
- **Revisit when:** the bounded provider/OAuth probe records an outcome for each supported format and actual non-Linux/macOS worker runs record resource results, or the maintainer changes the support and acceptance scope.
- **Effort:** omp-through-m3
- **Superseded by:** 2026-10-12 - Leave unavailable platform evidence outside the M0 release condition

## 2026-10-12 - Leave unavailable platform evidence outside the M0 release condition

- **Decided:** task 30 no longer requires a passing non-Linux/macOS run before M1. Keep the missing platform measurements explicitly unverified and stop unavailable-runner work. Retain the bounded approved-provider task 29 and its actual provider/OAuth outcomes for the gate review; this platform waiver alone does not turn unavailable provider evidence into a pass.
- **Instead of:** keeping M0 blocked on access to a real macOS/Windows runner.
- **Because:** the maintainer explicitly said to drop the mandatory task-30 pass when it cannot be verified and enter M1 promptly. This changes the release condition, not the observed platform status or retained support matrix.
- **Mine:** no
- **Revisit when:** a real target-platform runner is available or platform certification becomes required for a retained release surface.
- **Effort:** omp-through-m3
- **Supersedes:** 2026-10-12 - Keep provider and platform evidence as M0 prerequisites

## 2026-10-12 - Enter M1 with the observed provider path and explicit OAuth limitation

- **Decided:** accept the real approved-provider stored API-key path as the measured M0 provider boundary and enter M1 after the bounded investigation is reviewed. Keep official provider conversion, OAuth refresh/scopes and account-selection behavior unverified rather than reporting success. Actual credential handoff and per-provider unsupported/re-authentication outcomes remain mandatory at task 22 and M2 gate 23.
- **Instead of:** keeping M0 blocked until unavailable official-provider/OAuth credentials can be supplied and exercised.
- **Because:** the approved test provider completed through persisted, closed and cold-reopened AuthStorage plus the installed public factory. The maintainer explicitly accepted the remaining provider limitation and selected entry into M1; Host extraction and extension retirement do not perform SDK credential migration.
- **Mine:** no
- **Revisit when:** official provider/OAuth credentials become available, or real service credential handoff requires a provider behavior not yet established.
- **Effort:** omp-through-m3

## 2026-10-13 - Remove the M2 queue and consumer acceptance cycle

- **Decided:** unblock task 22 on tasks 10 and 12 (`Blocked by: 10, 12`) so server-consumer composition builds directly on task 11's already-committed `sqlite-store.js` and `canonical-runtime.js` source, pause task 11 with `Blocked by: 09, 22` for its final composed queue verification after task 22 lands, and require both tasks 11 and 22 at M2 gate 23 (`Blocked by: 11, 22`). No tasks are deleted or renumbered, and W1–W10 acceptance criteria and product scope are unchanged.
- **Instead of:** keeping task 22 formally blocked on task 11 while task 11's Progress keeps task 11 open until task 22 composes public Host routes, attachment conversion and service event consumers, or archiving task 11 early on its isolated-worktree receipt alone.
- **Because:** task 11's SQLite queue owner and canonical dispatcher source are already committed on the integration branch, whereas its remaining acceptance items require the composed Host consumer boundary owned by task 22. Ordering 10/12 acceptance → 22 composition → 11 final composed acceptance → gate 23 breaks the circular dependency without weakening any queue, credential-handoff or gate check.
- **Mine:** yes
- **Revisit when:** task 22 composition reveals a missing storage primitive in task 11 that must be implemented before server consumers can wire to the queue owner.
- **Effort:** omp-through-m3
## 2026-10-18 - Canonical agent profiles are the selectable UI roster

- **Decided:** Treat every enabled native `Agent` returned by the canonical workspace catalog as a visible/selectable profile in shared UI. Use `name` as its display label, `description` for supporting text, and do not preserve the legacy `hidden`, `mode`, or `displayName` filters.
- **Instead of:** Keep the legacy OpenCode catalog presentation fields through an adapter or block the caller migration until an equivalent field set is added to the Canonical API.
- **Because:** The native service discovers enabled project, user, extension, and bundled agent definitions and projects only the JSON-safe `Agent` fields. The target contract has no hidden/mode/display metadata, and fabricating those values would create a second authority. Direct use of the native roster keeps the canonical contract authoritative and makes the loss of legacy internal-agent filtering explicit.
- **Mine:** yes
- **Revisit when:** The canonical Agent contract adds an intentional visibility or role policy that is required by a retained product surface.
- **Effort:** omp-through-m3

## 2026-10-18 - Native agent controls and ConfigStore catalog retirement

- **Decided:** Cut ModelControls and App startup to `useAgentsStore`, retire the duplicate OpenCode agent catalog in `useConfigStore`, and remove client-side `PermissionRuleset` simulation. ModelControls displays native `allowedTools` tool availability and `permissionPresetId`, retains canonical model/variant selection, binds profile default models via `providerId`/`modelId`, and cycles native `agentId`/`name`. Host approval controls remain unchanged, the native SDK owns authorization policy, and no new Canonical contract fields are created for retired legacy mode or HTTP sampling metadata.
- **Instead of:** Waiting indefinitely for hypothetical canonical schemas matching OpenCode's client-side permission ruleset and HTTP sampling, or creating compatibility adapters and pass-through shims.
- **Because:** The selectable UI roster was settled in `2026-10-18 - Canonical agent profiles are the selectable UI roster`. Legacy sampling was only tooltip metadata, and `allowedTools` denotes tool availability rather than authorization rules. Authorization is enforced by the native SDK and Host approval boundary. Removing duplicate agent loading stops legacy `/api/agent` polling loops during startup while preserving empty-catalog versus error state semantics.
- **Mine:** yes
- **Revisit when:** Native SDK or canonical contracts introduce dedicated tool-policy or preset catalog schemas required by retained product surfaces.
- **Effort:** omp-through-m3

## 2026-10-21 - Finish M3 by owning the observed dirty work and closing the gate cycle

- **Decided:** Assign the observed unowned behavior to Tasks 64-68: live Agent Service session reopen (64), in-flight snapshot and reconnect run-control continuity (65), a spike on the failing workspace-admission recovery test (66), bounded directory startup catalog recovery/retry (67, blocked by 65 and 66), and the native Web Search provider-catalog fix (68). Block Task 52 on 64; block Tasks 56-59 on 65 and 67; block Task 60 on 65, 67 and 68; block Task 61 on 65 and 67. Remove Task 18 from Task 15's blockers and resume Task 15 on archived Task 36 evidence after 65/67 land. Make Task 18 wait on every open M3 deliverable (15, 52, 56-61 and 64-68).
- **Instead of:** Leaving the uncommitted live-reopen, live-control, startup-retry and catalog work unowned for the gate to absorb, or keeping Task 15 blocked by the Task 18 gate it must precede.
- **Because:** No open task owned that behavior; the committed Task 62 snapshot-race test is red at HEAD, the startup retry ignores Task 17's failing workspace-admission test, and the Web Search catalog defect has no owner. Task 15 could never close while waiting on Task 18. Task 18 must run once against rebuilt artifacts after this work lands, not against the current dirty tree or the superseded `598bf582…` AppImage and `c438247e…` Web dist.
- **Mine:** yes
- **Revisit when:** A dirty path turns out to belong to a different owner, or a task's implementation shows the behavior is already fully committed and the task can be dropped without losing the evidence.
- **Effort:** omp-through-m3

## 2026-10-22 - Reopen M3 for the trial-observed quota and model-availability follow-ups

- **Decided:** Reopen `omp-through-m3` for two follow-up bugfixes. Task 75 (owned by the quota lane in its own worktree) makes an unconfigured provider's usage request `configured: false` with no error while configured failures stay visible. Task 76 (this lane) makes the workspace `ModelCatalog` expose only providers the native SDK reports as available, while `ProviderCatalog` stays the complete Settings directory.
- **Instead of:** Deferring these trial-observed defects to M4, treating the native-provider read as a new design effort, or rewriting Host profile/environment agent-directory resolution. Live Host metadata binds the current workspace `agentDirectory` to `/home/shizuku/.omp/agent`, matching the OMP CLI's default `models.yml`, and the running service already publishes CLIProxyAPI with its 12 enabled models. There is no current-lane evidence of a path mismatch to fix.
- **Because:** The user's real trial showed the chat picker listing every bundled provider, which buries the one configured custom provider, and a quota error for a provider with no credential. Application packaging/integration is coordinated separately for the final M3 gate rather than becoming a product task.
- **Mine:** no
- **Revisit when:** A real trial workspace shows the Host agent directory differing from the native OMP CLI configuration path, or a provider still cannot be selected after the availability fix.
- **Effort:** omp-through-m3

## 2026-10-24 - Remove Task 37 and retain unproven Agent Service failure log

- **Decided:** Amend `post-m3-hardening` by removing Task 37 (`37-project-plugin-registry-setup.md`) without SDK or source changes. Retain `/home/shizuku/Project/ohpichamber-omp-artifacts/post-m3-integration-2026-10-24/root-test.log` as historical failure evidence, and record the exact cause of the earlier Agent Service failure as unproven.
- **Instead of:** Keeping Task 37 open to patch `@oh-my-pi/pi-coding-agent` or add parent-directory creation around `Bun.write`.
- **Because:** Direct Bun 1.4.2 smoke verification confirms `Bun.write` creates parent directories (`{createdParents:true}`) when writing nested paths like `.omp/plugins/installed_plugins.json.tmp`. In an isolated fresh workspace, the focused Agent Service plugins test passes (2 pass, 7 skip), and the assembled root gate on candidate branch `validation/post-m3-hardening-final` passes 7/7 suites unchanged with `TMPDIR=/tmp` (`/home/shizuku/Project/ohpichamber-omp-artifacts/post-m3-integration-2026-10-24/root-test-localtmp.log`). The hypothesized missing-mkdir `ENOENT` defect is disproved.
- **Mine:** no
- **Revisit when:** A reproducible fresh-workspace plugin install failure is observed with an identified root cause.
- **Effort:** post-m3-hardening

## 2026-10-24 - Keep isolated spaces unreleased without the OpenCode runtime

- **Decided:** Choose Task08 Option B: remove the OpenCode space runtime and keep isolated spaces unreleased until an OMP space runtime is built as a separate effort. Task38 owns the bounded removal and awaits a dedicated owner.
- **Instead of:** Building an OMP Agent Service into isolated spaces as part of post-M3 hardening.
- **Because:** Task08's source inventory found that OMP support would require coordinated image, tools-volume, in-space service, dispatcher and security-boundary work, while spaces are already explicitly unreleased. The maintainer selected B on 2026-10-23; the decision is now synchronized from the Task08 archive into the governing spec and decision log.
- **Mine:** no
- **Revisit when:** The maintainer starts a dedicated OMP isolated-spaces effort or changes the unreleased product boundary.
- **Effort:** post-m3-hardening

## 2026-10-24 - Break the Guest SDK version for the private bootstrap transport

- **Decided:** Ship a breaking Guest SDK version bump for the private `MessagePort` bootstrap transport. Wire envelope and bootstrap handshake are `v: 2`; `@openchamber/sdk` and the release-coupled root/ui/web/electron packages are `3.0.0`. Manifest `apiVersion` stays `1` because the manifest/`contributes` schema is unchanged. A pre-M3 `v1` window `hello` from the current iframe stops the pane with a localized explicit version-mismatch; a v1 bootstrap announcement is dropped. The frame receives no port, ready push, or host state; no compatibility path or fallback is added.
- **Instead of:** Supporting both the old `window.postMessage` hello bootstrap and the new private `MessagePort` transport, or leaving the wire at `1` and bumping only the SDK package.
- **Because:** The two bootstrap contracts have different trust and lifecycle semantics. The maintainer chose an explicit breaking bump; the old SDK has no handshake-error message and is not guaranteed to call after `hello`, so the pane error is the observable refusal without weakening the private channel boundary. `scripts/bump-version.mjs` keeps the SDK version equal to the app release, so the release packages move with it.
- **Mine:** no
- **Revisit when:** The maintainer reintroduces a supported pre-`v2` consumer, or the manifest schema changes independently of the transport.
- **Effort:** post-m3-hardening

## 2026-10-25 - Drive OMP modes in-process instead of the rpc-ui subprocess

- **Decided:** Keep OMP inside the Agent Service worker and reuse the pinned package's RPC-mode modules in-process (`RpcGoalController`, `RpcBtwController`, `executeAcpBuiltinSlashCommand`). Plan and vibe get a worker mode controller that follows `interactive-mode.ts` without importing it.
- **Instead of:** Running `omp --mode rpc-ui` per session behind the Agent Service, as the ompweb reference client does.
- **Because:** ompweb runs a subprocess only because Node can't load OMP. Our Bun worker already imports OMP and depends on the vendored patch, in-process host tools and the fail-closed interaction manager; a subprocess would duplicate the worker and move those guarantees across a pipe.
- **Mine:** no
- **Revisit when:** a needed OMP capability exists only in the RPC process and can't be reached through package exports, or an OMP upgrade removes the `./modes/rpc/*` exports.
- **Effort:** omp-native-chat

## 2026-10-25 - Replace root agent selection with session modes

- **Decided:** A chat runs the main conversation. The composer switches session mode (main, plan, vibe, goal); agent profiles are only `task` subagent definitions. A root `agentId` or `agentMention` is rejected at Host admission, and stored root `agentId` values are migrated to `null`.
- **Instead of:** Keeping the root agent picker, filtered to profiles whose tools are available.
- **Because:** OMP has no root agent. A root profile override changes the tool set behind OMP's back, which produced the 422 on new chats; modes are OMP's own way to change root behaviour.
- **Mine:** no
- **Revisit when:** OMP adds root agent personas, or users need a root persona that plan, vibe and goal can't express.
- **Effort:** omp-native-chat

## 2026-10-25 - Report OMP-initiated turns as worker-originated runs

- **Decided:** When OMP starts a turn without a Host prompt (plan approval, goal continuation), the worker projection opens a canonical run with `origin: 'plan' | 'goal'`. The Host treats it as an active run for `/runs`, queue dispatch and abort.
- **Instead of:** Having the Host send every continuation and approval prompt through its delivery path.
- **Because:** `RpcGoalController` already owns budget accounting, the no-progress stop and session-change handling; copying it into the Host would split goal state between two processes. The worker holds no user prompt, so the Host remains the single delivery owner.
- **Mine:** yes
- **Revisit when:** a worker-originated run must carry a user-authored prompt, or the Host needs to reorder continuation turns against queued prompts.
- **Effort:** omp-native-chat

## 2026-10-25 - Use OMP goal mode as the only goal loop

- **Decided:** Session Goals run on OMP goal mode (`RpcGoalController` in the worker). The Host Session Goals supervisor, its objective files and its small-model progress audit are removed; the composer, fork, plan, scheduled-task and CLI "Run as goal" entry points send the `goal create` control, and notifications follow the session's goal mode.
- **Instead of:** Keeping the Host supervisor as the goal loop, or running both, with the supervisor's independent audit judging OMP's goal turns.
- **Because:** the supervisor existed because OpenCode had no goal mode. OMP's goal runtime already does continuation, budget accounting, the no-progress stop and abort handling, and a second loop would mean two goal states and two token counters for one session. The maintainer accepted losing the independent audit; the agent now declares completion itself.
- **Mine:** no
- **Revisit when:** goals end too early in practice because the agent declares completion without the work being done, or OMP exposes a hook for an external completion check.
- **Effort:** omp-native-chat

## 2026-10-26 - Approval summaries are safe one-liners

- **Decided:** The public approval record carries the exact tool name and a redacted, single-line, 200-character input summary (bash command or file path). Raw input and exact policy targets stay service-private; card details, pattern labels and tooltips are built only from the safe projection.
- **Instead of:** Forwarding the captured input object/details to the browser, or keeping the generic "Native tool operation requires approval" text.
- **Because:** The card must name the tool and command to be useful, but the same projection reaches browser events and notifications. Environment assignment values, authorization schemes, URL credentials, token arguments, API-key headers, signed-URL parameters and known credential/key shapes must be masked before that boundary.
- **Mine:** yes
- **Revisit when:** a tool needs a different human summary field, or the projection gains structured preview data that cannot be bounded by one line.
- **Effort:** omp-native-parity

## 2026-10-26 - Chat reference bindings require a Git repository

- **Decided:** `useRepositoryHosts` ensures the owning Git store has read the directory's status, then reads a source-control binding only when that status reports a repository. Non-repository chat directories request no binding.
- **Instead of:** Returning a synthetic empty binding from `GET /api/source-control/binding`, or letting the existing 422 stand and treating it as an empty result.
- **Because:** `SourceControlBindingRead` requires a real repository context; a fake repository would leak into identity, mutation and worktree consumers that assume a repository. The binding route remains honest about its precondition, and a deep-linked or Source-Board directory still gets a status read before its real repository binding is skipped or loaded.
- **Mine:** yes
- **Revisit when:** a non-repository surface needs a first-class "no repository" binding read (for example a dedicated discriminated response).
- **Effort:** omp-native-parity

## 2026-10-26 - Refresh errors belong to the group that failed

- **Decided:** A sidebar group shows "Could not refresh sessions" when its own directory bootstrap failed, or when the global session-list request itself failed (a total failure, with global retry). Partial per-scope `result.errors` do not mark untouched groups.
- **Instead of:** Falling back to `globalStatus === 'error'` for every incomplete group, or suppressing all global failures for directory-backed groups.
- **Because:** A partial global result can fail for one directory while other groups have not refreshed at all, while a total list failure is real for every unopened group and must keep its retry visible.
- **Mine:** yes
- **Revisit when:** the global store publishes per-directory failure attribution, which would let each group show its own global-scope error directly.
- **Effort:** omp-native-parity

## 2026-10-27 - Always allow uses OMP's native ACP cache with exact Host grants

- **Decided:** "Always allow" resolves OMP's `allow_always` handle through the native `ClientBridge.requestPermission` seam for bash. OMP's per-session ACP decision cache owns the key (`bash`); the Agent Service keeps no policy mirror and writes nothing to Host SQLite or OMP config. A worker-local routing set only identifies a cached call so it can request the silent exact Host grant; it never authorizes execution itself. A later cached bash call bypasses the native card but still reaches the custom Bash tool, which synthesizes an exact Host execution grant bound to that tool call and input before authorization; that grant is consumed once and produces no public card. The bridge resets with the native logical session, stops with the worker, surfaces non-bash ACP-gated tools as one-shot canonical cards (never a session allowance), passes native bash pattern allow/deny to their existing Host policy, and provider-safety or Host-only prompts never receive a native allowance. Schema version 2 revokes all legacy persisted session allowances.
- **Instead of:** The interim Agent Service session-rule Set, a wildcard Host policy row, or a second approval prompt after the native cache already authorized a call.
- **Because:** Title-text scraping and conflating the two-option `ui.select` prompt with the four-option native gate were unsound: cached ACP calls bypass `requestPermission`, so a Host mirror could authorize the wrong tool or keep allowing after the native session reset. The native cache is the exact lifecycle owner; re-entering the custom Bash tool is the one point where every execution can still be bound to an exact Host grant.
- **Mine:** yes
- **Revisit when:** the SDK exposes per-tool ACP bridge scoping or a session-reset callback that lets the Host observe cache clears directly.
- **Effort:** omp-native-parity
## 2026-10-27 - Publish OMP's resolved defaults on the model catalog

- **Decided:** Add `defaults: { model, thinkingLevel }` to the canonical `ModelCatalog`; the worker resolves them with the pinned `resolveAllowedModels`/`resolveModelRoleValue`/`pickDefaultAvailableModel` and `cfgDefaultThinkingLevel`, and the UI treats them as the untouched-draft value. `auto` is exposed but never sent as an effort.
- **Instead of:** Keeping app-owned default model/thinking settings (desktop `defaultModel`/`defaultVariant`) and teaching the UI OMP's precedence itself.
- **Because:** The catalog already crosses the worker boundary with the exact native workspace state; a second resolver in the UI would drift on credentials, enabled models and role aliases, and app defaults would keep overriding the TUI on the same session.
- **Mine:** yes
- **Revisit when:** OMP exposes a session-scoped default or the catalog read stops reflecting the live credential/role resolution.
- **Effort:** omp-native-parity

## 2026-10-27 - Keep unset effort distinct from explicit off and persist the sent level

- **Decided:** `undefined`/`null` effort means "defer to OMP"; `off` is a real choice. The worker normalizes optional controls to `null` before its guard, the composer shows session effort → explicit draft effort → OMP catalog default → `off`, and the sent effort is stored per session+agent+model so a reload restores it. Route variants stay a separate picker.
- **Instead of:** Defaulting the composer to `off` when no local choice exists, or folding `off` into the unset state.
- **Because:** OMP resolves a missing effort to its configured level; treating that as `off` both hides the real level and forces a different request. Explicit `off` must still reach `setThinkingLevel('off')`.
- **Mine:** yes
- **Revisit when:** the canonical session record starts carrying the stored thinking level, which can replace the local per-session copy.
- **Effort:** omp-native-parity

## 2026-10-27 - Retire only the global default model/thinking controls, keep project and small-model choices

- **Decided:** Remove the global `defaultModel`/`defaultVariant` desktop settings and the Defaults page model/thinking rows; keep the project default model/route and the small-model/walkthrough preferences that share the page.
- **Instead of:** Deleting the whole Defaults section and every per-project or auxiliary model preference.
- **Because:** The spec retires app-level defaults that override OMP for ordinary new chats; project identity and small-model selection are separate explicit choices, and deleting their only UI would drop unrelated capability. The main composer now follows OMP when no explicit choice exists.
- **Mine:** yes
- **Revisit when:** OMP role settings replace the small-model/walkthrough overrides, or the maintainer wants the remaining Defaults controls moved or removed.
- **Effort:** omp-native-parity

## 2026-10-27 - Keep the worker's OMP resolution unchanged; prove it with fixtures

- **Decided:** Do not change the worker's `selectOptions` guard. The observed base behavior already defers to OMP when all client effort/variant values are `null`; the real defect was on the catalog/UI side. Keep fixture tests for no-effort → `high` and explicit `off`, and record the spec's unreproduced "worker forces off" claim in task 04 Progress instead of inventing a production change.
- **Instead of:** Keeping a defensive normalization that made no observable difference, or editing the spec Check to hide the mismatch.
- **Because:** A real native fixture on `cbe1f912b3` already recorded `reasoning_effort: high` with no client effort. Changing the guard would be scope without evidence; the strict contract already forbids `undefined` in those fields.
- **Mine:** yes
- **Revisit when:** a real caller can pass `undefined` effort/variant outside the parsed contract, or a client-visible case forces `off` again.
- **Effort:** omp-native-parity

## 2026-10-27 - Read the persisted session level from the transcript snapshot

- **Decided:** Add `selection: { model, thinkingLevel }` to `SessionSnapshot`/`ProjectionSeed`, derive it from the JSONL's last `model_change` and `thinking_level_change`, and publish `session.updated.selection` when OMP reports `thinking_level_changed`. The composer reads session choice → this native level → draft choice → OMP default.
- **Instead of:** Relying only on the browser selection store for reload, or exposing the level on every `Session` record.
- **Because:** A page reload can hit a live worker whose in-memory level is newer than the seed; the event keeps the journal current, and the snapshot is the canonical place the UI already reads. Keeping it out of `Session` avoids changing every session list/row consumer.
- **Mine:** yes
- **Revisit when:** the canonical `Session` record starts carrying the native selection, making a separate snapshot field redundant.
- **Effort:** omp-native-parity
## 2026-10-27 - Host tools are essential callable tools, not xd:// devices

- **Decided:** Register `openchamber`, `web`, `memory` and `notify` with `loadMode: 'essential'`, so OMP places them in the normal callable tool schema with only their own descriptions. Their Host actions keep the existing capability owner and approval path.
- **Instead of:** Leaving them as default `discoverable` extension tools, which OMP mounts as `xd://` devices whose documentation the Host policy refuses, or adding app-authored prompt guidance explaining how to call them.
- **Because:** The effort's parity rule is that the model receives what plain OMP receives plus pins, attachments and the tools' own descriptions. A discoverable extension tool reaches the model only through an `xd://` device listing, which is additional prompt text and an unreadable Host capability; an essential tool is the ordinary OMP shape for a callable extension.
- **Mine:** yes
- **Revisit when:** OMP changes extension-tool presentation so essential tools gain prompt text of their own, or a Host tool needs to be deferred until explicitly enabled.
- **Effort:** omp-native-parity

## 2026-10-27 - Host policy passes only allowlisted OMP internal URL reads

- **Decided:** A native `read` descriptor may carry `internalReadUrls` only for the exact OMP schemes `agent`, `history`, `artifact`, `local`, `proc`, `skill`, `xd`, `mcp`, `omp`, `issue` and `pr`. The descriptor resolves them with OMP's own `InternalUrlRouter.normalize`/`canHandle` (so registered aliases and selectors keep OMP's meaning) and stores the normalized URL. Host policy admits them only for `read`, checks every local target in a mixed list as before, and keeps `write`, `edit`, `grep` and `glob` on the filesystem-only path. Unknown schemes, `file://`, `https://` and NUL bytes stay refused. Native `wait` is admitted because it only observes this session's async jobs.
- **Instead of:** Removing the `://` refusal wholesale, resolving internal URLs in the Host, or allowing the same pass-through for every native tool.
- **Because:** OMP owns the grammar and containment of its internal resources, while the Host must not turn an opaque URL into a machine-capability grant. The allowlist is exactly the schemes the TUI resolves; arbitrary MCP fallback schemes and remote/file URLs are not silently granted, and a mixed delimited read still authorizes each local path.
- **Mine:** yes
- **Revisit when:** OMP adds or removes a native internal scheme, or a read-only internal URL starts granting a capability the Host must authorize separately.
- **Effort:** omp-native-parity
## 2026-10-27 - Publish plan-role availability in the workspace model catalog

- **Decided:** `ModelCatalog` carries `planRoleAvailable`, resolved by the Agent Service with OMP's `resolveRoleModelFull(settings, 'plan', modelRegistry.getAvailable(), undefined)` — the same resolver the worker's plan enter uses. The composer reads it from the per-directory catalog cache to disable Plan and show the reason before a session exists.
- **Instead of:** Letting the user pick Plan and surfacing the worker's 422 `MODEL_UNAVAILABLE` after the draft session is created, or reading the OMP config from the UI.
- **Because:** the UI must know availability in a draft, the Agent Service already owns OMP settings and the executable model list, and a second availability rule would drift from `mode.ts`. The new field is required so every catalog producer and consumer states the fact.
- **Mine:** yes
- **Revisit when:** OMP exposes a dedicated capability endpoint, or plan availability stops depending on `modelRoles.plan`.
- **Effort:** omp-native-parity

## 2026-10-27 - Draft mode lives in draft state and applies after session creation

- **Decided:** `NewSessionDraftState.mode` (and a Goal objective) holds the composer's choice. `sendMessage` applies Plan/Vibe with `mode.set` after the session exists and before the prompt; Goal calls the native `goal create` and returns without a prompt, because the controller starts the first turn. If `mode.set` fails, the created session stays in Main, the composer text is restored, and no prompt is sent.
- **Instead of:** Applying the mode before creation through a hidden draft session, or sending the prompt and switching afterwards.
- **Because:** the worker mode control needs a real session id and "before the first prompt" is the acceptance condition; for Goal, also sending the typed text would duplicate the first objective turn.
- **Mine:** yes
- **Revisit when:** the Agent Service supports creating a session in an initial mode atomically, or a draft mode can fail without closing the draft.
- **Effort:** omp-native-parity

## 2026-10-27 - Mode picker sits beside ModelControls, not inside it

- **Decided:** the desktop mode picker renders immediately after `<ModelControls>` in the composer's right-side group; mobile renders it after the model button in the same model row. It uses the retired agent picker's DropdownMenu + Input + ScrollableOverlay pattern, with a searchable bottom sheet on mobile.
- **Instead of:** Editing `ModelControls.renderAgentSelector`'s old insertion point inside that component.
- **Because:** the visual order is the same rightmost slot, and window C owns the model/effort region of `ModelControls.tsx`; a sibling keeps the two intents mergeable. Mobile keeps the exact vacated `MobileAgentButton` slot.
- **Mine:** yes
- **Revisit when:** composer layout composes model and mode into one shared control cluster.
- **Effort:** omp-native-parity
## 2026-10-26 - OMP owns session titles

- **Decided:** `RuntimeSession.title` is the only session title, sourced from OMP's JSONL through its listing and title-change event. Rename goes through OMP `setSessionName`; Host metadata no longer has a writable title field, and legacy stored titles are ignored on read.
- **Instead of:** Keeping `SessionMetadata.title` as the UI-facing canonical title and overlaying or mirroring OMP's title into it.
- **Because:** two writable title stores disagree after a CLI rename or OMP auto-title, and the spec requires the sidebar and `omp --resume` to show the same title. A projection also leaves `getSessionMetadata`, list composition and patch revisions disagreeing about which title is current.
- **Effort:** omp-native-parity
- **Mine:** yes
- **Revisit when:** a retained surface needs Host-owned titles that OMP cannot express, or an OMP release stops storing the title in the session JSONL.

## 2026-10-26 - Cold title writes use OMP's session manager

- **Decided:** A rename on a cold root opens OMP's `SessionManager` for that JSONL, calls `setSessionName(..., 'user')`, flushes and closes. A live root applies the same call through its worker.
- **Instead of:** Requiring a worker to be started before any rename, or appending a title record by hand.
- **Because:** OMP's own API owns the header title slot and title-change entry; starting a worker only to write a title wastes a capacity slot, and a hand-written record would diverge from OMP's format. The live branch prevents two writers to the same file.
- **Effort:** omp-native-parity
- **Mine:** yes
- **Revisit when:** OMP adds a storage API that writes titles without constructing a session manager, or a live/cold race becomes observable.

## 2026-10-26 - Legacy Host titles are dropped, not migrated

- **Decided:** Existing `session_metadata.payload.title` values are stripped from canonical metadata reads and are not copied into OMP. OMP's JSONL titles become authoritative immediately.
- **Instead of:** A one-time Host-to-OMP title migration during list or startup.
- **Because:** app-created sessions already carry OMP's generated title in their JSONL, so the common case needs no migration; a list-time migration would mutate during a read and could start an unbounded cold-write pass. Manual old titles are the only loss, and no acceptance criterion requires importing them.
- **Effort:** omp-native-parity
- **Mine:** yes
- **Revisit when:** a maintainer reports a manual title that must survive the cutover; then add an explicit versioned migration rather than a fallback.

## 2026-10-27 - OMP behaviour settings route is a narrow registry view

- **Decided:** `GET`/`PUT /api/agent/v1/workspaces/:workspaceId/settings` exposes only `OMP_SETTING_IDS` from the shared contract. Descriptor metadata comes from the pinned `orderedSettings()`, values are validated by each native `Setting.assertWritable`, and writes use the workspace catalog owner's uint64 revision CAS. The route excludes credentials and `auth.broker.*` (broker URL/token), raw MCP command/env/header definitions, account pools, appearance keys, remote URLs and configurable paths; those stay on their owning provider/MCP/skill surfaces or the OMP TUI. The four candidate pages (classification, routing, magic prompts, snippets) are retained because each still has a live Host/native consumer.
- **Instead of:** A generic dotted-key settings API, copying OMP's schema into the app, or deleting active feature pages to make the settings list shorter.
- **Because:** the route writes the same `config.yml` OMP reads, so a second schema or credential/path/egress field would create a second authority or bypass provider-entry policy. Keeping descriptors dynamic follows the pinned package and lets the UI see OMP's own defaults and enum values.
- **Mine:** yes
- **Revisit when:** OMP exports a supported settings mutation API with its own revision/lock semantics, or a candidate page loses its last runtime consumer.
- **Effort:** omp-native-parity
## 2026-10-27 - Worker titles use OMP's generator on the selected provider

- **Decided:** The worker leaves OMP `autoTitle` off and, after an idle turn on an untitled session, calls OMP `AgentSession.generateTitle` with the `tiny`, `commit` and `smol` roles pinned to the selected session model and model fallback disabled. The worker authorizes `provider.use` through the Host before that call; a refused or unavailable provider leaves the session untitled without failing the user run.
- **Instead of:** Enabling OMP `autoTitle`, which can run a fork turn or fall back to a role model on another connected provider, resolving credentials directly from the model registry without the Host `provider.use` gate.
- **Because:** the title request carries the operator's first substantive message and must release credentials only for a Host-authorized provider. Pinning one candidate keeps title work on the selected provider, as the migration architecture requires, and limiting the override to the idle title window leaves user-run fallback behavior untouched.
- **Effort:** omp-native-parity
- **Mine:** yes
- **Revisit when:** OMP exposes a title hook that accepts a Host-authorized model and fallback policy directly, or titles must use a configured small model on a different provider.

## 2026-10-27 - Listed native sessions become references on first mutation

- **Decided:** A read of an OMP-listed session builds a transient cold reference from the list result and never writes storage. The first mutating operation promotes that session into the persisted SessionReference index before its worker starts.
- **Instead of:** Persisting every CLI/native session during list, or refusing to open a listed session that has no reference.
- **Because:** list is a read and must not mutate the reference file, while a send needs the session file and Host scope to survive worker startup and restart. Promotion at the mutation boundary keeps reads cold and gives native sessions the same durable ownership as app-created sessions.
- **Effort:** omp-native-parity
- **Mine:** yes
- **Revisit when:** OMP exposes a scoped open-by-session-file API that makes the reference index unnecessary, or a listed session must be mutated without a prior list read.
