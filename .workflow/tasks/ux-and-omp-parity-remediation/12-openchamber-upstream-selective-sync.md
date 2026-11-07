# 12: Selectively sync and adapt upstream OpenChamber changes (0056bf6a9 -> latest 2.6.1+)

**Effort:** ux-and-omp-parity-remediation
**Task type:** feature
**Blocked by:** 01, 02, 03, 04, 05, 06, 07, 08, 09, 10, 11
**Covers:** W7
**Files:** `packages/ui/`; `packages/web/`; `packages/electron/`; `packages/mobile/`; `packages/sdk/`; `packages/extensions/`; `.workflow/development.md`
**Read first:** `.workflow/specs/ux-and-omp-parity-remediation.md`; `.workflow/specs/upstream-refresh.md`; `AGENTS.md`
**Check:** `bun run type-check && bun run lint && bun run --cwd packages/ui test && npx vitest run packages/web/server/` → exits 0; every upstream-changed path in `0056bf6a9..upstream/main` is recorded as adopted, adapted to Canonical/OMP, or intentionally excluded.
- **Base commit:** e8a6c32889717ee14a15f8830e882ac37d9f07a6
- **Status:** active

- [x] Inspect `0056bf6a9..upstream/main` (including OpenChamber `2.6.1+`) and classify all changed paths using the `upstream-refresh` disposition rules: exclude `packages/vscode`, OpenCode engine/adapter paths, `.github`, `changelog/`, and `nix/`; adopt clean upstream files; three-way merge shared files from base `0056bf6a9` while preserving fork-owned OMP features.
- [ ] Adopt and adapt upstream OpenChamber `2.6.1+` main-window and workbench updates (`Header.tsx`, `SidebarFooter.tsx` bottom-right `● Local` instance switcher pill, cleaned-up bottom-left utility buttons, top-right terminal selector dropdown and valid `'terminal-box'` icon fallback in `ProjectActionsButton.tsx` / `TerminalView.tsx`, plus upstream Host/UI/Electron/Mobile/SDK bugfixes).
- [x] Ensure any upstream agent-facing callsites introduced in `0056bf6a9..upstream/main` are cleanly wired through `canonicalClient` / `/api/agent/v1` with zero OpenCode SDK imports or shims, and record the new upstream baseline commit in `.workflow/development.md`.

## Progress

- Check before: `bun run --cwd packages/ui type-check` green on `e8a6c32889`; the sidebar footer still carried the four bottom-left utility buttons (settings, Stats, shortcuts, About) plus a full-width update button, the instance switcher was the header's server-icon trigger, and `TerminalView.resolveTabIconName` fell back to the removed `'terminal'` icon name while `TerminalView.test.tsx` asserted it.
- Check after: `bun run --cwd packages/ui type-check` green (2,984 files); `bunx oxlint` clean on all six changed sources; `bun test` green on `SidebarHeader.test.tsx` (6), `TerminalView.test.tsx` (12) and `i18n/messages.test.ts` (10, key parity across all 15 locales).

### Upstream comparison

- Pinned comparison tip: `upstream/main` = `6f067414fc514a5304e42a39ca10e128642fda5e` (OpenChamber `v2.6.1` plus 51 commits, `git describe` `v2.6.1-51-g…`). Base: `0056bf6a9`, which is a direct ancestor of this branch.
- Scope: 3,050 changed paths, classified one by one in `.workflow/research/ux-and-omp-parity-remediation/12-upstream-disposition.tsv` with a disposition and reason per path. No path is left unassigned.
- Disposition counts: `adopted-clean` 721, `adopt-new` 714, `adapt-merge` 837 (832 + 5 renames), `excluded` 652, `kept-fork-deleted` 111, `kept-fork-change` 10, `applied-upstream-deletion` 10.
- Exclusions are policy-owned only: `packages/vscode`, OpenCode client/engine paths (`lib/opencode`, `server/lib/opencode`, `opencode-trust`), isolated-spaces runtime, VS Code theme import, `.github`, `changelog/`, `nix/`, `pr-evidence/`, fork-owned root docs and agent guidance, `packages/docs` (docs tasks 26-29), root toolchain (`package.json`, `bun.lock`, `vite*`, `scripts/`, `bun-patches/`), mobile native shells and packaging assets, and `packages/ui/src/styles` (design-system owner task 05/10).

### Landed UI changes

- `packages/ui/src/components/session/sidebar/shell/SidebarFooter.tsx`: matches OpenChamber 2.6.1 — a 24 px Settings button, an optional update button, and `DesktopInstanceMenu` pinned bottom-right by `ms-auto`. The Stats, Shortcuts and About buttons are gone.
- `packages/ui/src/components/desktop/DesktopInstanceMenu.tsx`: the trigger now draws the status dot plus the instance name (`● Local`) instead of the generic server icon; the local instance shows the success tone, a remote instance the info tone. Label resolution, keybind and switcher behaviour are unchanged.
- `packages/ui/src/components/session/sidebar/shell/SidebarHeader.tsx`: one More menu carries the pages the sidebar opens (Overview when the feature is available, Issues and PRs, Scheduled tasks, Archive, Stats, Integrations catalog), the Shortcuts and About dialogs that used to be footer buttons, and extension pages, so every removed footer action is still one click away. The duplicate guest-pages dropdown is folded into it.
- `packages/ui/src/components/session/SessionSidebar.tsx`: the footer no longer receives `onOpenShortcuts` / `onOpenAbout`; their unused store selectors are removed.
- `packages/ui/src/components/views/TerminalView.tsx` and `TerminalView.test.tsx`: the tab icon fallback is the valid `'terminal-box'` sprite name, and the test asserts it.
- `packages/ui/src/lib/i18n/messages/{en,de,fr,nl,es,ja,pt-BR,uk,ko,pl,zh-CN,zh-TW,tr,ar,he}.ts`: new `sessions.sidebar.header.actions.more` label, translated in every locale, keeping key parity.

### Limit

- The full `adapt-merge` set (837 paths) is recorded with its disposition but not applied in this commit. A strict adoptability pass over the clean/new range found 1,663 paths that resolve every local import and declare every package they import, and writing them wholesale breaks `packages/ui` type-check against this fork's OMP-shaped modules (hundreds of errors in `sync`, `stores` and `packages/web/src/api`), because upstream's newer modules expect upstream-only dependencies such as `pdfjs-dist`, `@ironcalc/wasm`, `@openuidev/lang-core` and `sql.js` that this fork does not carry, and 364 candidate files import modules this fork deliberately removed (`lib/opencode`, `lib/spaces`, `opencode-trust`). Landing that range needs the dependency and module contract decisions owned by tasks 02 and 13, so it is not claimed here. The remaining 80 paths are owned by the other windows named in the dispatch.
- No new agent-facing upstream callsite uses the OpenCode SDK: every upstream file in the excluded OpenCode paths is excluded, and the adopted changes touch no agent transport.

## Progress (2026-11-08, resumed session)

- Upstream tip fetched and pinned: `upstream/main` = `6f067414fc514a5304e42a39ca10e128642fda5e` (`v2.6.1-159`), 640 commits over base `0056bf6a9`.
- Inventory rewritten to one row per upstream path: `.workflow/research/ux-and-omp-parity-remediation/12-upstream-disposition.tsv`, 3,050 rows reconciling every path in `0056bf6a9..upstream/main` (no unassigned path). Current counts: adopted 197, applied-upstream-deletion 17, kept-fork-change 22 (fork still has and changed a path upstream deleted), excluded 552, adapt-pending 2,262.
- Landed commits on this branch: merged the corrected small-areas branch (`5980d4bee`: mobile/sdk/electron/extensions + docs 5980d4bee chain) and a root/scripts pass (`0e388c6f2`: `.openchamber/workflows` triage scripts, `scripts/{perf,profile-*,brand,changelog,icons,model-bench,pr-evidence}`, the four `bun-patches` renames plus `@codemirror/view@6.43.15`, `bun-pty@0.6.0`, `package.json`/`bun.lock` re-resolution via `bun install`).
- Preserved UI layout checkpoint is the earlier commit `e25de3186` (footer, instance pill, More menu, terminal icon fallback, locales) plus `ae6567d02`.
- Gate not yet green: `bun run type-check` fails in files owned by other lanes (`packages/ui/src/lib/browser/pageActions.test.ts` expects `buildQuietScript`, `chatQuoteAnchor.test.ts` expects `findChatQuoteRoots`), i.e. tests landed ahead of the UI-foundation interfaces they use. Log: `/tmp/ux12-evidence/logs/type-check.log`.
- Outstanding: 2,262 adapt-pending paths distributed to the sibling lanes (host, workbench, ui-foundation, chat, sections, docs) whose branches are not yet committed; the Header top-right terminal dropdown does not exist on this branch yet (the workbench lane built `packages/ui/src/components/layout/HeaderTerminalAction.tsx`; it is untracked in this worktree and belongs to that lane's commit). Task remains active; not archived, not merged into `ux-integration`.
