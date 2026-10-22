# 75: Unconfigured providers show an empty quota instead of an error

**Effort:** omp-through-m3
**Task type:** bugfix
**Base commit:** 7b495354bd6c744f1c9ea924dd71af21afaf25d9
**Started:** 2026-10-22T03:48:52Z

**Delivers:** Refreshing usage for a provider with no selected credential reports `configured: false` with no usage and no error, so the Usage page shows its existing empty state. A configured provider whose credential resolution or quota request fails keeps a visible error, and an unsupported provider keeps its distinct outcome.

**Blocked by:** None
**Files:** `packages/web/server/lib/quota/routes.js`, `packages/web/server/lib/quota/providers/index.js`, `packages/web/server/lib/quota/providers/selected-credential.js`, `packages/ui/src/components/sections/usage/UsagePage.tsx`, `packages/ui/src/components/sections/usage/usagePageState.ts`, their focused tests and owning documentation.

**Read first:** `packages/web/server/lib/quota/` route/provider modules and tests; `packages/ui/src/stores/useQuotaStore.ts`; `packages/ui/src/components/sections/usage/`.
**Covers:** W6

**Related:** Task 76 (`done/omp-through-m3/76-chat-model-availability.md`) is the independent model-availability fix. It touches the Agent Service catalog only; this task touches quota routes and the usage UI, so neither blocks the other.

**Check:** `bun test packages/web/server/lib/quota/routes.test.js packages/web/server/lib/quota/providers/index.test.js packages/ui/src/stores/useQuotaStore.refresh.test.ts packages/ui/src/components/sections/usage/usagePageState.test.ts` → an unconfigured provider returns HTTP 200 with `configured: false` and no error, a configured success still reports usage, and a configured failure still reports its error.

- [x] Root cause: credential-unavailable was mapped to a generic 503 and recorded as a refresh error.
- [x] The route distinguishes "no credential selected" from "credential resolution or provider request failed".
- [x] The store leaves an unconfigured refresh error-free while preserving configured failures.
- [x] Focused regression tests cover unconfigured/empty, configured success and configured failure.
- [x] Owning documentation states the three outcomes.

## Progress

Dirty at start: none.

Source: cherry-picked quota-lane commit `f3be60e81` onto clean main `7b495354b` with no conflicts. The record is the canonical Task75 and links Task76 in the archived record.

Integrated checks (combined tree):
- `bun run --cwd packages/web test -- server/lib/quota/routes.test.js server/lib/quota/providers/index.test.js` → 2 files passed, 41 tests passed.
- `bun test packages/ui/src/stores/useQuotaStore.refresh.test.ts packages/ui/src/components/sections/usage/usagePageState.test.ts` → 16 pass, 0 fail, 59 expect() calls.
- `bun test packages/agent-service/src/worker/catalog-models.test.ts` → 31 pass, 0 fail, 112 expect() calls (Task76).
- `bun run --cwd packages/agent-service type-check`, `bun run --cwd packages/ui type-check`, `bun run --cwd packages/web type-check` → all exit 0.
- Combined `oxlint` exits 1 only on pre-existing anti-slop findings in touched files (`routes.js`/`selected-credential.js` runtime-typeof validation, `UsagePage.tsx` provider-id assertions and `nextSettings` annotation); the quota diff introduces no new lint finding.

Behavior: an unconfigured provider now resolves to `{ok:false, configured:false}` with no error; the Usage page maps that to `empty` with no red banner. Configured credential-resolution or provider failures keep `configured:true` and their error. Unsupported providers remain distinct.

Blocking review finding: `routes.js` called the injected `providers.buildUnconfiguredQuotaResult`, but production `packages/web/server/lib/quota/index.js` did not re-export it, so the real route still returned 503. Fixed by re-exporting the helper from the production module and adding a production-wiring regression that resolves providers through `import('./index.js')`: unconfigured 200 with no error, unsupported still 503. The existing configured-credential-failure semantics remain covered.

**Finished:** 2026-10-22T03:55:00Z
