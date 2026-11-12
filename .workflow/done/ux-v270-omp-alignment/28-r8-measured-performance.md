# 28: Measured settings, session start and catalog performance (R8)

**Effort:** ux-v270-omp-alignment
**Blocked by:** 21, 25
**Covers:** W9
**Files:** `packages/ui/src/components/sections/openchamber/OmpSettingsPage.tsx` (tab mounting only); `packages/agent-service/src/supervisor/{workers,catalog}.ts`; `packages/agent-service/src/sessions/registry.ts`; `packages/agent-service/src/worker/{catalog-models,session}.ts`; `packages/ui/src/stores/useConfigStore.ts`; `scripts/perf/`
**Read first:** `scripts/perf/DOCUMENTATION.md`; skill `performance-engineering`; spec W9
**Check:** `scripts/perf` scenarios for OMP Settings tab switch, prompt dispatch on a new versus warm session, and repeated model/provider catalog reads → before/after numbers recorded, meeting ≤ 100 ms, ≤ 150 ms over warm, and ≤ 20 ms; `bun --cwd packages/agent-service test && VITEST_MAX_WORKERS=2 bunx vitest run packages/ui/src/stores` → exit 0
**Base commit:** ab047171d642c5077422fab8b4fad6111b70bcd5

- [x] Measure the three scenarios on the merged tree before changing anything, and record the numbers.
- [x] Mount only the active Settings tab; keep a pre-warmed session worker that a new session adopts; cache model/provider catalogs in the service, invalidated by model, provider, auth and settings writes. UI readers use the warm config store instead of duplicate fetches.
- [x] Keep a change only when its measured effect justifies it; revert and record the rest.
- [x] Record before/after numbers in `development.md`. The numbers live in this file's `## Progress`; `development.md` is owned by tasks 19 and 29 in this effort, so task 29 transcribes them rather than this task editing a file another task owns.
- [x] Deletes: duplicate catalog fetches in UI readers, and any optimization that failed to move its number.

## Progress

### Scenario harness

Added `scripts/perf/omp-performance.mjs` (`bun run profile:omp`): measures the three
W9 paths against a running server — catalog read timings over HTTP, new-session
versus warm-session `POST /runs` acknowledgement, and the OMP Settings page via CDP.
It writes `omp-performance.json` so two builds compare field by field.

### Baseline (before any change), 2026-11-12

Server: `node scripts/perf/isolated-server.mjs --port 4788 --fixture-port 4787 --root tmp/perf-probe`
Command: `node scripts/perf/omp-performance.mjs --url http://127.0.0.1:4788 --dir <probe project> --model perf/stream-20000cps --reads 8 --skip-ui`

```
catalog models:    first 459.91 ms, warm median 435.34 ms, max 541.95 ms   (budget 20 ms)   FAIL
catalog providers: first 497.76 ms, warm median 474.98 ms, max 569.68 ms   (budget 20 ms)   FAIL
dispatch:          new session 140.7 ms, warm 125.63 ms, overhead 15.07 ms (budget 150 ms)  PASS
```

The UI tab-switch scenario was not run: the CDP scenario needs a built Web surface
and the run ended before it was exercised. No tab-switch number is recorded.

### Where the catalog cost is

Measured directly against a worker runtime (`openNativeRuntime` on the probe agent
directory), median of 5:

```
settings.reloadFromDisk        1.0 ms
modelRegistry.reapplyPolicies 46.7 ms
authStorage.reload             0.0 ms
modelRegistry.getAvailable     1.4 ms
readModels                    60.1 ms
readProviders                113.8 ms
```

`readModels`/`readProviders` are ~60/114 ms in-process; the HTTP round trip adds the
rest. Every read re-derives the catalog instead of answering from a cached snapshot.

### Where the new-session cost is

`POST /sessions` takes 3.6–4.5 s; the `POST /runs` that follows is 129–153 ms. Service
trace of one create:

```
admit:start 0
registerRoot:done 1
catalog.registerWorkspace:done 1
pluginRevision:done 1115          <- stateless worker round trip
openResolved:start 0
policies:loaded 2
launch:spawned 1
launch:worker:ready 2672          <- worker module load + OMP runtime open
worker:started 2674
runtime:ready 2674
openResolved:done 2678
launch:done 3794
registerCatalogWorker:done 4297
admit:done 4297
```

Worker spawn measured in isolation: bootstrap sent at 8 ms reaches ready at 1638 ms;
sent at 3004 ms reaches ready at 3731 ms (bootstrap→ready 727 ms). So ~900 ms of the
spawn is Bun module load that a pre-spawned worker would already have paid, and
`pluginRevision` costs another ~1.1 s on every create.

### After, 2026-11-12

Same harness, same isolated server, on the branch tip. Command:

```
node scripts/perf/isolated-server.mjs --port 4128 --fixture-port 4787 --root tmp/perf-probe
bun run profile:omp -- --url http://127.0.0.1:4128 --dir <probe project> --model perf/stream-300cps --reads 6
```

```
catalog models:    first 29.05 ms, warm median 12.91 ms, max 13.71 ms   (budget 20 ms)   PASS
catalog providers: first 18.20 ms, warm median 14.66 ms, max 15.36 ms   (budget 20 ms)   PASS
dispatch:          new session 120.60 ms, warm 112.87 ms, overhead 7.73 ms (budget 150 ms) PASS
settings tab switch: 51.90, 51.55, 51.72, 51.95, 51.60 ms              (budget 100 ms)  PASS
```

Before → after: models 435.34 → 12.91 ms, providers 474.98 → 14.66 ms, dispatch
overhead 15.07 → 7.73 ms (both inside its budget; the new-session path it
describes is the one that changed), tab switch unmeasured → 51.7 ms.

The tab-switch number is the navigation into Settings → OMP, measured in Chrome
over CDP against the built Web surface. The page is one route with one scroll,
so there is no second tab to switch to; the cost it measures is the page's own
mount, which is what the budget protects.

### What changed, and what each change moved

1. **Catalog cache** (`worker/catalog-models.ts`). `readModels`/`readProviders`
   answered by re-deriving the whole catalog on every read. They now keep the
   derived catalog against a key built from the four inputs a catalog depends
   on: the committed catalog revision, the native `models.yml` mtime and size,
   the credential generation, and the settings values the catalog reads
   (enabled models, disabled providers, default thinking level, default and plan
   roles, match preferences). `settings.revision` is deliberately not the key:
   `reloadFromDisk()` bumps it on every call, so it never repeats.
   Measured alone: 435/475 → 48/83 ms.

2. **Policy capture for reads** (`worker/index.ts`). The stateless worker
   published an authorization-policy snapshot before *and* after every
   operation, and each capture re-read the agent catalog and re-applied model
   policies (~65 ms each, ~130 ms per read). A read cannot change any input a
   policy is captured from, so reads now skip both captures; every mutation and
   the bootstrap still publish, so admission always sees a policy as fresh as
   the last change. Measured with the cache: 48/83 → 12/13 ms.

3. **Pre-warmed session worker** (`supervisor/workers.ts`,
   `supervisor/workspaces.ts`, `worker/index.ts`, `protocol.ts`). Workspace
   registration boots one spare worker process; the worker replies `idle` once
   its module graph is loaded; a session launch adopts that process instead of
   spawning. The spare is bounded to one, reaped after two minutes, dropped on
   exit, and replaced after it is adopted. `POST /sessions` went from 1.7–2.0 s
   to 1.0–1.2 s. `pluginRevision` is ~165 ms of what remains.

4. **UI catalog reads** (`useConfigStore.ts`, `hooks/useSettingsModels.ts`,
   `OmpSettingsPage.tsx`, `DefaultsSettings.tsx`, `GitSettings.tsx`,
   `lib/smallModelRequest.ts`). The three Settings pages each fetched the model
   catalog in parallel with their settings read, and the background small-model
   resolver fetched it again per completion. The config loader already reads
   that catalog; the store now keeps it per directory (including disabled
   models, which the role editors need) and those four callers read it. The
   duplicate requests are deleted.

Settings already mounted only the active page (`SettingsView` renders
`renderPageContent(settingsSlug)`), so no tab-mounting change was needed; the
page's cost was the two fetches above, and one of them is now gone.

Files touched beyond the task's list, all named by the change that needed them:
`packages/agent-service/src/{supervisor/workspaces.ts,protocol.ts,worker/index.ts}`
for the pre-warmed worker handshake, `packages/ui/src/hooks/useSettingsModels.ts`
as the one reader of the store's catalog, `package.json` and
`scripts/perf/DOCUMENTATION.md` to register the harness.

### Reverted

An agent-discovery cache in `NativeAgents` was measured and dropped: it moved
the agents catalog from 78 to 67 ms, a path outside all three budgets, and it
would serve stale definitions after an external file edit.

### After the integration merge

Measured again on the merged tree (integration tip merged into the branch, no
conflicts):

```
catalog models:    first 32.00 ms, warm median 12.90 ms, max 14.75 ms   (budget 20 ms)   PASS
catalog providers: first 19.34 ms, warm median 13.48 ms, max 16.94 ms   (budget 20 ms)   PASS
dispatch:          new session 148.49 ms, warm 153.49 ms, overhead -5.00 ms (budget 150 ms) PASS
settings tab switch: 51.85, 51.72, 51.79, 51.52, 51.72 ms              (budget 100 ms)  PASS
```

The dispatch pair lands within noise of each other on this run, which is what
the budget asks for: a new session no longer costs measurably more than a warm
one.

### Check

`Check before:` not run; the baseline run ended before the check.

Check after: `bun --cwd packages/agent-service test` → 485 pass, 10 skip,
0 fail across 68 files (exit 0); re-run with integration merged in → 486 pass,
10 skip, 0 fail across 68 files (exit 0). The perf scenarios in `## Progress`
all meet their budgets on the same tree.

`VITEST_MAX_WORKERS=2 bunx vitest run packages/ui/src/stores` cannot run in this
tree: every file in `packages/ui/src/stores` imports `bun:test`, and vitest
reports `Cannot find package 'bun:test'` for all 85 files (85 failed, no tests
ran). This is the substitution task 25 recorded, so the same suites were run
with the package's own runner: 1303 of 1310 test files passed, 7 failed.

The 7 failing files are `useSmallModelStore`, `useConfigStore`, `smallModel`,
`sessionTitle`, and three `generateCommitMessage` suites. Each fails
identically with this task's changes stashed (`git stash push` on the changed
UI files, same command, same failures), so they are pre-existing and not part
of this task's surface. The suites that do cover the changed code pass:
`bun test packages/ui/src/lib/smallModelRequest.test.ts
packages/ui/src/stores/configCatalogCache.test.ts` → 27 pass, 0 fail.

- **Review:** pass. Read-only self-review of the diff against `ab047171d` across the
  catalog cache and its key, the read-only policy-capture skip, the pre-warmed
  worker handshake and spare lifecycle, the store's catalog field and selector,
  and the four deduplicated readers. Findings fixed in this task: a late `idle`
  reply could return an already-adopted worker to the spare pool; the model
  catalog would have been persisted into the localStorage blob; the
  small-model resolver lost its client fallback for a cold store; the cache
  comment named an input the key does not use. No blocking finding remains.
  Trust boundaries unchanged: the worker still receives only the Host overlay
  environment, the policy snapshot still publishes on every mutation and on
  bootstrap, and the spare is spawned with the same environment and cwd rules
  as a normal launch.
