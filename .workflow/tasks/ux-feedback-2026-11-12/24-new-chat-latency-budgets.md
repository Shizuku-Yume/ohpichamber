# 24: Meet the new-chat latency budgets and close task 17's races

**Effort:** ux-feedback-2026-11-12
**Task type:** bugfix
**Blocked by:** 17
**Covers:** W11
**Files:** `packages/agent-service/src/supervisor/{service,workers,catalog}.ts`; `packages/ui/src/sync/{session-ui-store,session-actions}.ts`; `scripts/perf/omp-performance.mjs`; `.workflow/decisions.md` (the task 17 entry that accepted about 880 ms)
**Read first:** the independent review of task 17, `/home/shizuku/Project/ohpichamber-omp-artifacts/ux-feedback-2026-11-13/independent-review/Review17.md` (all five findings); `.workflow/done/ux-feedback-2026-11-12/17-new-chat-latency.md` and its receipts; `research/feedback-2026-11-12/15-16-streaming-latency.md` (cause 2: the steps `admit` runs under the catalog lock); skills `performance-engineering`, `sync-state-invariants`
**Check:** run `bun run profile:omp` with the `create → run → first event` scenario on the fixture provider. It must record `POST /sessions` p50 ≤ 400 ms and the first `part.delta` ≤ 600 ms after send on a new chat. Spec W11 sets these budgets, and only the maintainer can waive them.
**Check before:**
- `bun run profile:omp -- --url http://127.0.0.1:4124 --dir /tmp/oc-perf-serve-4124/project --output /home/shizuku/Project/ohpichamber-omp-artifacts/ux-feedback-2026-11-13/task24/before --skip-ui` on base commit `81e48cd715c2525dad96b3bd360a370063ac5f67`:
  - `POST /sessions` p50: 1022.49 ms (samples: 947.51, 1023.89, 947.5, 1022.49, 1075.17 ms; budget ≤ 400 ms)
  - first `part.delta` after send on a new chat p50: 1378.49 ms (samples: 1252.81, 1378.49, 1252.2, 1416.9, 1397 ms; budget ≤ 600 ms)
  - first `part.delta` after `POST /runs` p50: 316.08 ms (samples: 296.26, 348.17, 296.29, 385.66, 316.08 ms)
  - Receipt written to `/home/shizuku/Project/ohpichamber-omp-artifacts/ux-feedback-2026-11-13/task24/before/omp-performance.json`.
**Check after:**
- Command: `bun run profile:omp -- --url http://127.0.0.1:4134 --dir /tmp/r3/final/project --output …/task24/after-9/run{1,2,3} --new-chat-runs 10 --skip-ui`, isolated `HOME`, throwaway `OPENCHAMBER_DATA_DIR`, fixture provider on 4133. Receipts: `task24/after-9/{run1,run2,run3}/omp-performance.json`.
- **Load caveat, recorded because it dominates the absolute numbers:** these three runs happened at load average 12–22 with six other worktrees holding idle TypeScript servers and under 2 GB free. The same build measured (c) 220–232 ms earlier at load ~6. Treat the numbers below as the loaded-machine reading and the earlier ones as the floor; the verdict per variant is the same in both.
- **Prepared path (c) — what the product does, because opening the composer calls `prepare`: MEETS both budgets in every run.** `POST /sessions` p50 8.77 / 10.71 / 7.56 ms (≤ 400). First `part.delta` after send p50 **378 / 473 / 324 ms** (≤ 600), against 220–232 ms on the same build at lower load.
- **Cold path (a): `POST /sessions` MEETS, first `part.delta` DOES NOT.** `POST /sessions` p50 20.84 / 27.38 / 20.40 ms (≤ 400). First `part.delta` p50 **1261 / 1651 / 1272 ms** here, 720–800 ms at lower load and 855–934 ms in the round-3 review's runs, against ≤ 600. Needs the maintainer waiver recorded in `.workflow/decisions.md`.
- **Prepare-issued-then-send (b): both budgets MISS, accepted and documented.** `POST /sessions` p50 **848 / 939 / 749 ms** against ≤ 400, because creation awaits its own in-flight prepare; first `part.delta` p50 1170 / 1351 / 1035 ms.
- Stream cadence p50 33.3 ms (≤ 33 ± 5 MET).
- Suites: `bun test packages/agent-service/src` 512 pass / 10 skip / 0 fail; web `openchamber-sessions` + `shutdown-runtime` 176 pass; UI sync 171 pass; type-check, `oxlint` on changed files and `dead-code` clean for changed files.

**Check before:**
- `bun run profile:omp -- --url http://127.0.0.1:4124 --dir /tmp/oc-perf-serve-4124/project --output /home/shizuku/Project/ohpichamber-omp-artifacts/ux-feedback-2026-11-13/task24/before --skip-ui` on base commit `81e48cd715c2525dad96b3bd360a370063ac5f67`:
  - `POST /sessions` p50: 1022.49 ms (samples: 947.51, 1023.89, 947.5, 1022.49, 1075.17 ms; budget ≤ 400 ms)
  - first `part.delta` after send on a new chat p50: 1378.49 ms (samples: 1252.81, 1378.49, 1252.2, 1416.9, 1397 ms; budget ≤ 600 ms)
  - first `part.delta` after `POST /runs` p50: 316.08 ms (samples: 296.26, 348.17, 296.29, 385.66, 316.08 ms)
  - Receipt written to `/home/shizuku/Project/ohpichamber-omp-artifacts/ux-feedback-2026-11-13/task24/before/omp-performance.json`.
**Check after:**
- Latest measurement: `bun run profile:omp -- --url http://127.0.0.1:4134 --dir /tmp/r3/run/project --output …/task24/after-9/run{1,2} --new-chat-runs 10 --skip-ui`, isolated `HOME`, throwaway `OPENCHAMBER_DATA_DIR`, fixture provider on 4133. Receipts in `task24/after-9/{run1,run2}/omp-performance.json`; the earlier `after-8` and round-3 runs are alongside them.
- **Prepared path (c) — what the product does, because opening the composer calls `prepare`: meets both budgets.** First `part.delta` p50 ≈ 220–260 ms (≤ 600 MET), `POST /sessions` p50 6–7 ms (≤ 400 MET).
- **Cold path (a): `POST /sessions` MET, first `part.delta` NOT MET.** p50 ≈ 720–800 ms on a lightly loaded machine, ≈ 855–934 ms under load, against ≤ 600 ms. Keep the maintainer waiver wording in `.workflow/decisions.md`.
- **Prepare-then-immediate-send (b): both NOT MET, accepted.** `POST /sessions` p50 560–750 ms against ≤ 400 ms, because creation awaits its own in-flight prepare; first `part.delta` p50 ≈ 780–1020 ms. Documented as an accepted miss, not fixed: the alternative would move the same wait into send.
- Stream cadence p50 ≈ 33.2 ms (≤ 33 ± 5 MET).
- Full suites: `bun test packages/agent-service/src` 512 pass / 10 skip / 0 fail; UI sync 171 pass; web `openchamber-sessions` 165 pass; type-check, `oxlint` on changed files and `dead-code` clean for changed files.

**Check before:**
- `bun run profile:omp -- --url http://127.0.0.1:4124 --dir /tmp/oc-perf-serve-4124/project --output /home/shizuku/Project/ohpichamber-omp-artifacts/ux-feedback-2026-11-13/task24/before --skip-ui` on base commit `81e48cd715c2525dad96b3bd360a370063ac5f67`:
  - `POST /sessions` p50: 1022.49 ms (samples: 947.51, 1023.89, 947.5, 1022.49, 1075.17 ms; budget ≤ 400 ms)
  - first `part.delta` after send on a new chat p50: 1378.49 ms (samples: 1252.81, 1378.49, 1252.2, 1416.9, 1397 ms; budget ≤ 600 ms)
  - first `part.delta` after `POST /runs` p50: 316.08 ms (samples: 296.26, 348.17, 296.29, 385.66, 316.08 ms)
  - Receipt written to `/home/shizuku/Project/ohpichamber-omp-artifacts/ux-feedback-2026-11-13/task24/before/omp-performance.json`.
**Base commit:** 81e48cd715c2525dad96b3bd360a370063ac5f67
**Status:** active
**Review:** pending independent re-review (reviewer session ufb-24-reviewer: round 1 FAIL, round 2 FAIL, round 3 FAIL)

## Progress

- **Earlier rounds.** `admit` paid a synchronous worker launch (914.5 ms), so `POST /internal/sessions` gained `deferred: true` and prompts queue behind readiness; `POST /sessions` fell to 13–14 ms. `stopGeneration`, causal registration failures, the optimistic draft bubble and its restore guard landed then.
- **Traced per-hop timeline (`after-8`).** Temporary instrumentation stamped one shared wall-clock file from the Host, supervisor, worker and fixture; all of it was removed. Raw logs: `task24/after-8/analysis/`. Variant (a), 12 samples, ms after send, p50: Host create 5.6, client attach + run 6.0, await worker open 60.0, `createAgentSession` 108.8, mode reconcile 1.0, post-init `Promise.all` 273–316, ready → dispatch 1.0, prompt prepare 1.5, agent-loop prep 143.8, provider first byte + relay 13.0.

- **Where the time actually goes, measured with CPU accounting.** `process.cpuUsage()` around each window turns out to exceed the window's wall time in every branch (`post-init` 449 ms CPU / 272 ms wall; skill apply 492/316; extension init 474/307; model selection 217/143). Those branches therefore run **concurrently**, and the wall time each reports is queueing, not its own work:

  | Claim from the earlier table | Measurement |
  |---|---|
  | Skill preflight ~280 ms is a slow plugin-root scan | `listClaudePluginRoots` is **2.0 ms cold, 0.3 ms warm** when called directly, and its own window inside the worker is 254–268 ms wall at 1.6× CPU. It is waiting for the single JS thread, not scanning disk. |
  | Model selection ~125 ms plus `setModelTemporary` ~148 ms | `resolveSelection` is 128.6 ms wall / 216.7 ms CPU, and `setModelTemporary` is 154.2 ms wall / 243.6 ms CPU, overlapping the same window. |
  | Prompt-to-provider ~163 ms | Real and serial: the fixture receives the request **9–13 ms** after `before_provider_request`, so the rest is agent-loop preparation the worker cannot start earlier. |

  So the two "discovery" windows are starvation behind one busy thread; the genuine serial cost is `createAgentSession` (108.8) plus the agent-loop prep (143.8) plus roughly 60 ms of supervisor queueing.

- **`setModelTemporary` on the model the session already has: measured isolated, and it is free.** All 32 post-init `selectOptions` calls resolved to the session's own model, and OMP does skip that call in `#restorePlanPreviousModel`. Round 3 proposed skipping it as the lever to bring the cold path under budget. Measured directly in the worker fixture, three runs each: a same-model `setModelTemporary` costs **0.2–0.7 ms wall, 0.1–0.7 ms CPU**; switching to a different model and back costs 0.2–4.2 ms. The 154 ms the earlier per-window `process.cpuUsage()` attribution put on this call was process-wide CPU from the other branches running concurrently, not this call. `resolveSelection` is the real cost in that branch, at **63–96 ms wall / 83–116 ms CPU** in the same harness. So skipping the redundant switch is a transcript and provider-session correctness improvement worth about a millisecond; it is not a latency lever and does not belong in this task. Reverted, with a test that a prompt naming a different model still switches.

- **Latency cuts landed in this task:** idle-worker runtime prewarming (~550 ms), `resolveHostSessionScope` for SSE attach (~870 ms), `liveRootSessions` on `POST /runs`, the synchronous session-file write in `createInitialSession`, `capturePolicy()` moved off the open path, and the guarded `refreshSkills()`/model-policy reloads.
- **Spare pool (`workers.ts`).** Two slots per workspace instead of one, counted over loaded and still-loading processes. Adopting a spare previously left nothing behind, so the next new chat cold-launched — the alternating fast/slow pattern of `after-6`. Round 3 found the refill it added retried from its own settle and could livelock the service's single thread when no spare could spawn (a worktree lease, a missing entrypoint, a worker that died loading). The retry now comes from the reaper's fixed-interval sweep, and a refused or failed attempt sets a block only that sweep clears, so a refusal costs one attempt per interval. `workers.spare.test.ts` proves a second launch adopts instead of spawning, and that a leased workspace does not stop 100 ms timers.
- **Tests that could not fail, now fixed.** The idle-reap test never advanced the five-minute timer (it now uses fake timers and fails if the reaper is deleted); the prepare/create race test awaited a delay both requests shared, so it passed on the pre-fix tree (it now delays prepare's workspace resolve and reports two creations against `8ce92ddb99`, one here); the adoption test asserted a spawn count the refill pads either way (it now names the process that served the second session and asserts it was already spawned, so disabling adoption fails it).
- **`warm` reply.** A spare reports `idle` as soon as its module graph is loaded (adoption stays possible) and `warm` once its background prewarm finished. The supervisor prefers a warm spare over a still-loading one, so a session is never handed a process that will finish its warm-up on the user's time. `protocol.ts` carries the new reply.
- **`prewarmNativeRuntime` returns its promise** so the worker can report `warm`; behaviour and ordering are otherwise unchanged.
- **Rejected experiments (measured, then reverted):** a throwaway `createAgentSession` on a separate runtime (regressed (a) to 1155 ms and hit an `AgentRegistry.global()` conflict), gating the `idle` reply on prewarm (broke startup readiness), `prepare` with `deferred: true` (moved the wait into send; regressed (c) to 842 ms), and skill warm-up inside the spare (no gain).
- **Budget status.** Variant (a) is **not met**: 761.41 / 769.69 ms p50 in the cleanly loaded traced runs, 797.28 / 920.85 ms in the two Check runs under memory pressure, against a 600 ms budget. It is not reachable by moving work around: what is left is ~109 ms of `createAgentSession`, ~144 ms of serial agent-loop preparation before the provider call, and ~60 ms of supervisor queueing — real work in one process, on one thread, for a brand-new session. The two windows that looked like removable discovery (`280 ms` skill apply, `128 + 154 ms` model selection) are concurrency artifacts, proven by CPU accounting: their CPU time exceeds their own wall time, and `listClaudePluginRoots` is 2 ms when called directly. Reaching 600 ms on this path needs the native session to be constructible in the spare, which would need an SDK seam that does not exist (`AgentRegistry.global()` is process-wide and a second `createAgentSession` was measured at +1155 ms with a registry conflict). Variant (c) — what the composer produces, because opening a draft calls `prepare` — is 220.38 / 227.29 ms p50 and met the budget in every run since `after-6`.
- **What variant (b)'s 550 ms `POST /sessions` is.** It is not a regression to fix. The Host's `prepare` adopts a session whose worker open has already finished, so `create` costs 6 ms; variant (b) posts `prepare` and `create` together, so `create` awaits its own in-flight prepare and pays that open. The alternative the assignment suggested — return the prepared session id at once and let the run wait on readiness — is already what the deferred path does, and measuring it was variant (a): 761 ms p50. There is no ordering that both avoids the wait in `create` and keeps the wait out of `send`, because one of them has to hold the open. No change; the three variants stay as they are.
- Check after (`task24/after-8`):
  - Command: `bun run profile:omp -- --url http://127.0.0.1:4134 --dir /tmp/task24-perf/project --output /home/shizuku/Project/ohpichamber-omp-artifacts/ux-feedback-2026-11-13/task24/after-8/run{1,2} --new-chat-runs 10 --skip-ui`, isolated `HOME`, throwaway `OPENCHAMBER_DATA_DIR`, fixture provider on 4133. Both runs under heavy machine memory pressure (940 MB free, six other worktrees holding idle `tsc`).
  - `POST /sessions` p50: 13.74 / 14.31 ms (noPrepare), 742.10 / 739.14 ms (prepareImmediate), 7.03 / 6.59 ms (prepareCompleted). The ≤ 400 ms budget is met by the paths a user takes.
  - first `part.delta` after send p50: (a) **797.28 / 920.85 ms**, (b) 1019.24 / 995.09 ms, (c) **258.16 / 273.20 ms**. Variant (c) meets ≤ 600 ms; (a) does not, and these two runs are the worst of the traced series because of the memory pressure (the cleanly loaded traced runs of the same build measured (a) 761.41 and 769.69, (c) 220.38 and 227.29).
  - stream cadence p50: 33.27 / 33.26 ms (budget 33 ± 5 ms, met).
  - Receipts: `task24/after-8/{run1,run2}/omp-performance.json`; the six traced runs, the raw hop logs and the CPU-accounted logs are in `task24/after-8/{traced,traced2,cpu,branches,samemodel,skipmodel,analysis}/`.
  - `bun test packages/agent-service/src`: 512 pass, 10 skip, 0 fail, 71 files.
  - UI sync: 171 pass. Web `openchamber-sessions`: 165 pass, 11 files. agent-service type-check, `bunx oxlint` and `bun run dead-code`: clean for the changed files.
