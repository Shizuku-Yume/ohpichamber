# 10: Design system, theme and rebranding

**Effort:** upstream-refresh
**Task type:** feature
**Base commit:** 4d69e299e46344ccc2d29df6b2cb7e4b2a9c8e2c
**Started:** 2026-10-27T05:10:00Z
**Finished:** 2026-10-27T06:05:00+08:00

**Delivers:** Upstream's UI primitives, spacing/raised-surface styling, logos, app icons, PWA assets and theme catalog are in place, with the fork's theme-import behavior preserved.

**Blocked by:** 02
**Files:** Path list: `/home/shizuku/Project/ohpichamber-omp-artifacts/upstream-sync-2026-10-27/plan-paths/10.tsv` (226 paths: 215 clean/new, 10 both-side, 3 conflicts; includes 89 assets). Main locations: `packages/ui/src/components/{ui,icon,icons,onboarding,update,emoji}`, `packages/ui/src/{assets,styles,App.css,index.css}`, `packages/ui/src/lib/theme/`.

**Read first:** Spec W6; `packages/ui/src/lib/theme/STYLING.md`; `.agents/skills/locale-ui-patterns/SKILL.md`; `.agents/skills/openchamber-change-discipline/SKILL.md`; decisions.md: 2026-10-27 - Keep the fork version at 3.0.0 (branding assets do not change the version).
**Covers:** W6

**Check:** `bun install --frozen-lockfile` and `bun run type-check` and `bun run lint` and `bun run test` all exit 0, `bun run --cwd packages/ui build` exits 0, and the running app renders the new logo/icons and both light and dark themes without layout regressions. Real path: switch theme, open a dialog and a toast, and capture screenshots for the task record.

## Done when

- [x] Logo, app icons and PWA assets are applied everywhere the upstream set covers, including the Electron and web public directories owned by tasks 05 and 22 (coordinate; do not duplicate).
- [x] Design tokens are the single source for spacing, radius and surface elevation; no component keeps a parallel token set.
- [x] Theme import still accepts the fork's existing themes; OpenCode-named theme fixtures remain only as fixtures.
- [x] Onboarding and update surfaces render with the new primitives.

## Progress

**Base branch point:** cut from `upstream-refresh/integration` at `4d69e299e4` (tasks 01, 02 landed). Upstream tip `0056bf6a9`, adoption base `1f9320062`. Bun 1.4.4 from `~/.local/opt/bun/v1.4.4/bun-linux-x64`.

**What landed:** 211 of the 226 paths carry upstream's `0056bf6a9` content (215 clean/new minus 14 deferred, plus 5 clean three-way merges and 2 adapted files), the upstream deletion of `App.css` is applied, and the fork's OMP onboarding and VS Code-free styling are preserved. Every primitive call site in the tree was migrated to the new primitive contracts.

**Conflicts and fork restorations (3 conflict files, 11 hunks):**
- `packages/ui/src/index.css` (2 hunks): adopted upstream's token/utility blocks; kept the fork's VS Code-free stylesheet. Upstream's `.vscode-runtime` composer-placeholder rule and the `:not(.vscode-runtime)` header guard were not adopted because the fork has no VS Code surface; the two conflict hunks were the only places the merge could not apply the fork's earlier removals, so the rest of the file is upstream's.
- `packages/ui/src/components/onboarding/ChooserScreen.tsx` (2 hunks): kept the fork's file whole. Upstream's version is the retired OpenCode install/chooser flow; the fork's OMP desktop/remote chooser stays. Upstream's only generic changes there are RTL logical classes, which belong to task 20.
- `packages/ui/src/components/ui/CommandPalette.tsx` (7 hunks): not adopted — see deferred list. The fork's palette is unchanged.

**Adapted (upstream content, fork contract):**
- `packages/ui/src/components/ui/UpdateDialog.tsx` (clean merge): adopted. Two new `installBlocked` values needed the union in `packages/ui/src/lib/desktop.ts` (task 25's file) extended with upstream's exact type and comment, and `updateDialog.desktopHostInstall` added with a real translation in all 13 locales. `useUpdateStore` still maps only `service-manager` until task 23 adopts upstream's parser; the dialog is ready for the other values.
- `packages/ui/src/components/ui/MemoryDebugPanel.tsx` (clean merge): adopted with the shared-clock hook.
- `packages/ui/src/lib/theme/DOCUMENTATION.md` and `packages/ui/src/lib/theme/vscode/adapt.ts` (clean merges): adopted. VS Code theme import is retained (extension retirement does not retire theme import); `adapt.test.ts`, `definition.test.ts` and the theme suites pass (48 tests).
- Kept deleted: `components/onboarding/LocalSetupScreen.tsx`, `components/update/OutdatedServerNotice.tsx` (fork deleted their OpenCode-era predecessors; the OMP setup and update notices cover the need).

**Prerequisites adopted from other tasks' path lists** (self-contained modules an adopted file imports; content identical to upstream, so the owning task's later merge is a no-op):
- `packages/ui/src/hooks/clockPausedContext.ts`, `packages/ui/src/hooks/useDurationTicker.ts`, `packages/ui/src/hooks/usePageColors.ts` (task 24). The shared 250 ms/1 s clock replaces per-spinner timers; `spinner`, `busy-dots`, `pause-clock`, `OpenChamberLogo`, `MemoryDebugPanel` and `dialog` depend on it.

**Deferred — kept at the fork's version, dependency owner in parentheses:**
- `CommandPalette.tsx`, `commandPaletteMessages.tsx`, `commandPaletteFilesState.ts` (task 25: `lib/search/subsequenceSearch`, `lib/search/matchSegments`, `lib/settings/pageTitle`, `lib/projectActions.resolveProjectActionIconName`; tasks 23/25: `sync/session-pins`, `lib/sessionPins`; tasks 21/23: overview store state).
- `HelpDialog.tsx` (task 25: `open_project_actions` shortcut id and its registry entry).
- `textarea.tsx`, `components/emoji/{EmojiAutocomplete,emojiInlinePicker,useEmojiPicker,useEmojiPicker.test,DOCUMENTATION}` (task 15: `lib/emoji/shortcodes`, `components/inline-picker/*`).
- `JsonTreeViewer.tsx`, `JsonTreeView.tsx`, `JsonTreeView.test.tsx` (task 07: `views/files/FileTreeRowParts`, `fileTreeRow`; task 25: `FlatJsonNode.key`).
- `MatchHighlight.tsx`, `commandPaletteMatches.ts`, `commandPaletteMatches.test.ts` (task 25: `lib/search/matchSegments`).
- `OverlayScrollbar.tsx`, `sonner.tsx`, `sonner.test.tsx`, `sortable-tabs-strip.tsx` (task 20: i18n `direction`, `isRightToLeft`, `getLocaleDirection`).

**Identity and assets:** the fork stays `3.0.0`; no upstream version string is adopted. The new OpenChamber logo art (`components/ui/openChamberLogoArt.ts`, `OpenChamberLogo.tsx`) and the 89 integration logos under `assets/integration-logos/` are in place. The web public icons/PWA set (18 files) belongs to task 22 and the Electron icon set to task 05 — neither is duplicated here.

**Icon sprite:** upstream's generated `sprite.ts` is kept. Task 03's refreshed `scripts/generate-icon-sprite.mjs` still cannot see `satisfies`-typed icon records (for example `DocumentSymbolsPanel`'s `braces`) and would drop them on the next regeneration; the sprite stays upstream's superset until the generator scan covers that form (task 03's area). One fork-only call site (`components/chat/CommandAutocomplete.tsx`, redo icon `arrow-go-forward`) moved to the available mirrored undo arrow, because upstream's sprite (and the fork's generator) carry no forward-turn arrow.

**Token source:** `styles/design-system.css` (`oc-raised`, `oc-surface-elevated`, `.oc-field`, radius and spacing tokens), `index.css`, `typography.css`, `mobile.css` and the 56-theme catalog define spacing, radius and elevation; the adopted primitives read them. `SETTINGS_SELECT_SIZE` (a parallel size prop) is retired: `SelectTrigger` no longer takes a size, and its 59 call sites were migrated.

**Caller migration (59 attributes + 8 variant calls across 43 files):** `SelectTrigger size=…` removed in 21 files; `dropdownTriggerVariants({ size: 'sm' })` → `dropdownTriggerVariants()` (composer, multirun) or upstream's `mobile ? 'mobile' : 'default'` (git comparison selectors); `useDurationTickerNow` arity updated in `BackgroundShellsStrip`/`SessionActivityDuration`; `Icon name="todo"` → `git-pull-request` in `SidebarHeader`/`MobileSessionsSheet`. `sections/PATTERNS.md` and `sections/references/controls.md` describe the new contract.

**Checks (logs in `/home/shizuku/Project/ohpichamber-omp-artifacts/upstream-refresh-10-2026-10-27/logs/`):**
- `bun install --frozen-lockfile`: exit 0 (resolved after the branch was cut).
- `bun run type-check`: exit 0 (`type-check.log`).
- `bun run lint`: exit 0 (`lint.log`), one warning in adopted `tooltip.tsx`: its `no-physical-sides` disable is unused while that rule stays off until task 20.
- `bun run --cwd packages/ui build`: exit 0 (`ui-build.log`).
- `VITEST_MAX_WORKERS=2 bun run test`: exit 0, 7/7 suites, 374 files passed / 9 skipped, 6086 tests (`test.log`). The known host-config `network-defaults` failure did not reproduce, so no isolated-HOME rerun was needed.
- `bun run dead-code`: exit 1 with findings, inspected (`dead-code.log`): `components/ui/pause-clock.tsx` is unused until the clock-paused consumers land with tasks 20/24; `popup-side`/`color.ts`/`useDurationTicker`/`usePageColors` exports are consumed by later tasks' files; the two `knip.json` hints predate this task.
- `bunx oxlint` on the files this task substantially rewrote: exit 0 (`oxlint-authored.log`).

**Real path (observed):** `bun run dev` with `OPENCHAMBER_DATA_DIR=/tmp/ohpi-10-data`, UI `http://127.0.0.1:5280`, API `http://127.0.0.1:4902` (`dev.log`). UI `/` returned 200; `/site.webmanifest` 200; `GET /api/agent/v1/ready` returned 200 `{"ready":true,"engine":"omp","version":"1.0.0"}`. In Chrome (isolated context): light chat rendered, the settings dialog opened, Appearance showed the theme catalog (29 dark themes) and "Import VS Code theme", dark mode applied, Catppuccin selected (`--primary-base` `#cba6f7`, canvas `#1e1e2e`), and a toast rendered over the dialog. Screenshots in the evidence directory: `02-light-chat.png`, `04-dark-settings-appearance.png`, `05-dark-chat.png`, `06-dark-catppuccin-chat.png`, `08-toast-dialog-catppuccin.png`. Console errors seen: a `422` resource load and `DiffWorkerProvider` uncaught promises — neither from theme/token code; the diff-worker module load is task 12's area and is recorded as a limit, not claimed fixed.

**Commits:** at landing `91beee5231` (design system adoption and caller migration) and `a7054f6ef6` (this record), fast-forwarded onto `upstream-refresh/integration`.

**Console-error follow-up (2026-10-27):** the `422` and the `DiffWorkerProvider` uncaught promises from the real-path run are **pre-existing**, not introduced by the refresh. Reproduced with identical steps on `4d69e299e4` (before tasks 10/23/03) and at the integration tip, each in its own temporary worktree with an isolated `OPENCHAMBER_DATA_DIR`, its own ports (5281/4903 and 5282/4904), a fresh `bun run dev`, and the chat page loaded in Chrome with `fetch`/`XMLHttpRequest`/`unhandledrejection` instrumentation:
- `GET /api/source-control/binding?directory=<data-dir>/chats` answers `422` with `{"error":"Directory is not a supported Git repository","code":"UNSUPPORTED_SOURCE_CONTROL_REPOSITORY","reason":"not-a-git-repository"}` on both trees — the source-control probe for a chat directory that is not a Git repository; the UI handles it as "no source control", the browser logs the failed request.
- `WorkerPoolManager: worker initialization timed out after 10000ms`, four unhandled rejections on each tree, raised inside `DiffWorkerProvider`'s pool construction. The pool warms on `requestIdleCallback` while a cold Vite start is still optimizing dependencies; on a warm load neither tree shows any unhandled rejection.
Console counts are identical (`422` ×1, `Uncaught (in promise)` ×4) before and after the refresh. Logs: `logs/probe-pre10-dev.log`, `logs/probe-pre10-early.log`, `logs/probe-tip-dev.log`, `logs/probe-tip-early.log`; full finding: `probe-console-errors.md` in the evidence directory. No code change was needed; the diff-worker cold-start timeout is a dev-server characteristic and remains task 12's surface if it matters in packaged builds.

**Limits:** the six deferred groups above keep upstream's improvements out until their dependency owners land; the palette search/highlighting, JSON tree indentation, emoji autocomplete, RTL-aware sonner/scrollbar/tab strip and the update-blocked UI strings are therefore not exercised in this task beyond compiling the fork's versions. The adopted sprite's `pause-clock` and clock-pause primitives are present but unused until those consumers land.
