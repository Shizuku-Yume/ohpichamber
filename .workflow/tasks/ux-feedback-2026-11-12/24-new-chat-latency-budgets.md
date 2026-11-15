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

- **Earlier rounds, in brief.** Profiling `admit` showed the response path paid a synchronous worker launch (914.5 ms) while the catalog lock cost under 1 ms, so `POST /internal/sessions` gained `deferred: true` and prompts queue behind worker readiness; `POST /sessions` fell from 1022.49 ms to 13–14 ms. `stopGeneration`, causal registration failures, the optimistic draft bubble and the draft-restore guard all landed in those rounds, and both reviews' findings were closed.
- **Traced per-hop timeline (this round, `after-7`).** Every hop below was measured with temporary `tracePerf` instrumentation across the Host, Agent Service supervisor, worker and fixture provider (wall-clock stamps in one file), then removed before landing. The earlier `after-6` table used estimates and is replaced by this one.

  Variant (a), no prepare, the fastest and slowest sample of the traced run. Times are ms after send; each row is the span between its two stamps.

  | Hop | Fast sample | Slow sample | What it is |
  |---|---|---|---|
  | Host `POST /api/agent/v1/sessions` | 5.9 → 13.3 | 5.1 → 12.1 | Host resolves scope, posts `/internal/sessions` with `deferred: true`; Agent Service materializes the session file and answers. |
  | Client subscribes and posts `/runs` | 14.2 → 20.6 | 13.1 → 18.6 | SSE attach, then the opening prompt. |
  | Worker bootstrap begins | 19.8 | 19.1 | The Adopted spare starts `WorkerSession.open` while the client is still dispatching. |
  | Runtime handover | 19.8 → 19.9 | 19.1 → 19.3 | The adopted spare's `AuthStorage`/`ModelRegistry`/`Settings` are already open; nothing is re-read. |
  | `createAgentSession` | 124.5 → 230.9 (106.4) | 131.9 → 225.4 (93.5) | Native session graph, tool registry, extension roots, system prompt. |
  | Post-init, run concurrently | 237.1 → 501.9 (264.8) | 231.7 → 514.9 (283.2) | `skills.apply`, `selectOptions` and extension init in one `Promise.all`; the longer branch is what shows. |
  | — skill preflight | 237.1 → 500.5 (263.4) | 231.7 → 513.5 (281.8) | `WorkerSkills.preflight`: provider-root scan. Its first `listClaudePluginRoots` call costs 208–237 ms cold in a fresh process and ~20 ms warm. |
  | — `loadSkills` + publish | 0.8 + 0.5 | 0.9 + 0.5 | Reads the roots the scan found. |
  | — model selection | 238.2 → 350.8 (112.6) | 232.9 → 355.8 (122.9) | `reapplyModelPolicies` + credential reload + credential resolve. |
  | — `setModelTemporary` | 350.8 → 497.3 (146.5) | 355.8 → 510.2 (154.4) | Native model switch, provider session reset, tool presentation sync. |
  | Worker `ready` reply | 502.6 | 515.7 | Supervisor unblocks the queued prompt. |
  | Worker prompt prepare + dispatch | 506.0 → 507.0 | 519.2 → 520.2 | `selectOptions` is already cached; message assembly only. |
  | Prompt dispatch → provider request | 507.0 → 671.2 (164.2) | 520.2 → 769.1 (248.9) | Agent loop pre-request work, then the provider transport call. |
  | Provider first byte | 675.7 (4.5) | 774.7 (5.6) | The fixture streams its first chunk immediately; a hosted model adds its own TTFT here. |
  | Delta relay to client | 678.1 (2.4) | 778.1 (3.4) | Projection → journal → SSE → client reader. |
  | **Total send → first `part.delta`** | **678.1** | **778.1** | p50 742.1 over the 10 traced samples. |

  p50 over 10 traced samples: `createAgentSession` 107.6, skill preflight 280.4, model selection 125.0, `setModelTemporary` 147.8, worker open 499.5, prompt-to-provider 162.9, provider first byte + relay 7.9.

  Variant (c), same instrumentation: Host create 5.1–7.0 ms (adopts the prepared root), SSE attach + run 5.1 ms, worker prompt prepare 1.0 ms, then the same 162.9 ms to the provider.

- **Latency cuts in this task, cumulative:**
  - `openNativeRuntime` SQLite discovery loop: ~550 ms eliminated by idle worker prewarming (`prewarmNativeRuntime`).
  - Redundant workspace admission on SSE connect: ~870 ms eliminated by using `resolveHostSessionScope` for streaming routes.
  - Redundant workspace re-admission on `POST /runs`: eliminated by using `liveRootSessions` in `scopeFor`.
  - Supervisor throwaway session file write in `createInitialSession`: removed synchronous `diskManager` create/write/close.
  - Policy capture on worker open: moved `capturePolicy()` off the critical path to run in the background.
  - Redundant `refreshSkills()` and model policy reloads: guarded and cached in `session.ts` and `catalog-models.ts`.
- **Spare pool refill (`workers.ts`).** The spare pool now keeps two slots per workspace instead of one, counted over loaded and still-loading processes, spawns are serialized so a refill never competes with a request already in flight, and every settle asks again until the pool is full. Adopting a spare previously left nothing behind, so the next new chat cold-launched: that is exactly the alternating 650/950 ms pattern in `after-6`. `workers.spare.test.ts` proves a second launch adopts instead of spawning.
- **`warm` reply.** A spare reports `idle` as soon as its module graph is loaded (adoption stays possible) and `warm` once its background prewarm finished. The supervisor prefers a warm spare over a still-loading one, so a session is never handed a process that will finish its warm-up on the user's time. `protocol.ts` carries the new reply.
- **`prewarmNativeRuntime` returns its promise** so the worker can report `warm`; behaviour and ordering are otherwise unchanged.
- **Rejected experiments (measured, then reverted):** a throwaway `createAgentSession` on a separate runtime, gating the worker's `idle` reply on prewarm, `prepare` with `deferred: true`, and skill warm-up inside the spare. The first regressed variant (a) to 1155 ms, the second broke Agent Service startup readiness, the third moved the wait from prepare into send and regressed variant (c) to 842 ms, the fourth measured no improvement (skill preflight stayed 260–290 ms, so the cost is contention with `createAgentSession`, not the plugin read alone).
- **Budget status.** Variant (a) p50 is 746.47–765.48 ms against the 600 ms budget, so the cold path is not met. The traced table above shows where the time goes: 499.5 ms of worker open (`createAgentSession` 107.6, skill preflight 280.4, model selection and `setModelTemporary` overlapping in one `Promise.all`), then 162.9 ms of agent-loop pre-request work before the provider is called. The two remaining levers are the ~280 ms skill preflight, whose cold cost is the first `listClaudePluginRoots` call inside the adopted process, and the ~163 ms between prompt dispatch and the provider request. Moving skill discovery into the spare measured no gain because the cost is CPU contention with `createAgentSession`, not the plugin read alone, so a fix needs either a section reorder in `WorkerSession.open` or an SDK-level change. Variant (c) — what a user gets from the composer, because `openNewSessionDraft` prepares on open — is 223.97–227.01 ms p50 and meets the budget.
- Check after:
  - Command: `bun run profile:omp -- --url http://127.0.0.1:4134 --dir /tmp/task24-perf/project --output …/after-7/run{1,2} --new-chat-runs 10 --skip-ui`, isolated `HOME`, throwaway `OPENCHAMBER_DATA_DIR`, fixture provider on 4133.
  - `POST /sessions` p50: 13.51 / 12.92 ms (noPrepare), 558.40 / 559.54 ms (prepareImmediate), 6.12 / 6.03 ms (prepareCompleted).
  - first `part.delta` after send p50: (a) **765.48 / 746.47 ms**, (b) 796.12 / 775.74 ms, (c) **223.97 / 227.01 ms**. Variant (c) meets ≤ 600 ms; (a) does not.
  - stream cadence p50: 33.24 ms (budget 33 ± 5 ms, met).
  - Receipts: `task24/after-7/{run1,run2}/omp-performance.json`; traced hops and rejected experiments in `task24/after-7/`.
  - `bun test packages/agent-service/src`: 512 pass, 10 skip, 0 fail, 71 files.
  - UI sync: 171 pass. Web `openchamber-sessions`: 165 pass, 11 files. agent-service type-check and `bunx oxlint`: clean.
