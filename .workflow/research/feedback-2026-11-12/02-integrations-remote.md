Items 2, 6 and 8 have three separate causes. Items 6 and 8 are both regressions from the v2.7.0 merge (`0e72ffbff`, `8327e6403`). Item 2 is independent. I edited nothing and ran nothing.

## Item 2: marketplace install

**Observed.** Installing Figma shows the toast "无法安装 Figma – MCP runtime application failed; the prior catalog is retained." (#2). The Figma detail page still says 已安装, with an OAuth "等待登录完成" panel and an MCP server row (#3). Settings → MCP shows "还没有 MCP 服务器" (#4).

**Root cause.** Three defects stack on top of each other (all verified by reading code):

1. **Persist is not undone when apply fails.**
   - `configureMcpNow` commits the new revision first, then applies it (`agent-service/src/supervisor/catalog.ts:406-420`).
   - Apply throws a 503 `MCP_APPLY_FAILED` when a worker fails (`catalog.ts:466`). There is no rollback.
   - On disk, the iso fork profile's `data/agent-state/catalog-state.json` holds `figma` at revision 3. The workspace's `.omp/mcp.json` (`chats/2026-11-10/session-d872…`) holds it too.
   - The UI store publishes `result.configuration` even on failure (`ui/src/stores/useMcpConfigStore.ts:86-96`).
   - "Installed" is derived only from that persisted list: `installedMcp` at `ui/src/components/views/IntegrationsCatalogView.tsx:278-281`, `isMcpInstalled` at 302-303, `isEntryInstalled` at 324-325.
   - So the failure toast is shown, but the detail page reads "installed" with nothing running.
   - Retrying hits `if (isMcpInstalled(entry)) continue;` (line 454), `failed` stays false, and the user gets `toast.success` (lines 523-524) with nothing applied. That is the "fake install".

2. **Figma can never apply before sign-in.**
   - The catalog entry is `auth: 'oauth'` (`registry.ts:291`).
   - `WorkerMcp.apply` stages every enabled server (`agent-service/src/worker/mcp.ts:365-371`). `#stage` throws on any failed handshake (`mcp.ts:770-778`). An unauthenticated OAuth server returns a bare 401, so apply always fails.
   - The UI already expects this: line 487 says "a failed connect is expected for an OAuth server". But `createMcp` returns `ok:false` first, so `installEntry` sets `failed` and skips `setSelectedId` (lines 465-469, 491).
   - [INFERENCE] The 401 reason itself is not confirmed. I did not run an MCP handshake, and the cause is not logged.

3. **The real cause is discarded.**
   - `Promise.allSettled` rejections are dropped (`mcp.ts:369-371`). The `catch {}` at `mcp.ts:776-778` rethrows a fixed message.
   - The installed fork's `profile/logs/main.log` has no MCP line at all, so the actual failure is unrecoverable from logs.

**Why Settings → MCP is empty.** Different workspaces.
   - The catalog reads and writes `useDirectoryStore.currentDirectory` (`IntegrationsCatalogView.tsx:205`, `createMcp` called without a directory at line 457). For a no-project chat that is the per-chat folder `chats/<date>/session-<uuid>`.
   - `McpGrid` and `McpPage` use `useSettingsDirectory()` instead: the settings project, else the active project, else the chats root (`ui/src/hooks/useSettingsDirectory.ts:21-35`, `McpGrid.tsx:73`).
   - Config is per workspace at `join(cwd,'.omp','mcp.json')` (`supervisor/service.ts:247`, `sessions/registry.ts:986`). Of the five workspaces in `catalog-state.json`, only `ws_fdf82dc7…` (the Nov 10 chat dir) has `figma`.
   - `~/.omp/agent/mcp.json` has no `mcpServers`.
   - Even with the page fixed, a new chat gets a new workspace without the server.

**Class.** "Persisted state treated as authoritative state" (the repo's Correctness Invariants), plus two scopes that disagree. Skills and plugin installs are probably not affected by the swallowed cause; I did not check them.

**Fix shape.**
- **Install outcome:** keep the persisted server, but classify the result.
  - OAuth component with apply failure: "saved, sign-in required". Select the detail page, show no error toast.
  - Other components with apply failure: show the real reason and a retry, or roll back with `deleteMcp`. I recommend an explicit "saved, not connected" state over rollback.
  - Remove the success toast on the already-installed `continue` path.
- **Installed marker:** show "installed" on the detail page only when the server is applied or awaiting auth. `IntegrationsCatalogView.tsx:358-369` already reads runtime status for the card pill, so reuse it.
- **Cause:** keep each rejection's `NativeMcpError` code and detail through `mcp.ts:369-371` and `776-778` into `#failed`. Then the toast can say "authorization required (401)" or whatever actually happened.
- **Scope (your decision):**
  - (a) User scope, `~/.omp/agent/mcp.json`. It is what an installed integration means, it is shared with the TUI, and it needs a contract and service change. I recommend this.
  - (b) Project scope with the catalog pinned to `useSettingsDirectory()`. Small change, but chat-dir installs stay invisible to other chats.
  - (c) Catalog uses `currentDirectory` and Settings → MCP shows that same directory. Matches today's behavior and fixes only the empty list.

## Item 6: error toast on opening Integrations

**Observed.** There is no screenshot for it. Nothing else on the page toasts on mount.

**Root cause.** Verified by reading code.
- `GuestIntegrationsSection` runs `refreshChannels()` on mount and on every guest change (`GuestIntegrationsSection.tsx:458-478`). That calls `loadNotificationChannels()`, which does `runtimeFetch('/api/notifications/channels')` and returns `null` if `!response.ok` (`ui/src/lib/notifications/channels.ts:81-89`). A `null` triggers `toast.error('settings.integrations.channels.toast.loadFailed')` once per mount (`GuestIntegrationsSection.tsx:461-465`; `channelsLoadFailedRef` is reset on each mount).
- The server never registers that route in the fork. `registerNotificationChannelRoutes` is defined in `web/server/lib/notifications/channel-routes.js:18` and has no caller.
- Upstream registers it at `opencode/feature-routes-runtime.js:869-875`, builds the store at `index.js:1032-1040`, wires `deliverToExtensionChannels` at `index.js:1061`, and passes it at `index.js:3058` (all at `bc50ba56a`).
- The fork has no `extensionNotificationChannels` anywhere. `notifications/runtime.js:25` still accepts `deliverToExtensionChannels`, but nothing supplies it.
- [INFERENCE] I did not capture the 404. This follows from the grep results.

**Class.** Instance of a wider pattern: the v2.7.0 merge kept the UI and module files but not the host wiring. In `bc50ba56a`, `feature-routes-runtime.js` builds `extensionTrackers` (line 800) and `extensionQuotaProviders` (line 815) as well. In the fork, `extensionTrackers`, `extensionQuotaProviders` and `extensionNotificationChannels` are absent from `packages/web/server` (grep), so extension trackers, quota providers and notification channels are unwired. Only `extensionSourceControlProviders` survives (`host/feature-routes-runtime.js:571`). The Integrations page may hit more of this.

**Fix shape.** Port the upstream wiring into `host/feature-routes-runtime.js` and `index.js`: build the channels store, register the routes, reconcile on guest activation, and wire `deliverToExtensionChannels`. Do the same for trackers and quota, or confirm they are intentionally dropped. Separately, make the UI quiet when a channel capability is not served, as trackers already do with `getRegisteredRuntimeAPIs()?.trackers` (`IntegrationsPage.tsx:32`). Toast only on real failures, not on mount. Decision for you: wire the Guest SDK notification path (recommended, since the SDK is retained), or remove the channels call and UI.

## Item 8: local machine listed as a remote device

**Observed.** Under "连接到此服务器", #15 shows "OpenChamber Desktop · 此设备 · 已连接 · 局域网" with a 撤销 button.

**Root cause.** Two layers, both verified.
1. **The filter was lost in the v2.7.0 merge.**
   - Commit `d6a1ae73c` (Nov 7) added `pairedDevices = remoteClients.filter(c => c.clientKind !== 'desktop-local')`. The workflow note `.workflow/done/ux-and-omp-parity-remediation/08-…md` and W15 in `specs/ux-and-omp-parity-remediation.md` claim it as done.
   - Commit `0e72ffbff` ("upstream wins … Remote instances") replaced the whole file. HEAD has no `pairedDevices`. `RemoteInstancesPage.tsx:552` (`revokedClientCount`), `:906-925` (load) and `:1606-1607` (empty check) use raw `remoteClients`. `:1627-1679` renders every record, including the `desktop-local` "此设备" badge at `:1666-1669`.
   - The server list route returns all records to a `desktop-local` caller (`web/server/lib/host/core-routes.js:791-805`).
2. **The fork always creates the record; upstream mostly does not.**
   - The fork's `packages/electron/main.mjs` adds `ensurePackagedLocalRuntimeAuth` (about lines 2897-2918, from commit `24f1012c1`, task 55). It calls `ensureDesktopLocalClientToken` (`packages/electron/desktop-local-auth.mjs:33-63`) on every packaged local window. That POSTs `{label:'OpenChamber Desktop', clientKind:'desktop-local', dedupeKey:'desktop-local'}`, so the record exists even on a passwordless host.
   - Upstream has no such function. I diffed `main.mjs` against `bc50ba56a`. Its page code at `:1627` is identical, so upstream would show the same row if a record existed. It only creates `desktop-local` in the password-login path (`loginRemoteAndIssueClientToken`, `main.mjs:1879-1881`).
   - That is why upstream looks clean here and the fork does not.

**Side hazard.** 撤销 on that row runs the self-revoke path (`RemoteInstancesPage.tsx:1089-1103`): it nulls the desktop's own token and switches the runtime endpoint. The "此设备" row is therefore also a lock-out button.

**Fix shape.**
- Smallest fix: restore `pairedDevices` from `d6a1ae73c`, and use it for the render, the empty check and `revokedClientCount`.
- Add a unit or render test for W15. The earlier fix had none that survived the merge.
- Alternative: filter server-side, so the list route omits `desktop-local` unless the caller asks for it. That also covers other clients, but it changes the route contract. I recommend the UI filter now.
- Do not remove the minting; the packaged UI at `openchamber-ui://` depends on it (task 55).

## Do they share a cause?

Items 6 and 8 share a process cause: v2.7.0 merge resolution kept upstream UI but dropped host wiring (6) or overwrote a fork delta (8). Item 2 is separate; it is the persist-then-apply design plus a scope mismatch.

## Checks to run after fixes

- `bun run --cwd packages/ui test`
- `bun run --cwd packages/ui type-check`
- `vitest run packages/web/server/lib/host/core-routes.test.js`
- Agent-service worker MCP tests
- `bunx oxlint <changed paths>`
- Real-path run: install Figma on a fresh HOME under `xvfb`. Watch both the toast and Settings → MCP.