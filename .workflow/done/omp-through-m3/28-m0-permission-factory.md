# 28: Verify full-factory interactive permission paths

**Effort:** omp-through-m3
**Task type:** spike
**Base commit:** 0bd2a5f03c2b0fb982c916ef4d2e85f582527863
**Started:** 2026-10-11T20:30:23+00:00
**Finished:** 2026-10-11T21:17:51Z
**Dirty at start:** 3,236 pre-existing assembled application, workflow, skill and documentation paths; all are excluded from this task.

**Delivers:** An answer to the remaining reachable M0 question about interactive approval for actual public-factory built-in tools, with observed execution/refusal/cancellation outcomes or a precise unsupported boundary.

**Blocked by:** 25
**Files:** `.workflow/omp-migration/m0/public-factory-permissions.json`; this task; disposable external consumer/process state only

**Read first:** `.workflow/specs/omp-through-m3.md` W1/W4; `.workflow/specs/omp-m0-probe.md` approval and question requirements; `.workflow/omp-migration/implementation-plan.md` M0 evidence boundaries; archived task 25 and `public-factory-auth-skills.json`; installed public factory, built-in tool and supported UI/approval owners
**Covers:** W1, W4

**Check:** Run one disposable Bun prototype from the prepared task-24 consumer through the public `createAgentSession` factory and a controlled local model. Invoke actual factory-registered built-in tools that require permission, exercise the supported interactive approval/cancel path and headless refusal separately, and record requested/resolved decisions, side effects, timeout/exit and cleanup. Use direct SDK/public factory owners only: no CLI/RPC substitute, custom echo tool, internal monkey-patch, real provider, secret, application edit or service-CAS claim. If the installed public factory cannot expose the supported interactive seam, record the exact owner and unavailable result without forcing a pass.

- [x] Reuse task-24 immutable installed inputs and private HOME/agent/workspace/environment; keep package payloads and application source read-only.
- [x] Use actual public-factory built-in tools and a controlled model; do not replace tool execution with a custom echo tool or source-internal call.
- [x] Record approval requested/resolved, cancellation/refusal, observable side effects and cleanup as separate outcomes; preserve failures and unavailable behavior.
- [x] Keep service CAS, stale replies, restart generations and Host authorization as later service requirements, not SDK evidence.
- [x] Record sanitized invocation, source/package identity, timeout/exit, platform and cleanup in a machine-readable artifact; remove throwaway state.
- [x] Keep the investigation separate from M0 acceptance; parent owns review, archive and gate decision.

## Progress

- Planned after gate review identified the full-factory interactive permission boundary as the only additional reachable M0 SDK evidence gap in the current slice.
- Final command `bun run task28-public-factory-permissions.ts` ran from the immutable task-24 consumer with the installed `@oh-my-pi/pi-coding-agent` 18.8.9 closure on Linux x64/Bun 1.4.2. It exited 0 within the 180-second bound; the loopback fixture handled eight requests, all with the synthetic authorization and expected model.
- The final public-factory setup loaded the caller observer through the supported inline extension path and exercised factory-registered `write` and `bash`; no CLI/RPC path, custom echo tool, source import, stream replacement or internal patch was used.
- Three disposable fixture corrections were required before final evidence: `restrictToolNames: true` suppressed caller inline extensions, the minimal UI omitted public `setWidget`, and an interim `select` implementation threw instead of returning the supported cancellation value. The final run used `restrictToolNames: false`, supplied `setWidget`, and returned `undefined` from `select`; all recorded `runtimeErrors` arrays are empty. Each correction remains in the artifact rather than being hidden.

Review: Requirements Brief A, Quality Brief B and the security review passed with no findings after the supported selector-cancellation correction. The artifact preserves the earlier injected UI-error attempt as superseded setup evidence. This investigation does not accept M0 or gate 03.

## Findings

- The approved `write` case emitted requested/resolved approval events, called the controlled public `ExtensionUIContext.select` once, wrote the expected workspace file, and completed without a tool error.
- The denied `write` case emitted requested/resolved approval with `approved: false`, returned the user-denied tool result, and created no file.
- The interactive cancelled `bash` case returned `undefined` from the supported public selector, emitted requested/resolved approval with `approved: false`, returned the user-denied tool result, and created no file.
- The headless `bash` case emitted requested/resolved refusal without calling `select`, returned the SDK no-interactive-UI approval refusal, and created no file.
- Every case created and disposed a public-factory session, closed its owned AuthStorage, removed its case root, and the finalizer stopped the loopback server and removed the run root. The sanitized machine-readable result is [`public-factory-permissions.json`](../../omp-migration/m0/public-factory-permissions.json).
- This closes the reachable full-factory interactive permission evidence gap for the exercised Linux/public-SDK slice. It does not accept M0: real provider/OAuth conversion feasibility and non-Linux/macOS worker-resource decisions remain maintainer-owned gate items; Host Gatekeeper, service CAS, restart generations and stale-resolution behavior remain later service evidence.
