# 17: Measure worker memory under concurrent sessions

**Effort:** post-m3-hardening
**Task type:** spike
**Base commit:** 690685e33071be6393d3caa9cd52981dd8475070
**Started:** 2026-10-24T13:35:00Z

**Delivers:** Answer to: what do 1, 5 and 10 concurrent roots cost in RSS (same and different workspaces), and what cap and idle-eviction policy does that support?

**Blocked by:** None
**Files:** `packages/agent-service/src/supervisor/workers.ts` (admission 161-183, launch 262-283)

**Read first:** `.workflow/specs/post-m3-hardening.md`; `.workflow/omp-migration/architecture.md` ADR-03 and lines 42-48, 433; `.workflow/decisions.md` "2026-10-11 - Accept measured worker memory as an M0 limitation"; `.workflow/development.md` task 08 RSS numbers; `.workflow/spike-tasks.md`
**Covers:** H11

**Check:** `## Findings` records the measured RSS per configuration on the real built service (provider or loopback fixture named), the recommended cap and idle timeout, and drafts task 18's exact policy values.

## Done when

- [x] Measurement scripts are throwaway and deleted; the receipt is kept in the evidence directory.
- [x] Time box: one measurement run per configuration.

## Progress

- Dirty at start: none in this worktree when the task branch was cut. The archived Task08 work is on `main` at `690685e33`; this task branch is `post-m3-hardening/17-worker-capacity-measurement` in `/home/shizuku/Project/ohpichamber-worktrees/lane-f-spikes`.
- Sequence authority: the archived Task08 recorded "do not start 17 until 08 is landed". Task08 landed on `main` at `690685e33` (user-confirmed), and the director then authorized Task17 explicitly. This is the current coordinator gating, not a timeless invariant.
- Check before: spike, skipped per `flow-implement` step 1.
- Read: `.workflow/specs/post-m3-hardening.md` (H11, lane F order), `.workflow/omp-migration/architecture.md` ADR-03 and the worker-lifecycle section (lines 42-48, 429-433), `.workflow/decisions.md` "2026-10-11 - Accept measured worker memory as an M0 limitation", `.workflow/development.md` task-08 historical RSS numbers, `.workflow/spike-tasks.md`, `flow-implement`, `flow-start`, `performance-engineering`, `desktop-shell`, plus `packages/agent-service` supervisor/worker source and the Host supervisor's IPC contract.
- Evidence: `/home/shizuku/Project/ohpichamber-omp-artifacts/task17-2026-10-23/task17-worker-capacity-receipt.json` (sha256 `c79ab7b380541f48a4fb2eeb155f29789c8169f62aa6ac4537610a6ac6af8bae`). All throwaway runners (`task17-runner.mjs`, `task17-runner-v2.mjs`, `task17-diagnostic.mjs`) and the temporary workspace tree were deleted after the receipt was written.
- Check after: measured six configurations on the built service with a named loopback provider fixture; cap and idle-timeout recommendation plus the draft Task18 policy values are in `## Findings`.
- Landing gate: full root `bun run test` on this branch at HEAD `910b468e7a0b6002380c50f700d16ca8f60aaae2` over base `873b7f82678bf0caca03e4e484364aeee1cfc63a` exited 0 in 507 s with `TMPDIR=/tmp/omp-task17-gate-l9TZxO` (device 54, same as `/tmp`, 0 initial entries). 7/7 suites: scripts 22/22, sdk 23/23, ui 805/805, agent-contract 177 pass/0 fail, agent-service 229 pass/7 skip/0 fail, electron 44/44, web 378 passed/9 skipped files (6128 passed/135 skipped tests). Evidence: `/home/shizuku/Project/ohpichamber-omp-artifacts/task17-2026-10-23/run-01/` (`bun-run-test.log`, `bun-run-test.exit`, `environment.txt`). An earlier gate attempt was cancelled on instruction; its top-level log and exit file remain labelled as cancelled and are not a result.
- Provenance incident, disclosed rather than claimed preserved: the cleanup that deleted the fresh `task17-runner-v2.mjs` also deleted the earlier external `task17-runner.mjs` and `task17-diagnostic.mjs`. Those two were never in git and no hashes were retained, so they are lost and were not recreated. No prior artifact was reused or overwritten; the retained receipt is unaffected.
- No source, spec, decisions, development, glossary, package or Task37 file changed. No Task23 work. No `main` write or merge.

## Findings

**Answered question:** what do 1, 5 and 10 concurrent roots cost in RSS (same and different workspaces), and what cap and idle-eviction policy does that support?

**Method.** Built `packages/agent-service/dist/index.js` and `dist/worker/index.js` from `690685e33` (`bun run --cwd packages/agent-service build`) and ran the real service as a Bun sidecar with a parent that answers the Host IPC contract (internal secret, approval-policy list/commit, skill-source reconcile, worker authorization `allowed: true`, host actions unavailable). Provider fixture: loopback `127.0.0.1` HTTP server named `loopback` with model `loopback-model` (`openai-completions`, endpoint `/v1`), serving a role frame, three content chunks 250 ms apart and a finish frame, so each run is observably active while sampled. Service and workers were sampled from procfs (`/proc/<pid>/status` `VmRSS`/`RssAnon`/`RssFile`/`RssShmem`, `/proc/<pid>/smaps_rollup` `Pss`, `/proc/<pid>/stat` threads and CPU ticks). Workers are the direct children of the service PID; the service's `/internal/workers` route supplied the worker-kind counts. Each configuration ran exactly once in this pass, then its service was stopped with `SIGTERM`, the exit was awaited, and surviving children were checked.

**Measured totals per configuration** (PSS is the reliably additive aggregate; VmRSS sums double-count shared file pages). `settled` = 3 s after all workers reported ready, no run yet; `activePeak` = highest of three samples while all runs streamed; `idle` = 3 s after every run reported `activeRun === null` and `runtimeStatus === 'idle'`. Service process PSS was 134-138 MiB.

| Configuration | Roots | Workspaces | Workers (kinds) | Settled PSS | Active peak PSS | Post-run idle PSS |
|---|---|---|---|---|---|---|
| 1 root, same workspace | 1 | 1 | 1 session + 1 stateless | 656 MiB | 802 MiB | 681 MiB |
| 1 root, different workspace | 1 | 1 | 1 session + 1 stateless | 643 MiB | 791 MiB | 682 MiB |
| 5 roots, same workspace | 5 | 1 | 5 session + 1 stateless | 2013 MiB | 2473 MiB | 2086 MiB |
| 5 roots, different workspaces | 5 | 5 | 5 session + 5 stateless | 3095 MiB | 3629 MiB | 3293 MiB |
| 10 roots, same workspace | 10 | 1 | 10 session + 1 stateless | 3394 MiB | 4197 MiB | 3917 MiB |
| 10 roots, different workspaces | 10 | 10 | 10 session + 10 stateless | 6115 MiB | 6900 MiB | 6607 MiB |

**Per-process observations.** Settled VmRSS per worker process (all kinds mixed) was 352-509 MiB, typically 356-400 MiB, of which `RssAnon` 296-453 MiB and `RssFile` 55-59 MiB per process; settled PSS per process was 298-457 MiB. Thread counts were 38-68. Marginal cost between measured points (settled VmRSS): 1 -> 5 roots in the same workspace added 1586 MiB for four workers (~397 MiB each); 5 -> 10 roots added 1674 MiB for five (~335 MiB each); 5 -> 10 roots across distinct workspaces added 3589 MiB for ten processes (~359 MiB each). The 1-root rows are the same topology (one workspace, one root) and differ by 13 MiB settled, 1.7% of the mean, which is the observed run-to-run spread on an unchanged build.

**Workspace overhead.** A stateless catalog worker exists per registered workspace and costs the same order as a session worker (e.g. 10 workspaces adds ten stateless workers). Root count alone therefore understates cost when roots are spread over workspaces: 10 roots in one workspace is 3.4 GiB settled, 10 roots in ten workspaces is 6.1 GiB settled / 6.9 GiB peak.

**Idle behaviour.** Idle after a completed turn was 3-15% *above* the pre-run settled value in every configuration (for example 4016 MiB -> 4578 MiB VmRSS and 3394 -> 3917 MiB PSS for 10 roots in one workspace). Idle workers do not release memory; keeping them alive after the user has moved on costs the full per-worker footprint indefinitely.

**Admission behaviour.** The current supervisor has no worker cap and no idle eviction (verified in `workers.ts`/`service.ts`), so 10 concurrent roots, including ten distinct workspaces and twenty worker processes, were accepted and served. The measurement therefore reports supported behaviour rather than a blocked configuration; no cap was altered to make a configuration pass.

**Recommended policy.**
- **Cap: 5 active root-session workers (default).** Measured worst case at 5 roots is ~2.5 GiB active in one workspace and ~3.6 GiB active across five workspaces, plus the ~0.14 GiB service, which fits an 8 GiB developer machine with room for the app. 10 roots across ten workspaces measured ~6.9 GiB worker PSS plus 0.14 GiB service, which needs a 16 GiB machine. The cap bounds the worst measured configuration near 4 GiB rather than 7 GiB.
- **Idle eviction: idle timeout 600000 ms (10 min), reap interval 30000 ms.** The measurement justifies eviction (idle workers keep, and slightly grow, their full footprint); the exact timeout is a product choice inside that evidence, not a measured optimum. A worker may be evicted only when it has no active run, no pending operation, no unresolved approval/question, and no restart reservation.
- **Admission beyond the cap** should be refused for a new root rather than silently oversubscribing; an existing root always keeps its worker.

**Draft Task18 policy values** (for the Task18 owner; not edited into Task18 here):

```ts
export const WORKER_CAPACITY_POLICY = {
  maxActiveRootWorkers: 5,
  idleEvictionTimeoutMs: 600_000,
  reapIntervalMs: 30_000,
} as const;
```

Semantics to implement in Task18: count only `kind: 'session'` workers toward `maxActiveRootWorkers` (stateless/catalog workers are per-workspace overhead, not roots); refuse a new root's admission with the existing `503 SERVICE_UNAVAILABLE` problem when the cap is reached, leaving existing workers untouched; evict an idle worker only when `pending.size === 0`, no action is in flight, no interaction is unresolved and no restart is reserved, then stop it through the existing graceful `stopEntry` path; never evict a worker with a live run.

**Limitations.** One Linux x64 host, one loopback provider, exactly one run per configuration, and no macOS/Windows or real-provider measurement. The service does not expose a PID-to-kind mapping, so per-process RSS samples mix session and stateless workers; the totals and the kind counts are exact. VmRSS aggregates double-count shared pages, so PSS is quoted for aggregates. CPU is recorded as summed scheduler ticks in the receipt, not as a utilization percentage. Historical task-08 numbers (service 63,292 KiB; workers 381,612/390,796/392,356 KiB) remain historical and were neither rerun nor reused as a baseline.

**Recorded in:** this task file's `## Findings`; the receipt above. Spec/decisions/glossary are outside this lane's write scope; the Task18 owner or the maintainer records the policy decision.
