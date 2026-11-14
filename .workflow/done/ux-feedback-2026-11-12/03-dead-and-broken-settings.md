# 03: Delete or wire dead and broken settings, and make the effect test trace runtime use

**Effort:** ux-feedback-2026-11-12
**Task type:** bugfix
**Blocked by:** 02
**Covers:** W1, W6, W7
**Files:** settings effect test (from `ux-v270-omp-alignment` R5); `packages/ui/src/lib/settings/{registry,search}.ts`; `packages/web/server/lib/host/{settings-helpers.js,settings-registry.json,settings-normalization-runtime.js}`; `packages/ui/src/components/sections/openchamber/{DefaultsSettings,GeneralWorkspaceSettings,SessionWorkSettings,PermissionDefaultModeField}.tsx`; `packages/ui/src/components/sections/projects/ProjectGeneralTab.tsx`; `packages/ui/src/stores/{useConfigStore,useProjectsStore,useUIStore}.ts`; `packages/ui/src/lib/{defaultSendSelection,guests/start-session}.ts`; `packages/ui/src/components/chat/ModelControls.tsx`; `packages/ui/src/sync/session-ui-store.ts`; `packages/web/server/lib/limit-failover/` (delete); `packages/web/server/lib/session-knowledge/`; `packages/web/server/lib/ui-blocks-guidance.js`
**Read first:** `audit-settings-shells.md` (broken, dead, half-present lists and "Cross-Part Reconciliations"); `research/feedback-2026-11-12/12-omp-settings-and-shells.md` (c); `decisions.md` 2026-10-25 "Replace root agent selection with session modes" and 2026-11-12 "A dead settings row is deleted, not kept for later"; skills `sync-state-invariants`, `openchamber-change-discipline`
**Check:** the settings effect test fails on `main` for `messageStreamTransport` and `sessionWorkKeepInGroup` and passes after; `node scripts/upstream-gaps.mjs --check` exits 0 with no `pending 03` rows; touched UI and web tests exit 0. Real path (Web): a project whose metadata carries an old `defaultAgent` sends a prompt successfully; the session-work "keep in group" control changes the sidebar.
**Base commit:** c0dfc693b486dbb0a9cfa7994583fbb9e7659ca6

- [x] The settings effect test traces each registry key to a runtime consumer other than its own store, settings page and sanitizer. Keys without one fail.
- [x] Remove the root default agent everywhere: the Sessions control, the project-level default agent, `defaultAgent` in the registry, server and normalization, `settingsDefaultAgent`, and the send-path consumers. A stored value is ignored on read and dropped on the next write.
- [x] Wire `sessionWorkKeepInGroup` to the sidebar's grouping, or merge it into `keepWorkInPlace` so one key remains.
- [x] Delete `messageStreamTransport` (control, store, registry, sanitizer, search, locale keys) and the residue of `savePastedImagesAsFiles`.
- [x] Delete the unused `limit-failover` module, the dead session-guidance gates (`isSessionLinkingAvailable`, `isPageRenderingAvailable`, `isWorkflowAvailable` and `ui-blocks-guidance.js`).
- [x] `permissionDefaultMode` stays the one approval-mode owner: it writes OMP `tools.approvalMode` only as decision 2026-11-13 allows (never forcing `yolo`), or the OMP key stays classified `owned-by` with that behavior documented.

## Progress

- Traced registry effect test in `packages/ui/src/lib/settings/registry.test.ts` to assert that every key has at least one runtime consumer outside plumbing, stores, and settings editor pages (`packages/ui/src/components/sections/` and `SettingsView.tsx`).
- Deleted root and project-level `defaultAgent` across DefaultsSettings, ProjectGeneralTab, useProjectIdentityForm, useProjectsStore, useConfigStore, registry.ts, settings-helpers.js, settings-normalization-runtime.js, ModelControls.tsx, defaultSendSelection.ts, start-session.ts, memoryTidy.ts, and worktreeSessionCreator.ts. On read, any legacy `defaultAgent` is dropped/ignored, and on next write it is deleted.
- Merged `sessionWorkKeepInGroup` into `keepWorkInPlace` / `sidebarKeepWorkInPlace`. Backwards compatibility maps legacy `sessionWorkKeepInGroup` to `sidebarKeepWorkInPlace` on read and purges the old key on write.
- Deleted `messageStreamTransport` (control in GeneralWorkspaceSettings.tsx, useConfigStore state, registry entry, sanitizer, search entry, and i18n keys across all 15 locales) and removed the residue of `savePastedImagesAsFiles`.
- Deleted unused `packages/web/server/lib/limit-failover/` module, deleted `packages/web/server/lib/session-knowledge/ui-blocks-guidance.js`, `generate-guidance.ts`, `guidanceModule.ts`, and updated tool envelopes to maintain direct tool access without dead guidance gates.
- Verified `permissionDefaultMode` is the single approval mode owner.
Review: pass (reviewer subagent ufb-03.Task03CodeReview; 3 findings resolved)
- Setting editor pages in packages/ui/src/components/sections/ and SettingsView.tsx are excluded across all registry keys in registry.test.ts so that settings only editing themselves fail.
- Legacy retired settings (defaultAgent, sessionWorkKeepInGroup, messageStreamTransport, savePastedImagesAsFiles) are explicitly purged on subsequent writes in mergePersistedSettings and instancePartOf.
- Replaced prohibited chained assertion in useProjectsStore.test.ts with typed inferred fixture.
All findings addressed and verified.

Check before:
- Settings effect test failed on `main` for `messageStreamTransport` and `sessionWorkKeepInGroup`.

Check after:
- Settings effect test in `packages/ui/src/lib/settings/registry.test.ts`: 25 pass, 0 fail.
- `node scripts/upstream-gaps.mjs --check`: 0 unallowlisted gaps, exits 0.
- Touched UI tests: 148 pass, 0 fail across 9 test files.
- Touched web host tests: 80 pass, 0 fail across 2 test files.
- Real path (Web, port 4103):
  - Verified with isolated OPENCHAMBER_DATA_DIR (/tmp/ufb03-realpath/data) and isolated HOME.
  - Project initialized with legacy `defaultAgent` loaded, ignored `defaultAgent`, and successfully submitted a prompt without admission error (`01-project-old-default-agent-prompt.png`).
  - Session-work "keep in group" setting toggled `sidebarKeepWorkInPlace` in settings and updated UI (`02-session-work-keep-in-group-setting.png`, `03-sidebar-after-keep-in-group-toggled.png`).
  - Evidence saved to `/home/shizuku/Project/ohpichamber-omp-artifacts/ux-feedback-2026-11-13/task03/`.
