# 28: Measured settings, session start and catalog performance (R8)

**Effort:** ux-v270-omp-alignment
**Blocked by:** 21, 25
**Covers:** W9
**Files:** `packages/ui/src/components/sections/openchamber/OmpSettingsPage.tsx` (tab mounting only); `packages/agent-service/src/supervisor/{workers,catalog}.ts`; `packages/agent-service/src/sessions/registry.ts`; `packages/agent-service/src/worker/{catalog-models,session}.ts`; `packages/ui/src/stores/useConfigStore.ts`; `scripts/perf/`
**Read first:** `scripts/perf/DOCUMENTATION.md`; skill `performance-engineering`; spec W9
**Check:** `scripts/perf` scenarios for OMP Settings tab switch, prompt dispatch on a new versus warm session, and repeated model/provider catalog reads → before/after numbers recorded, meeting ≤ 100 ms, ≤ 150 ms over warm, and ≤ 20 ms; `bun --cwd packages/agent-service test && VITEST_MAX_WORKERS=2 bunx vitest run packages/ui/src/stores` → exit 0
**Base commit:** ab047171d642c5077422fab8b4fad6111b70bcd5
**Status:** active

- [ ] Measure the three scenarios on the merged tree before changing anything, and record the numbers.
- [ ] Mount only the active Settings tab; keep a pre-warmed session worker that a new session adopts; cache model/provider catalogs in the service, invalidated by model, provider, auth and settings writes. UI readers use the warm config store instead of duplicate fetches.
- [ ] Keep a change only when its measured effect justifies it; revert and record the rest.
- [ ] Record before/after numbers in `development.md`.
- [ ] Deletes: duplicate catalog fetches in UI readers, and any optimization that failed to move its number.

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

### Not done

The three optimizations (active-tab-only Settings mounting, pre-warmed session worker
adoption, service-side catalog caching) are not implemented. Baseline numbers and the
harness are recorded; the change work and its after-numbers remain.
