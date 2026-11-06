# 10: Run integrated M5 gate verification across W1–W5

**Base commit:** 106acde94406c48835761bada2c573410e3535d7
**Effort:** m5-release-surfaces
**Blocked by:** 01, 04, 06, 07, 08
**Files:** `.workflow/development.md`, `packages/electron/README.md`, `packages/mobile/README.md`, `packages/web/README.md`
**Read first:** `.workflow/specs/m5-release-surfaces.md` (W1–W5)
**Covers:** W1, W2, W3, W4, W5
**Check:** On the merged `m5-release-surfaces/integration` tip, `.workflow/bin/workflow validate`, `bun install --frozen-lockfile`, `bun run type-check`, `bun run lint`, `bun run test`, and `bun run docs:validate` all exit 0, and W1–W5 artifacts/evidence are recorded in `.workflow/development.md`.

- [x] Re-verify W1–W5 together on the integrated `m5-release-surfaces/integration` tip (zero OpenCode/VSCode CI or Docker remnants, standalone `@openchamber/web` clean-prefix smoke receipt, Linux x64 Electron AppImage + Guest SDK `v2` receipt, Isolated Spaces fail-closed check, and `shutdown.test.js` stability).
- [x] Run full workspace gates (`bun install --frozen-lockfile`, `bun run type-check`, `bun run lint`, `bun run test`, `bun run docs:validate`) and record exact pass counts and M5 completion evidence in `.workflow/development.md` (keeping `.workflow/specs/m5-release-surfaces.md` at `Status: in progress` for maintainer `flow-close`).

## Progress

- **Check before:**
  - Pinned base commit: `106acde94406c48835761bada2c573410e3535d7` (integration tip with all constituent tasks `01`, `04`, `06`, `07`, `08` archived in `.workflow/done/m5-release-surfaces/`).
  - Claim lock `/tmp/m5-10.claim` successfully acquired.
  - Spec `.workflow/specs/m5-release-surfaces.md` verified at `Status: in progress`.

- **Work:**
  - Re-verified W1–W5 artifacts and evidence across all parallel lanes:
    - W1: All 8 GitHub workflow manifests cleaned of legacy `opencodeCli`/`vscode` targets; `bun@1.4.4` and Node 24 pinned; optional signing enabled for unsigned macOS/Windows/iOS/Android builds.
    - W2: `@openchamber/web` standalone tarball `openchamber-web-3.0.0.tgz` (285.43 MB, SHA-256: `1003e7b63e9a91b0c32840d29c94a80659039f9b38fed6f016661320d081b5f4`) verified in clean temp prefix `/tmp/openchamber-clean-smoke-m5-b` outside repo; ready 200 `{ ready: true, engine: "omp", version: "1.0.0" }`; real-provider prompt completed (`gemini-3.5-flash-lite`, answer: `"PONG"`).
    - W3: Linux x64 Electron AppImage (SHA-256: `df687bee0a54b4a8a72465fb04f1385a5128c288b0ea8b09f9bb9f9fca741e90`) verified with `resources/agent-runtime` staged and tested under Xvfb via `/dev/fuse`; ready 200, real-provider prompt completed, Guest SDK v2 panel rendered.
    - W4: `Dockerfile` and `docker-compose.yml` updated for OMP 18.16.0 with all 17 workspace manifests and 0 opencode volumes.
    - W5: `ISOLATED_SPACES_RELEASED = false` authoritatively fail-closed across all spaces endpoints; 0 `@opencode/*` remnants; `shutdown.test.js` timing race resolved (10/10 runs passed).
  - Recorded comprehensive M5 verification and pass counts in `.workflow/development.md`.
  - Maintained `.workflow/specs/m5-release-surfaces.md` at `Status: in progress`.

- **Check after:**
  - `bun install --frozen-lockfile`: exit 0 (1,447 installs across 1,597 packages).
  - `bun run type-check`: exit 0 (0 type errors across 3,221 files in 5 projects: root/UI, electron, agent-contract, agent-service, mobile).
  - `bun run lint`: exit 0 across all workspaces.
  - `bun run docs:validate`: exit 0 (672 pages, 56 sidebar links valid).
  - `bun run test`: scripts 23/23 passed; SDK 26/26 passed; UI 1021/1021 test files passed; agent-contract 192/192 tests passed; agent-service supervisor 75/75 tests passed; electron architecture 72/72 passed, updater 22/22 passed; web spaces and terminal suites passed.
  - `.workflow/bin/workflow validate`: exit 0 (210 task files valid).
