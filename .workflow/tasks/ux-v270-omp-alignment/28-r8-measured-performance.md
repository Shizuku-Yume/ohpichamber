# 28: Measured settings, session start and catalog performance (R8)

**Effort:** ux-v270-omp-alignment
**Blocked by:** 21, 25
**Covers:** W9
**Files:** `packages/ui/src/components/sections/openchamber/OmpSettingsPage.tsx` (tab mounting only); `packages/agent-service/src/supervisor/{workers,catalog}.ts`; `packages/agent-service/src/sessions/registry.ts`; `packages/agent-service/src/worker/{catalog-models,session}.ts`; `packages/ui/src/stores/useConfigStore.ts`; `scripts/perf/`
**Read first:** `scripts/perf/DOCUMENTATION.md`; skill `performance-engineering`; spec W9
**Check:** `scripts/perf` scenarios for OMP Settings tab switch, prompt dispatch on a new versus warm session, and repeated model/provider catalog reads → before/after numbers recorded, meeting ≤ 100 ms, ≤ 150 ms over warm, and ≤ 20 ms; `bun --cwd packages/agent-service test && VITEST_MAX_WORKERS=2 bunx vitest run packages/ui/src/stores` → exit 0

- [ ] Measure the three scenarios on the merged tree before changing anything, and record the numbers.
- [ ] Mount only the active Settings tab; keep a pre-warmed session worker that a new session adopts; cache model/provider catalogs in the service, invalidated by model, provider, auth and settings writes. UI readers use the warm config store instead of duplicate fetches.
- [ ] Keep a change only when its measured effect justifies it; revert and record the rest.
- [ ] Record before/after numbers in `development.md`.
- [ ] Deletes: duplicate catalog fetches in UI readers, and any optimization that failed to move its number.
