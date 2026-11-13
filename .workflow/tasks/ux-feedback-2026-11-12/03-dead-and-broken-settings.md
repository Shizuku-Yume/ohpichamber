# 03: Delete or wire dead and broken settings, and make the effect test trace runtime use

**Effort:** ux-feedback-2026-11-12
**Task type:** bugfix
**Blocked by:** 02
**Covers:** W1, W6, W7
**Files:** settings effect test (from `ux-v270-omp-alignment` R5); `packages/ui/src/lib/settings/{registry,search}.ts`; `packages/web/server/lib/host/{settings-helpers.js,settings-registry.json,settings-normalization-runtime.js}`; `packages/ui/src/components/sections/openchamber/{DefaultsSettings,GeneralWorkspaceSettings,SessionWorkSettings,PermissionDefaultModeField}.tsx`; `packages/ui/src/components/sections/projects/ProjectGeneralTab.tsx`; `packages/ui/src/stores/{useConfigStore,useProjectsStore,useUIStore}.ts`; `packages/ui/src/lib/{defaultSendSelection,guests/start-session}.ts`; `packages/ui/src/components/chat/ModelControls.tsx`; `packages/ui/src/sync/session-ui-store.ts`; `packages/web/server/lib/limit-failover/` (delete); `packages/web/server/lib/session-knowledge/`; `packages/web/server/lib/ui-blocks-guidance.js`
**Read first:** `audit-settings-shells.md` (broken, dead, half-present lists and "Cross-Part Reconciliations"); `research/feedback-2026-11-12/12-omp-settings-and-shells.md` (c); `decisions.md` 2026-10-25 "Replace root agent selection with session modes" and 2026-11-12 "A dead settings row is deleted, not kept for later"; skills `sync-state-invariants`, `openchamber-change-discipline`
**Check:** the settings effect test fails on `main` for `messageStreamTransport` and `sessionWorkKeepInGroup` and passes after; `node scripts/upstream-gaps.mjs --check` exits 0 with no `pending 03` rows; touched UI and web tests exit 0. Real path (Web): a project whose metadata carries an old `defaultAgent` sends a prompt successfully; the session-work "keep in group" control changes the sidebar.

- [ ] The settings effect test traces each registry key to a runtime consumer other than its own store, settings page and sanitizer. Keys without one fail.
- [ ] Remove the root default agent everywhere: the Sessions control, the project-level default agent, `defaultAgent` in the registry, server and normalization, `settingsDefaultAgent`, and the send-path consumers. A stored value is ignored on read and dropped on the next write.
- [ ] Wire `sessionWorkKeepInGroup` to the sidebar's grouping, or merge it into `keepWorkInPlace` so one key remains.
- [ ] Delete `messageStreamTransport` (control, store, registry, sanitizer, search, locale keys) and the residue of `savePastedImagesAsFiles`.
- [ ] Delete the unused `limit-failover` module, the dead session-guidance gates (`isSessionLinkingAvailable`, `isPageRenderingAvailable`, `isWorkflowAvailable` and `ui-blocks-guidance.js`).
- [ ] `permissionDefaultMode` stays the one approval-mode owner: it writes OMP `tools.approvalMode` only as decision 2026-11-13 allows (never forcing `yolo`), or the OMP key stays classified `owned-by` with that behavior documented.
