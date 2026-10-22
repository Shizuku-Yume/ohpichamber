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

Second blocking finding in real UI: the quota caller never sent `workspaceId`. Host selection rejects that as missing context (`INVALID_REQUEST`→503) before the credential branch, so the unconfigured result was unreachable. Live proof: the plain route returned 503 while the same route with the Host-resolved workspace query returned 200 `{ok:false, configured:false, usage:null}` with no error. Fixed in the UI owner: `useConfigStore` publishes the resolved workspace identity, `fetchQuota` adds it as the quota query, `useQuotaStore` gates requests on a resolved workspace and reloads on workspace change, keyed by runtime plus workspace. Focused quota UI tests pass 21/21 for directory switch, initialization ordering, A→B in-flight isolation, runtime switch, and the UsagePage readiness rule; the full config-store suite passes 115/115, including the new fresh-cached-directory workspace-resolution regression. No server-side default workspace is synthesized.

Reviewer follow-up (both blocking): (a) a directory switch kept the previous workspace identity while the next catalog loaded, so a refresh could send or commit the old workspace's quota; fixed by clearing `workspaceId` in both `activateDirectory` branches and the `initializeApp` active-directory change, and by treating any ready-scope change, including ready→empty, as reset+abort in the quota subscription. (b) `loadProviders` publishes `workspaceId` before `initializeApp` sets `isInitialized`, so the old subscription observed the workspace while initialization was still false and never retried; fixed by tracking `isInitialized ? workspaceId : ''` as one ready scope, so empty→ready triggers load. Focused regressions cover both transitions; no Host default-workspace fallback was added.

Third reviewer edge: `activateDirectory` cleared `workspaceId`, but a fresh cached provider snapshot skipped `loadProviders`, so the new directory never published a workspace. Fixed by forcing `loadProviders` whenever the directory actually changes, while keeping the cached snapshot painted; covered by a config-store regression that switches back to a fresh directory and asserts a new workspace resolve.

Integrated AppImage smoke (a93, sha256 `7af84e69…`): Settings → Usage listed the quota providers (Claude, Cursor, Google and others as `未设置`); selecting Claude, Cursor and Google each showed `暂无用量数据。` with no `刷新用量数据失败`, no credential-unavailable text and no not-configured banner. The quota route returned `{ok:false, configured:false, usage:null}` for an unconfigured provider in the same run. No completion or external discovery request was sent.

**Finished:** 2026-10-22T03:55:00Z
