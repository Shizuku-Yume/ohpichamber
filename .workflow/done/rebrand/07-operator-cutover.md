# 07: Operator cutover to the fork's own data directory

**Effort:** rebrand
**Blocked by:** 06
**Covers:** W7
**Files:** `.workflow/standards.md`, `~/.config/ohpichamber/omp-m0-provider.env`, `~/.config/ohpichamber/chats/`
**Read first:** `decisions.md: 2026-11-16 - Rebrand in two phases around the open UX effort`; `standards.md` "Running it"
**Check:** `standards.md` "Running it" no longer names `omp-m0-provider.env` or `~/.config/openchamber` as the protected directory. It names `~/.config/ohpichamber` (and Electron's `~/.config/OhPiChamber`) as the maintainer's real product data that dev and test runs never use, and says real-provider checks configure the provider through the app. `~/.config/ohpichamber` no longer contains `omp-m0-provider.env` or `chats/`. `.workflow/bin/workflow validate` exits 0.
**Base commit:** 7e9251f0d90a7191b4a1c5629c1d8e8af6de2f5e

- [x] Delete the two operator paths only after confirming that no open task's `Check` still sources them.
- [x] Update `development.md` and any skill or document that names the env file.

## Progress

- **Check before:** `~/.config/ohpichamber` contained `chats/` and `omp-m0-provider.env` (`/home/shizuku/Project/ohpichamber-omp-artifacts/rebrand-07-2026-11-18/config-ohpichamber-ls-before.txt`); `rg` over `.workflow/tasks/` found no open task other than 07 naming `omp-m0-provider.env`; `standards.md` "Running it" named the env file and `~/.config/openchamber` as the protected directory.
- **Check after:** env file and `chats/` deleted; `~/.config/ohpichamber` listing has neither (`config-ohpichamber-ls.txt`, names only); `standards.md` "Running it" names `~/.config/ohpichamber` and `~/.config/OhPiChamber` as real product data, isolates `HOME`/`OPENCHAMBER_DATA_DIR`/`OPENCHAMBER_DESKTOP_USER_DATA_DIR`, and configures real providers through the app or a read-only `~/.omp/agent` copy; `development.md` M0 provider-smoke section and rebrand status updated; `bun run docs:validate` and `.workflow/bin/workflow validate` exit codes (0 each) and counts (696 pages/58 links, 328 files).
- **Review:** pass (base 7e9251f0d90a7191b4a1c5629c1d8e8af6de2f5e) — independent flow-verify reviewer, 0 blocking findings (standards.md "Running it" and development.md provider-smoke text checked against scripts/omp-m0/run.mjs; remaining hits are decisions, done-effort specs and evidence JSON; ~/.config/ohpichamber verified without the env file and chats/).
