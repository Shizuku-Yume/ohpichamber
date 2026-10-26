# 03: Mobile, extensions and scripts

**Effort:** upstream-refresh
**Task type:** feature
**Base commit:** 4d69e299e46344ccc2d29df6b2cb7e4b2a9c8e2c
**Started:** 2026-10-27T13:10:00+08:00

**Delivers:** Mobile, built-in extensions and repository scripts match upstream 0056bf6a9: Android/iOS shell updates and assets, the extension registry/build, and the perf/brand/check scripts.

**Blocked by:** 02
**Files:** Path list: `/home/shizuku/Project/ohpichamber-omp-artifacts/upstream-sync-2026-10-27/plan-paths/03.tsv` (91 paths: 85 clean/new, 4 both-side, 1 conflict). Main locations: `packages/mobile/{android,ios,assets}`, `packages/extensions/`, `scripts/{perf,brand,check-changed,docs}`.

**Read first:** Spec W4; `.agents/skills/openchamber-change-discipline/SKILL.md`; `.agents/skills/locale-ui-patterns/SKILL.md`; `.agents/skills/clack-cli-patterns/SKILL.md`; `packages/mobile/README.md`; `scripts/perf/DOCUMENTATION.md`.
**Covers:** W4

**Check:** `bun install --frozen-lockfile` and `bun run type-check` and `bun run lint` and `bun run test` all exit 0, `bun run extensions:build` exits 0, `bun run --cwd packages/mobile build` exits 0, and the script tests under `scripts/` pass. Real path: launch the mobile web surface against the dev server; a physical-device build is not available in this task, so the simulator/device limit is recorded.

## Done when

- [x] Android and iOS shell sources, assets and build config are at the upstream revision and still build.
- [x] Built-in extensions build and load; no extension names an OpenCode engine (the registry is empty in the fork and in upstream, so the build stages none).
- [x] Scripts keep the fork's exit codes and `--json`/`--quiet` behavior where they had it.
- [x] Physical-device and store results are named as not exercised.

## Progress

Check before: not run for this branch (the branch is new from the integration tip; task 02's tip carried the green receipt). Dirty at start: none.

**Adopted whole (85 of 91 paths).** Mobile Android/iOS shell sources, launcher and notification assets, `capacitor.config.json`, `scripts/install.sh`, `scripts/check-changed.mjs` (keeps `oxlint.anti-slop.config.ts`), `scripts/generate-icon-sprite.mjs`, `scripts/legend-list-dom-order.test.mjs`, and the perf harness (`accessibility.mjs`, `frame-count.mjs`, `controls/pulse-dot.js`, and the updated `cdp`/`fixture-provider`/`compare-runs`/`toggle-analysis`/`profile-*` scripts). `scripts/anti-slop.mjs` was already identical to upstream after task 02.

**Both-side (4).** `packages/extensions/DOCUMENTATION.md` merged cleanly: upstream's built-in service-role paragraph added, fork trust wording kept. `packages/mobile/HANDOFF.md` and `packages/mobile/README.md` merged cleanly; their two brand-generator claims were corrected because the generator is not adopted (below). `scripts/perf/DOCUMENTATION.md` is upstream's text minus the paragraph on the deleted `packages/web/server/lib/opencode/env-runtime.js` and the two regression sections for the tests not adopted (below); the fork's previous file was an abridgement of the same upstream document, not fork-owned prose.

**Deletions (2).** `packages/mobile/capacitor.config.ts` replaced by `capacitor.config.json` (Capacitor reads a TS config through the TypeScript JS API, which TypeScript 7 no longer ships; values unchanged, `android.allowMixedContent` added upstream); `packages/mobile/tsconfig.json` (the package has no TypeScript sources, and upstream removed the `type-check` script with it).

**Not adopted (7 paths, recorded reason).**

- `scripts/brand/{generate.mjs,generate.test.mjs,raster.mjs,DOCUMENTATION.md}`: the generator writes paths this fork deleted (`packages/vscode/assets`, `packages/web/server/lib/opencode/static-routes-runtime.js`) and files owned by other lanes (`packages/web/index.html`, `packages/electron/early-startup.mjs`, `packages/ui/src/components/ui/openChamberLogoArt.ts`, docs badges), so it neither runs nor passes its test here. `scripts/brand/geometry.mjs` is kept because the adopted `scripts/generate-icon-sprite.mjs` imports `glyphInner` from it.
- `scripts/perf/chat-quote-popover.browser.test.mjs` and `scripts/perf/json-tree-view.browser.test.mjs`: they drive upstream's `ChatQuoteMarkPopover` and `JsonTreeView` DOM through a Vite fixture. The fork's UI is pre-refresh (tasks 10/12/13/25), and both failed here (`getBoundingClientRect` on a missing scroller; `maxHeight` caps not applied). Adapting the selectors only moved the failure into component behaviour, so they are deferred to the UI refresh instead of being silenced.

**Checks (evidence in `/home/shizuku/Project/ohpichamber-omp-artifacts/upstream-refresh-03-2026-10-27/`):**

- `bun install --frozen-lockfile` -> 0 (`install.log`, 112 packages, Electron 44.9.3 repaired).
- `bun run type-check` -> 0 (`type-check.log`).
- `bun run lint` -> 0 (`lint.log`, 7 workspaces).
- `bun run test` -> 1 on the first run: `scripts` failed on the three files above (`test.log`), then `node scripts/run-isolated-tests.mjs scripts` -> 0, 23/23 files (`scripts-suite.log`). The landing receipt is the rerun after the exclusions.
- `bun run extensions:build` -> 0, `Built 0 built-in extension(s)` (`extensions-build.log`); the registry is empty in both the fork and upstream.
- `bun run --cwd packages/mobile build` -> 0, web build plus `packages/mobile/dist` prepared (`mobile-build.log`).
- `bunx oxlint` on the new JS (`brand/geometry.mjs`, `perf/accessibility.mjs`, `perf/frame-count.mjs`, `perf/controls/pulse-dot.js`, `generate-icon-sprite.mjs`) -> 0.
- `bun run dead-code` -> 0; only pre-existing configuration hints (`dead-code.log`).
- Real path (`/tmp/ohpi-03`, UI 5391, API 3991): `GET /mobile.html` 200, the page mounted `MobileApp` with the sessions drawer and composer placeholder (`mobile-surface.png`), `GET /api/agent/v1/ready` 200 `{"ready":true,"engine":"omp"}`. Servers stopped afterwards.
- Limits: no iOS/Android simulator or device build, no store result, and no Capacitor runtime (LAN discovery, push, native plugins) was exercised; the hosted mobile web surface is the stand-in.


### Check after (2026-10-27, branch tip before landing)

- `bun install --frozen-lockfile` -> 0 (`install-final.log`).
- `bun run type-check` -> 0 (`type-check-final.log`).
- `bun run lint` -> 0 (`lint-final.log`).
- `VITEST_MAX_WORKERS=2 bun run test` -> 0: 7/7 suites, 6086 passed / 128 skipped (`test-final.log`). The web `network-defaults` approval-DB flake did not appear in this run.
- Re-ran `node scripts/run-isolated-tests.mjs scripts` after the exclusions -> 0, 23/23 (`scripts-suite.log`).
- `bun run extensions:build` -> 0 (`extensions-build.log`); `bun run --cwd packages/mobile build` -> 0 (`mobile-build.log`).
- `bunx oxlint` on the new JS -> 0; `bun run dead-code` -> 0 with only configuration hints (`dead-code.log`).
- Real path: dev server at `127.0.0.1:5391` with `/tmp/ohpi-03` data, `GET /mobile.html` 200 and `MobileApp` mounted (`mobile-surface.png`), `GET /api/agent/v1/ready` 200 `{"ready":true,"engine":"omp"}`. Servers stopped.
- Limits: no simulator/device or store run; Capacitor-only behavior (LAN connection, push, native plugins) unexercised.

**Finished:** 2026-10-27T13:55:00+08:00

**After rebase onto `3dc9b8a911` (task 23 landed while this task ran):** clean rebase, three commits replayed. `bun install --frozen-lockfile` -> 0 (`install-after-rebase.log`), `bun run type-check` -> 0 (`type-check-after-rebase.log`), `bun run lint` -> 0 (`lint-after-rebase.log`), `VITEST_MAX_WORKERS=2 bun run test` -> 0, 7/7 suites, 6086 passed / 128 skipped (`test-after-rebase.log`). This doc-only entry follows the tested code commit `1d4112ecd4`.
