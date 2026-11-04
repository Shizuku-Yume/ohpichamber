# 04: Guest SDK: upstream APIs with the fork transport

**Effort:** upstream-refresh
**Task type:** feature
**Base commit:** 7cd4ce6b7a2ee85ca1a6a4d863857a026bcf76c2
**Started:** 2026-10-27T14:05:00+08:00

**Delivers:** `packages/sdk` carries upstream's Guest contract additions (service providers, workspace/status views) while keeping the fork's private `MessagePort` `v: 2` bootstrap and `3.0.0` version.

**Blocked by:** 02
**Files:** Path list: `/home/shizuku/Project/ohpichamber-omp-artifacts/upstream-sync-2026-10-27/plan-paths/04.tsv` (30 paths: 23 clean/new, 7 both-side, 3 conflicts). Main locations: `packages/sdk/src`, `packages/sdk/examples`, `packages/sdk/scripts`, `packages/sdk/{API,DOCUMENTATION,GUEST_SERVICES}.md`.

**Read first:** Spec W4; decisions.md: 2026-10-24 - Break the Guest SDK version for the private bootstrap transport; `.agents/skills/openchamber-change-discipline/SKILL.md`; `.agents/skills/ui-api-decoupling/SKILL.md`; `packages/sdk/DOCUMENTATION.md`.
**Covers:** W4

**Check:** `bun install --frozen-lockfile` and `bun run type-check` and `bun run lint` and `bun run test` all exit 0, `bun run --cwd packages/sdk test` and the example/script tests pass, and the v2 bootstrap test still proves a v1 `hello` is refused with the version-mismatch pane. Real path: load one built-in extension in the running app and see its panel connect.

## Done when

- [x] The `v: 2` envelope and bootstrap handshake are unchanged; `@openchamber/sdk` is 3.0.0; manifest `apiVersion` stays 1.
- [x] Upstream service-provider and workspace types are exported from `src/index.ts` and consumed by tasks 06/07 without copying types into `packages/ui`.
- [x] Examples build and the example tests pass.
- [x] No pre-v2 compatibility path is reintroduced.

## Progress

Check before: not run for this branch (new branch from the integration tip; task 03's tip carried the green receipt). Dirty at start: none.

**Adopted whole (23 plan paths).** `src/manifest.ts`, `schemas.ts`, `scrollbar-style.ts`, `service-provider-schemas.ts`, `service-providers.ts` (+test), `workspace-schemas.ts`, `workspace.ts`, `ui/{index,option,style}.ts`, `tsconfig.json`, `examples/{shared.ts,browser-provider-stub/service/main.ts}`, `scripts/examples.test.ts`, and the new `src/status-view*.ts`, `src/ui/style.test.ts`, `examples/source-control-provider/{README.md,fake-forge.ts,service/main.{ts,js}}`, `scripts/source-control-example.test.ts`. Upstream's `contributes.sourceControl` (wire 1) and `status-view` contracts are in the SDK; `GUEST_SERVICE_PROVIDES` includes `source-control`.

**Both-side (7).** `GUEST_SERVICES.md`, `README.md`, `parse.ts`, `scripts/examples.test.ts` merged cleanly. `examples/README.md` and `src/ui/DOCUMENTATION.md` conflicts resolved to upstream's text (the fork side was the older, shorter copy). `src/parse.test.ts` took upstream's new imports and assertions with the fork's manifest constant: the fork's `OPENCHAMBER_SDK_API_VERSION` is the wire envelope (`2`), so the test keeps `OPENCHAMBER_SDK_MANIFEST_API_VERSIONS[0]` (`1`) for `apiVersion`.

**Deferred manifest (exception from task 02).** Added `examples/source-control-provider/package.json` (apiVersion 1, engines `>=2.5.1`); `bun install` added its workspace entry to `bun.lock`. The adopted parser accepts it: `scripts/examples.test.ts` "all manifests remain valid" passes for every example.

**`src/index.ts` (not in the plan; required by the Done-when).** Three-way merged: upstream's new exports (source-control provider API and limits, status-view, `PublicSourceControl`, `GuestSessionLink`, browser close params) plus the fork's `GUEST_BOOTSTRAP_*` exports and task 01's `onLateGenerateResult`/`LateGenerateResult`. Diff +94/-1.

**Example bundles.** All 16 checked-in bundles rebuilt with the pinned Bun 1.4.4 through `scripts/bundle-guest.ts`; `scripts/examples.test.ts` compares each rebuilt bundle hash and passes.

**Not adopted.** `packages/ui/src/components/layout/PluginPane.generate.test.tsx` (upstream, v1 window stand-in) stays out: the `v: 2` transport is unchanged, so that stand-in still cannot drive the pane. The fork's `PluginPane.sdk-version.test.tsx` proves the v1 refusal.

**Checks (evidence in `/home/shizuku/Project/ohpichamber-omp-artifacts/upstream-refresh-04-2026-10-27/`):**

- `bun install` -> 0 (adds the example workspace); `bun install --frozen-lockfile` -> 0.
- `bun run type-check` -> 0 (`type-check.log`).
- `bun run lint` -> 0 (`lint.log`, 7 workspaces).
- `VITEST_MAX_WORKERS=2 bun run test` -> 0, 7/7 suites, 6086 passed / 128 skipped (`test.log`).
- `bun run --cwd packages/sdk test` -> 0, 26/26 files (`sdk-test2.log`).
- `bun test src/components/layout/PluginPane.sdk-version.test.tsx` -> 0: v1 hello shows the version-mismatch pane and grants no port.
- `bun run dead-code` -> 1; all findings are in `packages/ui/src/stores` from task 23's landed state refresh (unchanged here). No SDK findings (`dead-code.log`).
- Real path (`/tmp/ohpi-04`, UI 5392, API 3992): installed `examples/hello-kit` through `POST /api/guests` (enabled, no grants) and opened the **SDK Playground** panel in the browser; the iframe rendered the full guest UI through the v2 `MessagePort` bootstrap with no version-mismatch state (`real-path.txt`). Servers stopped.
- Limits: one example guest on the web surface; no Capacitor/mobile guest, no source-control service process (tasks 06/07 own the host side), no packaged build.

### Check after (2026-10-27, before landing)

- `bun install --frozen-lockfile` -> 0; `bun run type-check` -> 0; `bun run lint` -> 0; `VITEST_MAX_WORKERS=2 bun run test` -> 0 (7/7 suites, 6086 passed / 128 skipped); `bun run --cwd packages/sdk test` -> 0 (26/26); v1-refusal pane test -> 0. Logs in `/home/shizuku/Project/ohpichamber-omp-artifacts/upstream-refresh-04-2026-10-27/`.
- `bun run dead-code` -> 1 with only the pre-landed UI-store findings from task 23; no SDK findings.

**Finished:** 2026-10-27T14:40:00+08:00

**After rebase onto `2e1239cd4b`:** clean rebase, two commits replayed. `bun install --frozen-lockfile` -> 0, `bun run type-check` -> 0, `bun run lint` -> 0, `VITEST_MAX_WORKERS=2 bun run test` -> 0 (7/7 suites) (`*-after-rebase.log`). This doc-only entry follows the tested code commit `5db1b91db8`.

**Final landing attempt (integration tip `4d4c335444`, docs-only commits on top of the previous rebase):** clean rebase, three commits replayed. `bun install --frozen-lockfile` -> 0, `bun run type-check` -> 0, `bun run lint` -> 0, `VITEST_MAX_WORKERS=2 bun run test` -> 0, 7/7 suites (`*-final.log`). This doc-only entry follows the tested code commit `7db7c994d3`.

**Landing checks at integration tip `e301f50e69`:** clean rebase; `bun install --frozen-lockfile` 0, `bun run type-check` 0, `bun run lint` 0, `VITEST_MAX_WORKERS=2 bun run test` 0 (7/7 suites) (`*-land.log`).
