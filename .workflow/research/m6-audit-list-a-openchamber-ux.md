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
- **`S` (Source-level):** Observed directly in repository source code at the cited commit.
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
| **Mobile Workspace Tabs** | `sections/openchamber/MobileWorkspaceTabsSettings.tsx:1-53` | Deleted from settings UI | S | **Restore in M6** | Drag-and-drop sortable visibility list for mobile bottom bar. Store `useUIStore.mobileWorkspaceTabOrder` is fully functional; restore UI settings component. |
| **Worktree Archive on Done** | `sections/openchamber/FinishedWorktreesSettings.tsx:20` | Dropped in `MergedWorktreeCleanupSettings.tsx` | S | **Restore in M6** | Expose `worktreeArchiveOnDoneEnabled` checkbox. Backing store `useWorktreeWork.ts:137` and host git automation are already complete. |
| **Live Browser Tab Limit** | `sections/openchamber/GeneralWorkspaceSettings.tsx:260` | Dropped from UI | S | **Restore in M6** | Expose `liveBrowserTabLimit` (1..20) stepper. Backing store and settings registry already present. |
| **Passkey Label Renaming** | `sections/openchamber/PasskeySettings.tsx:168-218` | Dropped from UI | S | **Restore in M6** | Restore pencil icon and inline rename input. Underlying API `renameStoredPasskey` in `packages/ui/src/lib/passkeys.ts:205` is fully intact. |
| **Default Model & Reasoning Effort** | `sections/openchamber/DefaultsSettings.tsx:60-120` | Gutted in `DefaultsSettings.tsx:1-45` | S | **Restore in M6** | Restore Default Model & Thinking Level picker for new sessions, mapped to OMP role `default` (`OMP_MODEL_ROLES`). |
| **Mobile Return Key Sends** | `sections/openchamber/ChatSettings.tsx:400-412` | Dropped in `ChatSettings.tsx` | S | **Restore in M6** | Mobile UX checkbox for `mobileReturnKeySends`. Store property exists in `useUIStore.ts` and `settings-helpers.js`. |
| **Save Pasted Images as Files** | `sections/openchamber/ChatSettings.tsx:450-457` | Dropped in `ChatSettings.tsx` | S | **Restore in M6** | Restore user preference to save clipboard image pastes as repo assets rather than data URIs. |
| **Sidebar & Tray / Dock Unread Sync** | `packages/electron/tray.mjs:1-50`<br>`electron/dev-dock-identity.mjs:1-40` | Degraded unread count (always 0) | S | **Restore in M6** | Feed restored `isSessionUnread` into Electron IPC `desktop_set_badge_count` and tray icon breathing/unread indicator. |
| **Mobile Widget Unread Snapshot** | `ui/src/apps/mobileWidgetSnapshot.ts:1-60` | Unread mark dropped from top-level sessions | S | **Restore in M6** | Restore `unread: isSessionUnread(session)` and lifecycle sort in mobile widget sync. |
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

## 7. Deep Dive: Settings Sections & Controls (`sections/openchamber/*`)

### 7.1 `DesktopAppSettings.tsx` vs. `DesktopNetworkSettings.tsx`
- **Finding:** Upstream `DesktopAppSettings.tsx` (560 lines) was deleted and inlined into `DesktopNetworkSettings.tsx:471-589`.
- **Impact:** Host window and lifecycle controls (`launchAtLogin`, `minimizeToTray`, `desktopMacMenuBarEnabled`, `desktopLinuxNativeFrame`, `keepAwake`, `miniChatGlobalShortcut`, `DesktopQuakeModeSettings`) are improperly bundled under "Network".
- **Restoration:** Re-partition into two distinct settings views/cards: **Desktop Application** (window, tray, launch, Quake) and **Local Network Access** (port, bind address, pairing). Restore `desktopRestartDrafts.ts` to coordinate pending restart states.

### 7.2 `GeneralWorkspaceSettings.tsx` & `MobileWorkspaceTabsSettings.tsx`
- **Finding:** `GeneralWorkspaceSettings.tsx` was deleted and partially absorbed into `OpenChamberVisualSettings.tsx`. In the process, `MobileWorkspaceTabsSettings.tsx` (drag-to-reorder for mobile bottom tabs: Status, Changes, Files, Terminal, Notes) was dropped.
- **Impact:** The backing store (`useUIStore.ts:886, 1522`), unit tests (`useUIStore.mobileWorkspaceTabs.test.ts`), and server settings registry (`settings-registry.json:747`) exist and work, but the UI settings component is missing.
- **Restoration:** Restore `MobileWorkspaceTabsSettings.tsx` within the Layout/General settings page.

### 7.3 `DefaultsSettings.tsx`
- **Finding:** Reduced from 530 lines to 45 lines.
- **Restoration:**
  - Restore Default Model and Reasoning Effort (Thinking Level) selector for new sessions, mapped to OMP role `default`.
  - Restore Default Agent Mode selector (mapping to main / plan / vibe / goal).
  - Keep `SessionWarmingModeField` and `PermissionDefaultModeField` retired.

### 7.4 Other Restored Controls
- **`worktreeArchiveOnDoneEnabled`:** Restore the checkbox in `MergedWorktreeCleanupSettings.tsx`.
- **`liveBrowserTabLimit`:** Restore the 1..20 stepper control in General Workspace settings.
- **`PasskeySettings.tsx`:** Restore the pencil icon and inline rename input calling `renameStoredPasskey`.
- **`mobileReturnKeySends`:** Restore checkbox in `ChatSettings.tsx` `ComposerTab`.
- **`savePastedImagesAsFiles`:** Restore checkbox in `ChatSettings.tsx` `ComposerTab`.

---

## 8. Additional Workbench UX Audits

### 8.1 Chat & Composer Mechanics
- **Attachment Inlining (CP-05):** In upstream OpenCode, non-image attachments were injected via custom messages. In OMP, plain text attachments should be inlined into prompt context with delimiters, while binary/large files supply absolute filesystem paths for the `read` tool.
- **Compact Action (CP-04):** Compact button currently sends `/compact` as a chat string while `runCommands: false`. It must call the canonical compact RPC (`session.compact()`).
- **Tool Status Buckets (CP-06):** `useAssistantStatus.ts:89-107` still uses OpenCode tool names (`shell`, `subagent`, `question`, `codesearch`). Map OMP native tool names (`bash`, `task`, `ask`, `find`, `grep`, `glob`, `todo`).

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
*Report autonomous audit complete. All findings verified against pinned source revisions `0056bf6a9` and `HEAD`.*
