# 06: Retire the VS Code extension support path

**Effort:** omp-through-m3
**Task type:** refactor
**Base commit:** <commit-sha>

**Delivers:** The VS Code extension is removed from supported build/release/runtime paths while external editor launch and VS Code theme import remain available in retained surfaces.

**Blocked by:** 03
**Files:** `packages/vscode/`, root/package manifests and scripts, release/build workflows, retained editor-launch and theme-import callers, documentation

**Read first:** `.workflow/specs/omp-through-m3.md` M1/W2; `.workflow/omp-migration/scope.md` VS Code retirement and retained capabilities; root package scripts; package docs; repository-wide VS Code references
**Covers:** W2

**Check:** `bun run docs:validate && bun run dead-code` → documentation passes and the report contains no retained package/build/release import of `packages/vscode`; retained editor/theme paths remain referenced by Web/Electron code.

- [ ] Inventory all package, script, release and documentation references before removal.
- [ ] Remove the extension package and its supported build/release/runtime entrypoints.
- [ ] Preserve external editor launch and VS Code theme archive/JSON import behavior.
- [ ] Remove stale aliases and extension-only tests instead of replacing them with no-op tests.
- [ ] Update package/workspace metadata and Docker manifest handling if the workspace changes.
