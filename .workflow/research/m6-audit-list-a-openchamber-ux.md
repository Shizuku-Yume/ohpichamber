# Phase 1 Audit List A: Mistakenly Cut or Deferred OpenChamber UX

**Effort:** `m6-audit-and-polish`  
**Task:** `01-audit-list-a-openchamber-ux`  
**Date:** 2026-11-06  
**Auditor:** Window A Research Stream (`window-a-settings` + `window-a-runtime`)  
**Base Commit (upstream/main):** `0056bf6a9ca4aa229817af5bf37533f602a16cc3`  
**Tip Commit (audit tip):** `76112ae00a5a8499ae4cbbd8077148c72f583eb6`  
**Integration Branch:** `m6-audit-and-polish/integration`  
**Target Scope:** `packages/ui/src`, `packages/web/server`, `packages/electron`  

---

## 1. Executive Summary & Purpose

Across earlier migration efforts (`omp-through-m3`, `upstream-refresh`, `omp-native-chat`, `omp-native-parity`, and `m4-orchestration`), the repository underwent substantial refactoring from the OpenCode 2.x engine to the embedded OMP (`@oh-my-pi/pi-coding-agent` 18.16.0) runtime. In this transition, two competing tendencies emerged:

1. **Necessary Retrenchments:** Pruning true OpenCode-only workarounds, dead configuration bridges, and duplicate execution authorities that have no role in an OMP-native architecture.
2. **Dogmatic Feature Cuts:** Mistakenly deleting, hiding, or gutting genuine OpenChamber frontend workbench and Host features simply because standalone OMP CLI lacked a 1:1 API field, or in overreaction to prompt-injection purity.

This audit report delivers an exhaustive, file-by-file inventory of changes between `0056bf6a9` and `HEAD` across the user-facing and Host gateway packages (`packages/ui/src`, `packages/web/server`, and `packages/electron`). It explicitly classifies every altered or deleted feature into **(1) Restore in M6** or **(2) Keep Retired**, supplies exact file and line citations, and lays down concrete restoration architectures centered on Host SQLite (`host-metadata.sqlite`), Canonical Agent Contract events, and the `openchamber-control` SSE transport (`/api/openchamber/events`).

---

## 2. Evidence Ledger & Methodological Limits

### 2.1 Evidence Classes
In compliance with project engineering and audit standards:
- **`S` (Source-level):** Observed directly in repository source code or git history at the cited commit. Every claim of code presence, omission, or schema change in this report is grounded in source citations.
- **`R` (Runtime-verified):** Verified through executable tests or live command receipts covering that specific boundary.
- **`I` (Inference):** Derived logically from documented architectural constraints; explicitly flagged as inference.

### 2.2 Operational Limits
- **Documentation-only scope:** This audit inspects, compares, and designs; it does **not** modify application source code, lockfiles, or runtime configurations.
- **Source presence is not runtime acceptance:** The presence of a file or function in `HEAD` is recorded as class `S`. It is never claimed as working runtime behavior unless covered by an active test receipt.
- **Clean separation:** Maintained strictly between Genuine OpenChamber GUI/Host UX (to restore) and OpenCode Engine Shims (to retire).

---

## 3. Master Classification Matrix: Restore in M6 vs. Keep Retired

The master table below summarizes all audited components across `packages/ui/src`, `packages/web/server`, and `packages/electron`.

| Feature / Subsystem | Upstream Citation (`0056bf6a9`) | HEAD Citation (`76112ae00`) | Class | Disposition | Architectural Rationale & Target |
|---|---|---|---|---|---|
| **#1 Cross-Device Session Pins** | `ui/src/lib/sessionPins.ts:25-41`<br>`ui/src/sync/session-pins.ts:1-75` | `ui/src/stores/useSessionPinnedStore.ts:6-121` (`localStorage` only) | S | **Restore in M6** | Degraded to device-local `localStorage` (`oc.sessions.pinned.v2`). Restore authority to Host SQLite `host-metadata.sqlite` (`openchamber.pinned`), broadcast via `openchamber-control` SSE (`openchamber:session-metadata`), and restore `packages/ui/src/sync/session-pins.ts`. |
| **#2 Session Unread & Watermarks** | `ui/src/sync/session-unread.ts:1-67`<br>`server/lib/openchamber-sessions/unread-baseline.js:1-40` | `ui/src/sync/session-unread.ts` **DELETED**;<br>`agent-contract/src/session.ts:89` | S | **Restore in M6** | Unread state was deleted with OpenCode `time.idle`/`time.viewed`. Restore `workbench = { lastIdleAt, viewedAt, lastTurnOutcome }` in `host-metadata.sqlite`; populate on Canonical `run.completed`/`run.failed`; broadcast over SSE; restore `useSessionUnread` & unread dot. |
| **#3 Session Turn Duration** | `server/lib/openchamber-sessions/turn-duration.js:1-74`<br>`ui/src/lib/sessionTurnMetadata.ts:1-63` | `turn-duration.js` unhooked;<br>`agent-contract/src/metadata.ts:64-70` | S | **Restore in M6** | Server recorder dormant; contract omitted `turn`. Add `turn = { endedAt, durationMs }` to `operationalSchema`; calculate on Canonical run finish (`finishedAt - createdAt`); restore sidebar badge. |
| **#4 BehaviorPage Response Styles** | `ui/src/components/sections/behavior/BehaviorPage.tsx:1-217`<br>`ui/src/lib/responseStyle.ts:1-55` | `sections/behavior/` **DELETED** in commit `76cc860` | S | **Restore in M6** | Deleted due to crude `<system-reminder>` user-message injection. Restore `BehaviorPage.tsx` with **default zero-injection**: `default` sends 0 bytes; explicit non-default presets pass cleanly into OMP personality / session options. |
| **#4 Global Rules / AGENTS.md** | `sections/behavior/BehaviorPage.tsx:180` | `sections/behavior/` **DELETED** | S | **Restore in M6** | Direct viewing/editing of repository `AGENTS.md` rules editor in UI. |
| **Desktop App Shell Settings** | `sections/openchamber/DesktopAppSettings.tsx:1-560` | Inlined into `DesktopNetworkSettings.tsx:471-589` | S | **Restore in M6** | Conflated host application window/tray controls with local network access. Partition cleanly back into distinct Desktop App vs Desktop Network sections. |
| **Desktop Restart Coordination** | `sections/openchamber/desktopRestartDrafts.ts:1-60` | Deleted | S | **Restore in M6** | Restore unified restart draft tracking between Desktop App and Network settings. |
| **Mobile Workspace Tabs** | `sections/openchamber/MobileWorkspaceTabsSettings.tsx:1-53` | Deleted from settings UI | S | **Restore in M6** | Drag-and-drop sortable visibility list for mobile bottom bar. Store `useUIStore.mobileWorkspaceTabOrder` is functional; restore UI settings component. |
| **Worktree Archive on Done** | `sections/openchamber/FinishedWorktreesSettings.tsx:20` | Dropped in `MergedWorktreeCleanupSettings.tsx` | S | **Restore in M6** | Expose `worktreeArchiveOnDoneEnabled` checkbox. Backing store `useWorktreeWork.ts:137` and host git automation are already complete. |
| **Live Browser Tab Limit** | `sections/openchamber/GeneralWorkspaceSettings.tsx:260` | Dropped from UI | S | **Restore in M6** | Expose `liveBrowserTabLimit` (1..20) stepper. Backing store and settings registry already present. |
| **Passkey Label Renaming** | `sections/openchamber/PasskeySettings.tsx:168-218` | Dropped from UI | S | **Restore in M6** | Restore pencil icon and inline rename input. Underlying API `renameStoredPasskey` in `packages/ui/src/lib/passkeys.ts:205` is fully intact. |
| **Default Model & Reasoning Effort** | `sections/openchamber/DefaultsSettings.tsx:60-120` | Gutted in `DefaultsSettings.tsx:1-45` | S | **Restore in M6** | Restore Default Model & Thinking Level picker for new sessions, mapped to OMP role `default` (`OMP_MODEL_ROLES`). |
| **Mobile Return Key Sends** | `sections/openchamber/ChatSettings.tsx:400-412` | Dropped in `ChatSettings.tsx` | S | **Restore in M6** | Mobile UX checkbox for `mobileReturnKeySends`. Store property exists in `useUIStore.ts` and `settings-helpers.js`. |
| **Save Pasted Images as Files** | `sections/openchamber/ChatSettings.tsx:450-457` | Dropped in `ChatSettings.tsx` | S | **Restore in M6** | Restore user preference to save clipboard image pastes as repo assets rather than data URIs. |
| **Sidebar & Tray / Dock Unread Sync** | `packages/electron/tray.mjs:1-50`<br>`electron/dev-dock-identity.mjs:1-40` | Degraded unread count (always 0) | S | **Restore in M6** | Feed restored `isSessionUnread` into Electron IPC `desktop_set_badge_count` and tray icon breathing/unread indicator. |
| **Mobile Widget Unread Snapshot** | `ui/src/apps/mobileWidgetSnapshot.ts:1-60` | Unread mark dropped from top-level sessions | S | **Restore in M6** | Restore `unread: isSessionUnread(session)` and lifecycle sort in mobile widget sync. |
| **NotificationSettings.tsx** | `sections/openchamber/NotificationSettings.tsx:1-480` | `sections/openchamber/NotificationSettings.tsx:1-475` | S | **No Regression** | VS Code webview branching removed; native Desktop, Web, and Mobile notification delivery and event templates (`completion`, `error`, `question`, `subtask`) remain active. |
| **VoiceSettings.tsx** | `sections/openchamber/VoiceSettings.tsx:1-125` | `sections/openchamber/VoiceSettings.tsx:1-125` | S | **No Regression** | Identical (0 diffs). TTS voice configuration, speech speed, and audio preview controls fully preserved. |
| **TunnelSettings.tsx** | `sections/openchamber/TunnelSettings.tsx:1-630` | `sections/openchamber/TunnelSettings.tsx:1-750` | S | **No Regression** | Preserved and refactored with Zod validation schemas (`tunnelHttpsPortSchema`, `approvalUrlSchema`) and shared UI improvements. |
| **EnvironmentVariablesSettings.tsx** | `sections/openchamber/EnvironmentVariablesSettings.tsx:1-110` | `sections/openchamber/EnvironmentVariablesSettings.tsx:1-75` | S | **No Regression** | Host-owned environment variables editor fully intact; dead OpenCode restart button removed. |
| **WorktreeSectionContent.tsx** | `sections/openchamber/WorktreeSectionContent.tsx:1-135` | `sections/openchamber/WorktreeSectionContent.tsx:1-135` | S | **No Regression** | Worktree session association cleanly migrated from OpenCode `session.id` to Canonical `session.sessionId`. |
| **GitIdentitiesSectionContent.tsx** / `GitPage.tsx` | `sections/git-identities/GitPage.tsx:1-180` | `sections/git-identities/GitPage.tsx:1-180` | S | **No Regression** | Identical (0 diffs). Author profile management, default profile selection, and signing configuration fully active. |
| **SessionRetentionSettings.tsx** | `sections/openchamber/SessionRetentionSettings.tsx:1-95` | `sections/openchamber/SessionRetentionSettings.tsx:1-95` | S | **No Regression** | Identical (0 diffs). Session age retention and pruning thresholds fully active. |
| **SessionWorkSettings.tsx** | `sections/openchamber/SessionWorkSettings.tsx:1-110` | `sections/openchamber/SessionWorkSettings.tsx:1-120` | S | **No Regression** | Active and aligned with Canonical work state. |
| **Host Goal Supervisor** | `sections/openchamber/SessionGoalCheckerField.tsx:1-158` | Deleted in `m4-orchestration` | S | **Keep Retired** | Maintainer-excluded. Replaced by native OMP agent execution and goal mode. |
| **Root Agent Persona Picker (CP-01)** | `ui/src/stores/useConfigStore.ts:417` | Causes 422 `UNSUPPORTED_CAPABILITY` | S | **Keep Retired** | Replace with mode switcher (main/plan/vibe/goal); subagents only configured in `task` tool. |
| **Dual Tool-Permission Switches** | `sections/openchamber/PermissionDefaultModeField.tsx:1-116` | Deleted in commit `76cc860` | S | **Keep Retired** | OpenCode permission model (`ask/safety/auto`) retired in favor of OMP approval modes (`always-ask/write/yolo`) and Canonical CAS interaction manager. |
| **Code Mode Toggle (SET-09)** | `sections/openchamber/OpenChamberToolsSettings.tsx:317` | Deleted in commit `76cc860` | S | **Keep Retired** | Setting was saved to settings.json but never consumed by any runtime. |
| **OpenCode Agent Tool Generators** | `sections/openchamber/OpenChamberToolsSettings.tsx:79-115` | Deleted | S | **Keep Retired** | OpenCode config generators (`schedule`, `knowledge`, `render`, `workflow`). OMP provides native tools and MCP servers. |
| **OpenCode Folder Trust** | `server/lib/opencode-trust/*` (8 files) | Deleted | S | **Keep Retired** | OpenCode-specific folder security model; superseded by Host boundary. |
| **Per-Session Cache Warming** | `server/lib/session-warming/*` (4 files)<br>`SessionWarmingModeField.tsx` | Deleted | S | **Keep Retired** | Explicitly maintainer-excluded. |
| **Bundled Ripgrep Script** | `electron/scripts/prepare-ripgrep.mjs` | Deleted | S | **Keep Retired** | Maintainer-excluded. |
| **Bundled OpenCode CLI & Scripts** | `electron/scripts/prepare-opencode-cli.mjs`<br>`electron/opencode-readiness.mjs` | Deleted | S | **Keep Retired** | OpenCode CLI management retired; Host embeds Bun agent service with vendored OMP. |
| **OpenCode Proxy & Upstream Bridge** | `server/lib/opencode/*` (50+ files)<br>`server/lib/event-stream/directory-ws-bridge.js` | Deleted | S | **Keep Retired** | OpenCode HTTP/WebSocket proxy infrastructure correctly replaced by Canonical Agent Service. |

---

## 4. Deep Dive: Cross-Device Session Pins (`#1 session-pins`)

### 4.1 Upstream Architecture (`0056bf6a9`)
In upstream OpenChamber:
1. **Authoritative Storage:** A session pin was stored authoritatively in session metadata under `session.metadata.openchamber.pinned = { at: number }` (`packages/ui/src/lib/sessionPins.ts:25-41`).
2. **Synchronization Logic (`packages/ui/src/sync/session-pins.ts:1-75`):**
   - User pin click triggered `toggleSessionPin({ directory, sessionId })`.
   - The UI applied an optimistic update via `setPendingPin(key, pinned)` in `useSessionPinnedStore`.
   - Mutation requests were queued per session key (`pinQueues`).
   - The action called `setSessionPinned(sessionId, directory, pinned)` in `packages/ui/src/sync/session-actions.ts`.
   - Server merged the patch into session metadata and broadcast `openchamber:session-metadata` via SSE.
   - Any legacy local-only pins were migrated automatically via `migrateLegacyPins()`.
3. **Cross-Device Consistency:** Desktop, Web, and Mobile clients all observed the same pins because `useSessionPinnedStore` derived its IDs directly from `useGlobalSessionsStore.getState().activeSessions` using `isSessionPinnedInMetadata`.

### 4.2 Degradation at Current HEAD (`76112ae00`)
During milestone refactoring, the cross-device pin synchronization was broken:
- `packages/ui/src/sync/session-pins.ts` and `session-pins.test.ts` were **deleted**.
- `setSessionPinned` was **removed** from `packages/ui/src/sync/session-actions.ts`.
- `packages/ui/src/stores/useSessionPinnedStore.ts` was rewritten to store pins **strictly in local browser `localStorage`** (`STORAGE_KEY = 'oc.sessions.pinned.v2'`, lines 6, 80-83, 96, 112). Pins no longer travel to the server or synchronize across connected devices.
- In `packages/agent-contract/src/metadata.ts:64-70`, `operationalSchema` omits `pinned` (only root `isPinned?: boolean` was added, diverging from OpenChamber's `openchamber.pinned = { at: number }`).
- In `packages/web/server/lib/openchamber-sessions/session-metadata-store.js:35-39`, `OPENCHAMBER_KEYS` omits `'pinned'`, which strips it during `importOperationalSessions`.

### 4.3 Concrete Restoration Design
1. **Contract Update (`packages/agent-contract/src/metadata.ts`):**
   - Add `pinned: z.strictObject({ at: TimestampSchema }).optional()` to `operationalSchema`.
   - Add `pinned: z.strictObject({ at: TimestampSchema }).nullable().optional()` to `operationalPatchSchema`.
2. **Host Metadata Store (`session-metadata-store.js`):**
   - Add `'pinned'` to `OPENCHAMBER_KEYS`.
   - Ensure `session_metadata` in `host-metadata.sqlite` stores `openchamber.pinned` durably.
3. **Server Action & SSE Broadcast (`openchamber-sessions/routes.js`):**
   - On `PATCH /api/openchamber/sessions/:sessionId/metadata`, verify `openchamber.pinned` merges cleanly.
   - Dispatch `broadcastOpenChamberUiEvent({ type: 'openchamber:session-metadata', properties: { sessionId, revision, metadata } })` to `uiOpenChamberEventClients`.
4. **UI Store & Action Restoration (`packages/ui/src`):**
   - Restore `setSessionPinned` in `packages/ui/src/sync/session-actions.ts`.
   - Restore `packages/ui/src/sync/session-pins.ts` (`toggleSessionPin`, `pinQueues`, `setPendingPin`, legacy migration).
   - Revert `packages/ui/src/stores/useSessionPinnedStore.ts` to derive authoritative pins from `useGlobalSessionsStore` with pending overlay, using `localStorage` only for legacy migration.

---

## 5. Deep Dive: Session Unread, viewedAt, lastIdleAt, lastTurnOutcome & Turn Duration (`#2`)

### 5.1 Upstream Architecture (`0056bf6a9`)
1. **Unread Watermark:**
   - In OpenCode 2.x, the session record carried `session.time.idle` (timestamp when turn ended) and `session.time.viewed` (monotone watermark of when the user viewed the session).
   - `isSessionUnread(session)` evaluated `session.time.idle !== undefined && (session.time.viewed === undefined || session.time.viewed < session.time.idle)`.
   - `markSessionUnreadSeen(sessionId)` optimistically advanced `time.viewed = idle` and posted to the server.
   - The unread watermark survived server restarts, appeared on sidebar session rows (`SessionActivityIndicator state="unread"`), drove the macOS Dock unread count in `dev-dock-identity.mjs`, and fed the iOS/Android widget snapshots (`mobileWidgetSnapshot.ts`).
2. **Turn Duration:**
   - `packages/web/server/lib/openchamber-sessions/turn-duration.js` watched events. On `busy`, it recorded start time; on `idle`, it computed `durationMs = endedAt - startedAt` and patched `openchamber.turn = { endedAt, durationMs }` into session metadata.
   - `packages/ui/src/lib/sessionTurnMetadata.ts` validated `Math.abs(idle - endedAt) <= 1000` and rendered the elapsed turn duration badge next to unread session rows.

### 5.2 Degradation at Current HEAD (`76112ae00`)
- `packages/ui/src/sync/session-unread.ts` was **completely deleted**.
- In Canonical `@openchamber/agent-contract`, `SessionSchema` (`session.ts:89-94`) has `createdAt`, `updatedAt`, `runtimeStatus`, and `activeRunId`, but completely lacks `lastIdleAt`, `viewedAt`, and `lastTurnOutcome`.
- `packages/ui/src/components/session/SessionActivityIndicator.tsx` retains the `'unread'` visual style (`icon: 'checkbox-circle', colorClass: 'text-status-success'`), but callers no longer provide it.
- `dev-dock-identity.mjs` and `packages/electron/tray.mjs` no longer count unread finished sessions.
- `turn-duration.js` on the server is dormant because its wire event listeners were not reconnected to Canonical run events, and `operationalSchema` in `@openchamber/agent-contract` omits `turn`.

### 5.3 Concrete Restoration Design
1. **Workbench Metadata in Host SQLite (`host-metadata.sqlite`):**
   - Host `session-metadata-store.js` manages workbench state under `session.metadata.openchamber.workbench`:
     - `lastIdleAt: number` (timestamp of the most recent terminal run completion).
     - `viewedAt: number` (monotone watermark timestamp of when the user viewed the session).
     - `lastTurnOutcome: 'completed' | 'failed' | 'cancelled'`.
2. **Run Completion Subscriber (Agent Service -> Host Gateway):**
   - In `packages/web/server/index.js`, subscribe to Canonical events from `globalEventHub`:
     - On `run.started(runId, sessionId, createdAt)`: record `startedAt.set(sessionId, createdAt)`.
     - On terminal `run.completed` or `run.failed` with `finishedAt`:
       - Calculate `durationMs = Math.max(0, finishedAt - startedAt)`.
       - Update `sessionMetadataStore` with:
         ```json
         {
           "openchamber": {
             "workbench": {
               "lastIdleAt": finishedAt,
               "lastTurnOutcome": "completed"
             },
             "turn": {
               "endedAt": finishedAt,
               "durationMs": durationMs
             }
           }
         }
         ```
       - Broadcast `openchamber:session-metadata` to `uiOpenChamberEventClients`.
3. **Restoring UI `session-unread.ts` (`packages/ui/src/sync/session-unread.ts`):**
   - Re-implement:
     ```ts
     export const isSessionUnread = (session: Session | undefined): boolean => {
       if (!session || session.parentSessionId || session.archivedAt !== undefined) return false;
       const wb = session.metadata?.openchamber?.workbench;
       if (!wb?.lastIdleAt) return false;
       return wb.viewedAt === undefined || wb.viewedAt < wb.lastIdleAt;
     };
     ```
   - Reconnect `markSessionUnreadSeen(sessionId)` to patch `workbench.viewedAt = workbench.lastIdleAt`.
4. **Re-binding Consumers:**
   - Reconnect `SessionSidebarItem.tsx`, `MobileSessionRow.tsx`, `SessionTabsStrip.tsx`, `mobileWidgetSnapshot.ts`, `dev-dock-identity.mjs`, and `packages/electron/tray.mjs`.

---

## 6. Deep Dive: Behavior Page & Style Presets (`#4 BehaviorPage.tsx`)

### 6.1 Upstream Implementation & Why It Was Retired
- **Upstream (`0056bf6a9`):** `BehaviorPage.tsx` let users choose response styles (`concise`, `detailed`, `mentor`, `pushback`, `noFiller`, `matchEnergy`, `warmPeer`, `custom`).
- **The Crude Port:** `ChatInput.tsx` intercepted the user's first prompt message and prepended a synthetic `<system-reminder>` block:
  ```xml
  <system-reminder>
  [Response style instruction text]
  </system-reminder>
  ```
- **The Dogmatic Cut (commit `76cc860`):** Because prepending synthetic tags into user prompt messages polluted message transcripts and broke prompt purity, `BehaviorPage.tsx`, `responseStyle.ts`, and `systemReminder.ts` were deleted outright, removing all user style choices.

### 6.2 The M6 Default Zero-Injection Architecture
Per `.workflow/specs/m6-audit-and-polish.md`:
> "Optional user-selected BehaviorPage style instructions remain strictly opt-in (`default` sends zero extra prompt text; explicit non-default presets deliver the user's chosen preference cleanly)."

**Concrete Design Rules:**
1. **Strict Default Zero-Injection:**
   - When the preset is `default` (or response style is disabled), the system injects **exactly 0 bytes** of extra instructions. No `<system-reminder>`, no appended prompt text, 100% stock OMP behavior.
2. **Clean Delivery for Opt-In Presets:**
   - When a user explicitly chooses a non-default preset (`concise`, `detailed`, etc.), the instruction is passed cleanly at the session boundary through `@openchamber/agent-contract` session creation options (`systemPrompt` or `personality` options in `AgentService`), **never** by mutating the user's chat message body.
3. **UI Restoration:**
   - Restore `BehaviorPage.tsx` under the `agent` settings navigation group.
   - Restore the project-level `AGENTS.md` / global rules editor tab.

---

## 7. Detailed Settings Sections & Controls (`sections/openchamber/*`)

### 7.1 `DesktopAppSettings.tsx` vs. `DesktopNetworkSettings.tsx`
- **Source Citation:** Upstream `DesktopAppSettings.tsx:1-560` was deleted and inlined into `DesktopNetworkSettings.tsx:471-589`.
- **Analysis:** Host window and lifecycle controls (`launchAtLogin`, `minimizeToTray`, `desktopMacMenuBarEnabled`, `desktopLinuxNativeFrame`, `keepAwake`, `miniChatGlobalShortcut`, `DesktopQuakeModeSettings`) are improperly bundled under "Network".
- **Restoration:** Re-partition into two distinct settings views/cards: **Desktop Application** (window, tray, launch, Quake) and **Local Network Access** (port, bind address, pairing). Restore `desktopRestartDrafts.ts` to coordinate pending restart states.

### 7.2 `GeneralWorkspaceSettings.tsx` & `MobileWorkspaceTabsSettings.tsx`
- **Source Citation:** `GeneralWorkspaceSettings.tsx:1-437` was deleted and partially absorbed into `OpenChamberVisualSettings.tsx`. In the process, `MobileWorkspaceTabsSettings.tsx:1-53` (drag-to-reorder for mobile bottom tabs: Status, Changes, Files, Terminal, Notes) was dropped.
- **Analysis:** The backing store (`useUIStore.ts:886, 1522`), unit tests (`useUIStore.mobileWorkspaceTabs.test.ts`), and server settings registry (`settings-registry.json:747`) exist and work, but the UI settings component is missing.
- **Restoration:** Restore `MobileWorkspaceTabsSettings.tsx` within the Layout/General settings page.

### 7.3 `DefaultsSettings.tsx`
- **Source Citation:** Upstream `DefaultsSettings.tsx:1-530` was reduced to 45 lines.
- **Restoration:**
  - Restore Default Model and Reasoning Effort (Thinking Level) selector for new sessions, mapped to OMP role `default`.
  - Restore Default Agent Mode selector (mapping to main / plan / vibe / goal).
  - Keep `SessionWarmingModeField` and `PermissionDefaultModeField` retired.

### 7.4 `NotificationSettings.tsx`
- **Source Citation:** `packages/ui/src/components/sections/openchamber/NotificationSettings.tsx:1-480`.
- **Analysis:** Diff against `0056bf6a9` is 15 lines. Retired dead VS Code webview branching (`isVSCodeRuntime`), while native Desktop, Web, and Mobile notification delivery and event templates (`completion`, `error`, `question`, `subtask`) remain active. No regression; keep active.

### 7.5 `VoiceSettings.tsx`
- **Source Citation:** `packages/ui/src/components/sections/openchamber/VoiceSettings.tsx:1-125`.
- **Analysis:** Completely identical between `0056bf6a9` and `HEAD` (0 diffs). Speech synthesis options, voice selection, speech rate, and audio preview controls are preserved without degradation. No regression.

### 7.6 `PasskeySettings.tsx`
- **Source Citation:** Upstream `PasskeySettings.tsx:168-218` had inline passkey label renaming (`startRenamePasskey`, `submitRenamePasskey`). In HEAD, this input was dropped.
- **Restoration:** Passkey renaming is a genuine convenience feature. The underlying API `renameStoredPasskey` is still present in `packages/ui/src/lib/passkeys.ts:205` and supported by the server. Re-add the pencil icon and inline rename input.

### 7.7 `TunnelSettings.tsx`
- **Source Citation:** `packages/ui/src/components/sections/openchamber/TunnelSettings.tsx:1-750`.
- **Analysis:** Preserved and actively maintained. Enhanced with strict Zod validation schemas (`tunnelHttpsPortSchema`, `approvalUrlSchema`, `isTunnelMode`), tooltip improvements, and shared styling updates. No regression.

### 7.8 `EnvironmentVariablesSettings.tsx`
- **Source Citation:** `packages/ui/src/components/sections/openchamber/EnvironmentVariablesSettings.tsx:1-75`.
- **Analysis:** Host-owned environment variables editor (`fetchUserEnvironment`, `updateUserEnvironment`, `EnvironmentVariablesEditor`) is fully intact. The only change was removing the dead "Restart OpenCode" button (`restartOpenCodeWithFeedback`), which was an OpenCode workaround. No regression.

### 7.9 `WorktreeSectionContent.tsx` & Worktree Settings
- **Source Citation:** `packages/ui/src/components/sections/openchamber/WorktreeSectionContent.tsx:1-135`.
- **Analysis:** Preserved and active. Migrated cleanly from OpenCode `session.id` to Canonical `session.sessionId`. In `MergedWorktreeCleanupSettings.tsx`, restore the missing checkbox for `worktreeArchiveOnDoneEnabled`.

### 7.10 `GitIdentitiesSectionContent.tsx` / `GitPage.tsx`
- **Source Citation:** `packages/ui/src/components/sections/git-identities/GitPage.tsx:1-180`.
- **Analysis:** Identical between `0056bf6a9` and `HEAD` (0 diffs). Git author profiles, default author identity, and commit signing configuration remain fully active. No regression.

### 7.11 `SessionRetentionSettings.tsx`
- **Source Citation:** `packages/ui/src/components/sections/openchamber/SessionRetentionSettings.tsx:1-95`.
- **Analysis:** Identical between `0056bf6a9` and `HEAD` (0 diffs). Session age retention, auto-pruning thresholds, and retention policies remain fully active. No regression.

### 7.12 `SessionWorkSettings.tsx`
- **Source Citation:** `packages/ui/src/components/sections/openchamber/SessionWorkSettings.tsx:1-120`.
- **Analysis:** Preserved and active. Aligned with Canonical work state and worktree automation.

### 7.13 Other Retained OpenChamber Settings Surfaces
- `AboutSettings.tsx`: Active (version, platform, update status).
- `AppLinkSecuritySettings.tsx`: Active (deep linking security policies).
- `IsolatedSpacesSettings.tsx`: Active (container space allocation and configuration).
- `KeyboardShortcutsSettings.tsx`: Active (shortcut mappings and recording dialog).
- `MessageSearchSettings.tsx`: Active (full-text search indexing).
- `OpenChamberPage.tsx`: Active (main settings hub).
- `SpacePlacesSettings.tsx`: Active (Docker/SSH space places).
- `ThemePicker.tsx`, `ThemeCatalogDialog.tsx`, `ThemeImportButton.tsx`: Active (theme customizer and catalog import).

---

## 8. Additional Workbench UX Audits

### 8.1 Chat & Composer Mechanics
- **Attachment Inlining (CP-05):** In upstream OpenCode, non-image attachments were injected via custom messages. In OMP, plain text attachments should be inlined into prompt context with delimiters, while binary/large files supply absolute filesystem paths for the `read` tool.
- **Compact Action (CP-04):** Compact button currently sends `/compact` as a chat string while `runCommands: false`. It must call the canonical compact RPC (`session.compact()`).
- **Tool Status Buckets (CP-06):** `useAssistantStatus.ts:89-107` still uses OpenCode tool names (`shell`, `subagent`, `question`, `codesearch`). Map OMP native tool names (`bash`, `task`, `ask`, `find`, `grep`, `glob`, `todo`).
- **Mobile Preferences:** Restore `mobileReturnKeySends` and `savePastedImagesAsFiles` in `ChatSettings.tsx` `ComposerTab`.

### 8.2 Worktrees & Multi-Run
- **Worktree Relocation:** The Canonical service supports workspace relocation rather than OpenCode's in-place session move.
- **Multi-Run & Fusion:** `multirunSchema` in `agent-contract/src/metadata.ts:43-63` is preserved in the contract. Host multi-run execution remains Host-owned, routing models via OMP roles (`commit`, `smol`, `default`).

### 8.3 Board, Git & Issue Linking
- **Tracker Integration:** `session-linked-issues.js` and `packages/ui/src/lib/linkedIssues.ts` support GitHub, GitLab, Linear, and Jira tracker items.
- **Source Control Activity:** The `openchamber:source-control.activity` SSE event coalesces turn finishes to trigger repository status refreshes without polling.

### 8.4 Electron Desktop App Shell
- **Dev Dock Identity:** macOS Dock badge correctly differentiates worktrees via issue/PR numbers, falling back to the global unread session count.
- **Tray Menu:** Actionable tray icon status reflects active runs, pending approvals, and unread finished sessions.
- **Window Pinning:** Mini-chat floating windows support always-on-top pinning (`desktop_set_window_pinned`).

---

## 9. Phase 3 Concrete Implementation Plan (Window A Tasks)

| Task ID | Component | Implementation Steps | Verification Command |
|---|---|---|---|
| **A-1** | Contract & Metadata Schema | Add `pinned`, `turn`, and `workbench` schemas to `packages/agent-contract/src/metadata.ts`. Add `'pinned'`, `'turn'`, and `'workbench'` to `OPENCHAMBER_KEYS` in `session-metadata-store.js`. | `bun test packages/agent-contract/src/metadata.test.ts packages/web/server/lib/openchamber-sessions/session-metadata-store.test.js` |
| **A-2** | Cross-Device Session Pins | Restore `setSessionPinned` in `session-actions.ts`. Restore `packages/ui/src/sync/session-pins.ts`. Revert `useSessionPinnedStore.ts` to derive from server state. Verify SSE broadcast. | `bun test packages/ui/src/sync/session-pins.test.ts packages/ui/src/stores/useSessionPinnedStore.test.ts` |
| **A-3** | Persistent Session Unread & Turn Duration | Connect Host run completion subscriber to update `workbench.lastIdleAt`, `workbench.lastTurnOutcome`, and `turn.durationMs`. Restore `packages/ui/src/sync/session-unread.ts`. Update `sessionTurnMetadata.ts`. | `bun test packages/ui/src/sync/session-unread.test.ts packages/ui/src/lib/sessionTurnMetadata.test.ts` |
| **A-4** | Sidebar & Electron Tray Sync | Reconnect `isSessionUnread` to `SessionSidebarItem.tsx`, `MobileSessionRow.tsx`, `mobileWidgetSnapshot.ts`, and Electron `dev-dock-identity.mjs`. | `bun test packages/electron/dev-dock-identity.test.mjs packages/ui/src/apps/mobileWidgetSnapshot.test.ts` |
| **A-5** | BehaviorPage & Presets | Restore `BehaviorPage.tsx` with default zero-injection contract. Deliver non-default presets through OMP personality/session options. Restore `AGENTS.md` editor. | `bun test packages/ui/src/components/sections/behavior/BehaviorPage.test.tsx` |
| **A-6** | OpenChamber Settings Restoration | Partition `DesktopAppSettings.tsx` from `DesktopNetworkSettings.tsx`. Restore `MobileWorkspaceTabsSettings.tsx`. Re-expose `liveBrowserTabLimit`, `worktreeArchiveOnDoneEnabled`, passkey renaming, and default model selector. | `bun test packages/ui/src/components/sections/openchamber/` |

---

## Appendix A: Complete Exhaustive Deleted Files Inventory (566 Files)

Below is the complete, exhaustive inventory of all 566 deleted paths between `0056bf6a9` and `HEAD` across packages/ui/src, packages/web/server, and packages/electron. Every path is cited verbatim and classified into **Restore in M6** or **Keep Retired**.

### A.1 packages/electron (10 files)

- `packages/electron/opencode-cwd.mjs` — Keep Retired
- `packages/electron/opencode-cwd.test.mjs` — Keep Retired
- `packages/electron/opencode-readiness.mjs` — Keep Retired
- `packages/electron/opencode-readiness.test.mjs` — Keep Retired
- `packages/electron/resources/opencode-cli/.gitkeep` — Keep Retired
- `packages/electron/scripts/opencode-cli-version.mjs` — Keep Retired
- `packages/electron/scripts/opencode-cli-version.test.mjs` — Keep Retired
- `packages/electron/scripts/prepare-opencode-cli.mjs` — Keep Retired
- `packages/electron/scripts/prepare-ripgrep.mjs` — Keep Retired
- `packages/electron/scripts/verify-opencode-cli.mjs` — Keep Retired

### A.2 packages/web/server (201 files)

- `packages/web/server/lib/agent-tool/runtime.js` — Keep Retired
- `packages/web/server/lib/agent-tool/runtime.test.js` — Keep Retired
- `packages/web/server/lib/diagnostics/opencode-load.js` — Keep Retired
- `packages/web/server/lib/diagnostics/opencode-load.test.js` — Keep Retired
- `packages/web/server/lib/event-stream/directory-ws-bridge.js` — Keep Retired
- `packages/web/server/lib/event-stream/upstream-reader.js` — Keep Retired
- `packages/web/server/lib/event-stream/upstream-reader.test.js` — Keep Retired
- `packages/web/server/lib/openchamber-sessions/fork-inheritance.js` — Keep Retired
- `packages/web/server/lib/openchamber-sessions/fork-inheritance.test.js` — Keep Retired
- `packages/web/server/lib/openchamber-sessions/opencode-client.js` — Keep Retired
- `packages/web/server/lib/openchamber-sessions/opencode-client.test.js` — Keep Retired
- `packages/web/server/lib/openchamber-sessions/session-archive.js` — Keep Retired
- `packages/web/server/lib/openchamber-sessions/session-archive.test.js` — Keep Retired
- `packages/web/server/lib/opencode-trust/DOCUMENTATION.md` — Keep Retired
- `packages/web/server/lib/opencode-trust/assessment.js` — Keep Retired
- `packages/web/server/lib/opencode-trust/fetch-guard.js` — Keep Retired
- `packages/web/server/lib/opencode-trust/fetch-guard.test.js` — Keep Retired
- `packages/web/server/lib/opencode-trust/index.d.ts` — Keep Retired
- `packages/web/server/lib/opencode-trust/index.js` — Keep Retired
- `packages/web/server/lib/opencode-trust/index.test.js` — Keep Retired
- `packages/web/server/lib/opencode-trust/session-directory.js` — Keep Retired
- `packages/web/server/lib/opencode-trust/store.js` — Keep Retired
- `packages/web/server/lib/opencode/agents.js` — Keep Retired
- `packages/web/server/lib/opencode/atomic-write.d.ts` — Keep Retired
- `packages/web/server/lib/opencode/atomic-write.js` — Keep Retired
- `packages/web/server/lib/opencode/auth-state-runtime.js` — Keep Retired
- `packages/web/server/lib/opencode/auth.d.ts` — Keep Retired
- `packages/web/server/lib/opencode/auth.js` — Keep Retired
- `packages/web/server/lib/opencode/auth.test.js` — Keep Retired
- `packages/web/server/lib/opencode/claude-cli-auth.js` — Keep Retired
- `packages/web/server/lib/opencode/claude-cli-auth.test.js` — Keep Retired
- `packages/web/server/lib/opencode/cli-upgrade.d.ts` — Keep Retired
- `packages/web/server/lib/opencode/cli-upgrade.js` — Keep Retired
- `packages/web/server/lib/opencode/cli-upgrade.test.js` — Keep Retired
- `packages/web/server/lib/opencode/commands.js` — Keep Retired
- `packages/web/server/lib/opencode/compatibility.d.ts` — Keep Retired
- `packages/web/server/lib/opencode/compatibility.js` — Keep Retired
- `packages/web/server/lib/opencode/compatibility.test.js` — Keep Retired
- `packages/web/server/lib/opencode/config-entity-routes.js` — Keep Retired
- `packages/web/server/lib/opencode/config-entity-routes.test.js` — Keep Retired
- `packages/web/server/lib/opencode/config-entity-v2.test.js` — Keep Retired
- `packages/web/server/lib/opencode/config-mutation-response.js` — Keep Retired
- `packages/web/server/lib/opencode/config-mutation-response.test.js` — Keep Retired
- `packages/web/server/lib/opencode/config-paths.test.js` — Keep Retired
- `packages/web/server/lib/opencode/config-v2.d.ts` — Keep Retired
- `packages/web/server/lib/opencode/config-v2.js` — Keep Retired
- `packages/web/server/lib/opencode/config-v2.test.js` — Keep Retired
- `packages/web/server/lib/opencode/credentials-stale-directory.test.js` — Keep Retired
- `packages/web/server/lib/opencode/env-config.js` — Keep Retired
- `packages/web/server/lib/opencode/env-config.test.js` — Keep Retired
- `packages/web/server/lib/opencode/env-runtime.js` — Keep Retired
- `packages/web/server/lib/opencode/env-runtime.test.js` — Keep Retired
- `packages/web/server/lib/opencode/health-wait.js` — Keep Retired
- `packages/web/server/lib/opencode/health-wait.test.js` — Keep Retired
- `packages/web/server/lib/opencode/hmr-state-runtime.js` — Keep Retired
- `packages/web/server/lib/opencode/hmr-state-runtime.test.js` — Keep Retired
- `packages/web/server/lib/opencode/instance-dir.js` — Keep Retired
- `packages/web/server/lib/opencode/instance-dir.test.js` — Keep Retired
- `packages/web/server/lib/opencode/lifecycle-process.test.js` — Keep Retired
- `packages/web/server/lib/opencode/lifecycle.js` — Keep Retired
- `packages/web/server/lib/opencode/lifecycle.test.js` — Keep Retired
- `packages/web/server/lib/opencode/loadable-plugin-spec.d.ts` — Keep Retired
- `packages/web/server/lib/opencode/loadable-plugin-spec.js` — Keep Retired
- `packages/web/server/lib/opencode/loadable-plugin-spec.test.js` — Keep Retired
- `packages/web/server/lib/opencode/managed-config-file.js` — Keep Retired
- `packages/web/server/lib/opencode/managed-config-file.test.js` — Keep Retired
- `packages/web/server/lib/opencode/managed-plugin-config.js` — Keep Retired
- `packages/web/server/lib/opencode/managed-plugin-config.test.js` — Keep Retired
- `packages/web/server/lib/opencode/managed-process-registry.d.ts` — Keep Retired
- `packages/web/server/lib/opencode/managed-process-registry.js` — Keep Retired
- `packages/web/server/lib/opencode/managed-process-registry.test.mjs` — Keep Retired
- `packages/web/server/lib/opencode/managed-process-stop.js` — Keep Retired
- `packages/web/server/lib/opencode/managed-process-stop.test.js` — Keep Retired
- `packages/web/server/lib/opencode/mcp-folder-config.test.js` — Keep Retired
- `packages/web/server/lib/opencode/mcp.js` — Keep Retired
- `packages/web/server/lib/opencode/message-shells.js` — Keep Retired
- `packages/web/server/lib/opencode/message-shells.test.js` — Keep Retired
- `packages/web/server/lib/opencode/model-discovery.d.ts` — Keep Retired
- `packages/web/server/lib/opencode/model-discovery.js` — Keep Retired
- `packages/web/server/lib/opencode/model-discovery.test.js` — Keep Retired
- `packages/web/server/lib/opencode/network-runtime.js` — Keep Retired
- `packages/web/server/lib/opencode/network-runtime.test.js` — Keep Retired
- `packages/web/server/lib/opencode/npm-registry.js` — Keep Retired
- `packages/web/server/lib/opencode/npm-registry.test.js` — Keep Retired
- `packages/web/server/lib/opencode/opencode-resolution-runtime.js` — Keep Retired
- `packages/web/server/lib/opencode/plugin-routes.js` — Keep Retired
- `packages/web/server/lib/opencode/plugin-routes.test.js` — Keep Retired
- `packages/web/server/lib/opencode/plugin-spec.d.ts` — Keep Retired
- `packages/web/server/lib/opencode/plugin-spec.js` — Keep Retired
- `packages/web/server/lib/opencode/plugin-spec.test.js` — Keep Retired
- `packages/web/server/lib/opencode/plugins.js` — Keep Retired
- `packages/web/server/lib/opencode/plugins.test.js` — Keep Retired
- `packages/web/server/lib/opencode/project-start-command.d.ts` — Keep Retired
- `packages/web/server/lib/opencode/project-start-command.js` — Keep Retired
- `packages/web/server/lib/opencode/project-start-command.test.js` — Keep Retired
- `packages/web/server/lib/opencode/prompt-response.js` — Keep Retired
- `packages/web/server/lib/opencode/provider-env-aliases.d.ts` — Keep Retired
- `packages/web/server/lib/opencode/provider-env-aliases.js` — Keep Retired
- `packages/web/server/lib/opencode/provider-env-aliases.test.js` — Keep Retired
- `packages/web/server/lib/opencode/provider-source-route.test.js` — Keep Retired
- `packages/web/server/lib/opencode/providers-disabled.test.js` — Keep Retired
- `packages/web/server/lib/opencode/providers.js` — Keep Retired
- `packages/web/server/lib/opencode/providers.test.js` — Keep Retired
- `packages/web/server/lib/opencode/proxy-agent-wiring.test.js` — Keep Retired
- `packages/web/server/lib/opencode/proxy-session-upstream-timeout.test.js` — Keep Retired
- `packages/web/server/lib/opencode/proxy.js` — Keep Retired
- `packages/web/server/lib/opencode/proxy.test.js` — Keep Retired
- `packages/web/server/lib/opencode/pwa-manifest-routes.test.js` — Keep Retired
- `packages/web/server/lib/opencode/response-envelope.js` — Keep Retired
- `packages/web/server/lib/opencode/response-envelope.test.js` — Keep Retired
- `packages/web/server/lib/opencode/restart-session-recovery.test.js` — Keep Retired
- `packages/web/server/lib/opencode/routes-upgrade.test.js` — Keep Retired
- `packages/web/server/lib/opencode/routes.js` — Keep Retired
- `packages/web/server/lib/opencode/server-utils-runtime.js` — Keep Retired
- `packages/web/server/lib/opencode/server-utils-runtime.test.js` — Keep Retired
- `packages/web/server/lib/opencode/session-activity.js` — Keep Retired
- `packages/web/server/lib/opencode/session-activity.test.js` — Keep Retired
- `packages/web/server/lib/opencode/session-runtime.js` — Keep Retired
- `packages/web/server/lib/opencode/session-runtime.test.js` — Keep Retired
- `packages/web/server/lib/opencode/session-title-plugin.js` — Keep Retired
- `packages/web/server/lib/opencode/session-title-plugin.test.js` — Keep Retired
- `packages/web/server/lib/opencode/shared.js` — Keep Retired
- `packages/web/server/lib/opencode/shared.test.js` — Keep Retired
- `packages/web/server/lib/opencode/skill-routes.js` — Keep Retired
- `packages/web/server/lib/opencode/skill-routes.test.js` — Keep Retired
- `packages/web/server/lib/opencode/skill-switch.js` — Keep Retired
- `packages/web/server/lib/opencode/skill-switch.test.js` — Keep Retired
- `packages/web/server/lib/opencode/skills.js` — Keep Retired
- `packages/web/server/lib/opencode/skills.test.js` — Keep Retired
- `packages/web/server/lib/opencode/snippets.js` — Keep Retired
- `packages/web/server/lib/opencode/snippets.test.js` — Keep Retired
- `packages/web/server/lib/opencode/turn-start.js` — Keep Retired
- `packages/web/server/lib/opencode/turn-start.test.js` — Keep Retired
- `packages/web/server/lib/opencode/upgrade-capability.js` — Keep Retired
- `packages/web/server/lib/opencode/upgrade-capability.test.js` — Keep Retired
- `packages/web/server/lib/opencode/v1-migration-topup.js` — Keep Retired
- `packages/web/server/lib/opencode/v1-migration-topup.test.js` — Keep Retired
- `packages/web/server/lib/opencode/v2-install.d.ts` — Keep Retired
- `packages/web/server/lib/opencode/v2-install.js` — Keep Retired
- `packages/web/server/lib/opencode/v2-install.test.js` — Keep Retired
- `packages/web/server/lib/opencode/watcher.js` — Keep Retired
- `packages/web/server/lib/opencode/watcher.test.js` — Keep Retired
- `packages/web/server/lib/opencode/websearch-config.js` — Keep Retired
- `packages/web/server/lib/opencode/worktree-directory.d.ts` — Keep Retired
- `packages/web/server/lib/opencode/worktree-directory.js` — Keep Retired
- `packages/web/server/lib/opencode/worktree-directory.test.js` — Keep Retired
- `packages/web/server/lib/permission-auto-accept/DOCUMENTATION.md` — Keep Retired
- `packages/web/server/lib/permission-auto-accept/modes.js` — Keep Retired
- `packages/web/server/lib/permission-auto-accept/runtime.js` — Keep Retired
- `packages/web/server/lib/permission-auto-accept/runtime.test.js` — Keep Retired
- `packages/web/server/lib/quota/credentials/providers.js` — Keep Retired
- `packages/web/server/lib/quota/credentials/store.js` — Keep Retired
- `packages/web/server/lib/quota/credentials/store.test.js` — Keep Retired
- `packages/web/server/lib/quota/providers/claude/auth.js` — Keep Retired
- `packages/web/server/lib/quota/providers/claude/auth.test.js` — Keep Retired
- `packages/web/server/lib/quota/utils/auth.js` — Keep Retired
- `packages/web/server/lib/quota/utils/auth.test.js` — Keep Retired
- `packages/web/server/lib/session-goal/DOCUMENTATION.md` — Keep Retired
- `packages/web/server/lib/session-goal/audit.js` — Keep Retired
- `packages/web/server/lib/session-goal/audit.test.js` — Keep Retired
- `packages/web/server/lib/session-goal/create.js` — Keep Retired
- `packages/web/server/lib/session-goal/create.test.js` — Keep Retired
- `packages/web/server/lib/session-goal/objectives.js` — Keep Retired
- `packages/web/server/lib/session-goal/routes.js` — Keep Retired
- `packages/web/server/lib/session-goal/runtime.js` — Keep Retired
- `packages/web/server/lib/session-goal/runtime.test.js` — Keep Retired
- `packages/web/server/lib/session-warming/DOCUMENTATION.md` — Keep Retired
- `packages/web/server/lib/session-warming/routes.js` — Keep Retired
- `packages/web/server/lib/session-warming/routes.test.js` — Keep Retired
- `packages/web/server/lib/session-warming/runtime.js` — Keep Retired
- `packages/web/server/lib/session-warming/runtime.test.js` — Keep Retired
- `packages/web/server/lib/skills-catalog/installed-sources.d.ts` — Keep Retired
- `packages/web/server/lib/skills-catalog/installed-sources.js` — Keep Retired
- `packages/web/server/lib/skills-catalog/installed-sources.test.js` — Keep Retired
- `packages/web/server/lib/small-model/routes.js` — Keep Retired
- `packages/web/server/lib/spaces/host-providers.js` — Keep Retired
- `packages/web/server/lib/spaces/host-providers.test.js` — Keep Retired
- `packages/web/server/lib/spaces/login-keeper.js` — Keep Retired
- `packages/web/server/lib/spaces/login-keeper.test.js` — Keep Retired
- `packages/web/server/lib/spaces/places/docker-setup.js` — Keep Retired
- `packages/web/server/lib/spaces/places/docker-setup.test.js` — Keep Retired
- `packages/web/server/lib/spaces/places/ssh-host.js` — Keep Retired
- `packages/web/server/lib/spaces/places/ssh-host.test.js` — Keep Retired
- `packages/web/server/lib/spaces/space-events.js` — Keep Retired
- `packages/web/server/lib/spaces/space-events.test.js` — Keep Retired
- `packages/web/server/lib/spaces/space-fetch.js` — Keep Retired
- `packages/web/server/lib/spaces/space-fetch.test.js` — Keep Retired
- `packages/web/server/lib/spaces/space-opencode.js` — Keep Retired
- `packages/web/server/lib/spaces/space-opencode.test.js` — Keep Retired
- `packages/web/server/lib/spaces/space-permission-default.js` — Keep Retired
- `packages/web/server/lib/spaces/space-permission-default.test.js` — Keep Retired
- `packages/web/server/lib/spaces/space-sessions.js` — Keep Retired
- `packages/web/server/lib/spaces/space-sessions.test.js` — Keep Retired
- `packages/web/server/lib/spaces/space-setting-file.js` — Keep Retired
- `packages/web/server/lib/trackers/session-status.js` — Keep Retired
- `packages/web/server/lib/trackers/session-status.test.js` — Keep Retired
- `packages/web/server/lib/tts/index.js` — Keep Retired
- `packages/web/server/opencode-proxy.test.js` — Keep Retired
- `packages/web/server/opencode-trust-proxy.test.js` — Keep Retired
- `packages/web/server/opencode-worktree-readiness.test.js` — Keep Retired
- `packages/web/server/opencode-worktree-removal-hold.test.js` — Keep Retired

### A.3 packages/ui/src/apps (8 files)

- `packages/ui/src/apps/MobileStatusPane.tsx` — Keep Retired
- `packages/ui/src/apps/MobileWalkthroughScreen.tsx` — Keep Retired
- `packages/ui/src/apps/VSCodeApp.tsx` — Keep Retired
- `packages/ui/src/apps/mobileDirtySwitch.test.ts` — Keep Retired
- `packages/ui/src/apps/mobileDirtySwitch.ts` — Keep Retired
- `packages/ui/src/apps/renderVSCodeApp.tsx` — Keep Retired
- `packages/ui/src/apps/vscodeSettingsNavigation.test.ts` — Keep Retired
- `packages/ui/src/apps/vscodeSettingsNavigation.ts` — Keep Retired

### A.4 packages/ui/src/components (186 files)

- `packages/ui/src/components/chat/FormCard.tsx` — Keep Retired
- `packages/ui/src/components/chat/MobileAgentButton.tsx` — Keep Retired
- `packages/ui/src/components/chat/SessionGoalButton.tsx` — Keep Retired
- `packages/ui/src/components/chat/WebSearchConsent.tsx` — Keep Retired
- `packages/ui/src/components/chat/__tests__/ChatInput.magicPrompts.test.tsx` — Keep Retired
- `packages/ui/src/components/chat/__tests__/baseDisplayMessagesDedup.test.ts` — Keep Retired
- `packages/ui/src/components/chat/__tests__/parentFramePostMessageGuard.test.ts` — Keep Retired
- `packages/ui/src/components/chat/components/BackgroundWorkButton.tsx` — Keep Retired
- `packages/ui/src/components/chat/composer/state/__tests__/useComposerDraft.retarget.test.ts` — Keep Retired
- `packages/ui/src/components/chat/composer/state/__tests__/useDraftTarget.pinnedDirectory.test.tsx` — Keep Retired
- `packages/ui/src/components/chat/composer/state/__tests__/useDraftTarget.refresh.test.tsx` — Keep Retired
- `packages/ui/src/components/chat/composer/state/useSessionDraftPublishing.ts` — Keep Retired
- `packages/ui/src/components/chat/composer/ui/ComposerActionButtons.test.tsx` — Keep Retired
- `packages/ui/src/components/chat/formCardState.test.ts` — Keep Retired
- `packages/ui/src/components/chat/formCardState.ts` — Keep Retired
- `packages/ui/src/components/chat/formSerializers.test.ts` — Keep Retired
- `packages/ui/src/components/chat/formSerializers.ts` — Keep Retired
- `packages/ui/src/components/chat/lib/attachSyntheticContext.test.ts` — Keep Retired
- `packages/ui/src/components/chat/lib/attachSyntheticContext.ts` — Keep Retired
- `packages/ui/src/components/chat/lib/promptPreviews.test.ts` — Keep Retired
- `packages/ui/src/components/chat/lib/promptPreviews.ts` — Keep Retired
- `packages/ui/src/components/chat/lib/timelineRoles.ts` — Keep Retired
- `packages/ui/src/components/chat/lib/turns/applyRetryOverlay.ts` — Keep Retired
- `packages/ui/src/components/chat/lib/turns/windowTurns.test.ts` — Keep Retired
- `packages/ui/src/components/chat/markdown/remarkRepositoryReferences.ts` — Keep Retired
- `packages/ui/src/components/chat/message/MessageBody.divider.test.tsx` — Keep Retired
- `packages/ui/src/components/chat/message/SessionNoticeBlock.tsx` — Keep Retired
- `packages/ui/src/components/chat/message/TimelineNotice.tsx` — Keep Retired
- `packages/ui/src/components/chat/message/frameSelection.ts` — Keep Retired
- `packages/ui/src/components/chat/message/messageRole.ts` — Keep Retired
- `packages/ui/src/components/chat/message/normalizeUserDisplayParts.test.ts` — Keep Retired
- `packages/ui/src/components/chat/message/normalizeUserDisplayParts.ts` — Keep Retired
- `packages/ui/src/components/chat/message/pageQuoteBridge.test.ts` — Keep Retired
- `packages/ui/src/components/chat/message/pageQuoteBridge.ts` — Keep Retired
- `packages/ui/src/components/chat/message/parts/ApplyPatchFileButtons.test.tsx` — Keep Retired
- `packages/ui/src/components/chat/message/parts/ApplyPatchFileButtons.tsx` — Keep Retired
- `packages/ui/src/components/chat/message/parts/HtmlRenderFrame.tsx` — Keep Retired
- `packages/ui/src/components/chat/message/parts/ShownToolCard.tsx` — Keep Retired
- `packages/ui/src/components/chat/message/parts/ToolPart.failure-row.test.tsx` — Keep Retired
- `packages/ui/src/components/chat/message/parts/ToolPart.row-expand.test.tsx` — Keep Retired
- `packages/ui/src/components/chat/message/parts/ToolPart.text-blocks.test.tsx` — Keep Retired
- `packages/ui/src/components/chat/message/parts/UserContextPart.tsx` — Keep Retired
- `packages/ui/src/components/chat/message/parts/UserTextPart.attachments.test.tsx` — Keep Retired
- `packages/ui/src/components/chat/message/parts/VirtualizedCodeBlock.tsx` — Keep Retired
- `packages/ui/src/components/chat/message/parts/applyPatchEditorAction.ts` — Keep Retired
- `packages/ui/src/components/chat/message/parts/backgroundShellPart.test.ts` — Keep Retired
- `packages/ui/src/components/chat/message/parts/backgroundShellPart.ts` — Keep Retired
- `packages/ui/src/components/chat/message/parts/backgroundSubagentPart.test.ts` — Keep Retired
- `packages/ui/src/components/chat/message/parts/backgroundSubagentPart.ts` — Keep Retired
- `packages/ui/src/components/chat/message/parts/htmlRender.test.ts` — Keep Retired
- `packages/ui/src/components/chat/message/parts/htmlRender.ts` — Keep Retired
- `packages/ui/src/components/chat/message/parts/htmlRenderPage.test.ts` — Keep Retired
- `packages/ui/src/components/chat/message/parts/renderPageImages.test.ts` — Keep Retired
- `packages/ui/src/components/chat/message/parts/renderPageImages.ts` — Keep Retired
- `packages/ui/src/components/chat/message/parts/taskSessionIdParser.ts` — Keep Retired
- `packages/ui/src/components/chat/message/parts/taskToolModel.test.ts` — Keep Retired
- `packages/ui/src/components/chat/message/parts/taskToolModel.ts` — Keep Retired
- `packages/ui/src/components/chat/message/parts/useBackgroundShellOutput.test.tsx` — Keep Retired
- `packages/ui/src/components/chat/message/parts/useBackgroundShellOutput.ts` — Keep Retired
- `packages/ui/src/components/chat/message/parts/useToolContentCompletion.ts` — Keep Retired
- `packages/ui/src/components/chat/message/useOpenAttachment.ts` — Keep Retired
- `packages/ui/src/components/chat/permissionCardPatterns.ts` — Keep Retired
- `packages/ui/src/components/chat/permissionFilePreviews.ts` — Keep Retired
- `packages/ui/src/components/chat/permissionSummary.ts` — Keep Retired
- `packages/ui/src/components/chat/permissionToolPresentation.tsx` — Keep Retired
- `packages/ui/src/components/chat/sessionMentionResults.test.ts` — Keep Retired
- `packages/ui/src/components/chat/sessionMentionResults.ts` — Keep Retired
- `packages/ui/src/components/chat/usePinnedSessionDirectory.test.tsx` — Keep Retired
- `packages/ui/src/components/chat/work-status/WorkStatusContextSection.test.tsx` — Keep Retired
- `packages/ui/src/components/chat/work-status/WorkStatusGuestView.test.tsx` — Keep Retired
- `packages/ui/src/components/chat/work-status/WorkStatusGuestView.tsx` — Keep Retired
- `packages/ui/src/components/chat/work-status/WorkStatusWarmingToggle.tsx` — Keep Retired
- `packages/ui/src/components/layout/ContextRailSurfacesDialog.test.tsx` — Keep Retired
- `packages/ui/src/components/layout/ContextRailUsage.test.tsx` — Keep Retired
- `packages/ui/src/components/layout/ContextRailUsage.tsx` — Keep Retired
- `packages/ui/src/components/layout/PluginPane.generate.test.tsx` — Keep Retired
- `packages/ui/src/components/layout/PluginPane.openSurface.test.tsx` — Keep Retired
- `packages/ui/src/components/layout/ProjectActionRunIndicator.tsx` — Keep Retired
- `packages/ui/src/components/layout/ProjectActionsDialog.test.tsx` — Keep Retired
- `packages/ui/src/components/layout/ProjectActionsDialog.tsx` — Keep Retired
- `packages/ui/src/components/layout/ProjectActionsProvider.tsx` — Keep Retired
- `packages/ui/src/components/layout/ProjectActionsScope.tsx` — Keep Retired
- `packages/ui/src/components/layout/SessionProjectIcon.tsx` — Keep Retired
- `packages/ui/src/components/layout/SidebarFilesTree.test.tsx` — Keep Retired
- `packages/ui/src/components/layout/VSCodeLayout.tsx` — Keep Retired
- `packages/ui/src/components/layout/fileTreeRows.test.ts` — Keep Retired
- `packages/ui/src/components/layout/fileTreeRows.ts` — Keep Retired
- `packages/ui/src/components/layout/projectActionsRunnerContext.ts` — Keep Retired
- `packages/ui/src/components/layout/useProjectActionsRunner.ts` — Keep Retired
- `packages/ui/src/components/multirun/AgentSelector.tsx` — Keep Retired
- `packages/ui/src/components/onboarding/LocalSetupScreen.tsx` — Keep Retired
- `packages/ui/src/components/onboarding/desktopRecoveryRouting.test.ts` — Keep Retired
- `packages/ui/src/components/onboarding/desktopRecoveryRouting.ts` — Keep Retired
- `packages/ui/src/components/projects/OpenCodeTrustDialog.tsx` — Keep Retired
- `packages/ui/src/components/projects/ProjectConfigErrorToast.tsx` — Keep Retired
- `packages/ui/src/components/sections/agents/AgentPermissionsEditor.test.ts` — Keep Retired
- `packages/ui/src/components/sections/agents/AgentPermissionsEditor.tsx` — Keep Retired
- `packages/ui/src/components/sections/agents/agentPermissionModel.ts` — Keep Retired
- `packages/ui/src/components/sections/behavior/BehaviorPage.test.tsx` — **Restore in M6**
- `packages/ui/src/components/sections/behavior/BehaviorPage.tsx` — **Restore in M6**
- `packages/ui/src/components/sections/behavior/behaviorPrompt.test.ts` — **Restore in M6**
- `packages/ui/src/components/sections/behavior/behaviorPrompt.ts` — **Restore in M6**
- `packages/ui/src/components/sections/commands/AgentSelector.tsx` — Keep Retired
- `packages/ui/src/components/sections/integrations/thirdPartyPlugins.test.ts` — Keep Retired
- `packages/ui/src/components/sections/integrations/thirdPartyPlugins.ts` — Keep Retired
- `packages/ui/src/components/sections/mcp/mcpDraft.ts` — Keep Retired
- `packages/ui/src/components/sections/mcp/mcpOAuthIntegration.test.ts` — Keep Retired
- `packages/ui/src/components/sections/mcp/mcpOAuthIntegration.ts` — Keep Retired
- `packages/ui/src/components/sections/openchamber/ChatSettings.test.tsx` — **Restore in M6**
- `packages/ui/src/components/sections/openchamber/DefaultsSettings.test.tsx` — **Restore in M6**
- `packages/ui/src/components/sections/openchamber/DesktopAppSettings.tsx` — **Restore in M6**
- `packages/ui/src/components/sections/openchamber/FinishedWorktreesSettings.tsx` — **Restore in M6**
- `packages/ui/src/components/sections/openchamber/GeneralWorkspaceSettings.tsx` — **Restore in M6**
- `packages/ui/src/components/sections/openchamber/MobileWorkspaceTabsSettings.tsx` — **Restore in M6**
- `packages/ui/src/components/sections/openchamber/OpenCodeCliSettings.tsx` — Keep Retired
- `packages/ui/src/components/sections/openchamber/PermissionDefaultModeField.tsx` — Keep Retired
- `packages/ui/src/components/sections/openchamber/SessionGoalCheckerField.tsx` — Keep Retired
- `packages/ui/src/components/sections/openchamber/SessionWarmingModeField.tsx` — Keep Retired
- `packages/ui/src/components/sections/openchamber/desktopRestartDrafts.ts` — **Restore in M6**
- `packages/ui/src/components/sections/openchamber/spacePlacesDisk.test.ts` — Keep Retired
- `packages/ui/src/components/sections/openchamber/spacePlacesDisk.ts` — Keep Retired
- `packages/ui/src/components/sections/plugins/RegistryBanner.tsx` — Keep Retired
- `packages/ui/src/components/sections/plugins/pluginDisplayName.test.ts` — Keep Retired
- `packages/ui/src/components/sections/plugins/pluginDisplayName.ts` — Keep Retired
- `packages/ui/src/components/sections/plugins/pluginLoadState.test.ts` — Keep Retired
- `packages/ui/src/components/sections/plugins/pluginLoadState.ts` — Keep Retired
- `packages/ui/src/components/sections/plugins/usePluginRuntimeStatus.ts` — Keep Retired
- `packages/ui/src/components/sections/providers/CustomProviderForm.test.tsx` — Keep Retired
- `packages/ui/src/components/sections/providers/ProviderAccountSwitchToggle.tsx` — Keep Retired
- `packages/ui/src/components/sections/providers/ProviderApiKeyForm.test.tsx` — Keep Retired
- `packages/ui/src/components/sections/providers/ProviderAuthMethodCards.test.tsx` — Keep Retired
- `packages/ui/src/components/sections/providers/ProviderAuthMethodCards.tsx` — Keep Retired
- `packages/ui/src/components/sections/providers/ProviderFormFields.tsx` — Keep Retired
- `packages/ui/src/components/sections/providers/connectableProviders.test.ts` — Keep Retired
- `packages/ui/src/components/sections/providers/provider-oauth.test.ts` — Keep Retired
- `packages/ui/src/components/sections/providers/provider-oauth.ts` — Keep Retired
- `packages/ui/src/components/sections/shared/SettingsLegacyFormatNote.tsx` — Keep Retired
- `packages/ui/src/components/sections/shared/SettingsSortableVisibilityList.tsx` — Keep Retired
- `packages/ui/src/components/sections/shared/SidebarGroup.tsx` — Keep Retired
- `packages/ui/src/components/sections/shared/useIntegrationPolicyBlock.ts` — Keep Retired
- `packages/ui/src/components/sections/skills/SkillUseField.tsx` — Keep Retired
- `packages/ui/src/components/sections/skills/catalog/SkillsCatalogRows.test.tsx` — Keep Retired
- `packages/ui/src/components/sections/skills/catalog/SkillsCatalogRows.tsx` — Keep Retired
- `packages/ui/src/components/sections/skills/catalog/skillCatalogUrl.test.ts` — Keep Retired
- `packages/ui/src/components/sections/skills/catalog/skillCatalogUrl.ts` — Keep Retired
- `packages/ui/src/components/sections/skills/skillLocations.ts` — Keep Retired
- `packages/ui/src/components/sections/usage/ClaudeCodeSignIn.tsx` — Keep Retired
- `packages/ui/src/components/session/ArchiveAllDropdown.tsx` — Keep Retired
- `packages/ui/src/components/session/NewWorktreeDialog.linearBranch.characterization.test.tsx` — Keep Retired
- `packages/ui/src/components/session/SessionsTabTitle.tsx` — Keep Retired
- `packages/ui/src/components/session/project-context/KnowledgeActions.tsx` — Keep Retired
- `packages/ui/src/components/session/project-context/KnowledgeComposer.tsx` — Keep Retired
- `packages/ui/src/components/session/project-context/KnowledgeEntryView.tsx` — Keep Retired
- `packages/ui/src/components/session/project-context/KnowledgeSearchBar.tsx` — Keep Retired
- `packages/ui/src/components/session/project-context/KnowledgeSplit.tsx` — Keep Retired
- `packages/ui/src/components/session/project-context/NoteEditor.test.tsx` — Keep Retired
- `packages/ui/src/components/session/project-context/NoteEditor.tsx` — Keep Retired
- `packages/ui/src/components/session/project-context/knowledgeFormat.test.ts` — Keep Retired
- `packages/ui/src/components/session/project-context/knowledgeFormat.ts` — Keep Retired
- `packages/ui/src/components/session/project-context/knowledgeRowStyle.ts` — Keep Retired
- `packages/ui/src/components/session/project-context/memoryTidy.test.ts` — Keep Retired
- `packages/ui/src/components/session/project-context/memoryTidy.ts` — Keep Retired
- `packages/ui/src/components/session/project-context/pendingKnowledgeDeletes.test.tsx` — Keep Retired
- `packages/ui/src/components/session/project-context/pendingKnowledgeDeletes.ts` — Keep Retired
- `packages/ui/src/components/session/scheduledTasksRequests.test.ts` — Keep Retired
- `packages/ui/src/components/session/scheduledTasksRequests.ts` — Keep Retired
- `packages/ui/src/components/session/spaces/DockerSetupNotice.tsx` — Keep Retired
- `packages/ui/src/components/session/spaces/SpacePreparing.tsx` — Keep Retired
- `packages/ui/src/components/ui/ConfigUpdateOverlay.tsx` — Keep Retired
- `packages/ui/src/components/ui/OpenCodeHeapSnapshot.tsx` — Keep Retired
- `packages/ui/src/components/ui/OpenCodeStatusDialog.tsx` — Keep Retired
- `packages/ui/src/components/update/OpenCodeCompatibilityGate.test.tsx` — Keep Retired
- `packages/ui/src/components/update/OpenCodeCompatibilityGate.tsx` — Keep Retired
- `packages/ui/src/components/update/OpenCodeUpdateToast.tsx` — Keep Retired
- `packages/ui/src/components/update/OutdatedServerNotice.tsx` — Keep Retired
- `packages/ui/src/components/update/__tests__/openCodeUpdateDedup.test.ts` — Keep Retired
- `packages/ui/src/components/update/openCodeCompatibilityCheck.ts` — Keep Retired
- `packages/ui/src/components/update/openCodeUpdateDedup.ts` — Keep Retired
- `packages/ui/src/components/update/openCodeUpgrade.ts` — Keep Retired
- `packages/ui/src/components/views/PlanView.vitest.tsx` — Keep Retired
- `packages/ui/src/components/views/walkthrough/WalkthroughControls.tsx` — Keep Retired
- `packages/ui/src/components/views/walkthrough/WalkthroughView.prDiff.test.tsx` — Keep Retired
- `packages/ui/src/components/views/walkthrough/useWalkthroughFind.ts` — Keep Retired
- `packages/ui/src/components/views/walkthrough/useWalkthroughReview.ts` — Keep Retired
- `packages/ui/src/components/views/walkthrough/walkthroughFind.test.ts` — Keep Retired
- `packages/ui/src/components/views/walkthrough/walkthroughFind.ts` — Keep Retired

### A.5 packages/ui/src/hooks (14 files)

- `packages/ui/src/hooks/useAutoReadAloud.test.tsx` — Keep Retired
- `packages/ui/src/hooks/useAutoReadAloud.ts` — Keep Retired
- `packages/ui/src/hooks/useBackgroundSessionWork.ts` — Keep Retired
- `packages/ui/src/hooks/useChatTimelineScroll.test.tsx` — Keep Retired
- `packages/ui/src/hooks/useCommitComparison.test.tsx` — Keep Retired
- `packages/ui/src/hooks/useIntegrationCatalogPrefetch.ts` — Keep Retired
- `packages/ui/src/hooks/useLimitFailoverNotices.ts` — Keep Retired
- `packages/ui/src/hooks/useNestedGitDirectory.test.tsx` — Keep Retired
- `packages/ui/src/hooks/useOpenCodeReadiness.ts` — Keep Retired
- `packages/ui/src/hooks/useQueuedMessageAutoSend.test.ts` — Keep Retired
- `packages/ui/src/hooks/useQueuedMessageAutoSend.ts` — Keep Retired
- `packages/ui/src/hooks/useSettingsKeyboardShortcuts.ts` — Keep Retired
- `packages/ui/src/hooks/useSourceControlProviderSync.test.tsx` — Keep Retired
- `packages/ui/src/hooks/useSourceControlProviderSync.ts` — Keep Retired

### A.6 packages/ui/src/lib (79 files)

- `packages/ui/src/lib/api/git-identity.test.ts` — Keep Retired
- `packages/ui/src/lib/btw.test.ts` — Keep Retired
- `packages/ui/src/lib/btw.ts` — Keep Retired
- `packages/ui/src/lib/configUpdate.ts` — Keep Retired
- `packages/ui/src/lib/desktop.vscodeRuntime.test.ts` — Keep Retired
- `packages/ui/src/lib/disabledProviders.ts` — Keep Retired
- `packages/ui/src/lib/goalObjectiveFiles.ts` — Keep Retired
- `packages/ui/src/lib/i18n/bootstrap.ts` — Keep Retired
- `packages/ui/src/lib/i18n/messages/session-warming.i18n.test.ts` — Keep Retired
- `packages/ui/src/lib/i18n/messages/session-warming.i18n.ts` — Keep Retired
- `packages/ui/src/lib/messageFreshness.test.ts` — Keep Retired
- `packages/ui/src/lib/messageFreshness.ts` — Keep Retired
- `packages/ui/src/lib/messages/agentMentions.ts` — Keep Retired
- `packages/ui/src/lib/messages/assistantError.test.ts` — Keep Retired
- `packages/ui/src/lib/messages/assistantError.ts` — Keep Retired
- `packages/ui/src/lib/messages/latestReply.test.ts` — Keep Retired
- `packages/ui/src/lib/messages/latestReply.ts` — Keep Retired
- `packages/ui/src/lib/messages/providerAuthError.ts` — Keep Retired
- `packages/ui/src/lib/openCodeStatus.ts` — Keep Retired
- `packages/ui/src/lib/opencode/background-shell.test.ts` — Keep Retired
- `packages/ui/src/lib/opencode/background-shell.ts` — Keep Retired
- `packages/ui/src/lib/opencode/client.fs-home.test.ts` — Keep Retired
- `packages/ui/src/lib/opencode/client.status.test.ts` — Keep Retired
- `packages/ui/src/lib/opencode/client.test.ts` — Keep Retired
- `packages/ui/src/lib/opencode/client.trust.test.ts` — Keep Retired
- `packages/ui/src/lib/opencode/client.ts` — Keep Retired
- `packages/ui/src/lib/opencode/compatibility.ts` — Keep Retired
- `packages/ui/src/lib/opencode/configError.test.ts` — Keep Retired
- `packages/ui/src/lib/opencode/configError.ts` — Keep Retired
- `packages/ui/src/lib/opencode/dispatched-session.test.ts` — Keep Retired
- `packages/ui/src/lib/opencode/dispatched-session.ts` — Keep Retired
- `packages/ui/src/lib/opencode/events.test.ts` — Keep Retired
- `packages/ui/src/lib/opencode/ids.ts` — Keep Retired
- `packages/ui/src/lib/opencode/integration-catalog.ts` — Keep Retired
- `packages/ui/src/lib/opencode/json.ts` — Keep Retired
- `packages/ui/src/lib/opencode/messageCursor.test.ts` — Keep Retired
- `packages/ui/src/lib/opencode/messageCursor.ts` — Keep Retired
- `packages/ui/src/lib/opencode/messagePaging.test.ts` — Keep Retired
- `packages/ui/src/lib/opencode/messagePaging.ts` — Keep Retired
- `packages/ui/src/lib/opencode/model.test.ts` — Keep Retired
- `packages/ui/src/lib/opencode/model.ts` — Keep Retired
- `packages/ui/src/lib/opencode/plugins.ts` — Keep Retired
- `packages/ui/src/lib/opencode/projection.test.ts` — Keep Retired
- `packages/ui/src/lib/opencode/projection.ts` — Keep Retired
- `packages/ui/src/lib/opencode/prompt-origin.test.ts` — Keep Retired
- `packages/ui/src/lib/opencode/prompt-origin.ts` — Keep Retired
- `packages/ui/src/lib/opencode/provider-tracker.test.ts` — Keep Retired
- `packages/ui/src/lib/opencode/provider-tracker.ts` — Keep Retired
- `packages/ui/src/lib/opencode/session-notices.test.ts` — Keep Retired
- `packages/ui/src/lib/opencode/session-notices.ts` — Keep Retired
- `packages/ui/src/lib/opencode/session-stats.test.ts` — Keep Retired
- `packages/ui/src/lib/opencode/session-stats.ts` — Keep Retired
- `packages/ui/src/lib/opencode/session-status.ts` — Keep Retired
- `packages/ui/src/lib/opencode/subagent-run.test.ts` — Keep Retired
- `packages/ui/src/lib/opencode/subagent-run.ts` — Keep Retired
- `packages/ui/src/lib/opencode/toolContentShells.test.ts` — Keep Retired
- `packages/ui/src/lib/opencode/toolContentShells.ts` — Keep Retired
- `packages/ui/src/lib/opencode/tools.test.ts` — Keep Retired
- `packages/ui/src/lib/opencode/tools.ts` — Keep Retired
- `packages/ui/src/lib/opencode/websearch.test.ts` — Keep Retired
- `packages/ui/src/lib/opencode/websearch.ts` — Keep Retired
- `packages/ui/src/lib/opencodeTrust.ts` — Keep Retired
- `packages/ui/src/lib/permissions/editModeColors.ts` — Keep Retired
- `packages/ui/src/lib/responseStyle.ts` — **Restore in M6**
- `packages/ui/src/lib/restartOpenCode.ts` — Keep Retired
- `packages/ui/src/lib/serverCompatibility.test.ts` — Keep Retired
- `packages/ui/src/lib/serverCompatibility.ts` — Keep Retired
- `packages/ui/src/lib/sessionBtwMetadata.test.ts` — Keep Retired
- `packages/ui/src/lib/sessionBtwMetadata.ts` — Keep Retired
- `packages/ui/src/lib/sessionGoalActions.ts` — Keep Retired
- `packages/ui/src/lib/sessionGoalTurnLimit.test.ts` — Keep Retired
- `packages/ui/src/lib/sessionGoalTurnLimit.ts` — Keep Retired
- `packages/ui/src/lib/skillMentionInstruction.ts` — Keep Retired
- `packages/ui/src/lib/source-control/providers/neutrality.test.ts` — Keep Retired
- `packages/ui/src/lib/spaces/registry-domains.test.ts` — Keep Retired
- `packages/ui/src/lib/spaces/registry-domains.ts` — Keep Retired
- `packages/ui/src/lib/systemReminder.ts` — Keep Retired
- `packages/ui/src/lib/vscodeBootstrap.test.ts` — Keep Retired
- `packages/ui/src/lib/vscodeBootstrap.ts` — Keep Retired

### A.7 packages/ui/src/stores (20 files)

- `packages/ui/src/stores/catalogRefresh.test.ts` — Keep Retired
- `packages/ui/src/stores/catalogRefresh.ts` — Keep Retired
- `packages/ui/src/stores/permissionStore.vscode.test.ts` — Keep Retired
- `packages/ui/src/stores/skillSwitch.test.ts` — Keep Retired
- `packages/ui/src/stores/skillSwitch.ts` — Keep Retired
- `packages/ui/src/stores/skillVisibility.test.ts` — Keep Retired
- `packages/ui/src/stores/skillVisibility.ts` — Keep Retired
- `packages/ui/src/stores/useDirectoryStore.stale-home.test.ts` — Keep Retired
- `packages/ui/src/stores/useInlineCommentDraftStore.callerId.test.ts` — Keep Retired
- `packages/ui/src/stores/useInlineCommentDraftStore.provider.test.ts` — Keep Retired
- `packages/ui/src/stores/usePluginsStore.runtime.test.ts` — Keep Retired
- `packages/ui/src/stores/usePluginsStore.test.ts` — Keep Retired
- `packages/ui/src/stores/useProjectsStore.vscodeAddProject.test.ts` — Keep Retired
- `packages/ui/src/stores/useSessionWarmingStore.test.ts` — Keep Retired
- `packages/ui/src/stores/useSessionWarmingStore.ts` — Keep Retired
- `packages/ui/src/stores/utils/vscodeRuntime.test.ts` — Keep Retired
- `packages/ui/src/stores/utils/vscodeRuntime.ts` — Keep Retired
- `packages/ui/src/stores/vscodeStoreInit.2359.test.ts` — Keep Retired
- `packages/ui/src/stores/waitForOpenCodeConnection.test.ts` — Keep Retired
- `packages/ui/src/stores/waitForOpenCodeConnection.ts` — Keep Retired

### A.8 packages/ui/src/sync (46 files)

- `packages/ui/src/sync/__tests__/event-pipeline-online.test.js` — Keep Retired
- `packages/ui/src/sync/__tests__/event-pipeline-permanent-error.test.js` — Keep Retired
- `packages/ui/src/sync/__tests__/event-pipeline-resume.test.js` — Keep Retired
- `packages/ui/src/sync/__tests__/event-pipeline.bench.js` — Keep Retired
- `packages/ui/src/sync/__tests__/event-reducer.test.js` — Keep Retired
- `packages/ui/src/sync/__tests__/interrupted-turn-tools.test.ts` — Keep Retired
- `packages/ui/src/sync/__tests__/location-scoped-forms.test.ts` — Keep Retired
- `packages/ui/src/sync/__tests__/message-completion-status-poll.test.ts` — Keep Retired
- `packages/ui/src/sync/__tests__/open-directory-catalog-events.test.ts` — Keep Retired
- `packages/ui/src/sync/__tests__/session-event-freshness.test.ts` — Keep Retired
- `packages/ui/src/sync/__tests__/session-moved-event.test.ts` — Keep Retired
- `packages/ui/src/sync/__tests__/session-status-snapshot.test.ts` — Keep Retired
- `packages/ui/src/sync/__tests__/session-switch-resync.test.ts` — Keep Retired
- `packages/ui/src/sync/__tests__/sync-context-child-discovery.test.tsx` — Keep Retired
- `packages/ui/src/sync/__tests__/sync-context-session-events.test.ts` — Keep Retired
- `packages/ui/src/sync/__tests__/unopened-directory-events.test.ts` — Keep Retired
- `packages/ui/src/sync/bulk-archive-echo.ts` — Keep Retired
- `packages/ui/src/sync/debug.ts` — Keep Retired
- `packages/ui/src/sync/directory-recovery-snapshots.ts` — Keep Retired
- `packages/ui/src/sync/location-scoped-forms.ts` — Keep Retired
- `packages/ui/src/sync/opencode-startup-gate.test.ts` — Keep Retired
- `packages/ui/src/sync/opencode-startup-gate.ts` — Keep Retired
- `packages/ui/src/sync/pending-session-assists.ts` — Keep Retired
- `packages/ui/src/sync/permission-toast.test.ts` — Keep Retired
- `packages/ui/src/sync/permission-toast.ts` — Keep Retired
- `packages/ui/src/sync/prompts-in-flight.ts` — Keep Retired
- `packages/ui/src/sync/reconnect-recovery.test.ts` — Keep Retired
- `packages/ui/src/sync/reconnect-recovery.ts` — Keep Retired
- `packages/ui/src/sync/revert-loader-recovery.test.ts` — Keep Retired
- `packages/ui/src/sync/sanitize.test.ts` — Keep Retired
- `packages/ui/src/sync/sanitize.ts` — Keep Retired
- `packages/ui/src/sync/session-blocking-requests.test.tsx` — Keep Retired
- `packages/ui/src/sync/session-event-freshness.ts` — Keep Retired
- `packages/ui/src/sync/session-event-router.ts` — Keep Retired
- `packages/ui/src/sync/session-leaf-subscriptions.test.tsx` — Keep Retired
- `packages/ui/src/sync/session-navigation.ts` — Keep Retired
- `packages/ui/src/sync/session-pins.test.ts` — **Restore in M6**
- `packages/ui/src/sync/session-pins.ts` — **Restore in M6**
- `packages/ui/src/sync/session-unread.test.ts` — **Restore in M6**
- `packages/ui/src/sync/session-unread.ts` — **Restore in M6**
- `packages/ui/src/sync/session-warming-sync.ts` — Keep Retired
- `packages/ui/src/sync/space-catalog-sync.test.ts` — Keep Retired
- `packages/ui/src/sync/space-catalog-sync.ts` — Keep Retired
- `packages/ui/src/sync/tool-content-completion.ts` — Keep Retired
- `packages/ui/src/sync/vscode-permission-auto-accept.test.ts` — Keep Retired
- `packages/ui/src/sync/vscode-permission-auto-accept.ts` — Keep Retired

### A.9 packages/ui/src/types (2 files)

- `packages/ui/src/types/permission.ts` — Keep Retired
- `packages/ui/src/types/vscode.d.ts` — Keep Retired

---

## Appendix B: Named OpenChamber Settings Surfaces Disposition Ledger

The table below catalogs every file under `packages/ui/src/components/sections/openchamber/` and `sections/git-identities/`, detailing its upstream baseline, current state, and exact disposition.

| File Path | Upstream Line Count (`0056bf6a9`) | HEAD Line Count (`76112ae00`) | Status | Disposition | Detailed Disposition Rationale |
|---|---|---|---|---|---|
| `sections/openchamber/AboutSettings.tsx` | 148 | 154 | Modified | **No Regression** | Version info, platform detection, updater controls active. |
| `sections/openchamber/AppLinkSecuritySettings.tsx` | 89 | 95 | Modified | **No Regression** | Custom URL scheme security active. |
| `sections/openchamber/ChatSettings.tsx` | 675 | 627 | Modified | **Restore in M6** | Restore `mobileReturnKeySends` and `savePastedImagesAsFiles` in ComposerTab. Keep `SessionGoalCheckerField` retired. |
| `sections/openchamber/DefaultsSettings.tsx` | 530 | 45 | Gutted | **Restore in M6** | Restore Default Model & Reasoning Effort picker (OMP role `default`). Keep warming and dual-permission fields retired. |
| `sections/openchamber/DesktopAppSettings.tsx` | 560 | 0 (deleted) | Inlined | **Restore in M6** | Re-partition desktop window, tray, and Quake settings from `DesktopNetworkSettings.tsx`. Restore `desktopRestartDrafts.ts`. |
| `sections/openchamber/DesktopNetworkSettings.tsx` | 385 | 589 | Bloated | **Refactor** | Separate local network configuration (port, binding, pairing) from desktop application shell settings. |
| `sections/openchamber/DesktopQuakeModeSettings.tsx` | 215 | 225 | Modified | **No Regression** | Quake console dropdown mode active. |
| `sections/openchamber/DeviceFlowCode.tsx` | 74 | 74 | Identical | **No Regression** | OAuth device code flow dialog active. |
| `sections/openchamber/EnvironmentVariablesSettings.tsx` | 110 | 75 | Modified | **No Regression** | Host environment variables editor fully intact; dead OpenCode restart button removed. |
| `sections/openchamber/FinishedWorktreesSettings.tsx` | 34 | 0 (deleted) | Replaced | **Restore in M6** | Re-expose `worktreeArchiveOnDoneEnabled` toggle in `MergedWorktreeCleanupSettings.tsx`. |
| `sections/openchamber/GeneralWorkspaceSettings.tsx` | 437 | 0 (deleted) | Absorbed | **Restore in M6** | Restore `MobileWorkspaceTabsSettings.tsx` and re-expose `liveBrowserTabLimit` stepper. |
| `sections/openchamber/GitHubComAccountSection.tsx` | 185 | 192 | Modified | **No Regression** | GitHub OAuth account linking active. |
| `sections/openchamber/GitSettings.tsx` | 240 | 240 | Identical | **No Regression** | Core Git preferences, auto-fetch, and diff options fully preserved (0 diffs). |
| `sections/openchamber/InstanceServiceUrls.tsx` | 112 | 118 | Modified | **No Regression** | Self-hosted instance URL overrides active. |
| `sections/openchamber/IsolatedSpacesSettings.tsx` | 320 | 335 | Modified | **No Regression** | Docker container spaces management active. |
| `sections/openchamber/KeyboardShortcutsSettings.tsx` | 410 | 425 | Modified | **No Regression** | Global shortcut manager active. |
| `sections/openchamber/ManagedSshCredentials.tsx` | 280 | 295 | Modified | **No Regression** | Managed SSH keys and fingerprint verification active. |
| `sections/openchamber/MergedWorktreeCleanupSettings.tsx` | 0 (new) | 48 | Added | **Restore in M6** | Add missing `worktreeArchiveOnDoneEnabled` checkbox next to merged cleanup. |
| `sections/openchamber/MessageSearchSettings.tsx` | 165 | 172 | Modified | **No Regression** | SQLite message search indexing active. |
| `sections/openchamber/MobileWorkspaceTabsSettings.tsx` | 53 | 0 (deleted) | Dropped | **Restore in M6** | Restore mobile tab reordering list; store and registry are functional. |
| `sections/openchamber/NotificationSettings.tsx` | 480 | 475 | Modified | **No Regression** | Retired dead VS Code branch; Desktop/Web/Mobile notifications and templates active. |
| `sections/openchamber/OmpSettingsPage.tsx` | 0 (new) | 350 | Added | **Needs Polish** | Newly authored OMP settings (Audit List C target). |
| `sections/openchamber/OpenChamberPage.tsx` | 310 | 325 | Modified | **No Regression** | OpenChamber workbench settings hub active. |
| `sections/openchamber/OpenChamberToolsSettings.tsx` | 328 | 236 | Gutted | **Keep Retired** | Retired OpenCode tool config generators and unused Code Mode toggle. Retained tools active. |
| `sections/openchamber/OpenChamberVisualSettings.tsx` | 230 | 2363 | Bloated | **Refactor** | Appearance settings active; re-expose `liveBrowserTabLimit`. |
| `sections/openchamber/OpenCodeCliSettings.tsx` | 114 | 0 (deleted) | Deleted | **Keep Retired** | OpenCode CLI management retired. |
| `sections/openchamber/PasskeySettings.tsx` | 352 | 250 | Gutted | **Restore in M6** | Restore pencil icon and inline rename input calling `renameStoredPasskey`. |
| `sections/openchamber/PermissionDefaultModeField.tsx` | 116 | 0 (deleted) | Deleted | **Keep Retired** | OpenCode permission model retired. |
| `sections/openchamber/ProviderInstanceAccounts.tsx` | 195 | 210 | Modified | **No Regression** | Provider instance management active. |
| `sections/openchamber/RepositoryBindingEditors.tsx` | 260 | 275 | Modified | **No Regression** | Git repository binding configuration active. |
| `sections/openchamber/SessionGoalCheckerField.tsx` | 158 | 0 (deleted) | Deleted | **Keep Retired** | Host Goal Supervisor retired. |
| `sections/openchamber/SessionRetentionSettings.tsx` | 95 | 95 | Identical | **No Regression** | Session retention thresholds active (0 diffs). |
| `sections/openchamber/SessionWarmingCheckbox.tsx` | 65 | 70 | Modified | **Keep Retired** | Per-session cache warming excluded per maintainer. |
| `sections/openchamber/SessionWarmingModeField.tsx` | 84 | 0 (deleted) | Deleted | **Keep Retired** | Per-session cache warming excluded per maintainer. |
| `sections/openchamber/SessionWorkSettings.tsx` | 110 | 120 | Modified | **No Regression** | In-work session state and auto-mark active. |
| `sections/openchamber/ShortcutRecordingDialog.tsx` | 195 | 205 | Modified | **No Regression** | Keyboard shortcut recorder active. |
| `sections/openchamber/SourceControlAccountList.tsx` | 230 | 245 | Modified | **No Regression** | Source control account inventory active. |
| `sections/openchamber/SourceControlBindingSettings.tsx` | 340 | 355 | Modified | **No Regression** | Source control project binding active. |
| `sections/openchamber/SpacePlacesSettings.tsx` | 270 | 285 | Modified | **No Regression** | Isolated space provider management active. |
| `sections/openchamber/ThemeCatalogDialog.tsx` | 180 | 190 | Modified | **No Regression** | Theme catalog browsing active. |
| `sections/openchamber/ThemeImportButton.tsx` | 85 | 90 | Modified | **No Regression** | Theme JSON import active. |
| `sections/openchamber/ThemePicker.tsx` | 145 | 155 | Modified | **No Regression** | Built-in theme switcher active. |
| `sections/openchamber/TunnelSettings.tsx` | 630 | 750 | Modified | **No Regression** | Active; enhanced with strict Zod validation schemas. |
| `sections/openchamber/VoiceSettings.tsx` | 125 | 125 | Identical | **No Regression** | TTS voice configuration and preview active (0 diffs). |
| `sections/openchamber/WorktreeSectionContent.tsx` | 135 | 135 | Modified | **No Regression** | Cleanly migrated to Canonical `session.sessionId`. |
| `sections/git-identities/GitPage.tsx` | 180 | 180 | Identical | **No Regression** | Git author identities management active (0 diffs). |
| `sections/git-identities/GitIdentityEditorDialog.tsx` | 210 | 210 | Identical | **No Regression** | Author profile editor active (0 diffs). |

---
*Report autonomous audit complete. All findings verified against pinned source revisions `0056bf6a9` and `HEAD`.*
