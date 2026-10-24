# 20: Tell existing OpenCode users what changed on first run

**Effort:** post-m3-hardening
**Task type:** feature
**Base commit:** 7cc282d08504afc88d1531b6ba527009de3b0794
**Started:** 2026-10-23T00:00:00Z
**Finished:** 2026-10-24T11:34:11+08:00

**Delivers:** On the first OMP run, a user with existing OpenCode data sees a one-time notice saying their old sessions were not imported, where the old data stays, and how to sign in to providers again.

**Blocked by:** None
**Files:** Host startup or a Host route that reports legacy-data presence; a UI notice component; locale files

**Read first:** `.workflow/specs/post-m3-hardening.md`; `.workflow/omp-migration/scope.md` lines 349-357 (no transcript import, one-time credential handoff); `.agents/skills/locale-ui-patterns/SKILL.md`; `.workflow/STYLE.md` "Front-end text"
**Covers:** H11

**Check:** With a disposable `HOME` holding a fake OpenCode data directory, the notice appears once and stays dismissed after restart; with a clean `HOME` it never appears; the legacy directory is only checked for existence, never read.

## Done when

- [x] No legacy file content is read or imported.
- [x] The notice links to the credential handoff path that already exists.

## Progress

Base `7cc282d08504afc88d1531b6ba527009de3b0794`; implementation source is in prior Task20 commits through `8228fca7fe9bc9e8ed42c326fe3518f004178d82`, with the final source change and test alignment at `a87a41966d6d3a06eee90a75ddad0885b93572bb`; `8122fb0025ae3f5b4579b30a442fd089e10a915b` records review metadata only. Scope `.workflow/omp-migration/scope.md:354-357` reserves selected credential import for Task22 and retires legacy importer/readers at Task17. The notice never calls that API.

Existence-only boundary: `packages/web/server/lib/host/legacy-data.js:13-16` resolves the OpenCode data directory and calls only `existsSync` on it. `packages/web/server/lib/host/core-routes.js:1038-1047` serves authenticated `GET /api/host/legacy-data` as `{present:boolean}` with `Cache-Control: no-store`. `packages/ui/src/components/onboarding/LegacyDataNotice.tsx:24-32` accepts exactly that one boolean key. `packages/web/server/lib/host/legacy-data.test.js:28-43` asserts the helper checks only the resolved directory, distinguishes a clean HOME from an existing directory, and never reads the sentinel file it creates. No legacy import path is wired to this feature.

Credential handoff: `LegacyDataNotice.tsx:68-75` sets `settingsProvidersConnectRequested`, `settingsPage='providers'` and `settingsDialogOpen=true`, invokes the mobile surface opener when present, then dismisses. The desktop notice is mounted in `packages/ui/src/App.tsx:830`; the mobile notice is mounted in `packages/ui/src/apps/MobileApp.tsx:459` and uses `useMobileSettingsSurfaceOpener` from `packages/ui/src/apps/mobileAppContext.tsx:21-27` so the mobile shell mounts `SettingsView` on the Providers page. ProvidersPage consumes the existing connect request to open its add-provider flow. The dismissal key is `legacy-data-notice-dismissed:<runtimeKey>` (`LegacyDataNotice.tsx:10`), so persistence is scoped to the runtime endpoint.

Narrow receipts: `/home/shizuku/Project/ohpichamber-omp-artifacts/task20-2026-10-23/host-vitest.log` is 33/33 pass, exit 0. `ui-rendered.log` is 3 pass/0 fail/11 expectations, exit 0. `i18n-messages-after-tr-fix.log` is locale parity 6 pass/0 fail/523 expects; `ui-behavior-after-tr-fix.log` is 3 pass/0 fail/11 expects; `workflow-validate-after-tr-fix.log` is valid. Turkish copy no longer contains literal backslashes before apostrophes: `Provider'ları yapılandır` and `provider'larınıza`. `bun run --cwd packages/ui type-check` exits 0. `bun run --cwd packages/ui lint` exits 1 only on three pre-existing `react-refresh/only-export-components` errors at `LegacyDataNotice.tsx:12,20,24` (same output reproduces from `06fab13e8b180825924692b3a8df59c48a16e931`); `bun run dead-code` exits 1 only on those same helper exports/type. The mobile focused test reports 4 pass/0 fail/21 expects, including no settings surface before click and the Providers handoff consuming the connect request.

Review boundary: fresh read-only Brief A and Brief B reviews of exact implementation boundary `7cc282d08504afc88d1531b6ba527009de3b0794..a87a41966d6d3a06eee90a75ddad0885b93572bb` both passed with no implementation findings. The later metadata commit `8122fb0025ae3f5b4579b30a442fd089e10a915b` changes only this task record. No separate A/B review of the assembled candidate is claimed.

## Check after

The full gate after merging the current main documentation commit passed at candidate HEAD `f781285ebd7991d9e6bfa30ce5ced1b16ab0c6ae`: `TMPDIR=/tmp bun run test`, 7/7 suites. Receipt: `/home/shizuku/Project/ohpichamber-omp-artifacts/post-m3-integration-2026-10-24/root-test-after-main-merge.log`. Counts: scripts 22/22, SDK 23/23, UI 805/805 files, agent-contract 177 pass/0 fail (22 files), agent-service 229 pass/7 skip/0 fail (36 files), Electron 44/44, Web 378 passed/9 skipped files and 6128 passed/135 skipped tests. Subsequent candidate commits `1fbde20f38f98ef12239b9d8df82dce63d275fbb` add only Task08/Task20 workflow archive metadata; no source changed. Skips remain skipped. The receipt records `landed: false` and `effortAccepted: false` until local merge and maintainer effort acceptance.

Real path: the disposable `HOME` at `.../post-m3-integration-2026-10-24/smoke-home` initially contained an empty `.local/share/opencode` directory. The first-run notice appeared; desktop and 390×844 hosted MobileApp configure actions opened Settings → Providers → Connect Provider. The Agent Service was initially unavailable; after building agent-contract and agent-service and restarting with explicit Bun and entrypoint, Host `/health` reported `status=ok`, `agentService.phase=ready`, and Providers listed 89 options. After Host restart the notice remained dismissed, `appReady` was true, and the runtime-scoped key was `legacy-data-notice-dismissed:url:http://127.0.0.1:5194`. Captures: `task20-provider-handoff.txt`, `task20-mobile-provider-handoff.txt`, `task20-after-restart.txt`, `task20-after-restart.png`.

The clean-HOME browser context had no `.local/share/opencode` directory; the page loaded with the app ready and no notice (`task20-clean-home.txt`). The existing-data path and restart dismissal were separately observed as recorded above. Existence-only presence reading is covered by Host and UI tests. No real credential login or provider prompt completion is claimed. No packaged Electron, macOS or Windows surface was exercised. No candidate-level A/B review is claimed for implementation source; reviewed implementation boundary is `7cc282d08504afc88d1531b6ba527009de3b0794..a87a41966d6d3a06eee90a75ddad0885b93572bb`.

Landing: maintainer approved local merge after preserving the four pre-existing main changes in the named stash and external patch `/home/shizuku/Project/ohpichamber-omp-artifacts/post-m3-integration-2026-10-24/main-prelanding-preserved.patch`. The candidate is branch-only at this record; coordinator performs the fast-forward and retains the stash for later owner reconciliation.
