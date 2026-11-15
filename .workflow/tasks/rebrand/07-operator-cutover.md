# 07: Operator cutover to the fork's own data directory

**Effort:** rebrand
**Blocked by:** 06
**Covers:** W7
**Files:** `.workflow/standards.md`, `~/.config/ohpichamber/omp-m0-provider.env`, `~/.config/ohpichamber/chats/`
**Read first:** `decisions.md: 2026-11-16 - Rebrand in two phases around the open UX effort`; `standards.md` "Running it"
**Check:** `standards.md` "Running it" no longer names `omp-m0-provider.env` or `~/.config/openchamber` as the protected directory. It names `~/.config/ohpichamber` (and Electron's `~/.config/OhPiChamber`) as the maintainer's real product data that dev and test runs never use, and says real-provider checks configure the provider through the app. `~/.config/ohpichamber` no longer contains `omp-m0-provider.env` or `chats/`. `.workflow/bin/workflow validate` exits 0.

- [ ] Delete the two operator paths only after confirming that no open task's `Check` still sources them.
- [ ] Update `development.md` and any skill or document that names the env file.
