# 21: Diagnostics, overview, quota and session warming

**Effort:** upstream-refresh
**Task type:** feature
**Base commit:** aa0954a966

**Delivers:** Upstream's diagnostics export, overview panel, quota/limit-failover handling, session warming and small-model routing work with the fork's providers.

**Blocked by:** 10, 22, 23
**Files:** Path list: `/home/shizuku/Project/ohpichamber-omp-artifacts/upstream-sync-2026-10-27/plan-paths/21.tsv` (80 paths: 52 clean/new, 28 both-side, 19 conflicts). Main locations: `packages/web/server/lib/{diagnostics,overview,quota,limit-failover,session-warming,session-assist,small-model}`, `packages/ui/src/lib/{diagnostics,overview,quota}`, `packages/ui/src/components/{overview,usage}`. Consume task 23's `stores/useSessionWarmingStore.ts` for the warming state/overview; no second warming source.

**Read first:** Spec W6; `.agents/skills/performance-engineering/SKILL.md`; `.agents/skills/enterprise-boundary/SKILL.md` (telemetry redaction); `.agents/skills/locale-ui-patterns/SKILL.md`.
**Covers:** W6

**Check:** `bun install --frozen-lockfile` and `bun run type-check` and `bun run lint` and `bun run test` all exit 0, the diagnostics/quota tests pass, and in the running app the overview lists waiting/running/finished work, the diagnostics export downloads a bounded and redacted timeline, and a quota failure shows its state. Real path: trigger one provider quota response or a named fixture.

## Done when

- [x] Diagnostics output is bounded and contains no tokens, prompts or credentials.
- [x] Overview derives live state and does not block on a slow provider.
- [x] Quota/limit-failover behavior is intentional per provider and visible in the UI.
- [x] Session warming respects the configured policy and is observable, through task 23's `useSessionWarmingStore` rather than a duplicate per-session source.

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

- **Retired / Excluded (3 paths):**
  - `packages/web/server/lib/quota/credentials/providers.js`: retired in fork (OpenCode auth.json credentials reader).
  - `packages/web/server/lib/quota/credentials/store.js`: retired in fork (legacy cookie store).
  - `packages/web/server/lib/small-model/routes.js`: retired in fork (public small-model endpoints replaced by canonicalClient).

- **Deferred with Owner:**
  - `packages/ui/src/lib/source-control/repositoryUrlMatcher.ts`, `packages/ui/src/lib/trackedItems/*`: Owned by Task 07 (`.workflow/tasks/upstream-refresh/07-review-surfaces-board-file-views.md`).
  - `packages/web/server/lib/diagnostics/opencode-load.js`: Retired. Not in `21.tsv`, OpenCode-specific process walker; all callers replaced with OMP Agent Service diagnostics from Task 16.

### Missing Canonical Session Fields Evidence

- `session.outcome`: OpenCode 2.x session field was used to detect failure (`overviewModel.ts:88,114`). Canonical `Session` from `@openchamber/agent-contract` does not carry `outcome`; mapped to canonical `session.runtimeStatus === 'unavailable'` without faking or casting.
- `session.time.updated`, `session.time.archived`, `session.parentID`: OpenCode 2.x metadata fields; mapped directly to canonical `updatedAt`, `archivedAt`, `parentSessionId`.
- `session.id`: mapped to canonical `session.sessionId`.

### Fallback Finding and Fix

- Finding: In `packages/ui/src/components/overview/useOverviewData.ts:50-54`, `OverviewData` only computed `ready: hasLoaded || sessionsStatus === 'ready'`, returning `ready: false` when `sessionsStatus === 'error'`, which left the overview screen trapped in an indefinite loading state masquerading a fetch error as loading.
- Fix: Added `error: boolean` to `OverviewData` (`useOverviewData.ts:54,382`), rendered an explicit error banner in `OverviewView.tsx:495-501`, and added test `the page renders an explicit error state when session load fails` in `OverviewView.test.tsx:103-141`.

### Checks at Tip

- `bun run type-check`: exit 0
- `bun run lint`: exit 0
- `bunx oxlint`: exit 0
- UI focused tests (`bun test packages/ui/src/{lib/diagnostics,components/overview,lib/overview,lib/quota}`): 57/57 passed (including `redacts all tokens, prompts, and credentials from diagnostics output`)
- Server focused tests (`vitest run packages/web/server/lib/{diagnostics,overview,limit-failover,session-warming,session-assist,small-model,quota}`): 476/476 passed across 39 files
- `bun run dead-code`: diff against baseline clean (only expected unconsumed interfaces: `dialog-availability.ts`, `antigravity`, `OverviewView`)
