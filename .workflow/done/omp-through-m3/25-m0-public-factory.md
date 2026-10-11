# 25: Verify installed public-factory runtime paths

**Effort:** omp-through-m3
**Task type:** spike
**Base commit:** edfdf096316b92775b55410a532f61fa8aa62de9
**Started:** 2026-10-11T19:07:11Z
**Finished:** 2026-10-12
**Dirty at start:** existing assembled application/development tree (all paths reported by `git status --porcelain=v1`; excluded from this task)
**Question:** Can the source-derived installed public SDK execute the retained session path with live stored auth/model configuration, full-factory skills and actual built-in permission handling?
**Time box:** One disposable consumer scenario covering these unexercised paths. Reuse unchanged lifecycle, branch, Shell, resource and storage-format observations.

**Delivers:** Answer to the remaining installed public-factory feasibility questions, with observed owner-specific outcomes and unresolved provider/permission limits for gate 03.

**Blocked by:** 02
**Files:** `.workflow/omp-migration/m0/public-factory-auth-skills.json`; this task; disposable external consumer/process state only

**Read first:** `.workflow/specs/omp-through-m3.md` M0/W1; implementation-plan M0 evidence boundaries; archived task 24 and `source-install.json`; installed public SDK factory, AuthStorage/ModelRegistry, skills builder and approval owners
**Covers:** W1

**Check:** Run a disposable Bun prototype from the coordinator-prepared installed consumer, using the immutable task-24 packages/lock/patches. Submit a controlled prompt through `createAgentSession`, observe actual stored-key authentication through loopback OpenAI/Anthropic-compatible protocol owners, change/remove credentials in the same live registry and cold-reopen the owned SQLite store. Exercise full-factory `.agents/skills` discovery/system prompt and public builder delivery plus actual built-in permission paths. Record invocation, API ownership, distinct outcomes, timeouts/exit and cleanup in the artifact. A stored record or getter echo is not authentication; a failed/unavailable required capability remains a gate.

## Progress

Start recorded from `edfdf096316b92775b55410a532f61fa8aa62de9`; shared dirty assembled paths are excluded. Disposable consumer/state will remain under `/tmp/ohpi-m0-evidence-consumer` and other private `/tmp` paths only.

- [x] Use installed public exports and supported registration/build APIs only; no source-workspace imports, `session.agent.streamFn` replacement, CLI substitute, internal monkey-patch, or custom echo tools.
- [x] Use private HOME/agent directory/workspace/environment. The frozen task-24 package inputs remain unchanged; no application dependencies/source were touched.
- [x] Exercise AuthStorage `type: "api_key"` set/rotation/remove, generation notifications, live ModelRegistry resolution, cold reopen after rotation and after removal, and synthetic Host-shaped `{ type: "api" }` → SDK `type: "api_key"` mapping through local protocol calls.
- [ ] Optional approved upstream provider environment was not inspected or used; availability is unknown. No real endpoint, secret file, or real provider/model was accessed; upstream/OAuth behavior remains unresolved.
- [x] Observe `.agents/skills` discovery, full-factory system-prompt/read capability, and public `buildSkillPromptMessage` delivery through `promptCustomMessage`.
- [x] Exercise actual factory built-in read/write/bash paths and their no-UI decisions. Record the tool-event outcomes; this is not Host Gatekeeper or service CAS proof.
- [x] Preserve provider-specific results and required gaps, redact provider/request/prompt details, and record session, SQLite, loopback process, and private runtime cleanup.
- [x] Keep the disposable probe/state outside git; parent owns shared evidence, review, archive and landing. This evidence does not accept M0.
Review: Requirements Brief A passed after the invocation receipt was restored in the task and artifact; no blocking findings remain. Quality Brief B and the security review passed with no findings. These reviews accept the bounded investigation, not M0 or gate 03.

## Findings

- Final disposable Bun 1.4.2 run used `bun run task25-public-factory-probe.ts` from `/tmp/ohpi-m0-evidence-consumer` on Linux x64 with a 180-second subprocess timeout; it exited 0 with empty stdout/stderr, using the task-24 frozen installed closure and immutable identities, with no application/dependency edits. Detailed sanitized outcomes are in [`public-factory-auth-skills.json`](../../omp-migration/m0/public-factory-auth-skills.json).
- `AuthStorage` SQLite generation moved 1 → 3 → 4 → 5 with notifications 2, 3, 4, 5. The four initial OpenAI-compatible requests authenticated with the stored key, the same live registry authenticated one request after rotation, and removing it made the registry resolve no key (zero post-removal network requests; prompt admission false). Explicitly reloaded cold opens saw the rotated API-key record and then its removal. One Anthropic-compatible request also completed using the stored key; its non-official loopback auth header was Bearer. No real upstream/OAuth result is implied.
- Full `createAgentSession` discovered the owned `.agents/skills` fixture, sent its description in the system prompt, advertised read, and delivered the public skill-builder body. Actual factory built-ins read and wrote the controlled workspace successfully. With `hasUI: false` and approval mode `write`, built-in bash exec emitted an error/refusal and did not create its synthetic side-effect file.
- A disposable custom-model registration attempt first hit source-backed validation requiring an API-key/OAuth config for model definitions; the final probe avoided a config-key override by registering only transport and using public `buildModel`. An earlier malformed Anthropic fixture envelope made seven authenticated requests without a completed turn; the corrected SSE fixture completed on one request. These were probe-setup corrections, not accepted SDK capability results.
- The optional approved-provider environment was not inspected or used (availability unknown). External provider availability, OAuth refresh/scopes, online discovery, interactive approval, Host Gatekeeper and service CAS remain unexercised; M0 is not accepted and gate 03 remains blocked pending the authoritative review.
- Both sessions, primary/cold AuthStorage stores, loopback server, and private runtime state were closed/stopped/removed. The throwaway probe and sanitized runner output are removed after the evidence artifact is captured.
