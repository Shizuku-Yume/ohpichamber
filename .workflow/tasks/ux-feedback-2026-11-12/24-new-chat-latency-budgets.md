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
- `bun run profile:omp -- --url http://127.0.0.1:4124 --dir /tmp/oc-perf-serve-4124/project --output /home/shizuku/Project/ohpichamber-omp-artifacts/ux-feedback-2026-11-13/task24/after-6/run1 --new-chat-runs 10 --skip-ui` (Run 1, 10 samples per variant):
  - Variant (a: no prepare):
    - `POST /sessions` p50: 13.34 ms (samples: 11.67, 12.48, 13.34, 13.52, 13.60, 13.62, 12.13, 14.75, 13.10, 13.81 ms; budget ≤ 400 ms - MET)
    - first `part.delta` after send p50: 745.46 ms (samples: 675.53, 990.40, 634.15, 965.51, 683.52, 925.92, 745.46, 930.94, 725.51, 898.54 ms; min 634.15 ms, max 990.40 ms)
    - first `part.delta` after `POST /runs` p50: 729.91 ms
  - Variant (b: prepare immediate, unawaited before send):
    - `POST /sessions` p50: 635.38 ms (waits for in-flight prepare promise; samples: 593.08, 686.80, 584.75, 663.93, 589.12, 662.90, 604.25, 635.38, 663.83, 639.91 ms)
    - first `part.delta` after send p50: 845.62 ms (samples: 798.28, 895.50, 787.94, 869.63, 803.12, 876.93, 826.94, 845.62, 869.97, 852.25 ms)
    - first `part.delta` after `POST /runs` p50: 203.18 ms
  - Variant (c: prepare completed before send):
    - `POST /sessions` p50: 6.38 ms (samples: 6.63, 6.63, 4.70, 6.38, 6.31, 6.64, 6.64, 6.16, 6.41, 5.67 ms; budget ≤ 400 ms - MET)
    - first `part.delta` after send p50: 217.60 ms (samples: 223.04, 223.00, 216.96, 217.60, 215.74, 220.55, 229.95, 220.12, 210.36, 213.83 ms; budget ≤ 600 ms - MET)
    - first `part.delta` after `POST /runs` p50: 207.30 ms
  - Stream cadence p50IntervalMs: 33.21 ms (budget 33 ± 5 ms - MET)
- `bun run profile:omp -- --url http://127.0.0.1:4124 --dir /tmp/oc-perf-serve-4124/project --output /home/shizuku/Project/ohpichamber-omp-artifacts/ux-feedback-2026-11-13/task24/after-6/run2 --new-chat-runs 10 --skip-ui` (Run 2, 10 samples per variant):
  - Variant (a: no prepare):
    - `POST /sessions` p50: 14.06 ms (samples: 16.34, 16.60, 13.94, 16.08, 13.66, 14.06, 13.83, 11.71, 16.87, 14.85 ms; budget ≤ 400 ms - MET)
    - first `part.delta` after send p50: 722.69 ms (samples: 654.94, 948.03, 670.24, 961.05, 709.30, 956.21, 722.69, 925.42, 711.91, 969.84 ms; min 654.94 ms, max 969.84 ms)
    - first `part.delta` after `POST /runs` p50: 703.12 ms
  - Variant (b: prepare immediate, unawaited before send):
    - `POST /sessions` p50: 606.05 ms (samples: 529.92, 745.61, 548.73, 722.08, 575.09, 701.97, 572.44, 711.53, 606.05, 729.21 ms)
    - first `part.delta` after send p50: 808.48 ms (samples: 738.18, 952.10, 752.84, 935.34, 791.50, 905.60, 786.57, 924.69, 808.48, 936.82 ms)
    - first `part.delta` after `POST /runs` p50: 203.06 ms
  - Variant (c: prepare completed before send):
    - `POST /sessions` p50: 5.96 ms (samples: 6.32, 5.92, 6.47, 5.96, 6.05, 5.04, 6.56, 9.92, 5.84, 5.89 ms; budget ≤ 400 ms - MET)
    - first `part.delta` after send p50: 216.54 ms (samples: 211.25, 213.30, 213.75, 219.46, 225.07, 216.80, 216.54, 217.39, 216.43, 233.70 ms; budget ≤ 600 ms - MET)
    - first `part.delta` after `POST /runs` p50: 205.69 ms
  - Stream cadence p50IntervalMs: 33.33 ms (budget 33 ± 5 ms - MET)
- Receipts written to `/home/shizuku/Project/ohpichamber-omp-artifacts/ux-feedback-2026-11-13/task24/after-6/` (`run1/omp-performance.json`, `run2/omp-performance.json`, `omp-performance.json`).
**Base commit:** 81e48cd715c2525dad96b3bd360a370063ac5f67
**Status:** active
**Review:** pending independent re-review (reviewer session ufb-24-reviewer: round 1 FAIL, round 2 FAIL)

The supervisor tests must cover:
- a replacement worker that is waiting when an old registration fails is not stopped;
- a deferred registration failure surfaces with its cause as a session error and in diagnostics.

The UI tests must cover:
- a new chat renders the user bubble before `POST /sessions` resolves;
- a failed draft send does not override navigation that happened later.

Every test exits 0. Save receipts to `/home/shizuku/Project/ohpichamber-omp-artifacts/ux-feedback-2026-11-13/task24/`.

- [x] Profile `admit` step by step. Take every remaining step that does not need to finish before the session id exists off the response path, keeping the order guarantees. Likely candidates are skill-source reconcile, `pluginRevision`, worker launch and ready, and catalog registration. If the budget still cannot be met after measurement, record the per-step numbers and the smallest contract change that would meet it (return the session id immediately and queue the prompt until the worker is ready). Then implement that change: it is the spec's named larger option and keeps the same user-visible behavior.
- [x] Make stopping a worker after a failed registration conditional on its generation, with the check and the stop together inside `withRoot`.
- [x] Surface a deferred registration failure with its cause.
- [x] Show the optimistic user bubble at the draft submission boundary and carry it over when the session is created.
- [x] Restore a failed draft only when the draft and the selection still belong to that submission.
- [x] Delete the task 17 decision that accepted about 880 ms, or replace it with the measured outcome.

## Progress

- **Earlier rounds.** `admit` paid a synchronous worker launch (914.5 ms) under a catalog lock costing under 1 ms, so `POST /internal/sessions` gained `deferred: true` and prompts queue behind readiness; `POST /sessions` fell to 13–14 ms. `stopGeneration`, causal registration failures, the optimistic draft bubble and its restore guard landed then.
- **Traced per-hop timeline (`after-8`).** Temporary instrumentation stamped one shared wall-clock file from the Host, the supervisor, the worker and the fixture, and repeated the run with `process.cpuUsage()` around each window. All of it is removed again; the raw logs are in `task24/after-8/analysis/`.

  Variant (a), no prepare, 12 samples from the first traced run. Times are ms after send.

  | Hop | p50 | Range | What it is |
  |---|---|---|---|
  | Host `POST /api/agent/v1/sessions` | 5.6 | 5.1–23.8 | Host scope resolve and the deferred `/internal/sessions` post. |
  | Client subscribes and posts `/runs` | 6.0 | 4.6–12.2 | SSE attach, then the opening prompt. |
  | Await worker open | 60.0 | 55.1–127.9 | Supervisor queues the prompt behind `openingPromise`. |
  | `createAgentSession` | 108.8 | 96.2–237.8 | Native session graph, tool registry, extension roots, system prompt. |
  | Mode reconcile + restore | 1.0 | 0.2–1.7 | Goal and mode state. |
  | Post-init `Promise.all` (wall) | 273–316 | 265–450 | Skill apply, model selection, extension init and warming, concurrent. |
  | Worker `ready` → prompt dispatch | 1.0 | 0.6–4.0 | Queued prompt is admitted. |
  | Prompt prepare | 1.5 | 0.5–2.4 | `selectOptions` is cached; message assembly and flush. |
  | Agent-loop prep before the provider call | 143.8 | 128.6–325.1 | `#prepareAgentStart`, prompt assembly, token count, payload transform. |
  | Provider first byte + relay | 13.0 | 11.0–21.8 | Fixture emits immediately; a hosted model adds its own TTFT. |
  | **Total send → first `part.delta`** | **761.4 / 769.7** | runs differ by noise | Two traced runs. |

- **Where the time actually goes, measured with CPU accounting.** `process.cpuUsage()` around each window turns out to exceed the window's wall time in every branch (`post-init` 449 ms CPU / 272 ms wall; skill apply 492/316; extension init 474/307; model selection 217/143). Those branches therefore run **concurrently**, and the wall time each reports is queueing, not its own work:

  | Claim from the earlier table | Measurement |
  |---|---|
  | Skill preflight ~280 ms is a slow plugin-root scan | `listClaudePluginRoots` is **2.0 ms cold, 0.3 ms warm** when called directly, and its own window inside the worker is 254–268 ms wall at 1.6× CPU. It is waiting for the single JS thread, not scanning disk. |
  | Model selection ~125 ms plus `setModelTemporary` ~148 ms | `resolveSelection` is 128.6 ms wall / 216.7 ms CPU, and `setModelTemporary` is 154.2 ms wall / 243.6 ms CPU, overlapping the same window. |
  | Prompt-to-provider ~163 ms | Real and serial: the fixture receives the request **9–13 ms** after `before_provider_request`, so the rest is agent-loop preparation the worker cannot start earlier. |

  So the two "discovery" windows are starvation behind one busy thread; the genuine serial cost is `createAgentSession` (108.8) plus the agent-loop prep (143.8) plus roughly 60 ms of supervisor queueing.

- **Removable duplicate, measured and reverted:** all 32 post-init `selectOptions` calls resolved to the session's own model, so every `setModelTemporary` reset the provider session, appended a model change to an empty transcript, and rewrote the usage row for nothing; OMP skips the same call in `#restorePlanPreviousModel` for the same reason. Skipping it measured no gain (variant (a) 933.26 and 838.05 ms, inside the same run-to-run spread) because removing 240 ms of CPU from a contended window does not shorten that window. It is a correctness improvement, not a latency one, so it does not belong in this task.

- **Latency cuts landed in this task:** idle-worker runtime prewarming (~550 ms), `resolveHostSessionScope` for SSE attach (~870 ms), `liveRootSessions` on `POST /runs`, the synchronous session-file write in `createInitialSession`, `capturePolicy()` moved off the open path, and the guarded `refreshSkills()`/model-policy reloads.
- **Spare pool refill (`workers.ts`).** The spare pool now keeps two slots per workspace instead of one, counted over loaded and still-loading processes, spawns are serialized so a refill never competes with a request already in flight, and every settle asks again until the pool is full. Adopting a spare previously left nothing behind, so the next new chat cold-launched: that is exactly the alternating 650/950 ms pattern in `after-6`. `workers.spare.test.ts` proves a second launch adopts instead of spawning.
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
