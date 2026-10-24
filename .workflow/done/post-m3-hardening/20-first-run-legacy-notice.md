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

Candidate full gate: `/home/shizuku/Project/ohpichamber-omp-artifacts/post-m3-integration-2026-10-24/integration-receipt.json` names candidate `588c74b64b69df3d8c4d7ea2ac639a74c3aba128` on `validation/post-m3-hardening-final`, running `TMPDIR=/tmp bun run test`. The receipt records `7/7 suites passed`, `skipsRemainSkipped: true`, and `sdkChanged: false`; log `root-test-localtmp.log`: scripts 22/22, SDK 23/23, UI 805/805 test files, agent-contract 177 pass/0 fail (22 files), agent-service 229 pass/7 skip/0 fail (36 files), Electron 44/44, Web 378 passed + 9 skipped files (387 total) and 6128 passed + 135 skipped tests (6263 total). This is the single current full-gate receipt and no root test was rerun. The receipt records `landed: false` and `effortAccepted: false`. The candidate ref has since advanced from `588c74b64b69df3d8c4d7ea2ac639a74c3aba128` to `f781285ebd7991d9e6bfa30ce5ced1b16ab0c6ae` by merging `main`; that diff is workflow docs only (`.workflow/decisions.md`, `.workflow/development.md`, `.workflow/specs/post-m3-hardening.md`) with no source, so the candidate receipt remains the source gate, not a gate at `f781285eb`.

Real path: the same receipt records `browserSmoke` against `http://127.0.0.1:5194/` with disposable `HOME` `.../post-m3-integration-2026-10-24/smoke-home` and an empty `.local/share/opencode` fixture. Initial notice was visible; clicking configure providers opened Settings → Providers → Connect Provider (desktop capture `task20-provider-handoff.txt`; hosted-mobile capture `task20-mobile-provider-handoff.txt`, the 390×844 surface used by the smoke). After restart the receipt records `noticeVisible: false`, `appReady: true`, and the persisted runtime-scoped key `legacy-data-notice-dismissed:url:http://127.0.0.1:5194`; `task20-after-restart.txt` and `task20-after-restart.png` show the app ready with no notice. The Agent Service was initially unavailable and was rebuilt/restarted to `/health` `status=ok` and `agentService.phase=ready`; the initial Providers pane showed `Unable to load provider list`, and no provider prompt completion is claimed.

Check semantics and limits: the real smoke proves the existing-data path (empty legacy directory, notice visible, configure handoff, restart dismissal) and existence-only presence reading is proven by the Host and UI tests. A real browser smoke with a fully clean `HOME` was not run; clean/absent absence is test evidence (`LegacyDataNotice.behavior.test.tsx`, `keeps the notice hidden when the Host reports clean data`, and `legacy-data.test.js`, the clean-HOME case), not a real-runtime claim. The receipt's fixture is empty by design because only the directory's existence is read; the preserved `smoke-home` no longer contains `.local/share/opencode` at archive inspection, so the restart-absence observation rests on the receipt and its recorded dismissal key rather than a re-inspected fixture. No packaged Electron, macOS or Windows surface was exercised. No candidate-level A/B review is claimed; the reviewed implementation boundary is `a87a41966d6d3a06eee90a75ddad0885b93572bb`.

Landing: not performed. The candidate is an integration candidate, not `main`; `main` was clean at `242b2b4129838b5d71e4fbddc5abb22cb2387a66` at archive inspection, and the previously observed dirty Task13/Task33/Task20 scaffold was preserved outside `main` in commit `ae0c4e47b9e3dfb0272071280eea493f03806cb8`. This branch still requires explicit landing authorization; no main or candidate ref was modified.
