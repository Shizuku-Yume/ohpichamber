# 03: Retire BehaviorPage response-style injection, dead Code Mode toggle, and Host permission auto-accept

**Effort:** m4-orchestration
**Task type:** refactor
**Blocked by:** 02
**Files:** `packages/ui/src/components/chat/ChatInput.tsx`, `packages/ui/src/components/sections/behavior/BehaviorPage.tsx`, `packages/ui/src/lib/responseStyle.ts`, `packages/ui/src/components/sections/openchamber/OpenChamberToolsSettings.tsx`, `packages/ui/src/stores/useUIStore.ts`, `packages/ui/src/components/views/SettingsView.tsx`, `packages/web/server/lib/permission-auto-accept/`, `packages/web/server/lib/notifications/runtime.js`, `packages/web/server/index.js`, `packages/web/server/lib/host/settings-helpers.js`, `packages/web/server/lib/host/settings-registry.json`, `packages/ui/src/lib/settings/registry.ts`
**Read first:** `.workflow/specs/m4-orchestration.md`; `.workflow/decisions.md` (2026-11-05 - Retire BehaviorPage response-style injection, dead Code Mode toggle, and Host permission auto-accept)
**Covers:** W4
**Check:** `bun run type-check` and `bun test packages/ui/src/components/views/SettingsView.test.tsx` and `bunx vitest run server/lib/notifications server/lib/host/settings-helpers.test.js` in `packages/web` exit 0.
- **Base commit:** 49c58b1ca0adf66cc04876bf1946d932274412b5

- [x] First-message `<system-reminder>` response-style injection is removed from `ChatInput.tsx`, and `BehaviorPage.tsx`, `responseStyle.ts`, and the `'behavior'` settings navigation item are deleted.
- [x] The unused `agentToolsCodeMode` ("Run through code mode") setting and checkbox are removed from `OpenChamberToolsSettings.tsx`, `useUIStore.ts`, and the settings registry.
- [x] `packages/web/server/lib/permission-auto-accept/` and `permissionDefaultMode` / `permissionAutoAccept` settings and UI controls are removed, leaving OMP's `tools.approvalMode`, ACP session permissions, and the Host Gatekeeper as the single permission authority.

## Progress

- **Check before:**
  - `bun run type-check`: 0 type errors across 3,209 files in 5 projects.
  - `packages/ui/src/components/views/SettingsView.test.tsx`: Did not exist yet.
  - `bunx vitest run server/lib/notifications server/lib/host/settings-helpers.test.js` in `packages/web`: 13 test files passed, 126 tests passed.
  - Baseline defects confirmed:
    - `ChatInput.tsx` imports `shouldAddResponseStyle` and `wrapSystemReminder` from `@/lib/responseStyle`, injecting response-style system reminders into the first message of a session.
    - `packages/ui/src/components/sections/behavior/BehaviorPage.tsx` and `packages/ui/src/lib/responseStyle.ts` exist, and `'behavior'` is an item in `SettingsView.tsx` navigation.
    - `OpenChamberToolsSettings.tsx`, `useUIStore.ts`, and settings registry expose dead `agentToolsCodeMode` toggle.
    - `packages/web/server/lib/permission-auto-accept/` exists and is wired into `packages/web/server/index.js`, `notifications/runtime.js`, and host settings (`permissionDefaultMode`, `permissionAutoAccept`).
- **Work:**
  - `ChatInput.tsx`: Removed first-message `<system-reminder>` response style prompt injection block (`shouldAddResponseStyle`), unused `fetchResponseStyleInstruction` and `wrapSystemReminder` imports, now-unused `hasUserMessages` helper, and unused `getSyncMessages` import. Preserved adjacent composer controls owned by Window B.
  - `packages/ui/src/lib/responseStyle.ts`, `packages/ui/src/components/sections/behavior/BehaviorPage.tsx`, and `BehaviorPage.test.tsx`: Deleted.
  - `packages/ui/src/lib/systemReminder.ts`: Deleted since response-style injection was its sole consumer.
  - `SettingsView.tsx`, `MobileApp.tsx`, `metadata.ts`, `pageTitle.ts`, `search.ts`: Removed `'behavior'` navigation item, slug, route case, search entry, and page title.
  - `SettingsView.test.tsx`: Added focused view tests asserting that `'behavior'` is excluded from settings navigation and that OMP/Agents/Commands/MCP pages are present.
  - `OpenChamberToolsSettings.tsx`: Removed `agentToolsCodeMode` setting, checkbox row, handler, and unused `SettingsCheckboxRow` import.
  - `useUIStore.ts`: Removed `agentToolsCodeMode` and `permissionDefaultMode` fields, action setters, and persistence keys.
  - `registry.ts`: Removed `agentToolsCodeMode`, `permissionDefaultMode`, `permissionAutoAccept`, and `responseStyle*` settings fields.
  - `packages/web/server/lib/permission-auto-accept/`: Deleted directory (`DOCUMENTATION.md`, `modes.js`, `runtime.js`, `runtime.test.js`).
  - `worker-operation-authorizer.js`: Extracted Host-owned `PERMISSION_PRESET_IDS` ('ask', 'safety', 'auto') and `isPermissionPresetId` validator; updated `worker-operation-authorizer.test.js` and `DOCUMENTATION.md`.
  - `settings-helpers.js`, `settings-helpers.test.js`, `settings-registry.json`: Removed `permissionAutoAccept`, `permissionDefaultMode`, `agentToolsCodeMode`, and `responseStyle*` settings sanitizers and fixtures.
  - `index.js`, `feature-routes-runtime.js`, `core-routes.js`, `shutdown-runtime.js`, `notifications/routes.js`, `space-archive.js`, `space-archive.test.js`: Removed `permissionAutoAcceptRuntime`, auto-accept notification route, and archive route patterns.
- **Check after:** `bun run type-check` and `bun test packages/ui/src/components/views/SettingsView.test.tsx` and `bunx vitest run server/lib/notifications server/lib/host/settings-helpers.test.js` in `packages/web` pass (0 type errors; 1 UI test passed; 13 test files passed, 124 passed).
  - Additional unit suites:
    - `bun test packages/ui/src/lib/settings/registry.test.ts`: 15 passed, 0 failures.
    - `bunx vitest run server/lib/host/worker-operation-authorizer.test.js` in `packages/web`: 25 passed, 0 failures.
  - Static analysis: `bunx oxlint` on all 22 changed files passed with 0 errors.
  - Dead-code inspect: `bun run dead-code` verified no new dead code.
- Independent review: Approved by director with no findings.
