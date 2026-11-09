# 14: Run the full workspace static gate and 24-point real-path verification across Web and Electron

**Effort:** ux-and-omp-parity-remediation
**Task type:** feature
**Blocked by:** 12, 13
**Covers:** W26
**Files:** `.workflow/development.md`; `.workflow/specs/ux-and-omp-parity-remediation.md`
**Read first:** `.workflow/specs/ux-and-omp-parity-remediation.md`; `.workflow/standards.md`; `AGENTS.md`
**Check:** `bun run dead-code && bun run type-check && bun run lint && bun run docs:validate && VITEST_MAX_WORKERS=2 bun run test && .workflow/bin/workflow validate` → all exit 0, and real-path Web + packaged Electron walkthrough verifies W1–W26.
- **Base commit:** 26ba4b932a99a0639f544ebbb519ba889ce3c5ec

- [x] Run the full workspace static verification suite (`bun run dead-code`, `bun run type-check`, `bun run lint`, `bun run docs:validate`, `VITEST_MAX_WORKERS=2 bun run test`, `.workflow/bin/workflow validate`) on the integration branch and resolve any cross-task regressions.
- [x] Build and launch both the Web surface and packaged Electron desktop app (`bun run electron:build`), drive every single one of the 24 reported items (`W1`–`W25`) end to end with a real provider and local `omp` installation, capture verification receipts/screenshots, and record the final evidence in `.workflow/development.md`.

## Progress

**Check before:** `bun run dead-code` exit 1 (62 unused files / 211 unused exports / 6 configuration hints); `bun run type-check`, `bun run lint`, `bun run docs:validate`, `.workflow/bin/workflow validate` exit 0; `VITEST_MAX_WORKERS=2 bun run test` failed 2 suites (agent-service `openchamber_image` not in `HOST_TOOL_NAMES`; web `DiffView.hunks.test.ts` missing an `aria-label`); no Web or Electron real-path run.

**Acceptance:** technical work complete; maintainer acceptance pending. `bun run dead-code` still exits 1 and the packaged ripgrep source is the host binary — both recorded below rather than claimed as passes.

**Check after:** `bun run type-check` exit 0 (3,743 files, 5 projects); `bun run lint` exit 0 (7 pre-existing UI `react-hooks/exhaustive-deps` warnings); `bun run docs:validate` exit 0 (696 pages, 58 sidebar links); `VITEST_MAX_WORKERS=2 bun run test` exit 0 (7/7 suites, Web 518 files / 8,451 tests); `.workflow/bin/workflow validate` exit 0 (238 task files); `bun run dead-code` exit 1 (61 unused files / 214 unused exports / 2 namespace exports / 103 unused exported types / 6 hints) — net-new over the main baseline (18 unused files / 65 unused exports / 69 unused exported types / 3 hints), not a claimed pass.

Real path: built Web on `127.0.0.1:3970` and the packaged `OpenChamber-3.0.0-linux-x86_64.AppImage` under Xvfb both exercised W1–W25 with the real provider (`gate-real-provider/gemini-3.5-flash-lite`) and system `omp/18.18.1`; evidence and screenshots in `/home/shizuku/Project/ohpichamber-omp-artifacts/ux-dispatch-2026-11-07/gate-evidence/`, receipt in `.workflow/development.md`.

Fixes landed while running the gate: quota module re-exported three names its provider index never exposed, so every `/api/quota/*` route answered 503 (module now imports, plus the missing server-side OpenCode Zen provider); project-scope `AGENTS.md` always 403 because behavior routes read `workspace.cwd` from the canonical public projection (now resolved through `resolveWorkspaceScope`); the Notifications page crashed with React #185 from an unstable zustand selector for `notifyOnPullRequests` (field now exists in the store, UI registry, host registry and sanitizers); `/api/openchamber/tunnel/status` 500 on a fresh data dir from `null.length`; duplicate `7zip-bin` key in `packages/web/package.json`; Electron packaging dropped upstream's `@openchamber/web` `files` exclusions and never ported `prepare:ripgrep`/`Resources/ripgrep`.

Accepted limits: dead-code exits 1; packaged ripgrep is staged from the host binary (`OPENCHAMBER_RIPGREP`) rather than the pinned npm tarball, so a cross-architecture build needs that variable; no paired peer, remote marketplace source or tunnel session existed to exercise W15's paired list, W22's marketplace install, or a live tunnel.
