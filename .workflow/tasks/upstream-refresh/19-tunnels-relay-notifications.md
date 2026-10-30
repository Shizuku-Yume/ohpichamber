# 19: Tunnels, relay and notifications

**Effort:** upstream-refresh
**Task type:** feature
**Base commit:** 43dcd6ffc15f9340f175eed07c03a3515023a475

**Started:** 2026-10-30T02:49:36+08:00

**Status:** active

**Delivers:** Upstream's relay behavior, Tailscale/Cloudflare/ngrok tunnel options and notification routing/click handling work with the fork's runtime selection.

**Blocked by:** 10, 22
**Files:** Path list: `/home/shizuku/Project/ohpichamber-omp-artifacts/upstream-sync-2026-10-27/plan-paths/19.tsv` (52 paths: 44 clean/new, 8 both-side, 5 conflicts). Main locations: `packages/web/server/lib/{relay,notifications,tunnels,dev-tunnel,tailscale-tunnel*,cloudflare-tunnel,ngrok-tunnel,client-auth}`, `packages/ui/src/lib/{relay,notifications}`. Direct callers claimed by this task after review: `packages/web/server/index.js` (provider registration), `packages/web/server/lib/host/{settings-helpers.js,settings-registry.json,bootstrap-runtime.js,session-runtime.js}` (tunnel HTTPS port persistence; removal of the attention state the notification-route cutover orphaned), `packages/web/bin/lib/cli-tunnel-capabilities.js`, `packages/web/src/api/clientAuth.ts`, `packages/ui/src/lib/api/types.ts`, `packages/ui/src/App.tsx`, `packages/ui/src/components/sections/remote-instances/{RemoteInstancesPage.tsx,RelayConflictNotice.tsx}`, `packages/ui/src/hooks/useRelayLimitToast.ts`.

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

### Real path (local relay fixture, running app)

Evidence root as above; headless Chrome only, `emulate --viewport 1280x800` for the final shot.

- Local relay fixture (`/tmp/19-fixture-relay.mjs`, kept with the evidence): a
  WebSocket room broker implementing the production data path (host-control
  `sync`/`connected`/`disconnected`, one host-data socket per
  connectionId, opaque text/binary forwarding). It deliberately ignores relay
  auth, like the existing flow-control fixture.
- Running app (`bun run dev`, data dir in the evidence root, HOME isolated,
  `OPENCHAMBER_RELAY_URL=ws://127.0.0.1:3799/ws`): `POST /api/openchamber/relay/enable`
  returned `state: connecting`, then `state: connected`; the fixture logged the
  real host-control connection with the app's serverId.
- Real client: the app's `createRelayTunnelClient` (UI transport) created a
  relay-only pairing session, redeemed it (`clientToken` 53 chars), completed the
  E2EE handshake through the fixture, got HTTP 200 for `GET /health` and HTTP 200
  for an authenticated `GET /api/client-auth/connection/candidates`; host status
  showed `connectedClients: 1` and the candidate set `["relay"]`
  (`logs/real-path-client.log`, `evidence/dev-log-with-relay-backoff.log`).
- Dead relay host: stopping the fixture produced exponential reconnect attempts
  (1s/2s/4s/8s/16s; 6 attempts in 25s, `state: reconnecting`, `lastError:
  ECONNREFUSED`) and no tight loop; restarting the fixture reconnected the host
  (`evidence/dead-relay-backoff.txt`).
- Tunnel settings in the running app: provider list includes `tailscale`; with it
  selected the panel shows the explicit `tailscale was not found.` state and its
  install command, and Start tunnel surfaces the explicit UI-password error
  (`screenshots/01`, `02`, and the 1280x800 `03`).
- Notification click: in the running app a dispatched
  `openchamber:open-session` event carrying another runtime's `runtimeKey` calls
  `desktop_open_host_session({runtimeKey, sessionId})` and leaves this window
  where it is; the same event without a foreign `runtimeKey` opens the session
  in this window (`evidence/notification-click-owning-runtime.txt`). Electron's
  `notification-host-routing.test.mjs` passes 13/13.
- External tunnels (Tailscale/Cloudflare/ngrok against real services) are NOT
  exercised: no external accounts and no installed `tailscale`/`cloudflared`.
  The server-side provider registration, availability reporting and explicit
  failure paths are covered by the provider/tunnel tests above.

### Rebase onto the plan landing

The workflow plan docs landed on integration as `811ecef471` (docs only, after
`f152005352`). This branch was rebased onto it before the final gate; the only
conflict-free replay touched the task file, and the source tree is identical to
the reviewed pin `dcd1e629fb` (`git diff` between the two source trees is empty;
the reviewed base stays `43dcd6ffc1`). Post-rebase the real path was exercised
again on the final branch: relay host connected to the local fixture, a real
pairing/redeem + E2EE tunneled `/health` and authenticated candidates returned
200, the owning-runtime click routed to `desktop_open_host_session`, and the
tunnel panel showed `tailscale was not found.` at the required 1280x800 viewport
(`logs/real-path-client-final.log`, `evidence/final-branch-smoke.txt`,
`screenshots/04-tunnel-tailscale-final-1280x800.png`).

Final receipts on the rebased branch (HEAD `f989f3c0af`, source tree identical
to reviewed `dcd1e629fb`): `logs/real-path-client-final.log` (real pairing +
E2EE + authenticated tunneled requests), `evidence/final-branch-smoke.txt`
(owning-runtime click routed `desktop_open_host_session` and left the window in
place; tunnel panel explicit `tailscale was not found.`),
`screenshots/04-tunnel-tailscale-final-1280x800.png`, and the fixture/client
scripts copied into `evidence/` for reproduction.


### Review fixes (B quality + security)

Adoption gap: the upstream task's path list contained the new providers and
relay/notification modules but not their direct consumers, so adoption alone
left the Tailscale CLI fallback, the persisted `tunnelHttpsPort`, the relay
conflict notice/reset and the relay-limit retry toast unwired, and it restored
upstream's directory-form space dev-tunnel dial that the fork's excluded spaces
router cannot serve. Fixed in this batch rather than deferring to tasks 11, 22
or 24:

- Space dev tunnels dial the fork's `/api/spaces/<id>/dev-tunnel` again; the
  directory form needs the excluded upstream spaces rewrite (recorded limit).
- `tunnelHttpsPort` is a persisted instance setting: UI registry entry
  (integer 1–65535, same `serve`/`funnel` tunnel-mode values as the server),
  sanitizer branch in `host/settings-helpers.js`, regenerated
  `host/settings-registry.json`, round-trip test.
- CLI fallback capabilities include `tailscaleTunnelProviderCapabilities`, so
  `tunnel start --provider tailscale` takes the provider's default `serve`.
- Relay consumers: `ClientAuthAPI.getRelayHostStatus()/resetRelayIdentity()`
  in the web client, `RelayConflictNotice` mounted in Remote Instances, and
  `useRelayLimitToast` (with `retry()`) mounted in `App.tsx`.
- Notification `run.failed` text uses the canonical `event.error` (redacted,
  bounded) instead of an always-empty string, covered by the trigger test.
- Removed the attention map/deps the removed notification routes orphaned;
  `markUserMessageSent` stays as the prompt-delivery guard.
- Security: retire reasons never reach `socket.close()` (a >123-byte reason
  used to throw after the map entry was dropped and leak the socket), peer
  close reasons are one sanitized line in logs/status, relay lifecycle
  mutations are serialized (reset no longer races reconcile/start), and the
  identity cache retries when a reset changes the key-store generation
  mid-build. Bugs fixed, not failures suppressed.
- Docs corrected: relay Settings statements now match the added consumers;
  tunnel HTTPS/approval text describes the API/CLI surface, not a Settings
  control this task does not add; notification docs use the real permission
  prefixes, the real `fanoutPush` badge path, the message-cap order and the
  existing notification store path.

Final UI/relay delta after the core batch (same review round):

- `TunnelSettings.tsx` now offers `serve`/`funnel` (TunnelMode union,
  TUNNEL_MODE_OPTIONS, toUiTunnelMode, capability filter), an HTTPS port select
  driven by the selected mode's `httpsPorts` that persists `tunnelHttpsPort`
  through the settings registry and sends `httpsPort` on start, an
  `approval_required` action that opens only the server-provided `approvalUrl`
  through the existing `openExternalUrl` helper, a Tailscale provider label,
  and session labels for serve/funnel instead of mislabelling them Managed
  Local. Locale keys reused, none added.
- Mobile relay limit: `mobileConnections.ts` classifies `relay-limit` from
  `isRelayLimitReached` in relay probes/session validation/re-probe,
  `MobileConnectionWelcome` renders the existing `mobile.connect.notice.relayLimit`
  message, and `MobileApp` shows the notice on cold launch/resume/retry and
  re-probes on an active-tunnel limit event; the phone keeps its own resume
  path (no browser claim).
- Claim watch runs inside the lifecycle queue and re-reads enabled/enterprise
  (takeover no longer starts a host after a concurrent disable); deterministic
  standby-disable regression added.
- Peer close reasons use a code-point sanitizer (no control-character regex) in
  both host-client and the UI protocol mirror; lint passes.
- Tunnel docs now state the actual Settings select/approval action and that the
  CLI only sends `--https-port` / prints the link; no CLI claim beyond that.

Exact focused evidence (durable logs under the evidence root):
- `logs/focused-web-final-ui.log`: vitest relay/service, notifications,
  host/session-runtime, host/settings-helpers, tunnels, dev-tunnel — 22 files,
  179 tests pass.
- `logs/focused-notifications-after-fixes.log`: notifications suite 12 files,
  64 tests pass.
- `logs/focused-relay-bun-final-ui.log`: host-client + identity 17/17 pass
  (retire leak, sanitized log/status, serialization, identity rebuild).
- `logs/focused-ui-final-ui.log`: UI relay 10+10+2+30+13 and
  mobileConnections 20/20 pass; every file exits 0.
- `logs/type-check-final.log` exit 0 (3,004 files); `logs/lint-final.log`
  exit 0; `logs/cli-tunnel-providers-final.json` lists
  cloudflare:quick|managed-remote|managed-local, ngrok:quick,
  tailscale:serve|funnel; `tunnel --help` documents `--https-port`.
- Earlier `logs/focused-after-fixes.log` recorded a failing trigger fixture
  before the redaction fix; it is SUPERSEDED by
  `focused-notifications-after-fixes.log` and must not be cited as passing.
- `lint:anti-slop` and `dead-code` fail on the pre-existing repo baseline
  (5,803 anti-slop findings in untouched files; dead-code unused
  source-control types/config hints); none of the new exports are listed.
- Remaining: full `bun run test` after the combined integration followups land
  and the rebase is redone, plus the running-app UI smoke (tailscale
  serve/funnel selection, HTTPS persistence, approval action, desktop and
  mobile relay notice/retry) when the heavy slot returns. External tunnel
  services remain unavailable and are recorded as not exercised.

