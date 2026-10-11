# 03: Record the M0 gate and implementation handoff

**Effort:** omp-through-m3
**Task type:** feature
**Base commit:** edfdf096316b92775b55410a532f61fa8aa62de9
**Started:** 2026-10-11T20:17:55+00:00
**Status:** blocked
**Dirty at start:** 3,242 pre-existing assembled application, workflow, skill and documentation paths; all are excluded from this task except the named gate documents.

**Delivers:** A current M0 gate record states what is accepted for M1/M2, what remains explicitly deferred, and the exact source-backed handoff for implementation.

**Blocked by:** 02, 25, 26, 27, 28
**Files:** `.workflow/development.md`, `.workflow/omp-migration/implementation-plan.md`, `.workflow/specs/omp-through-m3.md`

**Read first:** `.workflow/specs/omp-through-m3.md` W1; archived tasks 01/02/19/24 and evidence tasks 25-27; `.workflow/development.md`; migration scope, architecture and implementation-plan gates
**Covers:** W1

**Check:** `bun run docs:validate && .workflow/bin/workflow validate --no-color` plus an evidence-to-requirement review → docs pass and every required M0 item has observed evidence or a recorded maintainer decision. An unresolved required item means this task stays blocked and unarchived; completing a gate report alone cannot release tasks 04, 06 or 07.
## Progress

- Check before: `bun run docs:validate && .workflow/bin/workflow validate --no-color` passed before this gate review (`696` pages, `58` sidebar links, `37` workflow task files), but the evidence-to-requirement review was not complete, so the gate deliverable was not yet satisfied.
- The three reachable evidence investigations 25, 26 and 27 are now archived with their actual outcomes. Their artifacts retain failed, partial, unavailable and platform-limited behavior; none claims M0 or gate 03 passage.
### Evidence-to-requirement review

- W1 is observed across the pinned source-derived lifecycle, capability, Guest Shell, identity, installation, public-factory, MCP and Host PTY artifacts. Each retained invocation includes source/package/runtime identity, platform, timeout or exit, redaction and cleanup; task 25's receipt now records its command, private consumer cwd, 180-second timeout, Linux x64 platform and exit 0.
- W2 and W3 are observed by the lifecycle artifact: session creation, prompt/event sequence, terminal completion, history reload, branch/fork without workspace rollback, abort, disposal and subagent execution all passed. The raw fixture event vocabulary is not a Canonical Service contract.
- W4 is only partial: the real extension/AskTool seams observed approval and question resolve/cancel/headless refusal, while restart-pending fixtures observed cleanup boundaries but no cross-worker request handle or stale-reply rejection. Task 25 exercised full-factory read/write/bash paths and no-UI refusal, but not interactive full-factory approval coverage. This is a reachable SDK evidence gap, not a service-CAS result.
- W5 selects dedicated workers because all exercised shared-process cwd/environment modes failed. The original 100 MiB target remains failed; the measured Linux RSS limitation is explicitly maintainer-accepted. Non-Linux/macOS resource behavior remains unavailable and requires an explicit decision before gate release.
- W6 is mixed: AuthStorage paths and task 25's stored-key rotation/removal/cold-reopen loopback behavior, model/stateless completion and native Guest Shell owners are observed; the seven provider-format records retain unavailable authentication and unknown migration, and OAuth refresh/scopes/provider conversion remain unresolved. Task 26 observed installed HTTP/SSE, explicit config/schema apply, local auth challenge, manual reconnect and transport-close recovery, but not remote OAuth, default watcher behavior or abrupt network outage. Task 25 now observes full-factory `.agents/skills` system-prompt discovery and public skill delivery; lower-level slash expansion is explicitly unsupported and is not substituted for Composer acceptance.
- W7 event order/fragment observations and W8 sanitized identity, timeout/exit and cleanup reporting are retained. Service-only cursor, CAS, restart-generation and stale-publication guarantees remain later service gates, not M0 fixture claims. `PROBE-05` is correctly M2-owned under `SCOPE-6.3`; it is not a missing M0 benchmark.
- Architecture risk review: `PROBE-01` failed shared-process isolation and supports the dedicated-worker direction; `PROBE-02` retains the failed target plus the accepted Linux limitation; `PROBE-03` passed; `PROBE-04` remains unresolved with provider/OAuth feasibility; `PROBE-06` passed one real Linux Host PTY tab-close tree with the unrelated sibling preserved, while non-Linux and unexercised process classes remain outside the result. Tasks 25-27 are evidence investigations, not M0 passage.

## Blocked

- Reachable gap: complete full-factory built-in permission/interactive approval coverage is not observed. Add one narrow direct-SDK evidence task before re-evaluating this gate; do not replace it with CLI/RPC or a custom echo tool.
- Maintainer-owned decisions remain required for unavailable provider/OAuth conversion feasibility and non-Linux/macOS worker-resource requirements. Do not silently waive them or relabel them as M2 behavior.
- Service implementation and M2-owned contracts (Host CAS, cross-worker stale replies, service restart expiry, Host Gatekeeper overhead and actual service resource measurements) are not M0 blockers, but must not be claimed as passed here.



- [ ] Compare every M0 implementation-plan item and architecture risk probe with current artifacts, task-02 corrections and tasks 25-27 outcomes. Completed investigations do not turn failed/unavailable capabilities into accepted evidence.
- [ ] Separate reachable M0 work from M5/platform or provider limits without silently dropping required M0 evidence.
- [ ] Record the accepted worker architecture and its measured resource limitation.
- [ ] Make M1 the next ready phase only after every M0 prerequisite is accepted, not merely documented.
- [ ] Keep M0 blocked and this task unarchived if required evidence or a maintainer-owned resource decision is missing.
