# 22: Measure the packaged live-region announcement

**Effort:** post-m3-hardening
**Task type:** spike
**Base commit:** bc836586c0eb45359292d3823904b72ce6b1bac2
**Started:** 2026-10-24T18:15:00Z

**Delivers:** Answer to: does the packaged Electron app announce streaming status through `aria-live` within 400 ms, as the Web build does?

**Blocked by:** None
**Files:** the chat status live-region component; packaged Electron build

**Read first:** `.workflow/specs/post-m3-hardening.md`; `.workflow/done/omp-through-m3/retrospective.md` (W7 inconclusive live-region); `.workflow/spike-tasks.md`
**Covers:** H12

**Check:** `## Findings

**Answered question:** does the packaged Electron app announce streaming status through `aria-live` within 400 ms, as the Web build does?

**Answer: no, not within 400 ms — observed, with a completion caveat.** On the exact packaged AppImage built at `bc836586c` with a real configured provider, the first `role=status` / `aria-live="polite"` accessibility node appeared 709, 742, 988, 2040 and 3916 ms after the run request was accepted. None was inside 400 ms. The Web surface, served by `packages/web/server` from the built `dist` and measured with the same prompt and the same AX definition, exposed its first polite status (`Warming up`) at 1368 ms.

**Completion caveat and concrete blocker.** Only one of five packaged attempts reached `idle` (`appimage-run-1`). The others stayed `runtimeStatus: "running"` past 120-300 s while the packaged Agent Service logged 377 `Worker initialization failed (SESSION_RESTORE_FAILED)` entries (`appimage-app-3.log`). The harness completion condition was `activeRun === null && runtimeStatus === "idle"`, so this is not a watcher timeout artifact: the runs genuinely never completed. The Web run likewise stayed `running` and is incomplete. Therefore the three completed packaged runs the task wanted do not exist; five first-status observations do.

**What the timing origin includes.** `t0` is the accepted run request timestamp from the page clock; the end is the first non-empty polite status node read from `Accessibility.getFullAXTree` polling (~40 ms cadence). That interval includes provider connection and worker startup, so 709-3916 ms is an upper bound on UI-only announcement latency, not a pure render measurement. Even so, the status node itself is the correct target: `Calculating`, `Calibrating`, `Computing` and `Warming up` are the WorkingPlaceholder verbs, and the nodes carry `live=polite`, `atomic=true`.

**Supporting unpacked observations.** The earlier unpacked `dist/linux-unpacked` exploratory runs produced the same shape at 565 ms and 776 ms (full-tree polling, canonical trigger, loopback fixture); they confirmed the AX query path but are not the packaged answer.

**Build provenance.** The first `bun run electron:build` exited 1 on the missing `GH_TOKEN` publish step after packaging produced artifacts. The single compliant retry `env -u CI sh -c 'printf "CI=%s\n" "${CI-<unset>}"; exec bun run electron:build'` recorded `CI=<unset>` and exited 0 in ~101 s at `bc836586c`, producing `OpenChamber-3.0.0-linux-x86_64.AppImage` sha256 `b4c5fa6125269bdc633fc1a43beb7517ee358486e9c625b97e21c15e8b52771d`; that exact AppImage was measured.

**Follow-up.** Because a threshold failure was observed, `39-packaged-live-region-latency.md` is drafted in the task directory, covering both the 400 ms packaging target and the packaged `SESSION_RESTORE_FAILED` blocking behaviour. Task-only change.

**Limitations.** Accessibility-tree exposure is not screen-reader speech. The provider is a real remote endpoint, so connection latency is inside the measured interval. One Linux x64 host, Xvfb, headless Chrome for the Web surface; no macOS/Windows or AT.

**Recorded in:** this task file and `/home/shizuku/Project/ohpichamber-omp-artifacts/task22-2026-10-24/measurement-receipt.json`, with `appimage-run-1/2/3.json`, `appimage-retry-1/2.json`, `web-run-1.json`, `electron-build-4.*`, `build-4.env`, `appimage-4.sha256`, `appimage-app-3.log`, `web-build.*`, `web-server.log` and `processes/` before/after state.
