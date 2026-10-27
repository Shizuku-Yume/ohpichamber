# 21: Diagnostics, overview, quota and session warming

**Effort:** upstream-refresh
**Task type:** feature
**Base commit:** c4ce06dc0f

**Delivers:** Upstream's diagnostics export, overview panel, quota/limit-failover handling, session warming and small-model routing work with the fork's providers.

**Blocked by:** 10, 22, 23
**Files:** Path list: `/home/shizuku/Project/ohpichamber-omp-artifacts/upstream-sync-2026-10-27/plan-paths/21.tsv` (80 paths: 52 clean/new, 28 both-side, 19 conflicts). Main locations: `packages/web/server/lib/{diagnostics,overview,quota,limit-failover,session-warming,session-assist,small-model}`, `packages/ui/src/lib/{diagnostics,overview,quota}`, `packages/ui/src/components/{overview,usage}`. Consume task 23's `stores/useSessionWarmingStore.ts` for the warming state/overview; no second warming source.

**Read first:** Spec W6; `.agents/skills/performance-engineering/SKILL.md`; `.agents/skills/enterprise-boundary/SKILL.md` (telemetry redaction); `.agents/skills/locale-ui-patterns/SKILL.md`.
**Covers:** W6

**Check:** `bun install --frozen-lockfile` and `bun run type-check` and `bun run lint` and `bun run test` all exit 0, the diagnostics/quota tests pass, and in the running app the overview lists waiting/running/finished work, the diagnostics export downloads a bounded and redacted timeline, and a quota failure shows its state. Real path: trigger one provider quota response or a named fixture.

## Done when

- [ ] Diagnostics output is bounded and contains no tokens, prompts or credentials.
- [ ] Overview derives live state and does not block on a slow provider.
- [ ] Quota/limit-failover behavior is intentional per provider and visible in the UI.
- [ ] Session warming respects the configured policy and is observable, through task 23's `useSessionWarmingStore` rather than a duplicate per-session source.

## Progress

### Method and Base

Worktree `upstream-refresh-21`, branch `upstream-refresh/21`, cut from integration tip `aa0954a966`. Bun 1.4.4 from `~/.local/opt/bun/v1.4.4/bun-linux-x64/bun`.

Every path in `/home/shizuku/Project/ohpichamber-omp-artifacts/upstream-sync-2026-10-27/plan-paths/21.tsv` (80 paths) was reconciled against upstream `0056bf6a9` and the fork's canonical OMP contracts.

### Dispositions Summary

- **Adopted (52 paths):**
  - Diagnostics: `packages/ui/src/lib/diagnostics/` (`DOCUMENTATION.md`, `capture.test.ts`, `capture.ts`, `dialog-availability.ts`, `export.ts`, `timeline.test.ts`, `timeline.ts`), `packages/web/server/lib/diagnostics/` (`DOCUMENTATION.md`, `local-files.js`, `local-files.test.js`, `server-journal.js`, `server-journal.test.js`, `vocabulary.js`).
  - Overview: `packages/ui/src/components/overview/` (`ADR.md`, `DOCUMENTATION.md`, `OverviewView.test.tsx`, `OverviewView.tsx`, `overviewActions.ts`, `useOverviewData.ts`, `useWorktreeChangeRequests.ts`), `packages/ui/src/lib/overview/` (`overviewModel.test.ts`, `overviewModel.ts`), `packages/web/server/lib/overview/` (`feature-flag.js`, `feature-flag.test.js`).
  - Limit failover: `packages/web/server/lib/limit-failover/` (`DOCUMENTATION.md`, `policy.js`, `runtime.js`, `runtime.test.js`).
  - Session warming: `packages/web/server/lib/session-warming/` (`DOCUMENTATION.md`, `routes.js`, `routes.test.js`, `runtime.js`, `runtime.test.js`).
  - Quota: `packages/ui/src/lib/quota/` (`model-families.test.ts`, `model-families.ts`, `providers/index.ts`, `utils.test.ts`, `utils.ts`), `packages/web/server/lib/quota/providers/antigravity/` (9 paths: `api.js`, `api.test.js`, `auth.js`, `client.d.ts`, `client.js`, `client.test.js`, `index.js`, `transforms.js`, `transforms.test.js`), `packages/web/server/lib/quota/providers/google/` (`index.test.js`, `oauth.d.ts`, `oauth.js`), `packages/web/server/lib/quota/providers/ollama-cloud.test.js`, `packages/web/server/lib/quota/utils/formatters.js`.

- **Reconciled (22 paths):**
  - Server Quota: `packages/web/server/lib/quota/DOCUMENTATION.md`, `packages/web/server/lib/quota/routes.js`, `packages/web/server/lib/quota/providers/claude/` (`index.js`, `index.test.js`), `packages/web/server/lib/quota/providers/` (`codex.js`, `codex.test.js`, `copilot.js`, `copilot.test.js`, `index.js`, `ollama-cloud.js`, `openrouter.js`, `openrouter.test.js`), `packages/web/server/lib/quota/providers/google/` (`api.js`, `auth.js`, `index.js`, `transforms.js`).
  - Server Session Assist: `packages/web/server/lib/session-assist/` (`DOCUMENTATION.md`, `context.js`, `context.test.js`, `runtime.js`, `runtime.test.js`).
  - Server Small Model: `packages/web/server/lib/small-model/` (`DOCUMENTATION.md`, `client.js`, `index.js`, `index.test.js`).

- **Retired / Excluded (5 paths / symbols):**
  - `packages/web/server/lib/quota/credentials/providers.js`: retired in fork (OpenCode auth.json credentials reader).
  - `packages/web/server/lib/quota/credentials/store.js`: retired in fork (legacy cookie store).
  - `packages/web/server/lib/small-model/routes.js`: retired in fork (public small-model endpoints replaced by canonicalClient).
  - `diagnosticErrorMessage` (`packages/web/server/lib/diagnostics/vocabulary.js:50`): retired because its only upstream consumer (`packages/web/server/lib/opencode/proxy.js:16,99,100`) was deleted in fork during OMP migration (`X-opencode-engine.tsv`).
  - `isLimitFailoverConfigured` (`packages/web/server/lib/limit-failover/policy.js:92`): retired because its only upstream consumer (`packages/web/server/lib/opencode/managed-config-file.js:3,112`) was deleted in fork during OMP migration (`X-opencode-engine.tsv`).

- **Deferred with Owner:**
  - `packages/ui/src/lib/source-control/repositoryUrlMatcher.ts`, `packages/ui/src/lib/trackedItems/*`: Owned by Task 07 (`.workflow/tasks/upstream-refresh/07-review-surfaces-board-file-views.md`).
  - `readWorktreeUse` / `WorktreeUse` (`packages/ui/src/components/overview/overviewActions.ts:73,81`): Owned by Task 31 (`.workflow/tasks/upstream-refresh/31-one-view-sidebar-redesign.md:26`).
  - `packages/web/server/lib/diagnostics/opencode-load.js`: Retired. Not in `21.tsv`, OpenCode-specific process walker; all callers replaced with OMP Agent Service diagnostics (`packages/web/server/lib/host/canonical-routes.js:172-174`) from post-M3 hardening task 16 (`.workflow/done/post-m3-hardening/16-agent-service-diagnostics.md`).
### Missing Canonical Session Fields Evidence

- `session.outcome`: OpenCode 2.x session field was used to detect failure (`overviewModel.ts:88,114`). Canonical `Session` from `@openchamber/agent-contract` does not carry `outcome`; mapped to canonical `session.runtimeStatus === 'unavailable'` without faking or casting.
- `session.time.updated`, `session.time.archived`, `session.parentID`: OpenCode 2.x metadata fields; mapped directly to canonical `updatedAt`, `archivedAt`, `parentSessionId`.
- `session.id`: mapped to canonical `session.sessionId`.

### Fallback Finding and Fix

- Finding: In `packages/ui/src/components/overview/useOverviewData.ts:50-54`, `OverviewData` only computed `ready: hasLoaded || sessionsStatus === 'ready'`, returning `ready: false` when `sessionsStatus === 'error'`, which left the overview screen trapped in an indefinite loading state masquerading a fetch error as loading.
- Fix: Added `error: boolean` to `OverviewData` (`useOverviewData.ts:54,382`), rendered an explicit error banner in `OverviewView.tsx:495-501`, and added test `the page renders an explicit error state when session load fails` in `OverviewView.test.tsx:103-141`.

### Behavior without Task 07 (trackedItems / repositoryUrlMatcher)

- PR review requests: `useOverviewReviewRequests()` in `packages/ui/src/components/overview/useOverviewData.ts:139-141` returns `{ items: [], hasMore: false }`. In `packages/ui/src/components/overview/OverviewView.tsx:572-575`, the review requests section is hidden because `reviews.items.length === 0`.
- Linked issue state: in `useOverviewData.ts:338`, `issues: []` is passed to facts, so `doneSignalOf` in `overviewModel.ts:76-83` relies on PR merge state and agent hints without guessing tracker item resolution.
- Change request summaries: in `useWorktreeChangeRequests.ts:10`, `selectEntryVisualSummary` returns `null`, and unknown branches explicitly set `prsPending: true` (`useOverviewData.ts:335`), preserving the waiting row without premature done-classification.

### Checks at Tip

- `bun run type-check`: exit 0
- `bun run lint`: exit 0
- `bunx oxlint`: exit 0 (0 warnings, 0 errors across all authored files)
- UI focused tests (`bun test packages/ui/src/{lib/diagnostics,components/overview,lib/overview,lib/quota}`): 57/57 passed (including `redacts all tokens, prompts, and credentials from diagnostics output`)
- Server focused tests (`vitest run packages/web/server/lib/{diagnostics,overview,limit-failover,session-warming,session-assist,small-model,quota}`): 478/478 passed across 39 files
- `bun run dead-code`: diff against baseline: 0 new unused files (17 files, identical to baseline); 1 new unused export (`readWorktreeUse` in `overviewActions.ts:81`, deferred to Task 31); 1 consumed export (`resolveProjectColor` in `projectMeta.ts:86`, consumed by `useOverviewData.ts:377`); 1 new unused exported type (`WorktreeUse` in `overviewActions.ts:73`, deferred to Task 31). The namespace rename `openchamberConfig` -> `projectConfig` for `fetchProjectSetup` is caused by `start-session.integration.test.ts:13` importing `* as projectConfig from '@/lib/openchamberConfig'`, which knip associates as the primary namespace consumer instead of `issue-2039.test.ts`.
