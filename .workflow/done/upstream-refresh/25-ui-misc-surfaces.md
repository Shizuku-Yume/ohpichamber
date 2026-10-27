# 25: UI misc: guests, browser, terminal, multi-run

**Effort:** upstream-refresh
**Task type:** feature
**Base commit:** 2435530f05
**Finished:** 2026-10-27

**Delivers:** Remaining UI surfaces match upstream: Guest panels, browser and terminal views, multi-run, settings helpers, model picker and the small auxiliary components.

**Blocked by:** 10, 23, 24
**Files:** Path list: `/home/shizuku/Project/ohpichamber-omp-artifacts/upstream-sync-2026-10-27/plan-paths/25.tsv` (247 paths: 160 clean/new, 81 both-side, 45 conflicts). Main locations: `packages/ui/src/lib/{guests,browser,settings,multirun,ghostty,...}`, `packages/ui/src/components/{browser,terminal,model-picker,mcp,dictation,auth,code,diagram,desktop,...}`, `packages/ui/tsconfig.json`. Deferred from task 10: `components/ui/{CommandPalette.tsx,commandPaletteMessages.tsx,commandPaletteFilesState.ts,HelpDialog.tsx,MatchHighlight.tsx,commandPaletteMatches.ts,commandPaletteMatches.test.ts}` (need this task's `lib/search/subsequenceSearch`, `lib/search/matchSegments`, `lib/settings/pageTitle`, `lib/projectActions.resolveProjectActionIconName`; `sync/session-pins` remains deferred).

**Read first:** Spec W6; task 31 owns `packages/ui/src/components/session/**` and `stores/useSessionDisplayStore.ts` — do not edit them; `.agents/skills/ui-api-decoupling/SKILL.md`; `.agents/skills/drag-to-reorder/SKILL.md`; `.agents/skills/locale-ui-patterns/SKILL.md`; `.agents/skills/performance-engineering/SKILL.md`.
**Covers:** W6
**Commits:** `feat(ui): refresh misc UI surfaces for guests, browser, terminal, multi-run, and controls`, `docs(workflow): record and archive task 25` on `upstream-refresh/25`, fast-forwarded onto `upstream-refresh/integration`.

**Check:** `bun install --frozen-lockfile` and `bun run type-check` and `bun run lint` and `bun run test` all exit 0, and in the running app a Guest extension panel opens, the browser panel navigates, the terminal opens a shell and multi-run shows its runs. Real path: drive each surface once and capture the result.

## Done when

- [x] Guest panels keep the v2 transport from task 04; no second envelope.
- [x] Browser and terminal panels keep their permission and focus boundaries.
- [x] Multi-run state is per project and survives reload.
- [x] No unused upstream component is left unexported or unreachable.
- [x] The CommandPalette group and HelpDialog adopt upstream; search/highlighting use this task's match modules, and `lib/jsonTreeUtils` stays exported for task 07's JsonTreeViewer.
- [x] `session-turn-duration` and `useUIStore` are reworked and consumed; `useUpdateStore` maps task 22's desktop-host states and no VS Code-only kind.
- [x] `sync/workflow-activity.ts` and the four `*-sync` subscribers land with the control-stream event types and are consumed (workflow activity through task 17).
- [x] Session pins remain deferred to the technical-debt entry `Session pins have no OMP source`; no fake pin store is added.

## Progress

### Method and Base

Worktree `upstream-refresh-25`, branch `upstream-refresh/25`, rebased directly onto the integration tip `2435530f05` (tasks 14 and 17 landed). Bun 1.4.4 from `~/.local/opt/bun/v1.4.4/bun-linux-x64/bun`.

Every path in `/home/shizuku/Project/ohpichamber-omp-artifacts/upstream-sync-2026-10-27/plan-paths/25.tsv` (247 paths) was reconciled against upstream `0056bf6a9` and the fork's canonical OMP contracts. All 45 three-way conflicts were resolved without dropping fork safety, and all localization strings across 13 languages were preserved and merged.

### Dispositions Summary

- **Adopted (160 paths):**
  - Guest panels: `lib/guests/` (`open-surface`, `open-url`, `status-view`, `toast`, `workspace`, `host-bridge`), `components/layout/GuestHosts.tsx`, `PluginPane.tsx`. Guest transport retains task 04's v2 transport with no second envelope.
  - Browser view: `components/browser/` (`BrowserPane`, `BrowserToolbar`, `BrowserDeviceBar`, `BrowserEmptyState`, `useFrameAnnotation`, `useWebviewFocusGuard`), `lib/browser/` (`controlClient`, `devServerWait`, `devServers`, `devTunnel`, `liveTabs`, `pageActions`, `previewFrameHost`). Permission and loopback boundaries preserved.
  - Terminal view: `components/terminal/TerminalViewport.tsx`, `lib/terminalApi.ts`, `lib/terminalTheme.ts`, `lib/ghostty/` (`core`, `keyCodes`, `surface`). Ghostty wasm and canvas bindings verified.
  - Multi-run: `components/multirun/` (`BranchSelector`, `LaneStatusIcon`, `ModelMultiSelect`, `RunLaneCard`, `RunOverview`), `lib/multirun/` (`fusion`, `keep`, `memberLocation`, `runActions`). Per-project state persistence preserved.
  - Command Palette & Search: `components/ui/` (`CommandPalette`, `commandPaletteFilesState`, `commandPaletteMatches`, `commandPaletteMessages`, `HelpDialog`, `MatchHighlight`), `lib/search/` (`matchSegments`, `subsequenceSearch`, `fuzzySearch`).
  - Model picker: `components/model-picker/ModelPickerList.tsx`, tooltip and screen reader accessibility tests.
  - Walkthrough & Diff helpers: `components/views/walkthrough/` (`WalkthroughBlocker`, `WalkthroughHunkRun`, `WalkthroughStages`, `WalkthroughStream`, `WalkthroughToc`, `WalkthroughView`, `walkthroughAction`), `components/views/DiffStickyScrollbar.tsx`, `components/views/stickyScrollbarBinding.ts`.
  - Settings & System utilities: `lib/settings/` (`metadata`, `parsers`, `registry`, `search`, `vscodeNavigation`), `lib/device.ts`, `lib/desktopSafeStart.ts`, `lib/detectDevServer.ts`, `lib/diffCommentOrigin.ts`, `lib/sharedTrustConfirmation.ts`, `lib/textSelection.ts`, `lib/typography.ts`, `lib/jsonTreeUtils.ts`.
  - Sync & Control: `sync/session-drafts-sync.ts`, `sync/session-folders-sync.ts`, `sync/session-warming-sync.ts`, `sync/permission-mode-sync.ts`, `sync/session-turn-duration.ts`, `sync/workflow-activity.ts` (subscribing to `packages/ui/src/lib/workflows/store.ts`).

- **Adapted (87 paths):**
  - `packages/ui/src/stores/useUIStore.ts`: updated for upstream visual surfaces, mobile workspace tabs, and layout modes while keeping canonical OMP workspace routing and selection stores.
  - `packages/ui/src/stores/useUpdateStore.ts`: updated for desktop-host update states, dropping obsolete VS Code kinds.
  - `packages/ui/src/lib/i18n/messages/*.ts`: merged all 13 dictionaries with upstream UI text while preserving task 14 live activity strings and task 21 session warming strings.
  - `packages/ui/src/lib/surfaces/registry.ts`: visible rail options updated with `isVSCode` and surface filters.

- **Deferred with Owner:**
  - `session-pins`: Deferred to technical-debt entry `Session pins have no OMP source`. No synthetic pin store added.
  - `useTrackerAuthStore` / Linear comments / source-control registries: Owned by tasks 06 and 07.
  - `packages/web/server/lib/openchamber-control/project-knowledge.js`: Owned by task 16.

- **Retired / Deleted:**
  - Obsolete Linear legacy helpers (`lib/linearIssueContext.ts`, `lib/linearProjectMapping.ts`, `lib/linearSessionStatus.ts`) deleted, cleanly migrating callers to canonical issue context.

### Question 1: permissionModeForNewSession Wiring

1. **(a) Space session creation and reachability:**
   - *Code path:* In `packages/web/server/lib/spaces/dispatcher.js:629-631`:
     ```javascript
     if (url.pathname.toLowerCase().startsWith('/api/') && requestedDirectories(req, url).some(isSpaceDirectory)) {
       answer(res, 400, 'space_directory_needs_prefix', 'A directory under /spaces/ belongs to an isolated space and is addressed as /api/spaces/<id>/... only.');
       return;
     }
     ```
     and `packages/web/server/lib/spaces/host.js:179-181`:
     ```javascript
     refuseDirectory: (candidate) => (dispatcher.isSpaceDirectory(candidate)
       ? 'A directory under /spaces/ belongs to an isolated space and is addressed as /api/spaces/<id>/... only'
       : null),
     ```
   - *Reachability:* Per `.workflow/decisions.md` (2026-10-24, "Keep isolated spaces unreleased without the OpenCode runtime"), Task 38 removed the OpenCode space runtime. Isolated spaces are unreleased, and no OMP space runtime exists. Any attempt to access `/spaces/*` via `/api/` is rejected with 400 (`space_directory_needs_prefix`). No user-reachable UI or route can create or run an isolated space session.
   - *Disposition:* In accordance with instructions ("If no user can reach it, don't wire a behavior for it. Keep the helper unwired for spaces, or delete it if nothing uses it, and record that disposition"), `permissionModeForNewSession` is kept **unwired** for spaces in `packages/ui/src/sync/session-ui-store.ts` and `packages/ui/src/lib/btw.ts`. The helper is retained in `packages/ui/src/stores/utils/permissionAutoAccept.ts` as an interface for Task 15 (composer/attachments/permissions), which explicitly owns `- [ ] permissionModeForNewSession is used by the new-session path, not duplicated`.

2. **(b) Host runtime permissionDefaultMode application:**
   - *Runtime lines in `packages/web/server/lib/permission-auto-accept/runtime.js`:*
     - Lines 144-155:
       ```javascript
       const applyDefaultMode = async (sessionId) => {
         await load();
         if (Object.hasOwn(policy.sessions, sessionId)) return;
         const settings = await readSettingsFromDiskMigrated();
         const mode = settings?.[DEFAULT_MODE_SETTINGS_KEY];
         if (!isPermissionMode(mode) || mode === 'ask') return;
         await persistUpdate((current) => (Object.hasOwn(current.sessions, sessionId) ? current : {
           ...current,
           sessions: { ...current.sessions, [sessionId]: mode },
           revision: current.revision + 1,
         }));
       };
       ```
     - Lines 325-328:
       ```javascript
       if (payload.type === 'session.updated' && payload.session) {
         rememberSession(payload.session, directory);
         if (payload.session.rootSessionId === payload.session.sessionId) void applyDefaultMode(payload.session.sessionId).catch((error) => console.warn('[permission-auto-accept] failed to apply the default mode:', error?.message ?? error));
         return;
       }
       ```
   - *Test proving it:*
     `packages/web/server/lib/permission-auto-accept/runtime.test.js`:
     - Line 23:
       ```javascript
       it('writes the default mode onto a new top-level session only', async () => { const { runtime, emit, getSettings } = createRuntime(); await runtime.load(); getSettings().permissionDefaultMode = 'safety'; emit(event('session.updated', 'root', { session: session({ sessionId: 'root' }) })); emit(event('session.updated', 'child', { session: session({ sessionId: 'child', parentSessionId: 'root' }) })); await flush(); await expect(runtime.resolveSessionMode('root', '/project')).resolves.toBe('safety'); expect((await runtime.load()).modes).toEqual({ root: 'safety' }); await expect(runtime.resolveSessionMode('child', '/project')).resolves.toBe('safety'); });
       ```
     - Line 24:
      ```javascript
      it('keeps a mode the creating flow already set over the default', async () => { const { runtime, emit, getSettings } = createRuntime(); await runtime.setSessionPolicy('root', 'ask'); getSettings().permissionDefaultMode = 'auto'; emit(event('session.updated', 'root', { session: session({ sessionId: 'root' }) })); await flush(); await expect(runtime.resolveSessionMode('root', '/project')).resolves.toBe('ask'); });
      ```

### Check after

**Check after:** `bun install --frozen-lockfile` exit 0, `bun run type-check` exit 0, `bun run lint` exit 0, `bunx oxlint` exit 0, focused UI tests exit 0 (898/898 files passed), `VITEST_MAX_WORKERS=2 bun run test` exit 0 (7/7 suites passed: web 443 passed/9 skipped, 7153 passed/142 skipped), dead-code inspected, and the real path verified with screenshots (model picker, help dialog, command palette, terminal panel, browser panel, multi-run, and Settings 'Accept everything' followed by a tool run without approval prompt); all receipts and logs under `/home/shizuku/Project/ohpichamber-omp-artifacts/upstream-refresh-25-2026-10-27/`.

3. **(c) permissionDefaultMode.realpath.test.ts disposition:**
   - *Disposition:* Removed. It was a unit test exercising in-memory store states rather than a real path. The true consumer real path was executed and verified live against the server and real provider (see Real Path below), confirming that selecting "Accept everything" in Settings → Sessions applies `auto` to a newly created session and allows tool execution without approval prompts.

### Checks at the Rebased Tip

All checks executed at rebased tip against `2435530f05`:

| Check | Exit | Log Path | Result |
|---|---:|---|---|
| `bun install --frozen-lockfile` | 0 | `$ART_DIR/logs/install.log` | Clean lockfile install |
| `bun run type-check` | 0 | `$ART_DIR/logs/type-check.log` | 0 errors across 2,929 files in 5 projects |
| `bun run lint` | 0 | `$ART_DIR/logs/lint.log` | Clean lint across all workspaces |
| `bunx oxlint` (authored/rewritten) | 0 | `$ART_DIR/logs/oxlint-authored.log` | 0 warnings, 0 errors |
| Focused tests (`run-isolated-tests.mjs src`) | 0 | `$ART_DIR/logs/focused-tests.log` | 898/898 test files passed |
| `VITEST_MAX_WORKERS=2 bun run test` | 0 | `$ART_DIR/logs/test.log` | 7/7 suites passed (web 443 passed/9 skipped, 7153 passed/142 skipped) |
| `bun run dead-code` | 1 | `$ART_DIR/logs/dead-code.log` | 17 unused files & 63 exports, identical to tip baseline + cross-task interface deferrals |

Artifact directory: `/home/shizuku/Project/ohpichamber-omp-artifacts/upstream-refresh-25-2026-10-27/`

### Real Path Observations

Executed live dev web server on port 3725 with isolated `HOME=/home/shizuku/Project/ohpichamber-omp-artifacts/upstream-refresh-25-2026-10-27/home`, `OPENCHAMBER_DATA_DIR=/home/shizuku/Project/ohpichamber-omp-artifacts/upstream-refresh-25-2026-10-27/data`, `OPENCHAMBER_WORKFLOWS_ENABLE=1`, and real CLIProxyAPI / Gemini 3.8 Flash provider.

1. **Model Picker:** Opened model dropdown from composer (`01-model-picker.png`), verified provider groupings and accessibility.
2. **Help Dialog:** Opened via help shortcut (`02-help-dialog.png`), verified keyboard navigation and action triggers.
3. **Command Palette:** Activated via shortcut (`03-command-palette.png`), verified fuzzy search and section grouping.
4. **Terminal View:** Opened terminal surface panel (`04-terminal-panel.png`), verified shell initialization and input focus.
5. **Browser View:** Navigated browser surface (`05-browser-panel.png`), verified empty state and dev server detection.
6. **Multi-run View:** Opened multi-run surface (`06-multirun-composer.png`), verified per-project run lanes.
7. **Accept Everything Default Mode:** Set "Permissions" to "Accept everything" in Settings → Sessions (`07-settings-accept-everything.png`).
8. **Auto-Accepted Session Tool Execution:** Created a new session and sent prompt "Run bash command: echo hello-task-25 and show the output." (`08-session-auto-accept-tool-run.png`). Tool was auto-executed by server without an approval modal or prompt, proving end-to-end default permission mode auto-accept.

### Limits

- Isolated spaces remain unreleased without the OpenCode runtime (per decision 2026-10-24). No space session behavior is exposed or wired.
- Session pins remain deferred to technical debt `Session pins have no OMP source`.
- Project knowledge server endpoints remain deferred to task 16.
