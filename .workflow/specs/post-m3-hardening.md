# Post-M3 hardening and re-planning

**Status:** in progress
**Priority:** high

## What this is for

An independent review of `main` at `842a48adc` on 2026-10-23 found that the M3 migration is substantially real but not yet trustworthy as a finished state. The root test is red at the tip, the final M3 gate receipt does not describe a commit in `main`'s history, and several Agent Service lifecycle and boundary promises from the architecture are not met. The release pipeline also still calls removed OpenCode scripts, and the plan never assigned owners to distribution, upgrades, capacity, observability or existing-user migration. M4 and M5 as written cannot be executed directly.

This effort makes `main` verifiably green, fixes the confirmed defects, gives every unowned concern an owner, and re-plans M4/M5 into executable work. The maintainer's final acceptance of `omp-through-m3` waits for task 03 of this effort.

Evidence: `/home/shizuku/Project/ohpichamber-omp-artifacts/post-m3-review-2026-10-23/`, which holds six review reports (`AgentServiceReview.md`, `HostReview2.md`, `UIReview.md`, `SurfacesReview.md`, `PlanGapAnalysis.md`, `GateRerun.md`) and the gate rerun logs (`gate-*.log`). File and line references in the tasks are from `842a48adc`; the two later commits on `main` touched only workflow documents.

## What it does

When this effort is done:

- `bun run test` at the `main` tip passes, includes `agent-service` and `agent-contract`, and runs every package even when one fails. CI runs the same command.
- A current M3 gate receipt names a commit that is in `main`'s history; old receipts are marked historical.
- Agent Service and worker processes receive an allowlisted environment. Host secrets and the internal service token are not readable by agent tools.
- An unexpected Agent Service exit is followed by bounded automatic restart, with health reporting each state.
- A slow SSE reader receives every retained event in order; only real loss or an exceeded bound invalidates its stream.
- Every unconfirmed review finding is either reproduced and owned by a bugfix task, or closed with evidence.
- User-visible text no longer names OpenCode, and retained Host modules no longer live under `lib/opencode`.
- Release workflows stage and verify the Agent Runtime, and every release target has a defined native-package source.
- Process-tree cleanup has a defined, implemented behavior on macOS and Windows, and the Docker image runs the Agent Service without the OpenCode CLI.
- Agent Service diagnostics are observable, worker capacity has a measured policy, Host SQLite stores are versioned with a backup procedure, and existing OpenCode users get a first-run notice.
- The owed PROBE-05 benchmark and packaged live-region measurement have results.
- The Guest SDK transport change is versioned, and product docs claim only verified behavior.
- M4 and M5 are re-planned into executable specs and tasks. The OMP vendor upgrade has a runbook, and the upstream-sync question has an answer for the maintainer.

## How it is built

Phases, in landing order. Tasks inside a phase are independent unless their `Blocked by` says otherwise.

1. **Trustworthy main** (01-03): fix the three test regressions, put the new packages in the root test and CI, then rerun the full gate at the tip and repair evidence lineage.
2. **Agent Service correctness and security** (04-07): environment allowlist, crash restart, SSE backpressure, and a triage spike for findings that were read but not reproduced.
3. **OpenCode remnants** (08-10): a spike on isolated spaces (the only place OpenCode still executes), user-visible naming, and moving retained Host owners out of `lib/opencode`.
4. **Release and platforms** (11-15): release workflows, a native-package spike, non-Linux cleanup, Windows signing and the Docker image.
5. **Operations** (16-20): diagnostics, a capacity spike and policy, SQLite versioning and backup, and the first-run notice.
6. **Owed checks and contracts** (21-24): the PROBE-05 and live-region spikes, Guest SDK versioning and a docs truth pass.
7. **Re-planning** (25-28): M4 and M5 re-breakdown, the OMP vendor runbook, and an upstream-sync spike.

Spikes that answer a design question draft their follow-up implementation task as part of their answer (`flow-break` amend). New tasks take numbers after the highest used.

### Landing rules for this effort

- One task per commit set, landed per `standards.md` (`Landing: local-merge`). No squash of several tasks into one commit.
- Every task that changes source runs `bun run test` at its landing commit, not just focused suites. The follow-up commits after the old gate broke three suites because only focused checks ran.
- A receipt names the commit and worktree it ran in. Only one receipt per check is current.

### Parallel sessions

Work runs in lanes. Each lane is one conversation in its own worktree under `/home/shizuku/Project/ohpichamber-worktrees/`, works its tasks in the order listed, and edits only the files its tasks name. Code that another lane owns is changed only by asking that lane's session. Lanes A-G can start at the same time; lane H starts after A and E land.

| Lane | Tasks, in order | Owns | Waits for |
|---|---|---|---|
| A Baseline | 01 → 02 → 03 → 10 → 19 | quota/agents/`useConfigStore.ts`/`agentConfigBridge.ts` stores, `selected-credential.js`, root `package.json` `test`, `oc-review.yml`, M3 receipts, `lib/opencode/` moves, Host SQLite stores | nothing |
| B Agent lifecycle | 04 → 05 → 16 → 13 → 18 | `agent-service-supervisor.js`, `agent-runtime.js`, `agent-service/src/supervisor/workers.ts`, process-registry/pidfd modules | 13 waits for C's 07 finding on worker descendants; 18 waits for F's 17 |
| C Streams and triage | 06 → 07 → bugfixes 07 drafts | `agent-service/src/supervisor/service.ts` stream path, `sessions/registry.ts`, `globalSessions.ts`/`useGlobalSessionsStore.ts`, `session-actions.ts` `optimisticSend`, contracts route text | a worker-descendant fix goes to lane B as task 13, not to C |
| D Release | 12 → 11 → 14 → 15 → 27 | `.github/workflows/` except `oc-review.yml`, `scripts/oc-dev.mjs`, `packages/electron/scripts/`, Electron packaging config, `Dockerfile`, `scripts/docker-entrypoint.sh`, `vendor/omp/` docs | 14 asks open question 4; 12's follow-up asks question 5 |
| E Comparison audit | `omp-opencode-comparison/01` | `.workflow/research/` only | nothing |
| F Spikes | 08 → 17 → 21 → 22 → 28 | throwaway scripts outside the tree; task files only | 08 records the isolated-spaces decision; Task38 owns the OpenCode runtime removal after a dedicated owner is assigned; 28's answer asks question 7 |
| G UI, SDK and docs | 09 → 20 → 23 → 24 | i18n messages, composer footer, the first-run notice and its Host probe route, `packages/sdk`, `PluginPane.tsx`, `packages/docs`, package READMEs | 23 implements the maintainer's breaking-version decision for the private Guest bootstrap transport |
| H Re-plan | 25 → 26 | new M4/M5 specs and tasks | A's 03 and E's audit landed; asks questions 3 and 6 |

Landing order: lane A's task 01 lands first. Other lanes may build before that, but they rebase onto `main` and run `bun run test` green before each landing. Lane A's task 10 moves files under `packages/web/server/lib/opencode/`; any lane that touches those files rebases after it lands. Lane G registers its new Host route at the location in place after task 10, so it lands after 10 or rebases onto it.

## What it must not do

- Add OpenCode fallbacks, aliases or compatibility imports. Removing OpenCode code from isolated spaces happens only after the task 08 answer and the maintainer's decision.
- Silence tests, lint rules or unhandled errors to get green. Fix the cause (CONVENTIONS §8).
- Claim macOS, Windows, mobile device, Docker or GitHub Actions results without running them there. Name the stand-in.
- Run GitHub commands or make outbound network requests without the maintainer's explicit permission.
- Edit `changelog/`.

## What was considered and rejected

- **Accept `8d179c4e2` as the M3 gate for `main`.** Its source matches `24f1012c1`, but it does not cover the 12 later commits, and those are where the test failures came from.
- **Treat the `.github`, `.agents` and changelog differences as unrelated M3 churn.** Compared with the pre-migration commit `2a910d6fb`, `changelog/` is unchanged; the rebaseline chose not to adopt upstream release notes. The `.github` and `.agents` removals follow recorded cleanup decisions (`development.md` "Development-focused repository cleanup" and "Skill/document cleanup"). They were landed inside the M3 squash, which is a process problem, not a content problem. No task reverts them.
- **UI review finding "recovery does not reattach after an unchanged snapshot".** False positive: `packages/ui/src/sync/sync-context.tsx:180` returns only when the store's cursor differs from the snapshot's, i.e. a stale snapshot. Do not re-investigate.
- **Release isolated spaces on OpenCode.** It contradicts the OMP-only target. Spaces are unreleased (`packages/ui/src/lib/spaces/release.ts:6`, `ISOLATED_SPACES_RELEASED = false`), so the OpenCode path is not user-reachable today.

## How we will know it works

- **H1.** `bun run test` exits 0 at the `main` tip, its output includes `agent-service` and `agent-contract`, a failure in one package does not skip later packages, and `.github/workflows/oc-review.yml` runs it.
- **H2.** The current M3 gate receipt names a commit that `git merge-base --is-ancestor <sha> main` accepts, ran in the landing worktree, and all phases exit 0. Status documents cite only it.
- **H3.** With sentinel secrets in the Host environment, neither a worker's tool shell nor the Agent Service's `/proc/<pid>/environ` exposes them or the internal token, and a real provider prompt still completes.
- **H4.** Killing the Agent Service process makes `/api/agent/v1/ready` return to 200 within the backoff window and a new prompt completes; a crash loop ends in a visible failed state.
- **H5.** A slow SSE reader receives a replay larger than the socket buffer in order; exceeding the stated bound produces `stream.invalidated`.
- **H6.** Every item in task 07 has a recorded answer, and each confirmed bug has a landed bugfix task.
- **H7.** No user-visible string names OpenCode as the engine, and `packages/web/server/lib/opencode/` contains no retained Host owner.
- **H8.** Release and smoke workflows reference no removed script, they stage and verify the Agent Runtime, every release target has a defined native-package source, and Windows release signing is required.
- **H9.** Stopping the Agent Service or a worker leaves no descendant process on Linux; macOS and Windows behavior is implemented and its unverified status is explicit.
- **H10.** The Docker image starts the Host and Agent Service without the OpenCode CLI.
- **H11.** Worker and service diagnostics reach a bounded, redacted Host log; a measured worker capacity policy is enforced; Host SQLite stores carry a schema version and documented backup/restore; existing OpenCode users see a one-time notice.
- **H12.** PROBE-05 and the packaged live-region measurement have recorded results.
- **H13.** The Guest SDK transport change has an explicit version or compatibility decision, and SDK examples name the supported version.
- **H14.** Product docs and package READMEs describe only verified behavior or label it.
- **H15.** M4 and M5 each have an approved spec and tasks, the OMP vendor upgrade runbook reproduces the current pin, and the upstream-sync question is answered for the maintainer.

## Settled decision and open questions

Settled decisions are recorded here for reference. Remaining questions belong to the maintainer; the task that needs each answer asks it when it starts.

1. **Resolved (2026-10-24): Guest SDK compatibility** (task 23): ship an explicit breaking version bump for the private `MessageChannel` bootstrap transport. Old window-message clients receive an explicit version-mismatch result; no compatibility path or fallback is added. Decision: `decisions.md: 2026-10-24 - Break the Guest SDK version for the private bootstrap transport`.
2. **Resolved (2026-10-23; recorded 2026-10-24): Isolated spaces** (Task08): remove the OpenCode space runtime and keep spaces unreleased until an OMP runtime is built as a separate effort. Task38 owns that removal and remains unassigned pending a dedicated owner. Decision: `decisions.md: 2026-10-24 - Keep isolated spaces unreleased without the OpenCode runtime`.
3. **Mobile in the release matrix** (task 26): keep Capacitor mobile as a supported surface pending device validation, or take it out of the matrix and docs until then.
4. **Windows signing** (task 14): which certificate and secret names the release jobs use.
5. **Native packages for non-Linux targets** (after task 12): vendor registry prebuilt binaries pinned by integrity, or build from the pinned Rust source.
6. **npm standalone distribution** (task 26): publish the Agent Service packages, bundle them into `@openchamber/web`, or drop npm standalone from the supported matrix.
7. **Upstream OpenChamber sync** (after task 28): which policy to adopt.

## Notes

Tasks are in `../tasks/post-m3-hardening/`. Related input: `omp-opencode-comparison/01` (the OMP/OpenCode adaptation audit, not yet executed) blocks the M4 re-plan.
