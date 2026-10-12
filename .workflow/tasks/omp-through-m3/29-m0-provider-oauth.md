# 29: Verify provider and OAuth feasibility with approved inputs

**Effort:** omp-through-m3
**Task type:** spike
**Base commit:** <commit-sha>

**Delivers:** A bounded answer for the remaining M0 provider boundary: stored credential use and each supported provider/OAuth format are observed where the operator-managed approved environment makes them reachable, or retained as explicit unavailable/unsupported outcomes.

**Blocked by:** 28
**Files:** `.workflow/omp-migration/m0/provider-oauth-feasibility.json`; this task; disposable external consumer/process state only

**Read first:** `.workflow/specs/omp-through-m3.md` M0/W1; `.workflow/omp-migration/implementation-plan.md` evidence boundaries; `.workflow/omp-migration/m0/capabilities-real-provider.json`; `scripts/omp-m0/capability-fixture.mjs`; archived tasks 19, 24, 25 and task 28 artifact; enterprise boundary rules for provider entry and secret handling
**Covers:** W1, W6

**Check:** Run one bounded direct-SDK probe from the immutable task-24 consumer using only the operator-managed approved provider environment. Exercise the supported stored credential formats against the actual SDK owner and the reachable provider transport, including explicit OAuth availability/refresh/scope outcomes where credentials are supplied. Record only sanitized per-format status, provider/model identity labels, timeout/exit and cleanup; never print, persist or include keys, tokens, headers, prompts, raw responses, absolute paths or provider payloads. A missing approved format or unavailable refresh path remains `unavailable`/`unknown`; it does not become a pass and does not release M0.

- [ ] Reuse immutable installed inputs and private runtime directories; do not modify application source, dependencies or the approved environment.
- [ ] Resolve the exact public AuthStorage/ModelRegistry/factory owners before execution; do not use a getter echo or syntactic SQLite round trip as authentication evidence.
- [ ] Separate stored API-key authentication, OAuth refresh/scope behavior, unsupported conversion and unavailable provider environment outcomes.
- [ ] Keep provider entry loopback/external egress within the explicitly authorized probe boundary; no new application provider, policy knob or credential importer is added.
- [ ] Capture invocation, source/package identity, platform, timeout/exit, redaction, cleanup and all failed/partial/unavailable results in machine-readable evidence.
- [ ] Keep service credential handoff, startup import, Host authorization and M2 task-22 acceptance out of this SDK investigation.
- [ ] Parent reviews and archives the investigation; it does not accept M0 by recording the artifact.
