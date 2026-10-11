# 01: Pin latest upstream and inventory fork preservation

**Effort:** upstream-rebaseline
**Task type:** spike
**Question:** Which source and fork-owned paths must be replaced, reconciled or preserved for the coherent upstream update?
**Time box:** One repository-wide content/path comparison against refreshed upstream and available historical inputs.
**Started:** 2026-10-10
**Finished:** 2026-10-10
**Blocked by:** None
**Delivers:** An exact latest-upstream source baseline and a preservation inventory that lets the full application update proceed without losing OhPiChamber work.
**Files:** Source/package/build manifests, fork-owned guidance and workflow, current development records, and comparison evidence outside the application tree.
**Read first:** .workflow/specs/upstream-rebaseline.md, .workflow/development.md, .workflow/upstream-review.md, .workflow/technical-debt.md.
**Covers:** W1
**Check:** Acquire the actual upstream source revision and run a content/path comparison against the current fork; report its identity and every fork-only/changed/removed path class with a preservation or replacement disposition. Run `.workflow/bin/workflow validate`; no task or dependency errors.

## Done when

- [x] Refresh upstream main at execution time and record revision, date, acquisition method, and reproducible comparison inputs.
- [x] Preserve the current checkout and unrelated user changes before replacement; do not expose secrets in comparison reports.
- [x] Inventory OhPiChamber-owned customization, workflow/guidance, historical investigations, licensing/security material, and operational configuration.
- [x] Map the coherent latest runtime, dependency, Node/build, feature, and package closure; do not exclude OpenCode 2 or new features merely to protect the old 1.x baseline.
- [x] Identify source conflicts, destructive removals requiring a maintainer decision, external integration credentials, and runtime/platform verification prerequisites.
- [x] Update task 02's concrete integration inputs and checks from the pinned source; the next action remains actual baseline adoption, not more selective-port planning.

## Progress

Started from the current working tree without Git commands. Dirty-at-start ownership cannot be established through Git because it is not authorized. Every pre-existing source/configuration file is preserved in a private snapshot before replacement; uncertain ownership is not treated as permission to overwrite.

Comparison baseline: `/tmp/ohpi-rebaseline-3gef9jhv/fork-before.tar.gz`, SHA-256 `f86264de488395ae430cb2b067937e52d39498d180617c2eb2286b9a8a69e029`, mode `0600`, containing 5,338 paths excluding dependencies, generated output and Git internals. The private snapshot includes local configuration but comparison reports omit its contents and hashes. No commit, branch or landing is claimed.

Upstream main was refreshed through its public Atom feed after the commits API returned HTTP 403. The feed identifies `1f9320062c9a3c70925cf3243f1ee0c6e5f16765`, updated `2026-10-10T14:10:39Z`. The SHA-addressed codeload archive is SHA-256 `c313d38cb93bbcef0a67a2de575c6a5bf00ee2ef97eab7513e7b191c7a933cf6`; archive root and manifest were checked. This is newer than the historical input below.

Initial source comparison: 3,181 equal paths, 1,971 changed paths, 179 fork-only paths and 1,524 upstream-only paths. Counts exclude private runtime/configuration paths. The exhaustive disposition inventory is [upstream-baseline.json](../../upstream-baseline.json), covering all 6,855 compared paths. Input hashes and private configuration remain in the protected comparison workspace.

Check before: spike, not applicable. Initial workflow execution passed with five task files; Python deprecation warnings are inherited tool output.

Historical input: the earlier review compared selective v2.1.1 provenance with upstream `78dacb27fee580ec945a828d781cfe39b200b7bd`, including v2.2.0 and 57 later commits. Preserve that investigation; refresh the source identity rather than calling the old snapshot live latest.

One repository-wide source comparison is the spike's scope. It answers how to preserve the fork during the already-decided full update; it does not reopen whether to remain on 1.x. Git/GitHub CLI commands still require explicit authorization. Use archive/API acquisition otherwise.

Staged dependency availability passed with `bun install --frozen-lockfile --ignore-scripts`: Bun 1.4.2 installed 1,539 packages. This was the extracted upstream tree, not the assembled fork; lifecycle scripts, builds and runtime paths were not exercised by that check.

The system Node reports 22.23.1, below upstream's `>=24.14.0`. An isolated official Node 24.14.0 archive was acquired under the private comparison workspace, checked against its published SHA-256 `41cd79bb7877c81605a9e68ec4c91547774f46a40c67a17e34d7179ef11729df`, extracted, and executed successfully. No system installation changed. Browser automation opened an empty Chrome page; Xvfb, xvfb-run, xprop and xdotool are available for a real virtual-desktop smoke.

Docker CLI/socket, Android SDK/JDK and Xcode/iOS Simulator are unavailable on this workstation. Provider, remote-host, push and external integration credentials have not been exercised. These are runtime acceptance limits, not reasons to freeze the old application source or claims of passing those paths.

Host, UI and desktop/SDK scouts completed historical/content ownership comparison before application replacement. Retain the two independent native-push/APNs suites, typed native-push exports, workflow/guidance/history, security policy and migration notices. Other source differences follow the coherent refreshed closure. Content inspection is not runtime regression proof.

Check after: `.workflow/bin/workflow validate` passed with five task files. Both independent briefs used the general task fallback profile. Brief A found a stale development handoff; status and next action were corrected and its affected recheck passed. Brief B passed with no findings. No application source replacement, Git or landing occurred in this spike.

## Findings

The inventory classifies 3,043 paths for upstream adoption, 2,997 as unchanged, 135 for fork preservation, 71 for reconciliation, 95 obsolete source paths for retirement, 152 read-only release-note paths, 354 excluded collaboration/duplicate paths and eight excluded new release-note paths. Every compared path has one disposition. The fork-owned docs authoring guide and four identical referenced logo/badge assets remain. No application source has been replaced at this checkpoint.

The 95 retirements are historical upstream removals, including the old direct-provider small-model files, system-prompt plugin and legacy commitAndPush. The refreshed small-model module remains and forwards to OpenCode generation; do not delete that module. Native push keeps its typed Window declarations and public test helpers while adopting upstream window guards. No unresolved independent application customization was identified by this comparison.

Adopt the complete application and package closure, including inherited VS Code callers pending later OMP retirement. Keep the ten retained build/release workflows. Do not restore collaboration bots, triage skills, contribution templates, review evidence or duplicate isolated-space document owners. Keep release notes untouched.

Task 02 contains the exact source, runtime/toolchain pins, retained customization and runtime checks. Task 03 must reconcile the preserved migration notices and the refreshed ownership, queue storage, events, Guest shells, environment, SourceBoard, Quake and space wiring facts. The target SQLite queue is a proposed migration choice, not a claim about the inherited JSON queue. No OMP gate is advanced.

