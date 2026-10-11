# 01: Complete the M0 Guest Shell probe

**Effort:** omp-through-m3
**Task type:** feature
**Base commit:** <commit-sha>

**Delivers:** A disposable M0 suite establishes the real OMP shell execution owner and observes command start, output, status, stop, exit code and retention limits without exposing secrets. Service reconnect and authorization remain M2 acceptance, not SDK claims.

**Blocked by:** None
**Files:** `scripts/omp-m0/`, `.workflow/omp-migration/m0/guest-shell.json`

**Read first:** `.workflow/specs/omp-through-m3.md` W1; `.workflow/omp-migration/implementation-plan.md` M0; `packages/sdk/src/shells.ts`; `/home/shizuku/Project/oh-my-pi/packages/coding-agent/src/async/job-manager.ts`; `/home/shizuku/Project/oh-my-pi/packages/coding-agent/src/tools/bash.ts`
**Covers:** W1, W6

**Check:** `OMP_SOURCE_DIR=/home/shizuku/Project/oh-my-pi bun run scripts/omp-m0/run.mjs --suite guest-shell --fixture --output /tmp/omp-m0-guest-shell.json` → a sanitized artifact records each required raw SDK observation and cleanup. Missing execution behavior remains partial/failed with nonzero exit; a service-only requirement is explicitly identified, never fabricated by a fixture.

- [ ] Extend the runner with one Guest Shell suite without changing existing artifact semantics.
- [ ] Exercise at least one running command and one completed command using the real OMP job manager seam.
- [ ] Record raw output retrieval/retention limits, terminal status, exit code and stop behavior through the real execution seam.
- [ ] Establish whether execution handles are worker-local, and record which reconnect/scope guarantees require the service registry and capability checks in task 12.
- [ ] Preserve cleanup, failure isolation and secret/path redaction.
- [ ] Record the artifact and exact remaining limitations in the task progress.
