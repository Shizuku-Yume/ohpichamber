# 19: Tunnels, relay and notifications

**Effort:** upstream-refresh
**Task type:** feature
**Base commit:** <commit-sha>

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
