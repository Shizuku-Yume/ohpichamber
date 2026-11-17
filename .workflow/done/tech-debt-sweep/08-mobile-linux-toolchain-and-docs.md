# 08: Mobile build helpers find Linux toolchains, and the mobile docs stop promising M5 work

**Effort:** tech-debt-sweep
**Task type:** bugfix
**Blocked by:** None
**Covers:** W9
**Files:** `packages/mobile/scripts/with-mobile-env.mjs` (+ test beside `runtime-websocket.test.mjs`); `packages/mobile/README.md`; `packages/mobile/DOCUMENTATION.md`; `packages/mobile/HANDOFF.md`
**Read first:** `.workflow/specs/tech-debt-sweep.md` (item 6); `packages/mobile/README.md`; `.workflow/specs/m7-release-verification.md` (device runs belong there)
**Check:** `node --test packages/mobile/scripts/` → exit 0 with cases for linux, darwin and an explicit env override; `bun run docs:validate` exits 0; `grep -n 'planned for M5' packages/mobile` prints nothing.
**Base commit:** a3b5030876d98e4b5ac3cd0ae71d89b4363be28f

- [x] `with-mobile-env.mjs` defaults `JAVA_HOME`/`ANDROID_HOME` per platform (Linux: the common JDK 21 and `~/Android/Sdk` locations, checked for existence; macOS: Homebrew), and an explicit env value always wins.
- [x] README/DOCUMENTATION/HANDOFF describe the current state: Host-connected Capacitor shell on the Canonical Client, Guest iframe status as it is today, device verification owned by M7. No app-identity edits (the `rebrand` effort owns `com.openchamber.app`).

## Progress

- **Root cause:** packages/mobile/scripts/with-mobile-env.mjs unconditionally defaulted JAVA_HOME, ANDROID_HOME/ANDROID_SDK_ROOT, and DEVELOPER_DIR to macOS Homebrew and Xcode.app paths on every OS (injecting /opt/homebrew/... onto Linux PATH) and had no directory test entry for node --test packages/mobile/scripts/ under Node 24; packages/mobile/{README,DOCUMENTATION,HANDOFF}.md still carried pre-M5/M6 wording ("planned for M5" for Guest iframes, macOS-only local tooling assumptions, X-OpenCode-Directory* CORS headers, and pre-workflow CI gaps).
- Check before: On base commit a3b5030876d98e4b5ac3cd0ae71d89b4363be28f, running with-mobile-env.mjs on Linux with unset JAVA_HOME/ANDROID_HOME injected JAVA_HOME=/opt/homebrew/opt/openjdk@21 and ANDROID_HOME=/opt/homebrew/share/android-commandlinetools; grep -rn 'planned for M5' packages/mobile matched packages/mobile/README.md:9; node --test packages/mobile/scripts/ exited 1 with MODULE_NOT_FOUND (receipt: /home/shizuku/Project/ohpichamber-omp-artifacts/tech-debt-sweep-2026-11-18/task08/check-before.log).
- Check after: node --test packages/mobile/scripts/ exited 0 (9 tests: 8 passed covering linux JDK 21 and ~/Android/Sdk / /opt/android-sdk discovery, linux unset/PATH hygiene, darwin Homebrew and xcode-select defaults, explicit JAVA_HOME/ANDROID_HOME/ANDROID_SDK_ROOT/DEVELOPER_DIR overrides, and real CLI subprocess env injection + exit-code propagation; 1 skipped darwin-only runtime-websocket.test.mjs); bun run docs:validate exited 0 (696 pages, 58 sidebar links); grep -rn 'planned for M5' packages/mobile printed nothing (exit 1); real Linux CLI runs of node packages/mobile/scripts/with-mobile-env.mjs verified unset-when-absent, fake ~/Android/Sdk + JDK discovery, and explicit overrides; bun run lint:mobile, bun run type-check:mobile, oxlint anti-slop, knip mobile workspace, and bun scripts/upstream-drift.mjs --markers --check exited 0 (receipt: /home/shizuku/Project/ohpichamber-omp-artifacts/tech-debt-sweep-2026-11-18/task08/check-after.log).
- Review: pass (base a3b5030876d98e4b5ac3cd0ae71d89b4363be28f) — workflow-reviewer-08
