# 26: Commands, Plugins, Agents and Usage pages serve GUI users (R2)

**Effort:** ux-v270-omp-alignment
**Blocked by:** 25
**Covers:** W3
**Files:** `packages/ui/src/components/sections/commands/{CommandsPage,CommandsSidebar}.tsx`; `packages/ui/src/components/sections/plugins/{PluginsPage,ExtensionControlCenter}.tsx`; `packages/ui/src/components/sections/agents/{AgentsPage,AgentsSidebar}.tsx`; `packages/ui/src/components/sections/usage/UsagePage.tsx`; `packages/ui/src/components/views/usage/UsageStatsView.tsx`; `packages/web/server/lib/quota/`; related i18n modules
**Read first:** `decisions.md: 2026-11-10 - OMP TUI parity…`; `research/ux-v270-systemic-review.md` R2; upstream v2.7.0 counterparts (`git show bc50ba56a:<path>`); `packages/ui/src/components/sections/PATTERNS.md`; skills `locale-ui-patterns`, `enterprise-boundary`
**Check:** `VITEST_MAX_WORKERS=2 bunx vitest run packages/ui/src/components/sections packages/web/server/lib/quota && bun run lint` → exit 0, with the duplicate-owner test passing; real path: the Commands page creates and edits a prompt template while chat autocomplete still offers OMP built-ins; a plugin installs from the marketplace; an agent's tools are edited in one control; Usage shows token analytics plus quotas for providers configured in OMP
**Base commit:** ab047171d642c5077422fab8b4fad6111b70bcd5
**Status:** active

- [x] The Commands page manages prompt templates (`.omp/commands/*.md`, `~/.omp/agent/commands/*.md`); built-in OMP commands appear only in chat autocomplete.
- [x] The Plugins page follows the Skills catalog layout (installed, marketplace with working install/uninstall). Capability sources are listed only when they have items, and raw worker ids and engine diagnostics are hidden from the main view.
- [x] The Agents page has one tool-permission editor.
- [x] Usage combines upstream's token analytics with quota cards whose credentials come from OMP's auth store, showing only configured providers.
- [x] Deletes: the CLI command list and its CRUD shell, the 21-pill provider wall and raw inspector, the duplicate tool `<ul>` list and text input, and the unconfigured-provider loop on Usage.

## Progress

**Check before:** `VITEST_MAX_WORKERS=2 bunx vitest run packages/ui/src/components/sections packages/web/server/lib/quota` fails at baseline: 56 of 91 UI test files are `bun:test` files that vitest cannot import (`Cannot find package 'bun:test'`). The quota leg alone passes 35 files / 436 tests. Recorded decision (2026-11-12) substitutes `bun --cwd packages/ui test src/components/sections` for the UI leg; baseline run of that command: 1281/1281 files passed.

**Check after:**
- `VITEST_MAX_WORKERS=2 bunx vitest run packages/web/server/lib/quota` → 35 files / 436 tests passed, exit 0.
- `bun --cwd packages/ui test src/components/sections` → 1277/1277 test files passed, exit 0 (includes `settingsItemOwnership.test.ts`, the duplicate-owner test).
- `bun run lint` → exit 0 (only pre-existing warnings in untouched files).
- `bunx oxlint` on the seven created/substantially rewritten TSX files → no findings.
- `bun run dead-code` → inspected; every finding is in files this task did not touch (`quota/route-error.js`, `opencode-zen.js`, `lib/quota/index.ts`).
- `bun run --cwd packages/ui type-check` → the same nine error files as the base commit, all in `openchamber/` and `shared/ModelRoleEditor.tsx` (a pre-existing `globalLevel` prop mismatch landed by task 25). No error names a file this task owns.

**Real path (port 4126, `bun run dev` with API 4126 / UI 4125, provider env sourced):**
- `/api/agent/v1/workspaces/<ws>/commands` lists 30 OMP built-ins in `builtinCommands` (the chat autocomplete source) and no editable entries before a template exists. Creating `t26-demo` through the page's own request wrote `.omp/commands/t26-demo.md` in the workspace; editing it changed the frontmatter description and body on disk. The page lists only the editable entry, with zero overlap against the built-in names.
- `/api/agent/v1/workspaces/<ws>/plugins` reports one marketplace entry (`proof` in `local-proof`) and no installed plugins. The marketplace install request the page sends returns 400 `INVALID_REQUEST` from the Agent Service ("Native plugin operation failed. Check the plugin identity, source and diagnostics.") — the local proof catalog's entry is not installable by the native installer, so a successful marketplace install was **not** observed on this environment.
- `/api/quota/providers` returns `{"providers":[]}`: no provider credential resolves from OMP's auth store in this environment, so the Usage page correctly renders the no-quota state and no provider card. A populated quota card was **not** observed.
- The dev servers were closed afterwards (both ports answer 000).

**Review:** one `reviewer` subagent on the diff against `ab047171d`. Two blocking findings, both fixed in `ecf16f2ad`: marketplace installed keys now include the install scope, and the `usage.quotas` settings anchor exists in both the empty and populated states.
