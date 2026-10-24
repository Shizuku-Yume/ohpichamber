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

**Check:** `## Findings` records the accessibility-tree or assistive-technology observation on a packaged build (`bun run electron:build`), with timing, and says yes, no, or what blocks measurement.

## Progress

- Dirty at start: none. Branch `post-m3-hardening/22-packaged-live-region` cut from landed `main` `bc836586c0eb45359292d3823904b72ce6b1bac2` in `/home/shizuku/Project/ohpichamber-worktrees/lane-f-spikes`.
- Check before: spike, skipped per `flow-implement` step 1.
- Read: `.workflow/specs/post-m3-hardening.md` (H12), `.workflow/done/omp-through-m3/retrospective.md` W7, `.workflow/spike-tasks.md`, `flow-implement`, `desktop-shell`, `chrome-devtools-cli`, `performance-engineering`, `packages/electron/README.md`, and the Host wiring `agent-scope-runtime.js`/`agent-runtime.js` plus the `WorkingPlaceholder` live region (`role="status"`, `aria-live="polite"`).
- Build evidence: first `bun run electron:build` exited 1 because CI detection triggered implicit publishing and `GH_TOKEN` was absent, after `dist/linux-unpacked` and an AppImage were produced; that run is not claimed as green. The single compliant retry `env -u CI sh -c 'printf "CI=%s\n" "${CI-<unset>}"; exec bun run electron:build'` recorded `CI=<unset>` in the build process, exited 0 in ~101 s at HEAD `bc836586c`, and produced `packages/electron/dist/OpenChamber-3.0.0-linux-x86_64.AppImage` (sha256 `b4c5fa6125269bdc633fc1a43beb7517ee358486e9c625b97e21c15e8b52771d`) plus `dist/linux-unpacked/openchamber`. Evidence in the external directory listed below.
- Launch: the exact AppImage was started under Xvfb with `--remote-debugging-port` and an isolated HOME whose agent directory held a real configured provider (`m0` / `gemini-3.5-flash-lite`, `openai-completions`); credentials stayed in a `0600` file outside the artifacts and are not recorded.
- Check after: **blocked**. The UI was reached and a prompt was sent through the packaged composer's "Send message" button, but the session became `unavailable` and the Agent Service logged repeated `Worker initialization failed (SESSION_RESTORE_FAILED)` for that session, so no assistant stream and no streaming status region existed to time. No within-400 ms claim is made in either direction.
- Exploratory attempts preserved as invalid: `live-region-receipt.json` and `run-1.json` (loopback fixture, programmatic run, coarse polling), `ui-run-1.json` and `ui-run-2.json` (the Enter key never submitted; the page text was the composer draft), `ui-run-3.json` (send executed, then the worker failure above). None is the measured answer.
- Process ownership and cleanup: PIDs captured before/after in `processes/`; the AppImage tree, its Agent Service and workers, Xvfb and the loopback fixture were terminated and verified gone; `/tmp` extraction, app HOME and workspace removed; unrelated user processes untouched.
- No source, spec, decisions, development, glossary or package file changed. No `main` write or merge.
- Done-when exception: the "if it fails, a bugfix task is drafted" item stays unticked deliberately. The live region was not measured (blocked), and the observed blocker is an unexplained packaged worker restore failure under an isolated provider configuration; drafting a bugfix would either invent a live-region result or claim an unestablished cause. The reason is also stated in `## Findings`.

## Findings

**Answered question:** does the packaged Electron app announce streaming status through `aria-live` within 400 ms, as the Web build does?

**Answer: measurement blocked.** The requested packaged build exists and launches, but the packaged Agent Service could not keep a worker alive for the session: after the UI sent one prompt, the service logged `worker <session>/<generation>: Worker initialization failed (SESSION_RESTORE_FAILED)` repeatedly and the session settled as `unavailable` with no active run. With no streamed assistant response, the chat status live region never had content to expose, so there is no accessibility-tree timing to compare against 400 ms. This is not a measured failure of the live region and not a pass.

**What was observed.** CDP `Accessibility.getPartialAXTree` against the packaged renderer showed `role=status` nodes with `live=assertive`, `atomic=true`, `relevant=additions text` and empty accessible names. Those nodes are not proven to be the `WorkingPlaceholder` polite region, so they are recorded only as tree observations, not as an announcement and not as timing evidence. The send itself was a real UI action (text inserted into the composer, "Send message" clicked), and the user message appeared in the transcript before the worker failure.

**Build and artifact.** Compliant `env -u CI` run exited 0; AppImage sha256 `b4c5fa6125269bdc633fc1a43beb7517ee358486e9c625b97e21c15e8b52771d` from HEAD `bc836586c`. The earlier CI-triggered run exited 1 on the missing `GH_TOKEN` publish step even though packaging had produced artifacts; it is recorded, not claimed.

**Web comparability.** No paired Web-build run was made in this round. The retrospective's W7 note (Web announcement observed, packaged inconclusive) remains the only Web-side evidence and is not treated as a measured baseline.

**Why no bugfix task is drafted.** The Check asks for a bugfix draft when the measurement fails. Here nothing about the live region was measured, and the observed blocker is a packaged worker-restore failure under an isolated HOME with a custom provider configuration; whether that is a product defect or a fixture/configuration problem is unresolved. Drafting a live-region bugfix would invent a result, and drafting a worker-restore bugfix would claim a cause this spike did not establish. The maintainer should decide whether to fund a follow-up that reproduces `SESSION_RESTORE_FAILED` on the packaged build first.

**Limitations.** Accessibility-tree exposure is not screen-reader speech. The isolated HOME used a fresh provider configuration, so the restore failure may be specific to it. One Linux x64 host, Xvfb, one send attempt; no concurrency, macOS/Windows or real AT was exercised.

**Recorded in:** this task file and `/home/shizuku/Project/ohpichamber-omp-artifacts/task22-2026-10-24/measurement-receipt.json` (with `electron-build-4.*`, `build-4.env`, `appimage-4.sha256`, `appimage-app-2.log`, the invalid exploratory receipts, and `processes/before-cleanup.txt`/`after-cleanup.txt`).
