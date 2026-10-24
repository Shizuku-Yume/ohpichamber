# 23: Version the Guest SDK bootstrap transport change

**Effort:** post-m3-hardening
**Task type:** feature
**Base commit:** 039f542c3d3f1ae01866cbbf4b0c2157d71916e9
**Started:** 2026-10-24T03:53:49Z
**Status:** active

**Blocked by:** None
**Files:** `packages/sdk/src/host.ts` (321-327, 538-555); `packages/sdk/src/api-version.ts` (3-5); `packages/sdk/package.json`; `packages/ui/src/components/layout/PluginPane.tsx` (913-965); `packages/docs/content/docs/sdk/example.mdx` and its translations

**Read first:** `.workflow/specs/post-m3-hardening.md`; `/home/shizuku/Project/ohpichamber-omp-artifacts/post-m3-review-2026-10-23/``SurfacesReview.md` findings 1 and 8; `.workflow/decisions.md` "2026-10-11 - Guest bridge uses a private early bootstrap"; `packages/sdk/DOCUMENTATION.md`
**Covers:** H13

**Check:** A test drives the host with an old-protocol guest (`hello` window message) and observes the decided outcome (compatible bootstrap, or an explicit version-mismatch error instead of a silent timeout); SDK examples build against the stated version.

## Done when

- [x] Asks spec open question 1 when starting. Maintainer chose an explicit breaking version bump: no compatibility shim.
- [x] API/wire version and package version reflect the decision. Wire and bootstrap handshake are `v: 2`; `@openchamber/sdk` and the release-coupled root/ui/web/electron packages are `3.0.0`; manifest `apiVersion` stays `1` because the manifest schema is independent and unchanged.
- [x] Every locale's SDK example names the supported version. All 12 `sdk/example.mdx` dependencies are `^3.0.0`; all 12 `sdk.mdx` engine floors are `>=3.0.0`, enforced by the new SDK version-sync test.
## Progress

Dirty at start: none. Task23 uses branch `post-m3-hardening/23-guest-sdk-transport-version` in separate worktree `/home/shizuku/Project/ohpichamber-worktrees/post-m3-hardening-lane-g-23`, based at main `039f542c3d3f1ae01866cbbf4b0c2157d71916e9`. The maintainer settled open question 1: explicitly bump to a breaking version, with no compatibility path or shim. Implement this decision and name the supported version in host behavior and all localized SDK examples.

Check before: The new host test failed (`container.textContent` was empty after an old `v1` window `hello`), the legacy detector test could not resolve its module, and the docs/version test failed because every example still declared `@openchamber/sdk ^1.24.0` while the package was `2.2.0`.

Old protocol evidence: at pre-M3 `1f9320062c9a3c70925cf3243f1ee0c6e5f16765`, `host.ts:321-323` posted through `parent.postMessage`, `:533-538` posted `{channel:'openchamber.sdk', v:1, type:'hello'}` synchronously from `connectHost`, and calls only happen when panel code invokes them (`:542-556`, 20s timeout). The old host's `hello` branch pushed `ready`/host state (old `PluginPane.tsx:557-565`); panels that wait for `onConnection` therefore make no call after `hello`. An error that waits for a legacy call is not observable for those guests.

Check after:
- `bun run --cwd packages/sdk test` -> 23/23 test files passed (includes the docs/version sync and committed-bundle freshness tests).
- UI focused: `bun test` on legacy detector, real `PluginPane` old-hello test, plugin-panel i18n, host-bridge, sdk-examples, WorkStatus -> 46 pass; `GuestHosts.test.tsx` -> 3 pass. The real-pane test drives an old `v1` `hello` from the current iframe and observes zero host-to-guest `postMessage`, the explicit `@openchamber/sdk 3.0.0` pane message, and no iframe. No port, ready push, or host state is granted.
- `bun run --cwd packages/sdk build`, `type-check`, `lint` pass. `bun run --cwd packages/ui type-check` passes; changed UI files pass eslint. `bun run docs:validate` -> 672 pages, 56 sidebar links.
- `bun run dead-code` reports only the pre-existing exported `LegacyDataNotice` helpers/types from landed Task20; this task adds no unused export. Full UI lint has the same pre-existing `LegacyDataNotice` errors; changed files are clean.
- All 15 committed SDK example entries were rebuilt/verified with the v2 SDK; 12 bundle files changed (the other 3 do not import the SDK). The SDK bundle-freshness test passes.
- `bun run --cwd packages/web type-check` passes. `git diff --check` is clean.
- Release-set scope: `scripts/bump-version.mjs` lists root/ui/web/sdk/electron, which are all `3.0.0`; `packages/mobile` (1.13.2) and the internal agent packages (1.0.0) are not in that release set and are intentionally unchanged.

Real-path note: the old-hello regression drives the actual `PluginPane` window listener and React render. No packaged app/device run is claimed for this transport-only cutover.

Review boundary: `039f542c3` + `packages/sdk`, `packages/ui` guest host/i18n, `packages/docs/content/docs` SDK pages, release `package.json`/`bun.lock`, `.workflow` spec/decision; round: 1; briefs: A,B,sec; boundaries: current-iframe window message -> host pane state, SDK wire/bootstrap version -> package/docs version surface; findings: 1 blocking / 0 nonblocking. The workflow-reviewer/security-reviewer agents were replaced by an inline review because the maintainer directed no additional worker delegation; both briefs and the handshake security pass were run against the commands and paths above, followed by a delta review.

Blocking finding and resolution (Brief A): `packages/sdk/GUEST_SERVICES.md:3` still said the wire envelope "stays `1`" after the contract moved to `2`. Fixed to name the v2 wire/bootstrap handshake, and the user-facing `invalid-engines` parse message now uses the current `3.0.0` example. The task was reopened and moved back to `tasks/`; independent A/B/security recheck is still owed before archiving. No waivers needed.
