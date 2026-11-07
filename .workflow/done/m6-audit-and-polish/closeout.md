# Closeout: m6-audit-and-polish

**Accepted:** 2026-11-07 by final gate review

## Shipped

M6 integrated the OpenChamber workbench session pins, unread watermarks, turn-duration persistence, Behavior and restored settings surfaces, native OMP recaps, Agent Hub persistence/tree-cost/transcripts, Marketplace lifecycle, stats.db usage, OMP settings route, and settings/chat token, primitive, i18n, and RTL compliance work.

Task 10 repaired the final integration defects: Host now proxies typed recaps and Agent Hub session routes; session duration badges read persisted `openchamber.turn`; the default session mode is registered for persistence; stale overview fixtures now exercise Host-owned unread watermarks; and the remaining invalid typography token/dead alias were removed.

## Gate evidence

- Base commit: `876a08f538d3b791d762a1295ee8ba6c9002d573`
- Integration tip before Task 10: `d63088e1aff2f1fd952033e5bb9bd38f8286e541`
- Artifact root: `/home/shizuku/Project/ohpichamber-omp-artifacts/m6-gate-2026-11-07/`
- Runtime: UI `5230`, API `3960`, isolated data under `data/`, Chrome context `m6-final-gate`, viewport `1440x900`.
- Live API: readiness 200; OMP settings GET 200 and PATCH 200 persisted all 16 role keys; recaps, subagents, tree-cost returned 200; unknown transcript returned the expected 404; metadata PATCH persisted pin, unread watermark, outcome, endedAt, and `durationMs: 1234` in `host-metadata.sqlite`; `/api/openchamber/events` connected with 200 `text/event-stream`.
- Browser receipts: dark/light screenshots for Chat, OMP, Behavior, Providers, Web Search, Routing, General, Sessions, Plugins, MCP, Commands, Skills installed/catalog, and Usage are under `screenshots/`.
- Browser network/console: no observed HTTP 404/500 responses or uncaught console errors after the stabilized walkthrough.
- Static and focused checks: frozen install, package builds, forbidden-class sweep, workspace type-check, lint, docs validation, focused route tests (28 tests), focused overview/settings regression packet (32 tests, 821 expects), and dead-code parity against the base inventory (final 18 files, 65 exports, 69 types, 3 configuration hints versus base 18 files, 66 exports, 69 types, 3 hints; zero net-new findings). The full suite passed 7/7: scripts 23/23, SDK 26/26, UI 1028/1028, agent-contract 197, agent-service 418 pass / 10 skipped, Electron 55/55, Web 7539 pass / 142 skipped.

## Remaining debt & follow-ups

Agent Hub and Marketplace had no persisted subagent or remote marketplace fixture in the isolated data directory, so live proof covered their empty/available route states rather than a real revive or remote install. No provider secrets are included in receipts.
