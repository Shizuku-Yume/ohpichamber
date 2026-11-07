# 12: Selectively sync and adapt upstream OpenChamber changes (0056bf6a9 -> latest 2.6.1+)

**Effort:** ux-and-omp-parity-remediation
**Task type:** feature
**Blocked by:** 01, 02, 03, 04, 05, 06, 07, 08, 09, 10, 11
**Covers:** W7
**Files:** `packages/ui/`; `packages/web/`; `packages/electron/`; `packages/mobile/`; `packages/sdk/`; `packages/extensions/`; `.workflow/development.md`
**Read first:** `.workflow/specs/ux-and-omp-parity-remediation.md`; `.workflow/specs/upstream-refresh.md`; `AGENTS.md`
**Check:** `bun run type-check && bun run lint && bun run --cwd packages/ui test && npx vitest run packages/web/server/` → exits 0; every upstream-changed path in `0056bf6a9..upstream/main` is recorded as adopted, adapted to Canonical/OMP, or intentionally excluded.

- [ ] Inspect `0056bf6a9..upstream/main` (including OpenChamber `2.6.1+`) and classify all changed paths using the `upstream-refresh` disposition rules: exclude `packages/vscode`, OpenCode engine/adapter paths, `.github`, `changelog/`, and `nix/`; adopt clean upstream files; three-way merge shared files from base `0056bf6a9` while preserving fork-owned OMP features.
- [ ] Adopt and adapt upstream OpenChamber `2.6.1+` main-window and workbench updates (`Header.tsx`, `SidebarFooter.tsx` bottom-right `● Local` instance switcher pill, cleaned-up bottom-left utility buttons, top-right terminal selector dropdown and valid `'terminal-box'` icon fallback in `ProjectActionsButton.tsx` / `TerminalView.tsx`, plus upstream Host/UI/Electron/Mobile/SDK bugfixes).
- [ ] Ensure any upstream agent-facing callsites introduced in `0056bf6a9..upstream/main` are cleanly wired through `canonicalClient` / `/api/agent/v1` with zero OpenCode SDK imports or shims, and record the new upstream baseline commit in `.workflow/development.md`.
