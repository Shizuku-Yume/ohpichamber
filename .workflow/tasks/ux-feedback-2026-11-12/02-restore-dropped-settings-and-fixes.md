# 02: Restore dropped settings and overwritten fork fixes

**Effort:** ux-feedback-2026-11-12
**Task type:** bugfix
**Blocked by:** 01
**Covers:** W1, W3
**Files:** `packages/ui/src/stores/{useUIStore,useQuotaStore}.ts`; `packages/ui/src/lib/settings/{registry,search}.ts`; `packages/web/server/lib/host/{settings-helpers.js,settings-registry.json}`; `packages/ui/src/components/sections/openchamber/GeneralWorkspaceSettings.tsx`; `packages/ui/src/components/views/TerminalView.tsx`; `packages/ui/src/lib/terminalTabClose.ts`; `packages/ui/src/components/layout/SessionTabsStrip.tsx`; `packages/ui/src/components/sections/remote-instances/RemoteInstancesPage.tsx`; `packages/ui/src/lib/quota/fetchQuota.ts`; `packages/ui/src/components/**/usageGroups.ts`; `packages/ui/src/lib/quota/usageHeadline.ts`; `packages/ui/src/components/chat/message/ChatQuoteHighlightLayer.tsx`; `packages/ui/src/apps/MobileWorkspaceDrawer.tsx`; `packages/ui/src/components/views/usage/usageStatsStore.ts`; the providers custom-logo control and setter
**Read first:** audit `audit-merge.tsv` rows of class `overwritten-fix`, `settings-*` with severity P1, plus the 13 P1 `orphan-locale` keys; `research/feedback-2026-11-12/03-11-settings-parity.md` (item 4), `07-usage.md` section 5 (item #14), `02-integrations-remote.md` (item 8); commits `d6a1ae73c`, `542b6a76a`, `b1cdbbb0a`, `e6312a9b4`; skills `sync-state-invariants`, `locale-ui-patterns`
**Check:** `node scripts/upstream-gaps.mjs --check` exits 0 with no `pending 02` rows; `bun test` for the touched UI tests exits 0, including new regression tests for the paired-devices filter, quota `workspaceId` scoping, the quote-highlight frame retry, the mobile drawer's last-tab close and the usage refresh race guard. Real path (Web and packaged Electron, isolated data dir): toggling "Close the tab when the shell exits" closes an exited shell tab; per-workspace session tabs switch with the workspace; Remote instances does not list this device; the chat work-status usage shows only configured providers, and stopping the Host's quota route yields one error line, not one row per provider.

- [ ] Restore `terminalCloseOnExit` end to end: store field and setter, persist, registry, server sanitizer and registry JSON, `TerminalView` exit branch adapted to `lib/terminalTabClose.ts`, the settings row, and the search entry.
- [ ] Restore the `sessionTabsPerWorkspace` setter and control.
- [ ] Restore the custom provider logo control and `setCustomProviderLogo`, using task 01's routes.
- [ ] Restore the `pairedDevices` filter and use it for the list, the empty state and `revokedClientCount`.
- [ ] Restore quota workspace scope: `workspaceId` on every quota request, store keyed by workspace and reloaded on workspace change. A failed provider-list read sets one error state and no longer fans out to every provider. Rows for providers not known to be configured are dropped. `QUOTA_PROVIDER_ALIASES` is replaced by the native-to-logical mapping the Host returns.
- [ ] Restore the quote-highlight `ROW_MOUNT_FRAMES` retry, the mobile drawer `onLastTabClosed` terminal unmount and the usage stats `windowMoved` race guard.
- [ ] Restore controls for `showExpandedBashTools`, `showExpandedEditTools` and `persistChatDraft` where upstream has them; otherwise delete the consumer and record why.
