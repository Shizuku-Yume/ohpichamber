# 05: OMP behaviour settings in Settings

**Effort:** omp-native-parity
**Task type:** feature
**Base commit:** <commit-sha>

**Delivers:** An "OMP" Settings section that reads and writes the allowlisted OMP behaviour settings through OMP's Settings API, so `config.yml` stays the only store; OpenCode-only settings pages confirmed dead are removed.

**Blocked by:** 04
**Files:** new Agent Service settings operation (contract in `packages/agent-contract`, supervisor, worker or service-side Settings access), Host route with authorization in `packages/web/server/lib/`, `packages/ui/src/components/sections/` (new OMP section), settings pages for classification, routing, magic prompts, snippets.

**Read first:** spec "Defaults come from OMP"; `packages/ui/src/components/sections/PATTERNS.md`; skills `ui-api-decoupling`, `locale-ui-patterns`, `enterprise-boundary` (provider/model settings); OMP `config/settings-schema.ts` and `modes/settings.ts` in the pinned package for setting ids and metadata.
**Covers:** W7

**Check:** Before: no app control changes `compaction.thresholdPercent`. After: with an isolated OMP agent dir, a test writes the value through the route and the file changes; editing the file shows the new value on the next read; appearance keys are not returned; each removed page has a recorded reason it had no OMP effect.

- [ ] Allowlist from the spec, metadata from OMP's schema where exported.
- [ ] Host route authorizes; secrets never returned.
- [ ] UI section with save feedback per PATTERNS.md; strings localized.
- [ ] Dead OpenCode pages removed after confirmation.

## Progress (reconnaissance notes for the next session)

- The four candidate "dead OpenCode pages" are retained: snippets use the pinned native prompt-template calls and ChatInput expansion; routing consumes `host/prompt-delivery-runtime.resolveAutoSelection`; classification also informs permission auto-accept safety; magic prompts are used by gitApi, conflict/plan/review/fusion and ChatInput. They are not dead and must not be removed without a separate effect proof.
- Settings API constraints from the pinned package: `Settings.set` queues a native atomic background write; the OMP settings operation must flush before returning. Every GET must reload from disk so TUI edits appear. Do not narrow the spec allowlist silently: `isCredential` metadata, raw MCP `command`/`env`/`headers`, `auth.broker.*`, `task.agentAccountPools`, and `compaction.remoteEndpoint`/`skills.registryUrl` carry credential/exec/egress risk; route secret-rich MCP/provider fields through their existing owning APIs or record a precise spec adjustment backed by the pinned metadata and enterprise policy. Exclude appearance (including `goal.statusInFooter` even under `goal.*`). Selecting a provider model role is not by itself a provider entry; inspect the actual enterprise policy. A generic settings route must not bypass policy through URL/path/command fields.
