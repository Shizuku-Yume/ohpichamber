# 01: Complete the M0 Guest Shell probe

**Effort:** omp-through-m3
**Task type:** feature
**Base commit:** 98deedb81
**Started:** 2026-10-11T13:46:13Z
**Finished:** 2026-10-11T14:32:59Z

**Delivers:** A disposable M0 suite establishes the real OMP shell execution owner and observes command start, output, status, stop, exit code and retention limits without exposing secrets. Service reconnect and authorization remain M2 acceptance, not SDK claims.

**Blocked by:** None
**Files:** `scripts/omp-m0/`, `.workflow/omp-migration/m0/guest-shell.json`

**Read first:** `.workflow/specs/omp-through-m3.md` W1; `.workflow/omp-migration/implementation-plan.md` M0; `packages/sdk/src/shells.ts`; `/home/shizuku/Project/oh-my-pi/packages/coding-agent/src/async/job-manager.ts`; `/home/shizuku/Project/oh-my-pi/packages/coding-agent/src/tools/bash.ts`
**Covers:** W1, W6

**Check:** `OMP_SOURCE_DIR=/home/shizuku/Project/oh-my-pi bun run scripts/omp-m0/run.mjs --suite guest-shell --fixture --output /tmp/omp-m0-guest-shell.json` → a sanitized artifact records each required raw SDK observation and cleanup. Missing execution behavior remains partial/failed with nonzero exit; a service-only requirement is explicitly identified, never fabricated by a fixture.

- [x] Extend the runner with one Guest Shell suite without changing existing artifact semantics.
- [x] Exercise at least one running command and one completed command using the real OMP job manager seam.
- [x] Record raw output retrieval/retention limits, terminal status, exit code and stop behavior through the real execution seam.
- [x] Establish whether execution handles are worker-local, and record which reconnect/scope guarantees require the service registry and capability checks in task 12.
- [x] Preserve cleanup, failure isolation and secret/path redaction.
- [x] Record the artifact and exact remaining limitations in the task progress.

## Progress

- Dirty at start: none in `/tmp/ohpi-m0-shell-20261011`, branch `omp-through-m3/01-m0-guest-shell`. Parent integration preserves unrelated assembled application changes. This committed probe worktree lacks the assembled Guest SDK contract; comparison read the parent's `packages/sdk/src/shells.ts` without editing it.
- Check before: at `98deedb81`, the requested suite exited 1 with `INVALID_ARGUMENTS` and cleanup true. No baseline rerun was needed.
- The suite runs real pinned OMP `BashTool` commands through `AsyncJobManager` and `AgentSession` inspection/cancellation. Fixture changes add only optional session agent/manager arguments; existing callers retain defaults. No `.mjs` LSP server was available, so fallback reference search traced lifecycle, capabilities and restart-pending consumers. No external OMP source or application dependencies changed.
- SDK observations cover running/recent snapshots and native output, exit 0/42, inline truncation and full raw-artifact retrieval, concurrent agent-owner filtering, foreign inspection/stop denial, capacity rejection, cancellation and owning-session disposal. Failed observations cancel remaining owned jobs before the next probe. Only safe counts, booleans, statuses and source-only findings are projected.
- First Check after exited 1 with 8 passed and 1 failed. The probe incorrectly counted `OutputSink.outputBytes` as retained raw data alone; pinned streaming output includes the middle-elision marker/separators. The fix retained the original final-output bound and separately bounded `totalBytes - elidedBytes`, rather than increasing a limit.
- Authorized corrected Check at `2026-10-11T13:55:53.896Z` exited 0 with 9 passed. It generated/retrieved 108,924 raw bytes, retained 51,200 data bytes, composed 51,224 body bytes and 51,370 final inline bytes, below the unchanged 53,248-byte cap. Raw head/tail checks passed. The sanitized normal-path artifact is `.workflow/omp-migration/m0/guest-shell.json`; it is preserved without rerunning or overwriting it.
- Configured 600 ms retention and 100 ms consumed-result eviction expired at 606.151 ms and 100.458 ms. Default five-minute/30-second durations and the 16 MiB disk-overflow cap remain source-only. Boundary identification records `serviceAcceptanceExercised: false`, not passed M2 behavior.
- Task 12 still owns reconnect/cursors, service authorization and the Guest newest-200 ended history. Worker-local SDK handles cannot reconstruct cross-worker observation. Agent-owner filtering is not project authorization, and SDK failed jobs must not erase distinct stop/timeout reasons.
- Initial focused runner tests passed 8 tests/44 assertions, and changed JS passed configured oxlint. The clean worktree's first lint attempt could not resolve oxlint; explicit parent configuration resolved it without installation. Parent dead-code check passed. Unchanged SDK suites were not repeated.
- Requirements brief A passed with zero findings and independently executed the scoped comparison against `98deedb81`. Quality brief B initially blocked on native descendants escaping worker-group-only cleanup. Its affected recheck independently executed the complete corrected scoped diff and cleared the blocker with zero new findings. The affected security review also passed with zero findings after reading the full captured diff. The harness used reviewer specialists with the workflow briefs because `workflow-reviewer` is unavailable.
- Authorized real failing-before reproduction started `BashTool` async `sleep 30`, captured birth identity, killed the worker group and observed that the same process survived while old cleanup falsely returned `allProcessesExited: true`. Its group and POSIX session both differed from the worker. The original identity was safely terminated and observed exited; throwaway state was removed. Pinned native `shell.rs` uses `NewProcessGroup` and documents non-terminal `setsid`, so session-only cleanup would also be incomplete.
- The dedicated Linux runner now enables child-subreaper before its sole worker spawn and refuses pre-existing direct children. Cleanup includes worker-session members, verified ancestry and adopted detached orphans, signals exact birth identities through the existing pidfd helper, and waits for observed exit. Unverifiable cleanup fails and preserves the sandbox. Finally restores the original process-wide subreaper flag and closes its FFI handle.
- This process-wide ownership is valid only in the disposable single-worker executable, with no unrelated child spawn during adoption. It is not a shared-host or Agent Service guarantee. An unrelated sibling is outside ownership and must survive cleanup.
- Corrected real-path smoke used a throwaway copy of the actual outer runner with a real pinned BashTool worker. After SIGTERM, the detached native identity exited while an unrelated concurrent sibling retained its original live identity. Runner exit 1 correctly retained `RUN_INTERRUPTED` and `WORKER_DESCENDANTS_REMAINED`. Cleanup found/terminated one orphan, verified actual exit and removed the sandbox. Interruption is not relabelled as a passed suite; all smoke state was removed.
- Added a deterministic Linux regression with two ready `setsid` descendants before abrupt worker death. Both original identities must exit and an unrelated sibling must remain live. Parent ran `bun test scripts/omp-m0/runner.test.mjs scripts/omp-m0/pidfd-process.test.mjs`: 13 passed, 81 assertions. Focused oxlint for `run.mjs`, `process-group.mjs`, `runner.test.mjs` passed; dead-code passed with no entries after the export/import change. No broad SDK suite was rerun.
- Parent read the retained raw JSONL tool outputs for both real reproductions, confirming the failing same-identity orphan and corrected native exit/unrelated-sibling survival, not only the summarized history view. No runtime observation was repeated for review. The corrected interruption remains exit 1 with both failure codes. All task checks and affected reviews are complete; M0 and later gates remain open pending the remaining tasks.

