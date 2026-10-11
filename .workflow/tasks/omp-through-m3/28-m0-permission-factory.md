# 28: Verify full-factory interactive permission paths

**Effort:** omp-through-m3
**Task type:** spike
**Base commit:** <commit-sha>

**Delivers:** An answer to the remaining reachable M0 question about interactive approval for actual public-factory built-in tools, with observed execution/refusal/cancellation outcomes or a precise unsupported boundary.

**Blocked by:** 25
**Files:** `.workflow/omp-migration/m0/public-factory-permissions.json`; this task; disposable external consumer/process state only

**Read first:** `.workflow/specs/omp-through-m3.md` W1/W4; `.workflow/specs/omp-m0-probe.md` approval and question requirements; `.workflow/omp-migration/implementation-plan.md` M0 evidence boundaries; archived task 25 and `public-factory-auth-skills.json`; installed public factory, built-in tool and supported UI/approval owners
**Covers:** W1, W4

**Check:** Run one disposable Bun prototype from the prepared task-24 consumer through the public `createAgentSession` factory and a controlled local model. Invoke actual factory-registered built-in tools that require permission, exercise the supported interactive approval/cancel path and headless refusal separately, and record requested/resolved decisions, side effects, timeout/exit and cleanup. Use direct SDK/public factory owners only: no CLI/RPC substitute, custom echo tool, internal monkey-patch, real provider, secret, application edit or service-CAS claim. If the installed public factory cannot expose the supported interactive seam, record the exact owner and unavailable result without forcing a pass.

- [ ] Reuse task-24 immutable installed inputs and private HOME/agent/workspace/environment; keep package payloads and application source read-only.
- [ ] Use actual public-factory built-in tools and a controlled model; do not replace tool execution with a custom echo tool or source-internal call.
- [ ] Record approval requested/resolved, cancellation/refusal, observable side effects and cleanup as separate outcomes; preserve failures and unavailable behavior.
- [ ] Keep service CAS, stale replies, restart generations and Host authorization as later service requirements, not SDK evidence.
- [ ] Record sanitized invocation, source/package identity, timeout/exit, platform and cleanup in a machine-readable artifact; remove throwaway state.
- [ ] Keep the investigation separate from M0 acceptance; parent owns review, archive and gate decision.

## Progress

- Planned after gate review identified the full-factory interactive permission boundary as the only additional reachable M0 SDK evidence gap in the current slice.

## Findings

- Not started.
