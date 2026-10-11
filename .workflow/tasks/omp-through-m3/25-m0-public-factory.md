# 25: Verify installed public-factory runtime paths

**Effort:** omp-through-m3
**Task type:** spike
**Base commit:** <commit-sha>
**Question:** Can the source-derived installed public SDK execute the retained session path with live stored auth/model configuration, full-factory skills and actual built-in permission handling?
**Time box:** One disposable consumer scenario covering these unexercised paths. Reuse unchanged lifecycle, branch, Shell, resource and storage-format observations.

**Delivers:** Answer to the remaining installed public-factory feasibility questions, with observed owner-specific outcomes and unresolved provider/permission limits for gate 03.

**Blocked by:** 02
**Files:** `.workflow/omp-migration/m0/public-factory-auth-skills.json`; this task; disposable external consumer/process state only

**Read first:** `.workflow/specs/omp-through-m3.md` M0/W1; implementation-plan M0 evidence boundaries; archived task 24 and `source-install.json`; installed public SDK factory, AuthStorage/ModelRegistry, skills builder and approval owners
**Covers:** W1

**Check:** Run a disposable Bun prototype from the coordinator-prepared installed consumer, using the immutable task-24 packages/lock/patches. Submit a controlled prompt through `createAgentSession`, observe actual stored-key authentication through loopback OpenAI/Anthropic-compatible protocol owners, change/remove credentials in the same live registry and cold-reopen the owned SQLite store. Exercise full-factory `.agents/skills` discovery/system prompt and public builder delivery plus actual built-in permission paths. Record invocation, API ownership, distinct outcomes, timeouts/exit and cleanup in the artifact. A stored record or getter echo is not authentication; a failed/unavailable required capability remains a gate.

- [ ] Use installed public exports or supported exported subpaths, not source-workspace imports, internal mutation or `session.agent.streamFn` replacement.
- [ ] Use owned HOME/agent directory/workspace/environment. Package inputs are shared read-only; runtime state is private to this process. Keep application dependencies/source untouched.
- [ ] Observe long-lived AuthStorage set/rotate/remove, registry reactivity and disk reopen. Translate synthetic Host `{ type: 'api' }` to pinned SDK `{ type: 'api_key' }` through actual controlled protocol calls; distinguish OpenAI and Anthropic outcomes.
- [ ] If the existing approved provider environment is available, privately use it for a stored-key request without reading/printing its secret file or selecting another provider. Controlled local auth is not real upstream auth, OAuth refresh or scope validation.
- [ ] Observe retained `.agents/skills` discovery and full factory system-prompt/read capability; deliver the supported public skill expansion. Do not turn CLI handling or bare slash behavior into a new gate.
- [ ] Exercise actual representative built-in read/write/exec approval owners; record the built-in coverage map and no-UI/interactive limits. Custom echo tools cannot establish built-in coverage, and this is not Host Gatekeeper or service CAS proof.
- [ ] Preserve provider-specific unavailable/failed outcomes and required gaps. Redact secrets, real endpoints/models and prompt/response bodies before handoff; record session/database/process cleanup.
- [ ] Keep throwaway prototype/state off main; parent owns shared evidence, review, archive and landing. Completed investigation does not accept M0.
