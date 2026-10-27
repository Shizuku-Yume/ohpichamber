# 05: Electron shell

**Effort:** upstream-refresh
**Task type:** feature
**Base commit:** bd6745375d5f90c0fe48e94113d989d31f34ea69
**Started:** 2026-10-27T15:00:00+08:00

**Delivers:** The Electron main process, preload, browser-panel security, desktop entry, tray/menu and packaging scripts match upstream 0056bf6a9 on Electron 44, with the fork's desktop boundaries intact.

**Blocked by:** 02
**Files:** Path list: `/home/shizuku/Project/ohpichamber-omp-artifacts/upstream-sync-2026-10-27/plan-paths/05.tsv` (118 paths: 84 clean/new, 11 both-side, 6 conflicts, 23 upstream deletions). Main locations: `packages/electron/*.mjs`, `packages/electron/scripts/`, `packages/electron/resources/`, `packages/electron/package.json`.

**Read first:** Spec W4; `.agents/skills/desktop-shell/SKILL.md`; `.agents/skills/enterprise-boundary/SKILL.md`; `packages/electron/README.md`; decisions.md: 2026-10-27 - Bump the toolchain before refreshing ui and web.
**Covers:** W4

**Check:** `bun install --frozen-lockfile` and `bun run type-check` and `bun run lint` and `bun run test` all exit 0, `bun run electron:build` packages the app and the packaged app launches on Linux. Real path: open the packaged app, open a window, a Browser panel and a Mini Chat, and observe the updated tray/menu and desktop entry.

## Done when

- [x] Main/preload modules and their tests are at the upstream revision; upstream deletions are applied where the fork did not change the file.
- [x] Browser-panel security, external URL policy, host probe and guest-frame navigation tests pass.
- [x] Packaged launch works; macOS/Windows results are named as not exercised.
- [x] No OpenCode CLI resource or OpenCode-specific environment injection is reintroduced.

## Progress

Check before: not run for this branch (new branch from the integration tip `bd6745375d`). Dirty at start: none.

**Adopted whole (84 paths).** New upstream Electron modules (browser-panel cookies/security, context-menu clipboard, dev dock identity and window tape, renderer recovery, Linux package install/relaunch/desktop entry, safe-start, packaged app contents, smoke scripts, guest-frame navigation helpers) and the updated existing modules, scripts, resources and tests. **23 upstream deletions** applied where the fork had not changed the file (old icon assets, tray breath frames, etc.).

**Both-side (11).** `early-startup.mjs`, `guest-frame-navigation.mjs` (+test), `ssh-manager.mjs` (+test) merged cleanly. Six conflicts resolved:

- `main.mjs` (6 hunks): took upstream's imports, window/relay/updater/Linux-package wiring, clipboard and dev identity; kept the fork's Agent Service startup and `resolveAgentRuntime`, the packaged local-auth bootstrap and the Mini Chat local-auth step, and the `isRemoteSafeCommand` policy (`COMMANDS_SAFE_FOR_REMOTE` dropped as unused). Dropped the upstream `opencode-readiness`/`opencode-cwd` imports and the `desktop_collect_local_diagnostics` command: the fork's web package has no `server/lib/diagnostics/local-files.js` (task 21 owns that server module) and no UI caller exists. No OpenCode lifecycle, CLI preflight or environment injection was reintroduced.
- `README.md` (9 hunks): kept the fork's resource layout and OpenCode-free wording for every engine-labelled hunk; added the upstream hicolor-icon constraint paragraph that explains the new AppImage check. The generic upstream paragraphs on native clipboard, renderer safe start and menu actions are not copied into the README yet (code adopted; doc gap recorded).
- `.gitignore`: fork's `agent-runtime` staging kept; upstream's `web-dist-staging-*` kept; `sidecar/`, `opencode-cli/`, `ripgrep/` entries not adopted.
- `after-pack.cjs`: fork's Agent Runtime payload verification kept, plus upstream's `verifyPackagedAppContents` asar check.
- `verify-linux-appimage.mjs` (+test): fork's Agent Runtime/native-module verification kept; took upstream's `assertThemeIcon`/`.DirIcon` check and its tests; dropped the OpenCode CLI version check, `defaultCliVersion` and the `Resources/ripgrep` assertion (the fork ships neither CLI nor ripgrep). `packaged-app-contents.cjs` adapted the same way: no ripgrep rule and no `@openchamber/web/dist` exclusion (this fork's `files` list packages it; the served UI is still `resources/web-dist`). Its two rule tests removed.
- `packages/electron/package.json` (task 02-owned; one packaging fix): added `browser-panel-preload.cjs` to `files`. The packaged Browser panel loads it from `app.getAppPath()`, and without it the packaged panel has no preload. The asar contents check now proves it is present.

**Not adopted (with reason).** `scripts/prepare-ripgrep.mjs` (it resolves `@vscode/ripgrep` to find the version, and that dependency is not in the fork; `technical-debt.md` records that adding it is the maintainer's decision, so the desktop binary is not staged and task 22's resolver falls back to PATH/501); upstream's `desktop_collect_local_diagnostics` IPC (see above); upstream's OpenCode CLI staging/verification (engine-labelled). macOS and Windows packaging, notarization, updater install and tray interaction are not exercised here.

**Checks (evidence in `/home/shizuku/Project/ohpichamber-omp-artifacts/upstream-refresh-05-2026-10-27/`):**

- `bun install --frozen-lockfile` -> 0 (`install.log`); `bun run type-check` -> 0 (`type-check.log`); `bun run lint` -> 0 (`lint.log`, one pre-existing ui warning from another lane).
- `bun run --cwd packages/electron test` -> 0, 54/54 (`electron-test4.log`); earlier runs failed on the newly adopted packaging rules and the stale ripgrep expectation, both fixed (see above).
- `VITEST_MAX_WORKERS=2 bun run test` -> 1 on the first run (`test.log`): 6/7 suites, `agent-service` failed one test with `SDK readiness disposal failed`; a second suite-only run (`agent-service-test-alone.log`) failed a different test (`idle restart preflights all roots ...`). Each failed test passes alone (`cold-snapshot-cursor` 1/1, `registry-native` 15/15), and `git diff HEAD -- packages/agent-service` is empty, so the failing code is identical to the integration tip: this is the known load-sensitive agent-service flake, not this task's change. The final receipt is `test2.log` below.
- `bun run dead-code` -> 1 (`dead-code.log`): the task-23 UI-store findings are pre-existing; the one new finding is `packages/electron/browser-panel-preload.cjs`, which main.mjs loads by path (`app.getAppPath()`), so knip cannot see the reference. Inspected, not silenced.
- `bunx oxlint` on the changed main/preload/packaging JS -> 0 (`oxlint.log`).
- `bun run electron:build` -> 1 when electron-builder initialises the configured GitHub publisher without `GH_TOKEN`; every build step succeeded and the AppImage was produced. Re-running only the packaging step with `--publish never` -> 0 (`electron-package2.log`) and produced `dist/OpenChamber-3.0.0-linux-x86_64.AppImage` (610 MB). `electron-package.log` shows the earlier contents-check failure that the packaging fixes address.

**Real path (packaged AppImage under Xvfb, `APPIMAGE_EXTRACT_AND_RUN=1`, isolated HOME/XDG_CONFIG_HOME/XDG_DATA_HOME/XDG_CACHE_HOME/OPENCHAMBER_DATA_DIR/OPENCHAMBER_DESKTOP_USER_DATA_DIR under `/tmp/ohpi-05`):**

- The window loaded the staged UI over `openchamber-ui://app/index.html`; onboarding answered "Use Local"; the app mounted with the sidebar, composer and a real model (`GPT-6 Astra`).
- `GET http://127.0.0.1:<desktopLocalPort>/api/agent/v1/ready` -> 200 `{"ready":true,"engine":"omp","version":"1.0.0"}`.
- Browser panel opened from the rail and showed the browser surface with detected dev servers; Mini Chat opened as `openchamber-ui://app/mini-chat.html?mode=draft` and mounted with a model.
- One chat completed through the real provider in 16 s: sent "Reply with exactly: packaged chat ok" and the assistant answered `packaged chat ok`; `electron-chat-completed.png`. Screenshots: `electron-window.png`, `electron-browser-panel.png`, `electron-mini-chat.png`, `electron-chat-completed.png`. Logs: `app-run.log`, `app-launch.log` (the earlier missing-module launch failure that led to dropping the diagnostics import).
- The isolated profile (including the copied OMP model database) was deleted after the run; values from the provider env file were never read or printed.
- Limits: bare Xvfb has no system tray or desktop shell, so the tray menu and the installed `.desktop` entry were verified only by the AppImage verifier (desktop identity, hicolor icon, `.DirIcon`) and not by clicking them; macOS/Windows packaging, updater install/restart, and a real screen-reader accessibility run are not exercised. No physical display; the window and screenshots come from Xvfb.

### Check after (2026-10-27, before landing)

- `bun install --frozen-lockfile` -> 0; `bun run type-check` -> 0; `bun run lint` -> 0; `bun run --cwd packages/electron test` -> 0 (54/54); `bunx oxlint` -> 0; workflow validate -> 0.
- `VITEST_MAX_WORKERS=2 bun run test` -> 1 twice, both times only the `agent-service` suite: first run `cold-snapshot-cursor` (SDK readiness disposal), second run three `registry-native` capacity/restart tests; different tests each time, each file passes alone (1/1 and 15/15), and `git diff HEAD -- packages/agent-service` is empty. The host's load average was 16-17 with other lanes running suites and Vite servers, which is the recorded cause. This is the pre-existing load-sensitive agent-service flake; neither run's failure is touched by this branch. The landing receipt is the rerun at the rebased tip (`test-land.log`).
- `bun run electron:build` -> 1 at electron-builder's GitHub publisher initialisation without `GH_TOKEN`; the AppImage itself was built by `electron-builder --linux AppImage --x64 --publish never` -> 0.
- Real path: packaged AppImage window on `openchamber-ui://app/index.html`, `/api/agent/v1/ready` 200 engine omp, Browser panel and Mini Chat opened, one real-provider chat completed (`electron-chat-completed.png`).

**Finished:** 2026-10-27T15:45:00+08:00

**Final real path at the rebased tip (`96b7e75e5f` on `4634e8bcf1`):** rebuilt `prepare:agent-runtime` + `electron-builder --publish never`, then launched the AppImage under Xvfb with a fresh isolated profile. The window loaded `openchamber-ui://app/index.html`, "Use Local" mounted the app, `/api/agent/v1/ready` -> 200 `{"ready":true,"engine":"omp","version":"1.0.0"}` on `desktopLocalPort` 57123, the Browser panel rendered its browser surface, the Mini Chat opened as `openchamber-ui://app/mini-chat.html?mode=draft`, and a chat completed: the assistant answered `packaged chat ok` (GPT-6 Astra) in about 16 s. Screenshots from this run: `electron-window.png`, `electron-browser-panel.png`, `electron-mini-chat.png`, `electron-chat-completed.png`; log `app-run-final2.log`. (The earlier launch log `app-launch.log` records the missing `local-files.js` module that led to dropping the diagnostics import.) The isolated profile was deleted and all app processes stopped afterwards.

**Landing check at `4634e8bcf1` after the rebase:** `bun install --frozen-lockfile` 0, `bun run type-check` 0, `bun run lint` 0, `VITEST_MAX_WORKERS=2 bun run test` 0 — 7/7 suites (`install-land.log`, `type-check-land.log`, `lint-land.log`, `test-land2.log`). The earlier agent-service failures did not recur; the suite's code is unchanged by this branch.

**Agent-service failure at the integration tip without this branch:** a detached worktree at `dfd74f36bd` (integration tip, task 05 not applied) ran `bun run --cwd packages/agent-service test` -> 1 with the same test, `a pending worker operation and a restart reservation each postpone eviction` (617 ms). Receipt: `agent-service-at-tip.log`. The red suite at the landing attempt is therefore pre-existing at the tip and not caused by this branch; the same test file passes alone and the failing code path is untouched (`git diff HEAD -- packages/agent-service` empty). This is recorded for the effort gate. `bun run --cwd packages/electron test` (54/54) and all other suites pass at the rebased tip.
