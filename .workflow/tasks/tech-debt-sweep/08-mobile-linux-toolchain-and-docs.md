# 08: Mobile build helpers find Linux toolchains, and the mobile docs stop promising M5 work

**Effort:** tech-debt-sweep
**Task type:** bugfix
**Blocked by:** None
**Covers:** W9
**Files:** `packages/mobile/scripts/with-mobile-env.mjs` (+ test beside `runtime-websocket.test.mjs`); `packages/mobile/README.md`; `packages/mobile/DOCUMENTATION.md`; `packages/mobile/HANDOFF.md`
**Read first:** `.workflow/specs/tech-debt-sweep.md` (item 6); `packages/mobile/README.md`; `.workflow/specs/m7-release-verification.md` (device runs belong there)
**Check:** `node --test packages/mobile/scripts/` → exit 0 with cases for linux, darwin and an explicit env override; `bun run docs:validate` exits 0; `grep -n 'planned for M5' packages/mobile` prints nothing.

- [ ] `with-mobile-env.mjs` defaults `JAVA_HOME`/`ANDROID_HOME` per platform (Linux: the common JDK 21 and `~/Android/Sdk` locations, checked for existence; macOS: Homebrew), and an explicit env value always wins.
- [ ] README/DOCUMENTATION/HANDOFF describe the current state: Host-connected Capacitor shell on the Canonical Client, Guest iframe status as it is today, device verification owned by M7. No app-identity edits (the `rebrand` effort owns `com.openchamber.app`).
