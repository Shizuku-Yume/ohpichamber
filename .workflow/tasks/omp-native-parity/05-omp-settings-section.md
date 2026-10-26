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
