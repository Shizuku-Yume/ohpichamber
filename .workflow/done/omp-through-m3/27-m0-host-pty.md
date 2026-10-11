# 27: Verify actual Host PTY tab-close cleanup

**Effort:** omp-through-m3
**Task type:** spike
**Base commit:** edfdf0963
**Started:** 2026-10-11T19:04:32Z
**Finished:** 2026-10-11T19:11:40Z
**Question:** Does closing a real Host terminal tab terminate its complex child tree without affecting an unrelated sibling?
**Time box:** One actual tab-close scenario with background sleep and a loopback web-server/subshell tree; no full terminal suite or whole-Host substitute.

**Delivers:** Answer to original architecture `PROBE-06` through the existing Host PTY tab-close route, with observed process/port cleanup or a precise failure reproduction for gate 03.

**Blocked by:** 02
**Files:** `.workflow/omp-migration/m0/host-pty-tab-close.json`; this task; disposable external Host runtime/PTY fixture state only

**Read first:** `.workflow/specs/omp-through-m3.md` M0/W1; architecture `PROBE-06`; `packages/web/README.md`; nearest Host terminal documentation; assembled `packages/web/server/lib/terminal/runtime.js`, `shutdown.js` and terminal client tab-close owner
**Covers:** W1

**Check:** Launch the actual assembled Host terminal runtime with its real PTY backend in owned temporary state. Create a tab through the real create route, run background sleep and a loopback web-server/subshell tree, record PID birth identities/groups and the bound port, then invoke `DELETE /api/terminal/:sessionId`. Observe all owned descendants and the port after that close, before fallback cleanup, and prove an unrelated sibling stays alive. Record invocation, route response, timeout/exit and final cleanup in the artifact. Leftovers after tab close are failure even if the prototype later cleans them.

- [x] Read assembled application source from the coordinator tree, not the old committed application baseline. Do not modify application source/dependencies or use mocked PTYs.
- [x] Use private owned HOME/workspace/configuration, no user credentials/projects and no public listener. Real PTY process and Host route handlers must execute.
- [x] Capture process birth identity, parent/group/session relationships and loopback port liveness before and after closing that exact tab.
- [x] Keep per-tab cleanup distinct from `shutdownTerminalProcesses`/whole-Host shutdown and from OMP SDK native-runner cleanup. Neither is substitute evidence.
- [x] Preserve the tab-close failure result before cleanup. Signal only owned birth-identified fixture processes in final teardown and keep the unrelated sibling alive through the observation.
- [x] If the tab-close owner fails, return the precise reproduction and affected source owner; do not patch it inside this investigation or hide it with teardown. A real fix needs its own scoped task.
- [x] Record sanitized outcomes and remove owned scratch/processes. Keep throwaway prototype off main; parent owns shared evidence, review, archive and landing. Completed investigation does not accept M0.

## Progress

- Dirty at start: assembled parent tree already dirty (3,234 porcelain entries, including application source/dependencies, skills and workflow); all pre-existing changes belong to the parent and remain untouched. Exact initial path listing captured by `git status --porcelain` in session artifact 224. Work is direct on the shared parent tree; this worker changes only task27 and its new JSON evidence artifact. Parent owns archive/review/landing.
- Check before: skipped for a spike. Broad checks/validators are forbidden by this assignment; only the one actual runtime prototype will execute.
- Started timestamp is the observed workstation UTC clock (`date -u +%Y-%m-%dT%H:%M:%SZ`), which differs from the session's 2026-10-12 calendar reminder; no time claim depends on that discrepancy.
- Read `runtime.js`, `shutdown.js`, shell/environment/framing owners, `TerminalView.handleCloseTab`, the web close adapter and `terminalApi.closeTerminal` before execution. Read terminal `DOCUMENTATION.md`, web README, spec M0/W1 and architecture `PROBE-06`. The `communication-style` skill was unavailable in this assembled tree; `.workflow/STYLE.md` supplied the existing writing convention instead.
- One actual prototype invocation, 2026-10-11T19:10:25.786Z–19:10:37.919Z: `subprocess.run(['/usr/bin/node', '$PRIVATE/probe.mjs'], cwd='$PRIVATE/workspace', env=<the exact allowlisted environment recorded in the artifact>, capture_output=True, text=True, timeout=40)`. Equivalent shell invocation: `env -i PATH=/usr/bin:/bin HOME=$PRIVATE/home XDG_CONFIG_HOME=$PRIVATE/config XDG_CACHE_HOME=$PRIVATE/cache XDG_DATA_HOME=$PRIVATE/data XDG_STATE_HOME=$PRIVATE/state TMPDIR=$PRIVATE/tmp OMP_AGENT_DIR=$PRIVATE/agent SHELL=/usr/bin/bash PROBE_ROOT=$PRIVATE PROBE_SOURCE=$ASSEMBLED_SOURCE /usr/bin/node $PRIVATE/probe.mjs`. `$PRIVATE` was one newly created owned temporary directory, not a user path. Result: exit 0, no timeout, empty stderr; elapsed subprocess time 12.242 seconds. No retry or second scenario.
- The disposable entrypoint imported the unchanged assembled `createTerminalRuntime` and v3 frame helpers, registered its real routes on Express/`node:http`, and bound `127.0.0.1:0` (observed Host port 39723). No PTY-provider, termination-grace or shutdown override. Node v24.18.0 loaded real `node-pty` 1.2.0-beta.15, confirmed by the runtime attach snapshot.
- `POST /api/terminal/create` with the artifact's exact `createRequest` returned HTTP 200/running in 30.551 ms. An actual v3 binary WebSocket write sent `. ./tree.sh`; the fixture created ordinary background sleep plus a bash subshell containing Python `HTTPServer(('127.0.0.1', 0), ...)` and another sleep. All five recorded births and their parent/group/session relationships were live before close; ephemeral fixture port 33327 accepted TCP. The unrelated `sleep 12` was a direct Host-process sibling outside the PTY session.
- `DELETE /api/terminal/task27-owned-tab` returned HTTP 200 `{"success":true}` in 3.860 ms. Post-delete snapshots at 5.079, 250.020, 1000.592, 2997.837 and 5002.297 ms all found the five original births absent (no live leftovers or zombies), fixture port refusing TCP, and unrelated sibling alive with unchanged birth identity. Actual timings are retained rather than rounded target labels.
- The pre-cleanup result was persisted before teardown. No fallback signals were needed or sent. Neither `runtime.shutdown` nor `shutdownTerminalProcesses` executed. The unrelated sibling remained alive through owned cleanup, then exited naturally with code 0/signal null. Host HTTP listener closed, prototype exited, and owned scratch/throwaway scripts were removed at 2026-10-11T19:11:40Z. No application/dependency edits, SDK consumer changes, builds, tests, formatters or validators. Parent owns archive, review, workflow/docs validation and landing.
Review: Requirements Brief A passed with the bounded Linux evidence and limits preserved. Quality Brief B and the security review passed with no findings. This investigation does not accept M0 or gate 03.

## Findings

**Result:** Pass for this one real Host terminal tab-close scenario. The unchanged production tab-close owner terminated the exercised interactive bash background/subshell tree and released its loopback port before any fallback cleanup, without affecting the unrelated sibling. This completed investigation does not accept M0 or release gate 03.

**Evidence:** [host-pty-tab-close.json](../../omp-migration/m0/host-pty-tab-close.json) records the sanitized invocation/environment, source hashes, create/delete responses, backend snapshot, exact fixture sources, PID/start-tick identities, parent/group/session relationships, timed per-child/port observations, sibling natural exit and final cleanup. The temporary prototype was discarded; no permanent smoke infrastructure was added.

**Owner and reproduction:** `packages/ui/src/components/views/TerminalView.tsx:813-836` → `packages/web/src/api/terminal.ts:65-67` → `packages/ui/src/lib/terminalApi.ts:542` → actual `DELETE /api/terminal/:sessionId` in `packages/web/server/lib/terminal/runtime.js:568-584`, using `terminateProcess`/`killProcess` at lines 160-187. Reproduction is the recorded real create request, v3 `. ./tree.sh` input, live-birth/port precondition, and exact DELETE followed by the recorded five-second observation. No Host bug was observed in this scenario. Runtime-wide `shutdown.js` is a separate owner and was read, not invoked.

**Limits:** Linux x64, Node and ordinary interactive bash only; direct composition of the actual production terminal runtime, not full-application bootstrap, browser UI or authentication acceptance. No claim for Bun PTY, Windows/macOS, detached/daemonized or deliberately signal-resistant processes, unexercised shells, or long-term leak behavior beyond the recorded observation. No runtime rerun is implied for parent integration. Decisions made on the maintainer's behalf: none.
