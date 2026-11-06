# M6 Audit List B: Missing or Partially Wired OMP 18.16.0 Capabilities

**Audit Date:** 2026-11-06
**Auditor / Task:** M6 Phase 1 Audit List B (`.workflow/tasks/m6-audit-and-polish/02-audit-list-b-omp-capabilities.md`)
**Pinned OMP Revision:** `650f3a108229ee11bf68ba3377f4e8c3391cd424` / Version `18.16.0` (`vendor/omp/650f3a10/tarballs/*.tgz`)
**Compared Surfaces:** OhPiChamber `HEAD` (`packages/agent-contract`, `packages/agent-service`, `packages/web`, `packages/ui`)
**Status:** Complete

---

## 1. Executive Summary, Baseline & Methodology

### 1.1 Mission & Objectives
Even following M4's TUI parity and mode convergence milestones, several non-chat, cross-session, and extensibility capabilities present in pinned OMP `18.16.0` remained unwired, partially wired, or diverted into fork-specific ad-hoc Host workarounds. This audit provides an exhaustive, source-grounded inventory of all subsystems across `vendor/omp/650f3a10/tarballs/` against current `@openchamber/agent-contract`, `@openchamber/agent-service`, and `packages/ui`.

### 1.2 Inspection Methodology
1. **Archive Source Disassembly:** Pinned tarballs in `vendor/omp/650f3a10/tarballs/` were inspected down to the file and symbol level using streaming archive reads (`tar -ztf` and direct member extraction).
2. **Topology Verification:** The actual package topology of OMP 18.16.0 was confirmed against assumed workspace roots. Several directories historically presumed to be separate packages (`packages/swarm-extension`, `packages/mcp-client`, `packages/lsp`, `packages/python`) were found to be first-party submodules of `@oh-my-pi/pi-coding-agent`.
3. **Traceability & Proof:** All findings cite exact vendor archive member paths (`package/src/...`), fork file paths (`packages/...`), exported types, methods, and SQLite schemas. Observed behaviors are strictly distinguished from proposed integration designs.

### 1.3 Key Architectural Findings
* **Session Recap Fracture:** OMP's native idle recap generator (`idle-maintenance.ts` + SQLite table `session_recaps` in `history.db`) is completely uninstantiated in `agent-service`. OpenChamber previously substituted a fragile Web Host watcher (`session-assist/runtime.js`) using `small-model` with a redundant 60-second client-side delay.
* **Agent Hub / Swarm Isolation:** Multi-agent runtime coordination (`agent-hub-runtime.ts`, `IrcBus`, `registerPersistedSubagents`, `sumSubagentTreeCost`) is reduced to an in-memory ephemeral map in `WorkerSession`. UI reloads discard all subagents; parked subagents cannot be revived or messaged; transcripts are inaccessible in the GUI; and tree-wide recursive swarm costs are never aggregated.
* **Marketplace Truncation:** While OMP's `MarketplaceManager` provides complete plugin registry management (`marketplaces.json`), update checking, and previewed upgrades, OhPiChamber's contract and UI severely truncate this to simple package install/uninstall, completely omitting marketplace browsing from `AddPluginDialog.tsx`.
* **Stats Engine Bypass:** `@oh-my-pi/omp-stats` is bundled as a dependency in `packages/agent-service`, but `worker/usage.ts` bypasses its pre-aggregated SQLite database (`stats.db`) in favor of expensive, synchronous raw JSONL disk scans on every query.

---

## 2. Deep Dive 1: Session `Recap` & Archive Recaps (`SessionRecapSpacer.tsx`)

### 2.1 Observed Source Evidence

#### Vendor Subsystem (`vendor/omp/650f3a10`)
* **Core Generator Engine (`oh-my-pi-pi-coding-agent-18.16.0.tgz:package/src/session/idle-maintenance.ts`):**
  - Managed by `IdleMaintenance` class, initialized via `AgentSession.enableIdleMaintenance(options: IdleMaintenanceOptions)`.
  - Subscribes to session events: on `agent_end`, invalidates earlier timers and evaluates `#armWhenQuiet()`.
  - Quietness check (`#isQuiet()`): Requires `!session.isStreaming`, `!session.hasAdmittedSubmission`, `session.queuedMessageCount === 0`, and no pending goal or loop continuation turns (`options.scheduledTurn?.() !== true`).
  - Waits for `session.waitForIdle()` and `session.waitForAdmittedSubmissions()`.
  - Timer: Arms `#recapTimer` with delay `cfgRecap.get(this.#session.settings).idleSeconds * 1000` (clamped 1s–3600s, default 240s).
  - `#runRecap()` executes `session.runEphemeralTurn({ promptText, signal: run.signal })`. This executes an out-of-band turn using the active session model that does **not** append to conversation JSONL or LLM context.
  - Prompt Template (`package/src/prompts/system/recap-user.md`):
    ```markdown
    <recap>
    User stepped away; returning. Recap: <40 words, 1–2 plain sentences, no markdown. Lead: overall goal, current task; then one next action. Skip: root-cause narrative, fix internals, secondary to-dos, em-dash tangents.
    {{#if goal}}
    Overall goal: {{goal}}
    {{/if}}
    {{#if task}}
    Active task: {{task}}
    {{/if}}
    </recap>
    ```
  - Upon reply, verifies session is still quiet and unblocked, calls `session.sessionManager.recordRecap(replyText)`, and delivers the text to `options.onRecap?.(replyText)`.
* **Durable Journaling (`package/src/session/session-index.ts` & `package/src/session/session-manager.ts`):**
  - Recaps are journaled to SQLite `history.db`:
    ```sql
    CREATE TABLE IF NOT EXISTS session_recaps (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT NOT NULL,
        cwd TEXT NOT NULL,
        recap TEXT NOT NULL,
        created_at INTEGER NOT NULL DEFAULT (CAST(strftime('%s','now') AS INTEGER))
    );
    CREATE INDEX IF NOT EXISTS idx_session_recaps_session ON session_recaps(session_id, created_at);
    ```
  - Functions: `recordSessionRecap(sessionId, cwd, recap)` and `listSessionRecaps(query: SessionRecapQuery)`.
* **Settings Schema (`package/src/modes/settings.ts`):**
  - `recap.enabled`: boolean, default `true`.
  - `recap.idleSeconds`: number, default `240` (options: 60s, 120s, 240s, 300s, 600s).
* **TUI Presentation (`package/src/modes/interactive-mode.ts` & `package/src/modes/controllers/event-controller.ts`):**
  - `interactive-mode.ts:1857` hooks `onRecap: recap => activity.presentRecap?.(recap)`.
  - `event-controller.ts:481` calls `presentIdleRecap(reply)`, mounting `new RecapNotice(recap)` directly above the prompt.
* **Archive & Eval Views (`package/src/archive/archive.ts`):**
  - Evaluates `listSessionRecaps({ sessionIds, cwd, limit })`.
  - `ArchiveSession` includes `recap?: string` (latest recap) and `recaps: ArchiveRecap[]` (chronological journal).

#### Fork Implementation & Gaps (`HEAD`)
* **`packages/agent-service/src/worker/session.ts`:**
  - `WorkerSession` never calls `session.enableIdleMaintenance()`.
  - Native `IdleMaintenance` is dormant; SQLite table `session_recaps` in `history.db` remains completely empty.
* **`packages/agent-contract/src/events.ts` & `metadata.ts`:**
  - Contract lacks any `session.recap` event.
  - Retains obsolete `session.metadata.openchamber.assist: { recap, suggestion, forMessageID, generatedAt }`.
* **`packages/web/server/lib/session-assist/runtime.js`:**
  - An ad-hoc Host watcher listens to `run.completed`, waits 60s, invokes `small-model` (`smol` role) with an OpenCode-style prompt, and writes to `host-metadata.sqlite`.
  - Bypasses OMP's ephemeral turn, ignores `recap.idleSeconds`, and fails in standalone Agent Service or Electron desktop shell.
* **`packages/ui/src/components/chat/SessionRecapSpacer.tsx` & `useSessionAssist.ts`:**
  - `SessionRecapNote` reads `useSessionAssistState()`, which checks `session.metadata.openchamber.assist`.
  - `useSessionAssist.ts:8` hardcodes `RECAP_VISIBILITY_DELAY_MS = 60 * 1000`. This creates an unnecessary double-delay.
  - `CompactionDivider` in the same file only receives `tokensBefore` because `WorkerProjection` drops `method`, `tokensAfter`, and `summary`.
* **`packages/agent-service/src/sessions/archive.ts`:**
  - Dedicated to `.tar` archive import/export (`exportNativeArchive`/`importNativeArchive`). Unconnected to `history.db` recaps.

### 2.2 Proposed Canonical API, Worker & UI Integration Design

```
┌────────────────────────────────────────────────────────┐
│ OMP AgentSession (idle-maintenance.ts)                 │
│ 1. Waits recap.idleSeconds (default 240s) quiet window │
│ 2. Runs ephemeral turn via recap-user.md prompt        │
│ 3. Writes to history.db (session_recaps table)         │
│ 4. Calls onRecap(recapText)                            │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│ packages/agent-service (worker/session.ts)             │
│ - enableIdleMaintenance({ onRecap })                   │
│ - Emits canonical event: { type: 'session.recap' }     │
│ - Exposes GET /api/agent/v1/sessions/:id/recaps        │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│ packages/agent-contract (events.ts, session.ts)        │
│ - SessionRecapEventSchema                              │
│ - SessionRecapListResponseSchema                       │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│ packages/ui (SessionRecapSpacer.tsx, Sidebar)          │
│ - SessionRecapNote renders immediately on event        │
│ - CompactionDivider renders method + summary           │
│ - Session sidebar/archive displays latest recap        │
└────────────────────────────────────────────────────────┘
```

#### 1. Canonical Contract (`packages/agent-contract`)
* **Event Schema (`src/events.ts`):**
  ```ts
  export const SessionRecapEventSchema = z.strictObject({
    type: z.literal('session.recap'),
    sessionId: EntityIdSchema,
    recap: z.string().min(1),
    createdAt: TimestampSchema,
  });
  ```
* **Endpoint Schema (`src/requests.ts` / `src/session.ts`):**
  ```ts
  export const SessionRecapEntrySchema = z.strictObject({
    id: z.number().int(),
    sessionId: EntityIdSchema,
    cwd: z.string(),
    recap: z.string(),
    createdAt: TimestampSchema,
  });
  export const SessionRecapListResponseSchema = z.strictObject({
    recaps: z.array(SessionRecapEntrySchema),
  });
  ```
* **Settings Schema (`src/settings.ts`):** Register `recap.enabled` (`boolean`, default `true`) and `recap.idleSeconds` (`number`, default `240`).

#### 2. Agent Service Worker (`packages/agent-service`)
* In `src/worker/session.ts`, initialize idle maintenance inside `WorkerSession`:
  ```ts
  this.session.enableIdleMaintenance({
    isBlocked: () => this.isComposingOrBusy(),
    scheduledTurn: () => this.hasScheduledContinuation(),
    onRecap: (recap: string) => {
      this.emit([{
        timestamp: Date.now(),
        event: { type: 'session.recap', sessionId: this._sessionId, recap, createdAt: Date.now() },
      }]);
    },
  });
  ```
* In `src/sessions/` router: Expose `GET /api/agent/v1/sessions/:id/recaps` calling `listSessionRecaps({ sessionIds: [sessionId] })` from `@oh-my-pi/pi-coding-agent/session/session-index`.

#### 3. UI Surface (`packages/ui`)
* In `packages/ui/src/components/chat/SessionRecapSpacer.tsx`:
  - Update `SessionRecapNote` to subscribe directly to `session.recap` events or session state.
  - Remove the client-side `RECAP_VISIBILITY_DELAY_MS` delay: when the backend fires `session.recap`, display immediately.
  - Update `CompactionDivider` to receive rich `session.compacted` payload (`method`, `tokensBefore`, `tokensAfter`, `summary`).
* In Session Sidebar / Archive:
  - Render the latest journaled recap as a secondary line or tooltip for idle/archived sessions.

---

## 3. Deep Dive 2: `Agent Hub` (`modes/agent-hub-runtime.ts` and Coordination)

### 3.1 Observed Source Evidence

#### Vendor Subsystem (`vendor/omp/650f3a10`)
* **Coordinator Factory (`package/src/modes/agent-hub-runtime.ts`):**
  - `createAgentHubRuntime(options)` creates the central coordination interface:
    - `registry`: `AgentRegistry.global()`
    - `lifecycle`: `AgentLifecycleManager.global()`
    - `irc`: `IrcBus.global()` (inter-agent peer communication: `agent://<id>`, `agent://all`)
    - `activity`: `AgentActivityIndex` (live tool calls and status indexing)
    - `loadPersisted`: `registerPersistedSubagents(registry, sessionFile)`
    - `transcript`: `agentTranscriptSource` (incremental JSONL parser via `parseSessionEntries`)
  - `sumSubagentTreeCost(args)`: Recursively aggregates assistant and model usage costs across all subagent descendants in the root session's tree, excluding parent advisors.
* **Process Registry & Lineage (`package/src/registry/agent-registry.ts` & `persisted-agents.ts`):**
  - Process-global registry tracking every agent session (`main`, `sub`, `advisor`).
  - Maintains `id`, `name`, `parentId`, `status` (`running`, `idle`, `parked`, `cancelled`, `failed`), `sessionFile`, `directCost`, `outputPath`, `patchPath`, and `metrics`.
  - `registerPersistedSubagents`: Reads the session artifacts folder under `sessionsRoot`, registering discovered historical subagents as `parked`.
* **Lifecycle Controls (`package/src/registry/agent-lifecycle.ts`):**
  - Supports pausing, resuming, cancelling, and reviving agents (`task resume` / prompt to parked agent).
* **Agent Hub Overlay UI (`package/src/overlays/agent-hub.ts` & `agent-hub-projection.ts` in `pi-tui`):**
  - **Table View:** Hierarchical tree of subagents, status glyphs, unread IRC badges, tool names, direct costs, aggregated tree costs (`sumSubagentTreeCost`), and run durations. Keybindings: `r` (revive), `x` (abort/release), `c` (tree cost).
  - **Chat View:** Incremental transcript viewer for any subagent with an interactive prompt input to steer or revive.

#### Fork Implementation & Gaps (`HEAD`)
* **`packages/agent-service/src/worker/session.ts`:**
  - Maintains `liveSubagents = new Map<string, Subagent>()` in memory.
  - Listens to `TASK_SUBAGENT_LIFECYCLE_CHANNEL`, `PROGRESS_CHANNEL`, and `EVENT_CHANNEL`.
  - Supports `subagent.steer` and `subagent.cancel`.
  - **Does not call `registerPersistedSubagents`:** UI reloads wipe all subagents.
  - Rejects `subagent.steer` with `404` or "Subagent not running" if status is not running. Cannot revive parked subagents.
  - Never invokes `sumSubagentTreeCost`: no tree-wide cost rollups.
* **`packages/ui/src/components/chat/SubagentHudTray.tsx`:**
  - Only a compact tray docked in `ChatInput.tsx`.
  - No dedicated Agent Hub dashboard, no transcript viewer, no peer messaging inspection, and no revive controls.

### 3.2 Proposed Canonical API, Worker & UI Integration Design

```
┌────────────────────────────────────────────────────────┐
│ OMP Agent Hub Runtime (agent-hub-runtime.ts)           │
│ - AgentRegistry.global() & persisted-agents.ts         │
│ - IrcBus.global() (peer messaging)                     │
│ - agentTranscriptSource (JSONL parser)                 │
│ - sumSubagentTreeCost()                                │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│ packages/agent-service (worker/session.ts)             │
│ - registerPersistedSubagents on bootstrap              │
│ - subagent.revive operation support                    │
│ - GET /sessions/:id/subagents                          │
│ - GET /sessions/:id/subagents/:subId/transcript        │
│ - GET /sessions/:id/subagents/tree-cost                │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│ packages/agent-contract (session.ts, requests.ts)      │
│ - SubagentSchema with durable fields                   │
│ - SubagentControlRequestSchema (subagent.revive)       │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│ packages/ui (AgentHubModal.tsx, SubagentHudTray.tsx)   │
│ - Dedicated Agent Hub modal/drawer                     │
│ - Full subagent tree hierarchy + metrics + tree cost   │
│ - Embedded transcript viewer                           │
│ - Revive & Prompt + Steer action controls              │
└────────────────────────────────────────────────────────┘
```

#### 1. Canonical Contract (`packages/agent-contract`)
* **Durable Subagent Schema (`src/session.ts`):**
  ```ts
  export const SubagentSchema = z.strictObject({
    subagentId: EntityIdSchema,
    parentSessionId: EntityIdSchema,
    childSessionId: EntityIdSchema,
    role: z.string().optional(),
    status: z.enum(['running', 'idle', 'completed', 'cancelled', 'failed', 'parked']),
    activeTool: z.string().optional(),
    retryCountdown: z.number().optional(),
    tokens: z.strictObject({ input: z.number(), output: z.number(), total: z.number() }).optional(),
    cost: z.number().optional(),
    directCost: z.number().optional(),
    treeCost: z.number().optional(),
    depth: z.number().optional(),
    createdAt: TimestampSchema.optional(),
    updatedAt: TimestampSchema.optional(),
    sessionFile: z.string().optional(),
    outputPath: z.string().optional(),
    patchPath: z.string().optional(),
    persisted: z.boolean().optional(),
  });
  ```
* **Control Schema (`src/requests.ts`):** Add `subagent.revive` action to `SubagentControlRequestSchema`.
* **Endpoints:** Declare `GET /api/agent/v1/sessions/:id/subagents`, `GET /api/agent/v1/sessions/:id/subagents/:subagentId/transcript`, and `GET /api/agent/v1/sessions/:id/subagents/tree-cost`.

#### 2. Agent Service Worker (`packages/agent-service`)
* In `src/worker/session.ts`:
  - On session bootstrap, call `registerPersistedSubagents(AgentRegistry.global(), this.sessionFile)`.
  - Implement `subagent.revive` operation leveraging `AgentLifecycleManager.global().revive()`.
  - Expose routes for transcript reading (`agentTranscriptSource.parseEntries()`) and tree cost calculation (`sumSubagentTreeCost()`).

#### 3. UI Surface (`packages/ui`)
* Create `packages/ui/src/components/chat/AgentHubModal.tsx`:
  - Openable from `SubagentHudTray` or header status icon.
  - Displays complete tree table: status glyph, role, active tool, tokens, direct cost, tree cost, and elapsed runtime.
  - Includes transcript viewer for any selected subagent.
  - Provides "Revive & Prompt" input allowing operators to prompt parked or completed subagents directly.

---

## 4. Deep Dive 3: Plugin `Marketplace` (`extensibility/plugins/marketplace/*` vs `PluginsPage.tsx` and `catalog-plugins.ts`)

### 4.1 Observed Source Evidence

#### Vendor Subsystem (`vendor/omp/650f3a10`)
* **`package/src/extensibility/plugins/marketplace/manager.ts` (`MarketplaceManager`):**
  - Full-lifecycle plugin manager:
    - `addMarketplace(source: string)` (supports GitHub repo, Git URL, HTTP URL, local path)
    - `removeMarketplace(name: string)`
    - `updateMarketplace(name: string)` / `updateAllMarketplaces()`
    - `listMarketplaces()` (`MarketplaceRegistryEntry[]`)
    - `listAvailablePlugins(marketplace?: string)` (`MarketplacePluginEntry[]`)
    - `checkForUpdates()` -> `Array<{ pluginId: string; scope: "user" | "project"; from: string; to: string }>`
    - `upgradePlugin(pluginId, scope)` / `upgradeAllPlugins()`
    - `previewUpgradePlugin(pluginId, scope)` / `previewUpgradeAllPlugins()`
    - `setPluginEnabled(pluginId, enabled, scope)`
* **`package/src/extensibility/plugins/marketplace/types.ts`:**
  - `MarketplacePluginEntry`: `name`, `source`, `version`, `description`, `author`, `homepage`, `repository`, `license`, `keywords`, `category`, `tags`, `commands`, `agents`, `hooks`, `mcpServers`, `lspServers`, `dapAdapters`.
  - `MarketplacesRegistry`: Stored in `marketplaces.json` (sourceType: `github`, `git`, `url`, `local`).
  - `InstalledPluginsRegistry`: Stored in `installed_plugins.json` (version 2, Claude Code compatible).
* **`package/src/slash-commands/builtin-marketplace.ts`:**
  - CLI command `/marketplace` with subcommands: `add`, `remove`, `update`, `list`, `discover`, `install`, `uninstall`, `upgrade`, `enable`, `disable`, `doctor`.

#### Fork Implementation & Gaps (`HEAD`)
* **`packages/agent-contract/src/plugins.ts`:**
  - `MarketplaceEntrySchema` is stripped down to 4 fields: `{ marketplace, name, description, version }`.
  - Drops `author`, `homepage`, `repository`, `license`, `keywords`, `category`, and capabilities (`commands`, `agents`, `mcpServers`, `lspServers`, `dapAdapters`).
  - Zero schemas or endpoints for managing marketplace sources (`marketplaces.json`).
  - Zero schemas or endpoints for checking updates or batch upgrading.
* **`packages/agent-service/src/worker/catalog-plugins.ts`:**
  - Instantiates `MarketplaceManager`, but only exposes:
    - `plugins.marketplace` (calls `updateAllMarketplaces()`)
    - `plugins.install`
    - `plugins.uninstall`
    - `plugins.update` (single plugin upgrade without preview)
    - `plugins.configure`
  - Missing: `addMarketplace`, `removeMarketplace`, `listMarketplaces`, `checkForUpdates`, `previewUpgradePlugin`, `upgradeAllPlugins`.
* **`packages/ui/src/components/sections/plugins/AddPluginDialog.tsx`:**
  - Only provides two tabs: `package` (npm spec) and `local` (`.omp/extensions/<id>.ts`).
  - **No Marketplace tab or search** in the dialog to discover and install available marketplace plugins.
* **`packages/ui/src/components/sections/plugins/PluginsGrid.tsx` & `PluginsPage.tsx`:**
  - `PluginsGrid.tsx` ignores `catalog.marketplace`, displaying only installed plugins.
  - `PluginsPage.tsx` displays `catalog.marketplace` as an unstyled secondary list beneath the installed cards.
  - Missing catalog management UI, update indicators, and rich plugin detail views.

### 4.2 Proposed Canonical API, Worker & UI Integration Design

```
┌────────────────────────────────────────────────────────┐
│ OMP MarketplaceManager (extensibility/plugins/...)     │
│ - addMarketplace, removeMarketplace, listMarketplaces  │
│ - checkForUpdates, upgradePlugin, upgradeAllPlugins    │
│ - Full manifest: author, repo, MCP/LSP tools           │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│ packages/agent-service (worker/catalog-plugins.ts)     │
│ - plugins.marketplace.manage operation                 │
│ - plugins.marketplace.checkUpdates operation           │
│ - plugins.marketplace.upgradeAll operation             │
│ - Rich metadata in marketplaceEntries()                │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│ packages/agent-contract (plugins.ts)                   │
│ - MarketplaceEntrySchema with details                  │
│ - MarketplaceSourceSchema                              │
│ - PluginMarketplaceManageRequestSchema                 │
│ - PluginUpdateCheckResultSchema                        │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│ packages/ui (PluginsPage.tsx, AddPluginDialog.tsx)     │
│ - AddPluginDialog: 3rd tab for Marketplace browsing    │
│ - PluginsGrid: "Update Available" badge + Update btn   │
│ - Marketplace Sources configuration modal              │
│ - Rich Plugin Details drawer                           │
└────────────────────────────────────────────────────────┘
```

#### 1. Canonical Contract (`packages/agent-contract`)
* **Expanded Marketplace Schema (`src/plugins.ts`):**
  ```ts
  export const MarketplacePluginDetailsSchema = z.strictObject({
    author: z.strictObject({ name: z.string(), email: z.string().optional() }).optional(),
    homepage: z.string().url().optional(),
    repository: z.string().url().optional(),
    license: z.string().optional(),
    keywords: z.array(z.string()).optional(),
    category: z.string().optional(),
    commands: z.union([z.string(), z.array(z.string())]).optional(),
    agents: z.union([z.string(), z.array(z.string())]).optional(),
    mcpServers: z.record(z.string(), z.unknown()).optional(),
    lspServers: z.record(z.string(), z.unknown()).optional(),
  });
  export const MarketplaceEntrySchema = z.strictObject({
    marketplace: z.string().min(1),
    name: z.string().min(1),
    description: z.string(),
    version: z.string().nullable(),
    details: MarketplacePluginDetailsSchema.optional(),
  });
  ```
* **Catalog Management & Update Schemas (`src/plugins.ts`):**
  ```ts
  export const MarketplaceSourceSchema = z.strictObject({
    name: z.string().min(1),
    sourceType: z.enum(['github', 'git', 'url', 'local']),
    sourceUri: z.string().min(1),
    catalogPath: z.string(),
    addedAt: z.string(),
    updatedAt: z.string(),
  });
  export const PluginMarketplaceManageRequestSchema = z.discriminatedUnion('action', [
    z.strictObject({ action: z.literal('add'), source: z.string().min(1) }),
    z.strictObject({ action: z.literal('remove'), name: z.string().min(1) }),
    z.strictObject({ action: z.literal('update'), name: z.string().optional() }),
    z.strictObject({ action: z.literal('list') }),
  ]);
  export const PluginUpdateCheckEntrySchema = z.strictObject({
    pluginId: z.string(),
    scope: z.enum(['user', 'project']),
    from: z.string(),
    to: z.string(),
  });
  export const PluginUpgradeRequestSchema = z.strictObject({
    target: PluginTargetSchema,
    expectedRevision: CounterSchema,
  });
  ```

#### 2. Agent Service Worker (`packages/agent-service`)
* In `src/worker/catalog-plugins.ts`:
  - In `operation()`:
    - Route `plugins.marketplace.manage` to `MarketplaceManager.addMarketplace()`, `removeMarketplace()`, `updateMarketplace()`, `listMarketplaces()`.
    - Route `plugins.marketplace.checkUpdates` to `MarketplaceManager.checkForUpdates()`.
    - Route `plugins.marketplace.upgradeAll` to `MarketplaceManager.upgradeAllPlugins()`.
  - In `marketplaceEntries()`:
    - Map rich manifest attributes (`author`, `homepage`, `repository`, `keywords`, `mcpServers`, `lspServers`) from `MarketplacePluginEntry`.

#### 3. UI Surface (`packages/ui`)
* In `AddPluginDialog.tsx`:
  - Add a third tab: `marketplace` (Browse Marketplace) with live search and 1-click install.
* In `PluginsGrid.tsx` & `PluginsPage.tsx`:
  - Display "Update Available" badges (`from` → `to`) and inline "Update" buttons when updates exist.
  - Provide a "Marketplace Sources" dialog to view and add external Git/GitHub catalog repositories.
  - Add a Plugin Details sheet to view author, license, repo URL, and provided tools.

---

## 5. Complete Module-by-Module Capabilities Inventory (85 Subsystems)

### 5.1 `@oh-my-pi/pi-coding-agent` (51 Subsystems)

| Subsystem / Module | Files | Status in OhPiChamber | Vendor Path (`vendor/omp/650f3a10/packages/coding-agent/src/`) | Current Fork Path (`packages/`) | M6 Disposition & Action |
|---|---|---|---|---|---|
| `session` | 107 | **Fully Wired** | `session/agent-session.ts`, `session-manager.ts`, `blob-store.ts`, `checkpoint-entries.ts` | `agent-service/src/worker/session.ts`, `sessions/registry.ts` | Complete. Core session turns, branches, forks, and checkpoint restoration fully operational. |
| `config` | 27 | **Fully Wired** | `config/model-registry.ts`, `model-roles.ts`, `models-config.ts`, `all-settings.ts` | `agent-service/src/worker/catalog-models.ts`, `catalog-settings.ts` | Complete. Settings schema, model roles, and custom endpoints fully mapped. |
| `tools` | 96 | **Fully Wired** | `tools/read.ts`, `tools/edit.ts`, `tools/write.ts`, `tools/bash.ts`, `tools/grep.ts`, `tools/glob.ts`, `tools/task.ts` | `agent-service/src/worker/session.ts`, `native-bash-policy.ts` | Complete. Core tool executions and interactive approvals operational. |
| `task` | 36 | **Fully Wired** | `task/agents.ts`, `commands.ts`, `discovery.ts`, `seance.ts` | `agent-service/src/worker/session.ts`, `catalog-agents.ts`, `ui/.../SubagentTurn.tsx` | Complete. Subagent spawning, channels, and lifecycle streaming active. |
| `cleanse` | 8 | **Fully Wired** | `cleanse/index.ts`, `agent.ts`, `balance.ts`, `checkers.ts`, `loop.ts` | `agent-service/src/worker/session.ts`, `ui/.../CleanseBanner.tsx` | Complete. Autonomous multi-checker repair loop and progress events active. |
| `plan-mode` | 8 | **Fully Wired** | `plan-mode/approved-plan.ts`, `plan-autosave.ts`, `plan-files.ts` | `agent-service/src/worker/mode.ts`, `ui/.../PlanReviewDialog.tsx` | Complete. Plan review, approvals, and compact handoffs active. |
| `slash-commands` | 15 | **Fully Wired** | `slash-commands/acp-builtins.ts`, `available-commands.ts` | `agent-service/src/worker/builtin-commands.ts` | Complete. Core slash commands and custom prompt templates mapped. |
| `discovery` | 30 | **Fully Wired** | `discovery/agents.ts`, `agent-plugins.ts`, `omp-extension-roots.ts` | `agent-service/src/worker/catalog-agents.ts`, `catalog-skills.ts` | Complete. Discovery of skills, agents, and extension roots active. |
| `capability` | 18 | **Fully Wired** | `capability/context-file.ts`, `extension-module.ts`, `fs.ts`, `hook.ts` | `agent-service/src/worker/catalog-skills.ts`, `native-runtime.ts` | Complete. Context file loading and capability cache resets active. |
| `mcp` | 24 | **Fully Wired** | `mcp/manager.ts`, `config-writer.ts`, `oauth-flow.ts` | `agent-service/src/worker/mcp.ts`, `ui/.../MCPSettings.tsx` | Complete. Stdio/SSE/HTTP MCP servers, OAuth flows, and config persistence active. |
| `internal-urls` | 32 | **Fully Wired** | `internal-urls/agent-protocol.ts`, `artifact-protocol.ts`, `proc-protocol.ts` | `agent-service/src/worker/internal-device-path.ts` | Complete. Protocols (`agent://`, `artifact://`, `proc://`, `skill://`, `ssh://`) fully resolved. |
| `exec` | 5 | **Fully Wired** | `exec/bash-executor.ts`, `direnv.ts`, `non-interactive-env.ts` | `agent-service/src/worker/shell.ts` | Complete. PTY execution, non-interactive environment, and background exec active. |
| `launch` | 12 | **Fully Wired** | `launch/services.ts`, `paths.ts`, `presence.ts` | `agent-service/src/worker/session.ts` | Complete. Background service lifecycle (`proc://` devices) active. |
| `job-widgets` | 11 | **Fully Wired** | `job-widgets/registry.ts`, `caption.ts`, `format.ts` | `agent-service/src/worker/session.ts`, `shell.ts` | Complete. Async job captions, progress tracking, and shell job registry active. |
| `vibe` | 3 | **Fully Wired** | `vibe/lifecycle.ts`, `runtime.ts`, `state.ts` | `agent-service/src/worker/mode.ts` | Complete. Vibe autonomous loop and state tracking active. |
| `goals` | 5 | **Fully Wired** | `goals/runtime.ts`, `settings.ts`, `state.ts` | `agent-service/src/worker/mode.ts`, `agent-contract/src/metadata.ts` | Complete. Goal continuation modes and metadata persistence active. |
| `web` | 8 | **Fully Wired** | `web/search/index.ts`, `provider.ts`, `settings.ts` | `agent-service/src/worker/catalog-websearch.ts` | Complete. Exa, SearXNG, and Kagi grounded web search active. |
| `edit` | 10 | **Fully Wired** | `edit/auto-repair.ts`, `blackbox.ts`, `normalize.ts` | `agent-service/src/worker/native-runtime.ts` | Complete. Hashline edits and auto-repair logic active. |
| `async` | 4 | **Fully Wired** | `async/job-manager.ts`, `auto-background.ts` | `agent-service/src/worker/shell.ts` | Complete. Long-running bash job auto-backgrounding (60s cap) active. |
| `archive` | 4 | **Partially Wired** | `archive/archive.ts`, `prelude-definition.ts` | `agent-service/src/sessions/archive.ts`, `ui/.../SessionRecapSpacer.tsx` | **Priority 1**: Wire native `IdleMaintenance`, `onRecap`, and `listSessionRecaps`. |
| `modes` | 29 | **Partially Wired** | `modes/agent-hub-runtime.ts`, `rpc/rpc-btw.ts` | `agent-service/src/worker/session.ts` | **Priority 2**: Wire `createAgentHubRuntime`, `sumSubagentTreeCost`, and persisted subagents. |
| `extensibility` | 82 | **Partially Wired** | `extensibility/plugins/marketplace/*`, `plugins/manager.ts` | `agent-service/src/worker/catalog-plugins.ts`, `ui/.../PluginsPage.tsx` | **Priority 3**: Add Marketplace tab in `AddPluginDialog`, wire update checks and source addition. |
| `advisor` | 12 | **Partially Wired** | `advisor/advise-tool.ts`, `delta-split.ts` | `agent-service/src/worker/session.ts`, `ui/.../AdvisorMessage.tsx` | Autonomous typing watchdog is dormant in worker; schedule live watchdog activation. |
| `lsp` | 26 | **Partially Wired** | `lsp/client.ts`, `lspmux.ts`, `deferred-diagnostics.ts` | `agent-service/src/worker/session.ts` (`xd://lsp`) | Tool invocation works, but editor problem panel and diagnostics ledger are absent. |
| `dap` & `debug` | 11 | **Partially Wired** | `dap/client.ts`, `debug/profiler.ts` | `agent-service/src/worker/session.ts` (`xd://debug`) | Tool invocation works, but interactive breakpoints and stack inspection are unwired. |
| `ssh` | 5 | **Partially Wired** | `ssh/connection-manager.ts`, `sshfs-mount.ts` | `web/src/api/managed-ssh.ts` | `ssh://` URLs work; native SSHFS mounting is unwired in desktop shell. |
| `commit` | 14 | **Partially Wired** | `commit/execute.ts`, `message.ts` | `agent-contract/src/completion.ts`, `web/src/api/git.ts` | Uses generic completion RPC instead of OMP's chunked diff commit pipeline. |
| `memories` | 3 | **Unwired** | `memories/storage.ts`, `settings.ts` | None | Cross-session memory persistence (`memory_edit`, `recall`, `retain`, `reflect`) unwired. |
| `memory-backend` | 12 | **Unwired** | `memory-backend/local-backend.ts`, `global-scope.ts` | None | Dedicated global/local memory storage backends unwired. |
| `hindsight` | 11 | **Unwired** | `hindsight/bank.ts`, `client.ts` | None | Hindsight retrospective logging and retrieval unwired. |
| `mnemopi` | 9 | **Unwired** | `mnemopi/backend.ts`, `embed-client.ts` | None | On-device vector embeddings and semantic similarity index unwired. |
| `stt` & `tts` | 26 | **Unwired** | `stt/asr-client.ts`, `tts/runtime.ts` | None | Native Whisper/ASR and Sherpa TTS unwired (OhPiChamber uses browser Speech API). |
| `autoresearch` | 14 | **Unwired** | `autoresearch/git.ts`, `index.ts` | None | Autonomous iterative research loop and hypothesis tracking unwired. |
| `auto-graph` | 1 | **Unwired** | `auto-graph/planner.ts` | None | Automatic DAG task planner graph generator unwired. |
| `auto-prewalk` | 1 | **Unwired** | `auto-prewalk/classifier.ts` | None | Predictive file prewalking classifier unwired. |
| `auto-thinking` | 1 | **Unwired** | `auto-thinking/classifier.ts` | None | Dynamic thinking budget classifier unwired (uses static setting). |
| `autolearn` | 3 | **Unwired** | `autolearn/controller.ts` | `agent-service/src/worker/catalog-skills.ts` | Automated skill synthesis from user interaction unwired. |
| `ratchet` | 4 | **Unwired** | `ratchet/ratchet.ts` | None | Regression-prevention test runner unwired. |
| `secrets` | 10 | **Unwired** | `secrets/obfuscator.ts` | None | Native outbound secret scanning and placeholder masking unwired. |
| `tiny` | 14 | **Unwired** | `tiny/local-inference-api.ts` | None | Local on-device SLM inference via WebGPU/GGML unwired. |
| `collab` | 10 | **Unwired** | `collab/guest.ts`, `host.ts` | None | Multi-seat peer-to-peer live guest collaboration unwired. |
| `activity` | 1 | **Unwired** | `activity/index.ts` | None | Cross-session agent activity indexing unwired. |
| `blob-broker` | 27 | **CLI-Only / N/A** | `blob-broker/broker.ts` | None | Background daemon for external image broker; fork uses in-process `BlobStore`. |
| `cli` & `commands` | 122 | **CLI-Only / N/A** | `cli/*.ts`, `commands/*.ts` | None | Terminal CLI entrypoints and TUI flags; OhPiChamber uses GUI/RPC. |
| `markit` | 5 | **CLI-Only / N/A** | `markit/index.ts` | `ui/.../MarkdownRenderer.tsx` | Terminal ANSI formatter; OhPiChamber uses React Markdown. |
| `stream` | 12 | **CLI-Only / N/A** | `stream/console-tui.ts` | None | Terminal VT100 animation player; not applicable to React web DOM. |
| `subprocess` | 9 | **CLI-Only / N/A** | `subprocess/parent-watchdog.ts` | `agent-service/src/supervisor/workers.ts` | CLI watchdog processes; OhPiChamber uses its own Worker Supervisor. |

### 5.2 `@oh-my-pi/pi-ai` (8 Subsystems)

| Capability / Subsystem | Status in OhPiChamber | Vendor Path (`vendor/omp/650f3a10/packages/ai/src/`) | Current Fork Path (`packages/`) | M6 Disposition & Action |
|---|---|---|---|---|
| Providers (Anthropic, OpenAI, Gemini, Ollama, DeepSeek, etc.) | **Fully Wired** | `providers/*.ts`, `api-registry.ts` | `agent-service/src/worker/catalog-models.ts` | Complete. Native model registry and custom endpoints operational. |
| OAuth Flows (Google, Anthropic, GitHub) | **Fully Wired** | `auth/*.ts`, `auth-storage.ts` | `agent-service/src/worker/provider-oauth.ts` | Complete. Browser OAuth callback and credential storage active. |
| Dialect Formatters (Tool Calling, Reasoning) | **Fully Wired** | `dialect/*.ts` | `agent-service/src/worker/completion.ts` | Complete. Adapting streaming tokens and reasoning blocks active. |
| Token & Pricing Aggregation | **Fully Wired** | `usage.ts`, `usage/*.ts` | `agent-service/src/worker/usage.ts` | Complete. Token usage schemas fully wired. |
| Multimodal Images | **Fully Wired** | `images/*.ts` | `agent-contract/src/prompt.ts` | Complete. Base64 and attachment image ingestion active. |
| Audio/Video Target Extraction | **Partially Wired** | `video/*.ts`, `speech/*.ts` | `agent-service/src/worker/native-policy-descriptor.ts` | Video frame slice paths parsed; direct audio/video streaming unwired. |
| `auth-broker` & `auth-gateway` | **CLI-Only / N/A** | `auth-broker/*.ts`, `auth-gateway/*.ts` | None | Enterprise token brokering is CLI-only. |
| `judgment` & Model Grading | **Unwired** | `judgment/*.ts` | None | Automated evaluation models grading responses are unwired. |

### 5.3 `@oh-my-pi/omp-stats` (4 Subsystems)

| Capability / Subsystem | Status in OhPiChamber | Vendor Path (`vendor/omp/650f3a10/packages/stats/src/`) | Current Fork Path (`packages/`) | M6 Disposition & Action |
|---|---|---|---|---|
| SQLite Analytics Storage (`stats.db`) | **Unwired** | `db.ts`, `chunked-insert.ts` | `agent-service/package.json` (present, unused) | **Priority 4**: Cut over `usage.ts` from raw JSONL parsing to `StatsDatabase`. |
| Developer Time & Gain Rollup | **Unwired** | `gain-aggregator.ts`, `rollup.ts` | None | Expose time saved and speedup factors in `UsageStatsView.tsx`. |
| Frustration & Sentiment Metrics | **Unwired** | `frustration.ts`, `user-metrics.ts` | None | Interaction retry frequency and user interruption metrics unwired. |
| Standalone Stats Server | **CLI-Only / N/A** | `server.ts` | `packages/ui/.../UsageStatsView.tsx` | OMP standalone web server; fork uses native React usage view. |

### 5.4 Other Pinned Packages (10 Packages)

| Package | Status in OhPiChamber | Vendor Path | Current Fork Path | M6 Disposition & Action |
|---|---|---|---|---|
| `@oh-my-pi/pi-agent-core` | **Fully Wired** | `packages/agent/src/*` | `agent-service/src/worker/session.ts` | Complete. `AgentMessage`, `Tokenizer`, and core loops fully used. |
| `@oh-my-pi/pi-catalog` | **Fully Wired** | `packages/catalog/src/*` | `agent-service/src/worker/catalog-models.ts` | Complete. Bundled model definitions and pricing registries fully used. |
| `@oh-my-pi/pi-natives` + leaves | **Fully Wired** | `packages/natives/*` | `agent-service/src/worker/shell.ts` | Complete. C++ AST inspection and PTY pipe streaming fully used. |
| `@oh-my-pi/pi-utils` | **Fully Wired** | `packages/utils/src/*` | Throughout `agent-service` | Complete. Core file locks, atomic replacement, and path utilities used. |
| `@oh-my-pi/snapcompact` | **Fully Wired** | `packages/snapcompact/src/*` | `agent-service/src/worker/session.ts` | Complete. Semantic compaction algorithms fully wired. |
| `@oh-my-pi/omptype` | **Fully Wired** | `packages/omptype/src/*` | `agent-service/` | Complete. TypeScript schemas fully utilized. |
| `@oh-my-pi/pi-tui` | **Partially Wired / CLI-Only** | `packages/tui/src/*` | `agent-service/src/worker/interaction.ts` | Shared utilities wired; terminal UI components N/A. |
| `@oh-my-pi/pi-mnemopi` | **Unwired** | `packages/mnemopi/src/*` | None | Standalone vector embedding daemon unwired. |
| `@oh-my-pi/pi-wire` | **CLI-Only / N/A** | `packages/wire/src/*` | None | Low-level IPC framing; OhPiChamber uses Canonical JSON-RPC. |

---

## 6. Priorities & M6 Task Breakdown

Based on this audit, four focused implementation tasks are recommended for Phase 3:

### Task 1: Native Idle Recap & Compaction Pipeline
* **Target Files:** `packages/agent-service/src/worker/session.ts`, `packages/agent-contract/src/events.ts`, `packages/ui/src/components/chat/SessionRecapSpacer.tsx`, `packages/ui/src/hooks/useSessionAssist.ts`.
* **Deliverable:**
  - Wire `IdleMaintenance` in `WorkerSession`, populating `history.db` (`session_recaps`) and emitting `session.recap`.
  - Update `SessionRecapNote` to render immediately upon receiving `session.recap`.
  - Forward rich `CompactionDivider` metrics (`method`, `tokensAfter`, `summary`).
  - Deprecate ad-hoc `small-model` session-assist watcher in `packages/web/server/lib/session-assist/`.

### Task 2: Agent Hub Swarm Dashboard & Lineage Persistence
* **Target Files:** `packages/agent-service/src/worker/session.ts`, `packages/agent-contract/src/session.ts`, `packages/ui/src/components/chat/AgentHubModal.tsx`, `packages/ui/src/components/chat/SubagentHudTray.tsx`.
* **Deliverable:**
  - Call `registerPersistedSubagents` during session bootstrap so historical subagents survive UI reloads.
  - Implement `subagent.revive` operation in `WorkerSession` via `AgentLifecycleManager`.
  - Expose `GET /sessions/:id/subagents/:subagentId/transcript` via `agentTranscriptSource`.
  - Expose tree cost aggregation via `sumSubagentTreeCost`.
  - Build `AgentHubModal.tsx` in `packages/ui` for full swarm inspection and transcript review.

### Task 3: Plugin Marketplace Full-Lifecycle Un-truncation
* **Target Files:** `packages/agent-contract/src/plugins.ts`, `packages/agent-service/src/worker/catalog-plugins.ts`, `packages/ui/src/components/sections/plugins/PluginsPage.tsx`, `packages/ui/src/components/sections/plugins/AddPluginDialog.tsx`.
* **Deliverable:**
  - Expand `MarketplaceEntrySchema` with rich details (author, homepage, license, keywords, tools).
  - Expose `addMarketplace`, `removeMarketplace`, `listMarketplaces`, `checkForUpdates`, and `upgradeAllPlugins` in `catalog-plugins.ts`.
  - Add `Marketplace` browsing tab to `AddPluginDialog.tsx`.
  - Add "Check for Updates" and "Update Available" badges to `PluginsGrid.tsx`.
  - Overhaul `PluginsPage.tsx` layout to strictly comply with `PATTERNS.md` and `STYLING.md`.

### Task 4: Analytics Engine Cutover (`@oh-my-pi/omp-stats`)
* **Target Files:** `packages/agent-service/src/worker/usage.ts`, `packages/agent-contract/src/usage.ts`, `packages/ui/src/components/views/usage/UsageStatsView.tsx`.
* **Deliverable:**
  - Replace raw JSONL disk scanning in `usage.ts` with direct queries to `@oh-my-pi/omp-stats`'s `StatsDatabase` SQLite index (`stats.db`).
  - Populate stats incrementally on `agent_end` turn settlement.
  - Expose developer time savings and efficiency rollups in `UsageStatsView.tsx`.

---

## 7. Explicit Decisions on CLI-Only & Non-Applicable Capabilities

The following capabilities from `vendor/omp/650f3a10` are intentionally excluded from OhPiChamber's GUI/Host roadmap with explicit rationales:

1. **`blob-broker/` (External Media Daemon):**
   - *Rationale:* OMP's CLI spawns an external background daemon to broker local image uploads across terminal sessions. OhPiChamber's Electron/Web architecture already incorporates an in-process, scoped `BlobStore` (`packages/agent-service/src/session/blob-store.ts`) and Host static asset handler.
2. **`stream/console-tui.ts` & `stream/player.ts` (VT100 Console Player):**
   - *Rationale:* VT100 terminal escape sequence recording and frame-by-frame paint encoding are designed strictly for terminal emulators. OhPiChamber renders native React DOM timelines.
3. **`markit/` (Terminal Markdown ANSI Formatter):**
   - *Rationale:* ANSI escape token styling is redundant in a browser/Electron environment where React-Markdown and Tailwind typography are standard.
4. **`subprocess/parent-watchdog.ts` (CLI Parent Process Watchdogs):**
   - *Rationale:* CLI terminal watchdogs ensure subprocesses exit when a shell session is killed abruptly. OhPiChamber uses its own supervised lifecycle manager (`packages/web/server/lib/host/agent-service-supervisor.js`).
5. **`auth-broker` & `auth-gateway` CLI stdio mode:**
   - *Rationale:* Enterprise terminal stdio token brokering is replaced by OhPiChamber's Host Gateway and Canonical API session token management.
