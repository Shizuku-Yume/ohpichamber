# 05: Electron shell

**Effort:** upstream-refresh
**Task type:** feature
**Base commit:** <commit-sha>

**Delivers:** The Electron main process, preload, browser-panel security, desktop entry, tray/menu and packaging scripts match upstream 0056bf6a9 on Electron 44, with the fork's desktop boundaries intact.

**Blocked by:** 02
**Files:** Path list: `/home/shizuku/Project/ohpichamber-omp-artifacts/upstream-sync-2026-10-27/plan-paths/05.tsv` (118 paths: 84 clean/new, 11 both-side, 6 conflicts, 23 upstream deletions). Main locations: `packages/electron/*.mjs`, `packages/electron/scripts/`, `packages/electron/resources/`, `packages/electron/package.json`.

**Read first:** Spec W4; `.agents/skills/desktop-shell/SKILL.md`; `.agents/skills/enterprise-boundary/SKILL.md`; `packages/electron/README.md`; decisions.md: 2026-10-27 - Bump the toolchain before refreshing ui and web.
**Covers:** W4

**Check:** `bun install --frozen-lockfile` and `bun run type-check` and `bun run lint` and `bun run test` all exit 0, `bun run electron:build` packages the app and the packaged app launches on Linux. Real path: open the packaged app, open a window, a Browser panel and a Mini Chat, and observe the updated tray/menu and desktop entry.

## Done when

- [ ] Main/preload modules and their tests are at the upstream revision; upstream deletions are applied where the fork did not change the file.
- [ ] Browser-panel security, external URL policy, host probe and guest-frame navigation tests pass.
- [ ] Packaged launch works; macOS/Windows results are named as not exercised.
- [ ] No OpenCode CLI resource or OpenCode-specific environment injection is reintroduced.
