# 03: Retire BehaviorPage response-style injection, dead Code Mode toggle, and Host permission auto-accept

**Effort:** m4-orchestration
**Task type:** refactor
**Blocked by:** 02
**Files:** `packages/ui/src/components/chat/ChatInput.tsx`, `packages/ui/src/components/sections/behavior/BehaviorPage.tsx`, `packages/ui/src/lib/responseStyle.ts`, `packages/ui/src/components/sections/openchamber/OpenChamberToolsSettings.tsx`, `packages/ui/src/stores/useUIStore.ts`, `packages/ui/src/components/views/SettingsView.tsx`, `packages/web/server/lib/permission-auto-accept/`, `packages/web/server/lib/notifications/runtime.js`, `packages/web/server/index.js`, `packages/web/server/lib/host/settings-helpers.js`, `packages/web/server/lib/host/settings-registry.json`, `packages/ui/src/lib/settings/registry.ts`
**Read first:** `.workflow/specs/m4-orchestration.md`; `.workflow/decisions.md` (2026-11-05 - Retire BehaviorPage response-style injection, dead Code Mode toggle, and Host permission auto-accept)
**Covers:** W4
**Check:** `bun run type-check` and `bun test packages/ui/src/components/views/SettingsView.test.tsx` and `bunx vitest run server/lib/notifications server/lib/host/settings-helpers.test.js` in `packages/web` exit 0.

- [ ] First-message `<system-reminder>` response-style injection is removed from `ChatInput.tsx`, and `BehaviorPage.tsx`, `responseStyle.ts`, and the `'behavior'` settings navigation item are deleted.
- [ ] The unused `agentToolsCodeMode` ("Run through code mode") setting and checkbox are removed from `OpenChamberToolsSettings.tsx`, `useUIStore.ts`, and the settings registry.
- [ ] `packages/web/server/lib/permission-auto-accept/` and `permissionDefaultMode` / `permissionAutoAccept` settings and UI controls are removed, leaving OMP's `tools.approvalMode`, ACP session permissions, and the Host Gatekeeper as the single permission authority.
