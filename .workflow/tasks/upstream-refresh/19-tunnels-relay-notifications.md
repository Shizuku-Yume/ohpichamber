# 19: Tunnels, relay and notifications

**Effort:** upstream-refresh
**Task type:** feature
**Base commit:** 43dcd6ffc15f9340f175eed07c03a3515023a475

**Started:** 2026-10-30T02:49:36+08:00

**Status:** active

**Delivers:** Upstream's relay behavior, Tailscale/Cloudflare/ngrok tunnel options and notification routing/click handling work with the fork's runtime selection.

**Blocked by:** 10, 22
**Files:** Path list: `/home/shizuku/Project/ohpichamber-omp-artifacts/upstream-sync-2026-10-27/plan-paths/19.tsv` (52 paths: 44 clean/new, 8 both-side, 5 conflicts). Main locations: `packages/web/server/lib/{relay,notifications,tunnels,dev-tunnel,tailscale-tunnel*,cloudflare-tunnel,ngrok-tunnel,client-auth}`, `packages/ui/src/lib/{relay,notifications}`.

**Read first:** Spec W6; `.agents/skills/relay-transport/SKILL.md`; `.agents/skills/enterprise-boundary/SKILL.md`; `.agents/skills/sync-state-invariants/SKILL.md`; `packages/web/server/lib/relay/DOCUMENTATION.md`.
**Covers:** W6

**Check:** `bun install --frozen-lockfile` and `bun run type-check` and `bun run lint` and `bun run test` all exit 0, the relay and notification tests pass, and in the running app a notification click selects the owning runtime, a dead relay host does not reconnect-loop, and the tunnel settings show an explicit state. Real path: Tailscale/Cloudflare need external accounts; use the local relay fixture and name the tunnel limit.

## Done when

- [ ] Relay identity, hold-off and reconnect behavior match upstream; no second relay loop is added.
- [ ] Notification payloads are bounded and redacted; no tokens in the body.
- [ ] Tunnel state is visible and failures are explicit, not silent success.
- [ ] External tunnel verification is recorded as not exercised when unavailable.

## Progress

### Start

Worktree `upstream-refresh-19`, branch `upstream-refresh/19-tunnels-relay-notifications`, cut
from the integration tip `43dcd6ffc1` (task 16 landed). `Dirty at start: none`.

### Plan (initial)

52 upstream paths under `packages/ui/src/lib/relay/` and
`packages/web/server/lib/{relay,notifications,tunnels,dev-tunnel,tailscale-tunnel.js}`.
Mechanism: adopt `clean_live`/`new_adoptable` whole; three-way merge the `both_live`
files toward the fork's Host boundary and canonical session model; record kept,
deleted or excluded paths with reasons.

### Adoption result

- Adopted whole (clean/new, no fork drift): relay runtime/UI transport, tunnels + the
  `tailscale` provider, notifications clean files + `template-locales`, APNs, message,
  dev-tunnel client/test, relay tunnel compression test. New files:
  `tailscale-tunnel.js`, `tunnels/providers/tailscale.js`, `template-locales.js`,
  `relay/tunnel-compression.test.js` and their tests.
- Merged/ported by hand: `notifications/runtime.js` (upstream features onto the fork's
  canonical 173-line runtime: localized template defaults, `withTemplateDefaults`, sealed
  phone body, permission prefix by action type, goal phone body; titles stay generic for
  relay/enterprise), `notifications/push-runtime.js` (lock fix), `template-runtime.test.js`,
  `relay/DOCUMENTATION.md` (upstream text describes the adopted code),
  `notifications/DOCUMENTATION.md` (canonical runtime API, sealed phone text, removed
  OpenCode-only trigger prose), `dev-tunnel/DOCUMENTATION.md`.
- Wiring outside the path list: `packages/web/server/index.js` imports and registers
  `createTailscaleTunnelProvider()`; two UI test doubles gained the new
  `RelayTunnelClient.retry()` method (`mobileConnections.test.ts`, `openchamberEvents.test.ts`);
  the notification route test's relay key store fake gained `generation()`.
  Existing wiring already matched: notification routes (bootstrap-runtime), relay service
  (host lock, demand), dev-tunnel runtime, notification click host routing
  (`packages/electron/notification-host-routing.mjs` already matches upstream), relay
  protocol mirrored in TS/JS.

### Checks

Evidence root: `/home/shizuku/Project/ohpichamber-omp-artifacts/upstream-refresh-19-2026-10-30/`.

- `bun install --frozen-lockfile`: exit 0 (1422 packages).
- Focused vitest `server/lib/{notifications,relay,tunnels,dev-tunnel}`: 31 files, 190 tests
  pass (includes new `tunnel-compression`, `template-locales`, tailscale provider tests).
- UI relay bun tests run one file at a time (order-sensitive per relay skill): crypto,
  handshake, runtime-tunnel, tunnel-client, tunnel-codec — all 0 fail.
- `bun run type-check`: exit 0 after the two test-double updates. First attempt failed
  exactly on those two files (`retry` missing); log kept as
  `type-check-first-attempt.log`.
- `bun run lint`: exit 0; three pre-existing `react-hooks(exhaustive-deps)` warnings in
  untouched files.
- Full `bun run test`: 6/7 workspace suites pass; web suite 1 failing test,
  `server/lib/host/canonical-plugins.test.js > re-registering a workspace profile ...`,
  under parallel load (7401 passed, 1 failed, 142 skipped). Running that file alone passed
  5/5. Recorded as a load-sensitive observation, not proof of unrelatedness; final acceptance
  rerun happens on an idle machine after the real path.
