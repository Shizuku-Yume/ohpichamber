# 27: Verify actual Host PTY tab-close cleanup

**Effort:** omp-through-m3
**Task type:** spike
**Base commit:** <commit-sha>
**Question:** Does closing a real Host terminal tab terminate its complex child tree without affecting an unrelated sibling?
**Time box:** One actual tab-close scenario with background sleep and a loopback web-server/subshell tree; no full terminal suite or whole-Host substitute.

**Delivers:** Answer to original architecture `PROBE-06` through the existing Host PTY tab-close route, with observed process/port cleanup or a precise failure reproduction for gate 03.

**Blocked by:** 02
**Files:** `.workflow/omp-migration/m0/host-pty-tab-close.json`; this task; disposable external Host runtime/PTY fixture state only

**Read first:** `.workflow/specs/omp-through-m3.md` M0/W1; architecture `PROBE-06`; `packages/web/README.md`; nearest Host terminal documentation; assembled `packages/web/server/lib/terminal/runtime.js`, `shutdown.js` and terminal client tab-close owner
**Covers:** W1

**Check:** Launch the actual assembled Host terminal runtime with its real PTY backend in owned temporary state. Create a tab through the real create route, run background sleep and a loopback web-server/subshell tree, record PID birth identities/groups and the bound port, then invoke `DELETE /api/terminal/:sessionId`. Observe all owned descendants and the port after that close, before fallback cleanup, and prove an unrelated sibling stays alive. Record invocation, route response, timeout/exit and final cleanup in the artifact. Leftovers after tab close are failure even if the prototype later cleans them.

- [ ] Read assembled application source from the coordinator tree, not the old committed application baseline. Do not modify application source/dependencies or use mocked PTYs.
- [ ] Use private owned HOME/workspace/configuration, no user credentials/projects and no public listener. Real PTY process and Host route handlers must execute.
- [ ] Capture process birth identity, parent/group/session relationships and loopback port liveness before and after closing that exact tab.
- [ ] Keep per-tab cleanup distinct from `shutdownTerminalProcesses`/whole-Host shutdown and from OMP SDK native-runner cleanup. Neither is substitute evidence.
- [ ] Preserve the tab-close failure result before cleanup. Signal only owned birth-identified fixture processes in final teardown and keep the unrelated sibling alive through the observation.
- [ ] If the tab-close owner fails, return the precise reproduction and affected source owner; do not patch it inside this investigation or hide it with teardown. A real fix needs its own scoped task.
- [ ] Record sanitized outcomes and remove owned scratch/processes. Keep throwaway prototype off main; parent owns shared evidence, review, archive and landing. Completed investigation does not accept M0.
