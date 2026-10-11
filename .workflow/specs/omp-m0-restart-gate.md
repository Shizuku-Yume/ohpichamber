# M0 restart-pending gate

**Status:** done
**Priority:** high

## What this is for
The earlier M0 artifacts observed approval and question resolve/cancel behavior but left worker restart evidence unavailable. A future Agent Service could retain a stale approval, execute a request after restart, or present a pending request as valid when its OMP runtime no longer owns it. This effort measures the worker boundary without implementing that service.

## What it does
A disposable probe creates one pending approval and one pending question using controlled OMP fixtures, stops the owning worker while each request is unresolved, and starts a fresh worker. The report records whether the old request can still be resolved, whether any tool side effect or late answer occurs, and whether cleanup is observable. If the exercised SDK seam exposes no cross-worker request handle, the report records that limit and keeps the Canonical expiry/revocation rule proposed. Automated consumers receive `partial`, `unavailable`, or `failed` rather than a parent `passed` result when restart evidence is missing.

## How it is built
- Extend the M0 disposable runner and fixture worker boundary. The parent runner owns worker lifecycle, bounded timeouts, report output and cleanup. The worker owns only the controlled OMP session and fixture UI seam.
- Hold approval and question requests at their UI boundary before execution or answer submission. Write only sanitized readiness markers to the disposable sandbox so the parent can control termination without carrying request content into the report.
- Terminate the worker while each request is pending, then start a fresh OMP session in a distinct process using the same disposable workspace and agent directory. Instrument the controlled tool, answer settlement and sanitized events so zero counts are measured, not copied from expected values.
- Record process cleanup, fresh-session readiness, before/after counts and a bounded late-event observation window. Attempt stale resolution only through an actual SDK operation. If no cross-worker request handle can be exercised, `staleResolution` is `unavailable` and `staleResolutionRejected` is unobserved, not `true`.
- Reuse the existing envelope redaction and `partial` aggregation. A parent probe is `passed` only when all requested restart observations are passed; unresolved approval/question restart behavior produces `partial` or `unavailable` and a nonzero suite exit.
- Update `development.md`, `contracts.md`, and the M0 artifact only with observed behavior. Do not implement the Agent Service, durable approval storage, CAS, reconnect handling, or `/api/agent/v1` routes in this effort.

## What it must not do

- Do not add `packages/agent-service`, Host Gateway routes, Canonical API handlers, or persistent approval/question storage.
- Do not claim that direct OMP SDK behavior proves Agent Service restart semantics.
- Do not use a real provider, real credentials, network calls, or raw prompt/response content.
- Do not mark approval/question restart cleanup passed because the worker exited cleanly; the pending request and stale-resolution behavior must be observed separately.
- Do not broaden this effort into non-Linux, mobile, Electron, relay, Docker, updater, Guest Shell, or Board acceptance.

## What was considered and rejected

- **Implement durable Agent Service state first.** That would produce an implementation before the OMP boundary is measured and would conflate host-owned expiry with SDK behavior. The M0 plan requires evidence before canonical implementation.
- **Treat direct resolve/cancel coverage as restart coverage.** It is deterministic and already exists, but it says nothing about a process boundary or stale requests. The existing partial status is the correct signal until restart is exercised.
- **Use a live provider turn.** It adds credentials and nondeterministic network behavior without answering whether a pending UI request can be resumed after worker replacement. The probe uses dedicated local SDK workers and controlled model responses instead.

## How we will know it works

- **R1.** `OMP_SOURCE_DIR=<pinned-source> bun run scripts/omp-m0/run.mjs --suite restart-pending --fixture --output <report> --timeout-ms 120000` records source/package/platform identity, uses schema version 2, cleans temporary workers, and emits no secret, prompt, response, or host path.
- **R2.** The report proves an approval request was pending before tool execution and a question request was pending before answer submission; both controlled side effects remain at zero at the termination point.
- **R3.** The owning worker stops while each request is pending, the parent observes process cleanup, and a fresh worker starts with a distinct process identity.
- **R4.** Compare instrumented tool execution, answer settlement and sanitized event counts before termination and after a fresh OMP session runs. Attempt resolving an old request only when a real SDK API accepts its handle. Report an observed rejection or explicit `unavailable` evidence, never infer rejection from process exit alone.
- **R5.** Missing SDK durability is represented as explicit child `unavailable` or `partial` evidence. The parent summary and process exit status cannot report a complete pass when restart behavior is unresolved.
- **R6.** The artifact, `development.md`, and `contracts.md` retain the observed boundary. The Canonical rule that pending approvals expire or revoke on restart remains proposed unless the probe proves a stronger behavior.

Focused tests cover incomplete-result aggregation, startup failure, bounded worker termination, counter/event observation and cleanup. The real command exercises the assembled source path once. Non-Linux and Agent Service integration remain outside this effort and stay explicit M0 gates.

## Open questions

None. The probe outcome settles what the current SDK can prove; any stronger Agent Service behavior is a later implementation decision constrained by the result.

## Notes

- Related evidence: `.workflow/omp-migration/m0/capabilities-fixture.json` and `.workflow/omp-migration/m0/capabilities-real-provider.json`.
- Related contract: `.workflow/omp-migration/contracts.md`, "Pending approvals on restart".
- Preparation reads the existing `scripts/omp-m0` runner, worker, fixtures and capability implementation. No module documentation exists in that directory. The root package scripts own lint, dead-code and documentation validation commands.
- The next planned M0 effort after this one is the scoped Guest Shell probe from `implementation-plan.md`; this effort does not include it.
