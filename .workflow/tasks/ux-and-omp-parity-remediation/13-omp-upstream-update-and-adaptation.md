# 13: Update OMP to the latest upstream release and adapt Agent Service, Contracts, and UI

**Effort:** ux-and-omp-parity-remediation
**Task type:** feature
**Blocked by:** 01, 02, 03, 04, 07, 09, 10, 11
**Covers:** W25
**Files:** `vendor/omp/`; `package.json`; `bun.lock`; `packages/agent-contract/`; `packages/agent-service/`; `packages/ui/`; `packages/electron/scripts/prepare-agent-runtime.mjs`
**Read first:** `.workflow/specs/ux-and-omp-parity-remediation.md`; `.workflow/done/post-m3-hardening/29-vendor-native-leaves.md`; `vendor/omp/650f3a10/README.md`
**Check:** `bun install --frozen-lockfile && bun run --cwd packages/agent-service type-check && bun run --cwd packages/agent-service build && bun test packages/agent-service/src && bun run --cwd packages/electron prepare:agent-runtime && bun run --cwd packages/electron verify:agent-runtime` → exits 0.

- [ ] Acquire the latest upstream Oh My Pi (`can1357/oh-my-pi`) release/source, pack or verify the 13 first-party `@oh-my-pi/*` tarballs plus all 6 platform native leaves (`linux-x64`, `linux-arm64`, `darwin-x64`, `darwin-arm64`, `win32-x64`, `win32-arm64`) under `vendor/omp/<new-sha>/` with `copy-manifest.json` SHA-256 verification, rebase the SDK patch (`observeBashJobs`, `BashJobEvent`, `initialModelRefreshStrategy`), and update root `package.json` overrides, `packages/agent-service/package.json`, and `bun.lock`.
- [ ] Audit upstream OMP changes since `18.16.0` (`650f3a10`) and adapt `packages/agent-service`, `packages/agent-contract`, and `packages/ui` to all new/changed OMP runtime behaviors:
  - Align default session/execution mode with upstream OMP's default `code` mode (`code` agent / mode controller defaults and UI mode selector display).
  - Sync any newly added or modified OMP settings (`OMP_SETTING_IDS` and `OmpSettingsPage.tsx` i18n/controls), built-in slash commands (`ALLOWED_BUILTIN_COMMANDS`), tool definitions/renderers, and capability providers.
- [ ] Re-stage and verify the bundled Electron/Web Agent Runtime (`prepare:agent-runtime` and `verify:agent-runtime`).
