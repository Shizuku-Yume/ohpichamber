# 27: Every setting, class and stat has an effect (R5)

**Effort:** ux-v270-omp-alignment
**Blocked by:** 23, 25
**Covers:** W6
**Files:** `packages/ui/src/lib/settings/registry.ts` (+ effect test); `packages/ui/src/stores/{useUIStore,useSessionDisplayStore}.ts`; settings pages owning the dead keys; `scripts/check-css-classes.mjs` (new); `packages/ui/src/styles/design-system.css`; `packages/ui/src/index.css`; `packages/ui/src/components/session/SessionActivityIndicator.tsx`; `packages/ui/src/components/chat/work-status/telemetry.ts`; `packages/ui/src/components/chat/components/LiveTurnActivity.tsx`; `packages/ui/src/components/chat/lib/turns/timelineRows.ts`; `packages/ui/src/components/sections/openchamber/TunnelSettings.tsx`
**Read first:** `research/ux-v270-systemic-review.md` R5; `packages/ui/src/lib/theme/STYLING.md`; skills `performance-engineering`, `locale-ui-patterns`
**Check:** `VITEST_MAX_WORKERS=2 bunx vitest run packages/ui/src/lib/settings packages/ui/src/components/chat/work-status && bun scripts/check-css-classes.mjs && bun run lint` → exit 0, with the settings-effect test finding zero keys without a consumer and the CSS check finding zero unresolved classes; real path: a real turn shows model time, tool time, first-token latency and tok/s; the running-session spinner rotates when enabled; transcript content does not show through the composer

- [ ] Settings registry entries declare their effect; each of the 19 dead keys is wired to a real consumer or deleted together with its row and translations.
- [ ] Add `scripts/check-css-classes.mjs` to `bun run check`: every class token in UI TSX resolves to a CSS rule, an `@utility`, or a documented marker.
- [ ] Derive telemetry from task 23's step timings; a metric with no source is not rendered.
- [ ] Render turn pages through the merged upstream renderer, so no row kind lacks a renderer and no `{part.type}` stub remains.
- [ ] Deletes: dead persisted keys, the hardcoded `null` metric blocks, the `{part.type}` stub, the "More providers coming soon" item, and class names with no rule and no marker role.
