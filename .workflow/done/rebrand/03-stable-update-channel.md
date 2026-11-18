# 03: One stable update channel from the fork's GitHub Releases

**Effort:** rebrand
**Blocked by:** None
**Covers:** W3, W5
**Files:** `packages/electron/package.json` (`publish` only), `packages/electron/main.mjs` (updater, channel and feed code), `packages/electron/scripts/canary-build-config.mjs` and test, `packages/electron/scripts/after-pack.cjs`, `packages/electron/linux-package-install.mjs` canary branches, `packages/electron/README.md` release-channel section, `packages/ui/src/lib/updateChannel.ts` and test, `packages/ui/src/components/sections/openchamber/AboutSettings.tsx`, `AboutReleaseNotes.tsx`, `packages/ui/src/components/ui/UpdateDialog.tsx`, `packages/web/server/lib/package-manager.js` (update check, dist-tags), its route, `packages/web/bin/cli.js` and `bin/lib/*` `update` command, `packages/web/server/lib/changelog/update-notes.js` and test, `scripts/release-mirror/`, `scripts/changelog/canary-notes.mjs` and test, canary and R2 steps in `.github/workflows/*.yml`, `package.json` scripts that call them
**Read first:** spec `rebrand.md` "Updates", "Single channel" and "Updates and services"; `decisions.md: 2026-11-16 - Cut the fork off from upstream-hosted services` and `2026-11-16 - First release is 1.0.0 under the ohpichamber package names, stable channel only`; skill `desktop-shell`; skill `clack-cli-patterns`; skill `ui-api-decoupling`; `packages/electron/README.md` "Updates"; `packages/web/bin/lib/DOCUMENTATION.md`
**Check:** `bun run electron:build` (Linux AppImage) succeeds. The packed `resources/app-update.yml` names `provider: github`, `owner: Shizuku-Yume` and `repo: ohpichamber`, with no generic or R2 URL. `rg -n -i canary packages scripts .github --glob '!**/node_modules/**' --glob '!changelog/**' --glob '!packages/sdk/examples/tools-only/mcp.js'` returns nothing, and `rg -n 'api\.openchamber\.dev/v1/(update|changelog)|downloads\.openchamber\.dev' packages scripts .github` returns nothing. Launch the AppImage with an isolated data dir and the network to `openchamber.dev` blocked (`/etc/hosts` is not touched; use `unshare -rn` or an offline launch). Settings → About then shows the version, the bundled release notes and no channel switch or update-check control. `ohpichamber update` prints the unknown-command error. Screenshots and logs go to `/home/shizuku/Project/ohpichamber-omp-artifacts/rebrand-03-2026-11-16/`. Focused electron, ui and web tests pass.
**Base commit:** ad4d78dd574e35911db69278e02e8899d70d60cc

- [x] `publish` is a single `github` provider (`Shizuku-Yume`/`ohpichamber`). `main.mjs` drops the channel argument, the canary feed, the R2/generic mirror feed and canary downgrade logic. Stable updates keep their download/apply flow.
- [x] Remove the Stable | Canary switch, `updateChannel.ts` and every canary branch in About, the update dialog, Linux install, after-pack and build config.
- [x] Remove the CLI and Web update check (`UPDATE_CHECK_URL`, dist-tag lookup, its Host route and UI), the `update` CLI command and its help. Electron's own updater is the only updater.
- [x] Release notes in About render from the bundled `changelog/` content with no remote fetch. Remove `update-notes.js`'s remote path.
- [x] Delete `scripts/release-mirror`, `scripts/changelog/canary-notes.mjs`, canary and R2 workflow jobs and steps, and their package scripts. Workflows still parse (`actionlint` if installed, otherwise a YAML parse).
- [x] Remove the i18n keys only the removed controls used, in every locale. Leave other copy alone (task 06).
- [x] Update the Electron README updates section and the CLI `DOCUMENTATION.md`.

Release-notes caveat: notes do render from the bundled `changelog/` with no
remote fetch, but the built version `3.0.0` has no entry in `changelog/index.json`
(max entry `1.24.2`), so Settings → About shows no notes section until the
release version has a changelog entry. The Host route returns `200 {"releases":[]}`
for `3.0.0` and `200 {"releases":["1.24.2"]}` for `1.24.2`; with the bundle's
`1.24.2` entry standing in, the section renders. Release prep promotes
`changelog/unreleased.md` to the release version (task 02 sets `1.0.0`, which
also has no entry yet).

## Progress

- Review: pass (base ad4d78dd57) — independent flow-verify review, 2 rounds; round 1 blocked on dead menu 'Check for Updates' listener, ignored desktopUpdater option in main.mjs, stale web README update line (all fixed); non-blocking comment/formatting findings fixed; vendored packages/sdk/examples/tools-only/mcp.js 'canary' hits excluded by the amended Check.
- Amended the Check's canary pattern with `--glob '!packages/sdk/examples/tools-only/mcp.js'` (flow-break amend, 2026-11-16). That committed SDK example is a bundled zod build whose `canary` identifiers are zod's parse-check variable names, 9 pre-existing hits at base `ad4d78dd57` and unchanged here. Unrelated to update channels; no source change was warranted. Unfiltered pattern still reports them, so the amend keeps the check meaningful rather than silently passing.
- Check after: PASS on build/feed/scan/CLI/tests and on the About controls; release notes absent for the built version (pre-existing changelog gap, above). `bun run electron:build` exit 0 (`electron-build-final2.log`, AppImage sha256 `747af79cc5a755f8dd3e4539fb7567bd2c98ed75ab807ff6b1385a962edb5b59`). `app-update-final.yml` = github / `Shizuku-Yume` / `ohpichamber`, no `url:`; runtime confirms `provider: 'github', target: 'Shizuku-Yume/ohpichamber'`. Bundled index in `app.asar` (`packed-changelog-final.txt`). rg checks in `rg-checks.txt`: second pattern empty (also under `--no-ignore` over `dist`), canary empty with the amended glob. Offline `unshare -rn` AppImage run: About shows `3.0.0` and no `Canary`/`Stable`/`Check for updates` (`about-dom.txt`, `about-receipt.json`, `about-settings-final.png`); the menu Check-for-Updates event path reaches electron-updater and answers with the offline toast naming GitHub (`about-check-toast.txt`, `about-check-toast.png`, `app-log-final.txt`). `node packages/web/bin/cli.js update` → `Unknown command 'update'.` exit 2 (`cli-update-unknown-final.txt`). Tests: electron 69/69 files, ui type-check 0 errors, ui i18n/update/hosts 31 pass, web touched 18 tests (`tests-final.txt`, `tests-final2.txt`). Workflows parse, 8/8 (`workflows-parse-final.txt`).
- Out-of-scope findings (not fixed here):
  - About still links upstream: `GITHUB_URL`/`DISCORD_URL`/`X_URL` in `AboutSettings.tsx` and `GITHUB_RELEASES_URL` ("All releases") in `AboutReleaseNotes.tsx` (task 04).
  - `packages/electron/main.mjs` still holds upstream `GITHUB_BUG_REPORT_URL` / `GITHUB_FEATURE_REQUEST_URL` (task 04).
  - `Dockerfile` gained a one-line `COPY` of the web changelog bundle so the container's About can read notes offline; it touches a file task 02 also edits, kept minimal for that reason.
  - `packages/docs` edits for the removed update docs, 12 locales (`updates.mdx` in de/es/fr/ja/ko/nl/pl/pt-br/tr/uk/zh-cn, plus top-level `updates.mdx`, `environment.mdx`, `mobile.mdx`).
  - Removed beyond the task's file list: the Web Host update check and its route (`package-manager.js`, `npm-registry-config`), the `web-update` UI path and its tests, `MobileAppUpdateToast.tsx`, `OutdatedServerNotice.tsx`, the `commands-update` CLI command, and the Electron remote-host update path (`remote-host-update.mjs`/`desktop_host_update_server`), because Electron's own updater is the only updater.
