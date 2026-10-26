# 11: Settings pages

**Effort:** upstream-refresh
**Task type:** feature
**Base commit:** 4dbd5f5e4d

**Delivers:** Upstream's regrouped Settings pages (agents, behavior, classification, extensions, integrations, MCP, providers, projects, plugins, remote instances, routing, skills, snippets, usage, websearch) render, save and deep-link.

**Blocked by:** 10, 23
**Files:** Path list: `/home/shizuku/Project/ohpichamber-omp-artifacts/upstream-sync-2026-10-27/plan-paths/11.tsv` (147 paths: 71 clean/new, 65 both-side, 42 conflicts). Main locations: `packages/ui/src/components/sections/`, `packages/ui/src/components/views/{SettingsView,SettingsWindow}.tsx`. Consume task 23's `stores/useSessionWarmingStore.ts` for the warming settings and `stores/utils/permissionAutoAccept.ts`'s `permissionModeForNewSession` for the new-session default. `sections/integrations/LinearSettings.tsx` drops its `useLinearAuthStore` import so task 07 can delete the store.

**Read first:** Spec W6; `packages/ui/src/components/sections/PATTERNS.md`; `.agents/skills/locale-ui-patterns/SKILL.md`; `.agents/skills/sync-state-invariants/SKILL.md`; `.agents/skills/ui-api-decoupling/SKILL.md`.
**Covers:** W6
**Commits:** `feat(settings): refresh the Settings pages from upstream 0056bf6a9` on `upstream-refresh/11-settings-pages` (this record is part of that commit), fast-forwarded onto `upstream-refresh/integration`.

**Check:** `bun install --frozen-lockfile` and `bun run type-check` and `bun run lint` and `bun run test` all exit 0, the settings tests pass, and in the running app every Settings page opens, search finds its sections, and a setting is changed, saved and visible after reload. Real path: change one OMP setting and one provider setting.


## Progress

### Method

Worktree `upstream-refresh-11`, branch `upstream-refresh/11-settings-pages`, cut from
`upstream-refresh/integration` at `4dbd5f5e4d`. Every path in the task list was
three-way merged from `1f9320062` (base), the branch tip (ours) and `0056bf6a9`
(theirs) into `scratch/`; the merge set and per-path result are in the evidence
directory (`merge/summary.tsv`, `dispositions.tsv`). Bun 1.4.4 from
`~/.local/opt/bun/v1.4.4/bun-linux-x64`.

**147 paths:** 33 adopted, 4 three-way merged, 34 deferred (each with its owning
dependency), 64 kept at the fork's version (upstream's change is OpenCode-shaped or
cosmetic-only), 11 stay deleted, 1 (the module doc) resolved. Full per-path record:
`/home/shizuku/Project/ohpichamber-omp-artifacts/upstream-refresh-11-2026-10-27/dispositions.tsv`.

### Adopted / merged (upstream behaviour on the canonical data model)

- Settings chrome: `shared/SettingsSection.tsx` (control constants and primitives),
  `SettingsCards.tsx` (`SettingsCardAction` exported for the Extensions page),
  `SettingsSidebarItem`, `SettingsSidebarSearch`, `EnvironmentVariablesEditor`,
  `views/SettingsWindow.tsx`, and `lib/settings/pageTitle.ts` (self-contained module
  from task 25's list; identical to upstream, so its later merge is a no-op).
- `views/SettingsView.tsx`: page titles through `pageTitle`, the raised search field
  with `data-settings-search`, Chat-tab selection for search results and jump
  requests (`chatSettingsTabs`), and the `extensions.gitIdentity` target. The
  tracker/source-control search parameters wait for task 07.
- `openchamber/ChatSettings.tsx` + `chatSettingsTabs.ts`: the Chat page is now the
  upstream three-tab page (Messages, Composer, Assistance); `OpenChamberPage`'s Chat
  section renders it. VS Code branches are gone; the mobile return-key and
  pasted-image controls wait for task 23/25 store and registry keys.
- `openchamber/SessionWarmingModeField.tsx`: rewritten for OMP. It reads and writes
  task 23's `useSessionWarmingStore` (`/api/session-warming`), offers off/chosen
  sessions plus the warm duration, reports through `reportSettingsSaveState`, and
  returns nothing while the Host reports `unavailable` — it never reads OpenCode
  config. `DefaultsSettings` renders it in a Prompt cache section next to the fork's
  workspace cache-warming checkbox (canonical `readCacheWarming`/`updateCacheWarming`).
- `openchamber/PermissionDefaultModeField.tsx`: upstream's info-hint presentation,
  with the same `updateDesktopSettings({ permissionDefaultMode })` write.
- Extensions: `ExtensionsPage.tsx` (card grid, detail view, install sources,
  approval dialog flow, website locale links), `builtins.test.tsx`,
  `Integrations` catalog cards (`CatalogExtensionsSection`, `IntegrationCatalogCard`,
  `catalogExtensions` + test, including the resource-monitor entry).
- Adopted pages: Voice, session retention, managed SSH credentials, app-link
  security, notifications, shortcut recording, theme catalog dialog and picker,
  snippets page, behavior page, usage sidebar/quota credentials (quota credentials
  now list only the providers with an inline form, matching upstream's removal of
  ollama-cloud's form), provider custom-model discovery/row/connect picker,
  `ModelSelector`, skills install-conflicts dialog, and `UsagePage`'s narrowed
  credential-form provider set.
- Localization: the refreshed pages' 102 new keys were added to all 13 dictionaries
  (`*.settings.ts`) with real translations taken from upstream's locale modules; the
  two per-session warming paragraphs and its label are written for OMP (no OpenCode
  config) and translated per locale. No English placeholder is used.

### Kept at the fork's version (recorded per path in `dispositions.tsv`)

- **Canonical stores, not OpenCode config**: providers page and its auth helpers
  (upstream imports `@opencode/client` and `lib/opencode/integration-catalog`),
  MCP page/import/OAuth (upstream needs `mcpDraft` and OpenCode MCP status types),
  web search (upstream reads/writes the OpenCode `websearch` config),
  plugins page (upstream needs `pluginLoadState`/`usePluginRuntimeStatus` over the
  OpenCode plugin runtime), skills page/sidebar (upstream needs `skillSwitch` and
  `skillLocations`), agents page/sidebar (upstream rewrote it on the OpenCode
  agent-config store; the fork uses the canonical agent store), commands pages
  (logical-direction/typography only; the sidebar's reset action has no canonical
  source), snippets sidebar (fork's `templateId` model), Magic Prompts page and
  sidebar (upstream's scoped overrides need task 15's `lib/magicPrompts`).
- **Another task owns the dependency**: the Integrations regroup and its tracker and
  source-control cards (task 06/07 registries, `@opencode/client`-free but
  registry-dependent), `LinearSettings`/`LinearProjectMapping`/
  `LinearSessionComments` and the GitHub/GitLab settings pages (task 07 replaces
  them; `useLinearAuthStore` is still consumed by `App.tsx`, `MobileApp.tsx`,
  `runtimeEndpointReset.ts` and `referenceSources.ts`, so the store cannot be
  deleted here), `WorktreeSectionContent`/`MergedWorktreeCleanupSettings` (task 09),
  `sourceControlOAuthPolling.test.tsx` (tests task 07's card),
  SettingsProjectSelector and InstallSkillDialog (task 08's
  `useProjectsInSidebarOrder`), `SkillsCatalogRows`/`skillCatalogUrl` (task 08/25),
  the General/Chat/Appearance split pages (`GeneralWorkspaceSettings`,
  `DesktopAppSettings`, `FinishedWorktreesSettings`, `MobileWorkspaceTabsSettings`,
  `SettingsSortableVisibilityList`, `SettingsColorField`, `lib/browser/liveTabs`)
  because they consume task 23/25 store fields and registry keys the integration
  tip does not have, the knowledge/workflow/render/schedule tool toggles in
  `OpenChamberToolsSettings` (tasks 16/17/23), tunnel modes and their registry keys
  (task 19/25), passkey rename (host API), GitHub.com account cards and provider
  instance accounts (task 06/07), Claude Code sign-in (OpenCode integration
  catalog), `AboutSettings` (upstream restores the retired OpenCode updater),
  Arabic/Hebrew entries in ExtensionsPage's website locale map (task 20 adds those locales).
- **Cosmetic-only upstream changes**: logical-direction classes, typography class
  swaps and `Spinner` replacements were not ported where the only change was RTL or
  styling for a page whose data layer stayed; RTL belongs to task 20 and the fork's
  pages keep their current classes.

### Deletions

Upstream's deletions were applied where the fork did not depend on them: none of
the 9 `up_deleted_fork_untouched` files were deleted because the fork's Integrations
page or OpenChamber page still renders them (recorded above). The 11 paths that were
already deleted on both sides stay deleted (`AgentColorField`, `agentPermissionModel`,
`mcpDraft`, `providerAvailability`, `ProviderFormFields`, `SidebarGroup`, and the
tests deleted with them). `MergedWorktreeCleanupSettings` and the OpenCode updater
files remain in place until their owners land.

### Checks

Run after the WIP commit, before the rebase; repeated at the rebased tip below.

| Check | Exit | Log |
|---|---:|---|
| `bun install --frozen-lockfile` | 0 | worktree setup |
| `bun run type-check` (TypeScript 7) | 0 | `logs/type-check-14.log` |
| `bun run lint` (oxlint 1.88) | 0 | `logs/lint-1.log` (one pre-existing unused-disable warning in `ui/tooltip.tsx`) |
| `bunx oxlint` on the authored files | 0 | `logs/oxlint-authored.log` |
| `VITEST_MAX_WORKERS=2 bun run test` with isolated HOME/XDG | 0 | `logs/test-3.log`: 7/7 suites, UI 821/821 files, web 374 files / 6086 tests |
| `bun run dead-code` | 1 (expected) | `logs/dead-code-1.log`: only task 23/10/24 interfaces not yet consumed (`pause-clock`, `useSessionDraftsStore`, `useMinuteTickerNow`, `usePageColors`, `toHexColor`, `readGlobalSessionLineage`, the warming snapshot exports, `useSessionWarmUntil`, `permissionModeForNewSession`) plus 3 pre-existing knip hints; nothing this task added |

Rebased onto the integration tip `65862865d0` (task 08 landed) the same set was
rerun before landing: `bun install --frozen-lockfile` (exit 0,
`logs/install-rebased.log`), `bun run type-check` (0,
`logs/type-check-rebased.log`), `bun run lint` (0, `logs/lint-rebased.log`),
`bunx oxlint` on the authored files (0, `logs/oxlint-rebased.log`),
`VITEST_MAX_WORKERS=2 bun run test` with a fresh HOME (0, 7/7 suites, UI 821/821
files, web 375 files / 6096 tests, `logs/test-rebased.log`) and `bun run dead-code`
(1, `logs/dead-code-rebased.log`: the same task 23/10/24 interfaces, one fewer
unused file because task 08 consumed the drafts store).

Landed on the tip after task 22 (`a57205eba5`'s parent `7035574c83`), the same set was
rerun once more: install (0, `logs/install-final.log`), type-check (0,
`logs/type-check-final.log`), lint (0, `logs/lint-final.log`), oxlint on the authored
files (0, `logs/oxlint-final.log`), the full suite (0, 7/7 suites, UI 821/821 files,
web 392 files / 6302 tests, `logs/test-final.log`) and dead-code (1,
`logs/dead-code-final.log`: 3 unused files and 24 unused exports from later tasks on
the integration branch — none from this task). The app was restarted at that tip
against the same isolated data dir: Settings opened, Sessions still showed
**Accept everything** pressed, and `GET /api/config/settings?surface=desktop` still
returned `permissionDefaultMode: "auto"` and the `hiddenModels` entry
(`08-settings-sessions-final-tip.png`).

Rebased onto the current integration tip `0bc5a1ce69` (tasks 17, 18, 22, 24 landed), the full suite and all checks were rerun and verified clean before landing: `bun install --frozen-lockfile` (exit 0, `logs/install-rebase-final.log`), `bun run type-check` (0, `logs/type-check-rebase-final.log`), `bun run lint` (0, `logs/lint-rebase-final.log`), `bunx oxlint` on authored/rewritten files (0, `logs/oxlint-rebase-final.log`), `VITEST_MAX_WORKERS=2 bun run test` with an isolated HOME/XDG directory (0, 7/7 suites passed: UI 821/821 files, agent-service 250 tests across 41 files pass, web 397 files / 6366 tests pass, electron 54/54 passed, `logs/test-rebase-final.log`), and `bun run dead-code` (1 expected, `logs/dead-code-rebase-final.log`: 5 unused files and 48 exports from other landed tasks; none from task 11). The dev server was started on ports 6402 / 6480 with `OPENCHAMBER_DATA_DIR=/tmp/ohpi-11-data`: `GET /api/agent/v1/ready` returned 200 `{"ready":true,"engine":"omp","version":"1.0.0"}`, the Settings dialog opened in Chrome, and the regrouped navigation and Session Defaults rendered cleanly (`09-settings-sessions-rebase-tip.png`).

Two flaky OMP tests surfaced under load and were investigated instead of silenced:

- `packages/web/server/lib/terminal/shutdown.test.js` failed once in the first
  full run (`logs/test-1.log`, stale real HOME) and once in a 3-run rerun, then
  passed in the isolated-HOME full run and in 3/3 runs at the integration tip
  (`4dbd5f5e4d` probe worktree). It reads wall-clock budgets and is load-sensitive;
  the final full suite passes.
- `packages/agent-service/src/sessions/registry-native.test.ts` failed once in the
  second full run (`logs/test-2.log`) and once in a 3-run rerun, then passed 15/15
  in two reruns and 242/242 in the full agent-service suite at the tip
  (`logs/tip-agent-service-full.log`). This task touches no agent-service file;
  recorded as a load-sensitive flake of the session-restart test.

### Real path (observed)

`bun run dev` in this worktree with `OPENCHAMBER_DATA_DIR=/tmp/ohpi-11-data`,
UI `http://127.0.0.1:6480`, API `http://127.0.0.1:6402`. `GET /api/agent/v1/ready`
→ 200 `{"ready":true,"engine":"omp","version":"1.0.0"}`; the app booted with the
machine's real OMP provider (`CLIProxyAPI … Gemini 3.8 Flash` in the composer).

- Opened Settings from the app; the dialog rendered with the regrouped nav
  (OPENCHAMBER / WORKSPACE / OMP / LIBRARY). Clicked every top-level page and
  read each: General, Appearance, Chat, Notifications, Sessions, Routing,
  Shortcuts, Voice, Integrations, Extensions, Usage, Projects, Remote Instances,
  External Tunnel, Git, Providers, Web search, Agents, Behavior, Commands, MCP,
  Plugins, Magic Prompts, Snippets, Skills, Skills Catalog — 26/26 rendered their
  sections (About is mobile-only by `metadata.ts`, not URL-only).
- Changed an OMP setting in the UI: Sessions → Permissions → **Accept everything**
  (permission default). `GET /api/config/settings?surface=desktop` answered
  `permissionDefaultMode: "auto"`, and after a page reload the chip still reports
  `aria-pressed="true"` (`02`/`03` screenshots).
- Changed a provider setting in the UI: Providers → the connected real provider
  (`task05-real-provider`, 1 model) → **Hide all**. The settings document then
  held `hiddenModels: [{providerID:"task05-real-provider",modelID:"gemini-3.5-flash-lite"}]`,
  still present after reload; the provider detail lists the model under
  Available Models (`04` screenshot).
- Settings search: query `reasoning` returned items grouped by page (Chat,
  Sessions, Projects, Agents, Commands); clicking **Show Reasoning Traces** opened
  Settings → Chat with the **Messages** tab selected, and query `follow-up` →
  **Follow-up behavior** opened the **Composer** tab (`05`–`07` screenshots), so
  `chatSettingsTabs` deep-links work.
- `GET /api/session-warming` answers **404** on this tip: the Host routes are
  task 21's path (`packages/web/server/lib/session-warming/`). `SessionWarmingModeField` therefore reports `unavailable` and
  renders nothing, exactly as designed; the field is exercised by its code and
  the store tests, not observable in this app build yet.
- Console (`console-lane11-real.log`): the known pre-existing `422`
  source-control probe for the non-git chat directory, `404`s for the missing
  session-warming route, one Base-UI "nested button" warning from
  `AgentSelector` inside `DefaultsSettings` (structure unchanged by this task),
  and `CanonicalApiError: The requested workspace is not authorized` from
  CommandsStore/skills right after adding a project directory in this fresh data
  dir (the provider page resolved after a reload; the commands/skills stores are
  task 23's files and were not touched here). No uncaught exception.

Screenshots: `01-settings-sessions.png`, `02-settings-sessions-after-reload.png`,
`03-settings-sessions-permission-auto.png`, `04-settings-provider-detail.png`,
`05-settings-search-reasoning.png`, `06-settings-chat-messages-tab.png`,
`07-settings-chat-composer-tab.png`; console log `console-lane11-real.log` in the
evidence directory (`08-settings-sessions-final-tip.png` and `09-settings-sessions-rebase-tip.png` verify the rebased integration tips).

### Amendments and interface gaps

Two interfaces could not be consumed inside this task; the exact amendment text
for their owners is in the evidence directory (`amendments.md`) and repeated in the
final report: `permissionModeForNewSession` → task 25 (session-creation call sites
in `lib/btw.ts`, plus the landed-23 `sync/session-ui-store.ts` transfer);
`useLinearAuthStore` deletion and the `LinearSettings` store drop → task 24 (with
task 07's `referenceSources` migration). The deferred dispositions whose named
owner is already landed (03/04/23) are flagged there too, with the replacement
owner for each.

### Interfaces

- Consumed: `useSessionWarmingStore` (per-session warming field), `settingsPageTitleKey`
  and the `chatSettingsTabs` store. `permissionModeForNewSession` is **not**
  consumed: its only honest call sites are session creation
  (`sync/session-ui-store.ts`'s `materializeOpenDraftSession`, `lib/btw.ts`), which
  are lane D files; task 23's follow-up confirmed it left the helper unwired and the
  call sites unchanged, so task 11 did not invent a settings-side consumer. This is
  a recorded gap for task 30's dead-code gate.
- `LinearSettings` still imports `useLinearAuthStore`; the store cannot be deleted
  until task 07 moves the other four consumers. The amended Done-when is therefore
  not achievable inside this task; the reason is recorded here instead of forcing a
  dead import elsewhere.

## Done when

- [x] Every upstream section has a home; no page is left reachable only by URL (26/26 top-level pages opened in the running app).
- [x] Search indexes the regrouped pages and their labels (query `reasoning` and `follow-up` returned items across pages; a Chat result opens the holding tab).
- [x] Save feedback, dirty state and error handling follow the fork's patterns (`SettingsPageLayout showSaveStatus`, `reportSettingsSaveState` in the warming field; adopted pages keep the autosave contract).
- [x] No OpenCode-only setting is exposed as if it applied to OMP (OpenCode updater, websearch config, provider SDK page and MCP draft UI kept out; the per-session warming field hides while the Host route is absent).
- [x] `useSessionWarmingStore` is consumed by the warming settings. `permissionModeForNewSession` is transferred to task 25 with the exact amendment in `amendments.md` (its only honest call sites are session creation in lane D files); no interface was faked here.
- [x] `LinearSettings` keeps its `useLinearAuthStore` import because four consumers remain (App, MobileApp, runtimeEndpointReset — task 24; referenceSources — task 07); the store removal and the page replacement are transferred to tasks 24/07 with the exact amendment in `amendments.md`.
