# Closeout: m6-audit-and-polish

**Accepted:** 2026-11-07 by final gate review

## Shipped

M6 integrated the OpenChamber workbench session pins, unread watermarks, turn-duration persistence, Behavior and restored settings surfaces, native OMP recaps, Agent Hub persistence/tree-cost/transcripts, Marketplace lifecycle, stats.db usage, OMP settings route, and settings/chat token, primitive, i18n, and RTL compliance work.

Task 10 repaired the final integration defects: Host now proxies typed recaps and Agent Hub session routes; session duration badges read persisted `openchamber.turn`; the default session mode is registered for persistence; stale overview fixtures now exercise Host-owned unread watermarks; the last invalid typography token and four unused type exports plus the dead `SessionSidebarItem` alias were removed.

## Gate evidence

- Base commit: `876a08f538d3b791d762a1295ee8ba6c9002d573`
- Integration tip before Task 10: `d63088e1aff2f1fd952033e5bb9bd38f8286e541`
- Artifact root: `/home/shizuku/Project/ohpichamber-omp-artifacts/m6-gate-2026-11-07/` (logs in `receipts/`, screenshots in `screenshots/`).
- Runtime: dev HMR stack (`node scripts/dev-web-hmr.mjs`), UI `5230`, API `3960`, isolated data under `data/`, Chrome context `m6-final-gate`, viewport `1440x900`.
- Static gates (all exit 0): frozen install (`1448 installs across 1597 packages, no changes`), agent-contract/agent-service/sdk builds, forbidden-class sweep, `type-check` (3,253 files, 5 projects), `lint` (all workspaces, five pre-existing UI hook warnings), `docs:validate` (672 pages, 56 sidebar links).
- Automated suite: `VITEST_MAX_WORKERS=2 bun run test` exit 0, 7/7 — scripts 23/23, SDK 26/26, UI 1028/1028, agent-contract 197 pass / 0 fail (1,365 expects), agent-service 418 pass / 10 skipped / 0 fail (428 tests, 2,810 expects), Electron 55/55, Web 469 pass / 9 skipped files (7,539 pass / 142 skipped tests).
- Dead code: `bun run dead-code` exits 1 on an inherited-only inventory (18 files / 65 exports / 69 types / 3 configuration hints versus pre-gate base 19 / 66 / 73 / 3); zero net-new findings.
- Live API on a Host-created session `7ca454f5-b79c-4036-8112-d0fbff466c04`: `ready` 200; OMP settings `GET` 200 (revision 1) listing all 16 roles, `PATCH` 200 at revisions 2 and 3 with the changed `modelRoles.tiny` value surviving a re-`GET` and landing in `~/.omp/agent/config.yml`; `recaps`, `subagents`, `subagents/tree-cost` 200; unknown transcript 404 `SESSION_NOT_FOUND`; metadata `PATCH` 200 persisting pin, unread watermark, turn outcome and `durationMs: 4321`, read back from the `session_metadata` row in `host-metadata.sqlite`; `/api/openchamber/events` streamed the matching `openchamber:session-metadata` event; `usage?timezone=UTC` 200 with the zeroed projection.
- Browser receipts: 33 distinct `screenshots/*-2026-11-07.png` covering dark and light Chat/Composer (with Model Selector, Effort and Session-mode menus open), OMP, Behavior, Providers, Web Search, Routing, General, Sessions, Plugins plus the `Add plugin` Marketplace tab, MCP, Commands, Skills installed/catalog, and Usage. The dark OMP capture's DOM exposes all 16 `Model for …` combos; the light capture shows the first seven rows of the unscrolled viewport.
- Browser network/console: a fresh `?settings=omp` load reported 0 console messages and no 4xx/5xx among its 300+ requests.

## Remaining debt & follow-ups

- No real provider turn was sent during this gate, so recaps stayed empty, a real subagent revive/transcript was not exercised, and usage stats were the zeroed projection (no `stats.db` was written).
- The only marketplace source available was the local `local-proof` fixture, so remote install/update checks were not exercised.
- The long-lived walkthrough page logged two `@pierre/diffs` `WorkerPoolManager: worker initialization timed out after 10000ms` errors with their two uncaught promise rejections; a fresh page load was clean, so this is recorded as an observed dev-stack limitation, not a verified regression.
- Gate ran on the dev HMR stack rather than a packaged build.
- The 28 pre-existing `screenshots/*.png` files left by the earlier dev stack are kept under `screenshots/superseded-1219/` and are not counted as per-page evidence.
- No provider secrets are included in receipts.
