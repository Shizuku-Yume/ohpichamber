# Retrospective: omp-m0-restart-gate

## Goal
Measure what the controlled OMP approval and question fixture can prove when its owning worker stops while requests are pending. Keep unavailable stale-response behavior separate from observed process cleanup.

## What shipped
The disposable runner now supports `restart-pending`. It measures pending requests, terminates their worker, creates a real OMP fixture session in a distinct worker, and records tool, answer and event counts. The [artifact](../../omp-migration/m0/restart-pending.json) retains partial approval/question evidence and a nonzero exit rather than claiming a complete runtime pass.

| Spec check | Accepted result |
|---|---|
| R1 | Passed. Pinned source identity, schema 2 and sanitized output. |
| R2 | Passed. Both requests were pending with no execution or answer before termination. |
| R3 | Passed. Distinct worker identity, fresh-session readiness and process/sandbox cleanup. |
| R4 | Passed through the explicit unavailable branch. Actual measurements are recorded; stale rejection is unobserved. |
| R5 | Passed. Missing stale-response evidence remains partial and causes exit code 1. |
| R6 | Passed. Development evidence and contracts distinguish observed behavior from proposed restart semantics. |

The [archived task](01-restart-pending.md) owns the commands, test results and review outcomes. The maintainer accepted the effort on 2026-10-11. Closure does not close M0 or authorize Git landing.

## Decisions that shaped it
No new decision entry was required or triggered. The probe uses controlled SDK UI callbacks, not a new Agent Service or durable request registry. An unavailable operation in that seam is not evidence that every SDK or RPC interface lacks response handles.

## Plan versus actual
- Tasks at breakdown: 1. Added: 0. Split: 0. Dropped: 0.
- During execution, R4 was clarified to require measured counters and a real fresh SDK session while permitting explicit unavailable stale resolution. The SDK limitation was then scoped to the exercised fixture seam.
- Two initial runs timed out. The task continued with corrected worker lifecycle and measurement behavior rather than substituting hardcoded successful observations.
- Review and archival used file snapshots without a Git baseline. A prose Base commit value made the workflow validator attempt Git ref resolution; the field was removed and the incident recorded in the task. No commit or landing occurred.

## Review findings
Requirements review passed. Quality review found one blocking race: a worker could publish its terminal file between polling reads and the observed exit, causing a false early-exit error. The controller now rereads final files after exit. A deterministic real-child regression failed before the fix and passed afterward; quality recheck passed. Security review passed without findings.

## What changes
The permanent FIFO-synchronized regression protects terminal publication at worker exit. Measured counter and process-boundary checks prevent incomplete evidence from being promoted. No new standards rule was added; these checks belong to the probe and already enforce the observed failures.

## Debt left behind
No new technical-debt entry or hotfix follow-up was created. RPC stale replies, durable request recovery, CAS and Agent Service restart semantics remain unverified, not delivered features. The [development record](../../development.md#m0-fixture-evidence) owns the remaining M0 gates and next scoped effort.
