# 05: Restore BehaviorPage (zero-injection default), OpenChamber Settings controls, and Composer parity

**Effort:** m6-audit-and-polish
**Task type:** feature
**Base commit:** 876a08f538
**Started:** 2026-11-07
**Finished:** 2026-11-07
**Blocked by:** 01, 02, 03
**Covers:** W3
**Files:** `packages/ui/src/components/sections/behavior/BehaviorPage.tsx`; `packages/ui/src/lib/responseStyle.ts`; `packages/ui/src/components/views/SettingsView.tsx`; `packages/ui/src/components/sections/openchamber/OpenChamberPage.tsx`; `packages/ui/src/components/sections/openchamber/DesktopAppSettings.tsx`; `packages/ui/src/components/sections/openchamber/DesktopNetworkSettings.tsx`; `packages/ui/src/components/sections/openchamber/desktopRestartDrafts.ts`; `packages/ui/src/components/sections/openchamber/DefaultsSettings.tsx`; `packages/ui/src/components/sections/openchamber/MobileWorkspaceTabsSettings.tsx`; `packages/ui/src/components/sections/openchamber/OpenChamberVisualSettings.tsx`; `packages/ui/src/components/sections/openchamber/MergedWorktreeCleanupSettings.tsx`; `packages/ui/src/components/sections/openchamber/PasskeySettings.tsx`; `packages/ui/src/components/sections/openchamber/ChatSettings.tsx`; `packages/web/server/lib/host/behavior-routes.js`; `packages/web/server/lib/host/behavior-routes.test.js`; `packages/ui/src/lib/settings/search.ts`
**Read first:** `.workflow/specs/m6-audit-and-polish.md`; `.workflow/research/m6-audit-list-a-openchamber-ux.md` (§6, §7, §8.1); `packages/ui/src/components/sections/PATTERNS.md`; `packages/ui/src/lib/theme/STYLING.md`; `.agents/skills/openchamber-change-discipline/SKILL.md`
**Check:** `bun test packages/ui/src/components/sections packages/web/server/lib/prompt-delivery && bun run --cwd packages/ui type-check` → exits 0 with `BehaviorPage` zero-injection on `default`, separated `DesktopAppSettings`, restored `DefaultsSettings`, and all 6 OpenChamber UI controls verified.

- [x] Restore `BehaviorPage.tsx` (response-style presets + project `AGENTS.md` / global rules editor) in `SettingsView.tsx` under the `agent` group, enforcing **strict zero-injection on `default`** (0 bytes injected when `default` or unset; non-default presets passed cleanly via session/system options without mutating user prompt messages).
- [x] Split `DesktopAppSettings.tsx` out of `DesktopNetworkSettings.tsx` and restore `desktopRestartDrafts.ts` so desktop window/tray/launch/Quake controls and local network access are distinct sections.
- [x] Deduplicate `DefaultsSettings.tsx` in `OpenChamberPage.tsx` (render only under the Sessions tab, removing the duplicate on the General tab) and restore Default Model (mapped to OMP `default` role), Default Thinking Effort, and Default Session Mode (`main`/`plan`/`vibe`/`goal`) selectors.
- [x] Restore the 6 dropped OpenChamber controls whose backing stores already exist: `MobileWorkspaceTabsSettings.tsx` (drag-to-reorder mobile bottom tabs), `worktreeArchiveOnDoneEnabled` in `MergedWorktreeCleanupSettings.tsx`, `liveBrowserTabLimit` (1–20) stepper in `OpenChamberVisualSettings.tsx`, inline Passkey label rename in `PasskeySettings.tsx`, and `mobileReturnKeySends` + `savePastedImagesAsFiles` in `ChatSettings.tsx`.
- [x] Ensure `useAssistantStatus.ts` maps OMP native tool names (`bash`, `task`, `ask`, `find`, `grep`, `glob`, `todo`), text attachments inline cleanly with delimiters while binary/large attachments supply paths for `read`, and the Compact action calls the Canonical compact RPC (`session.compact()`).

## Progress

- [x] Restored `desktopRestartDrafts.ts` and partitioned `DesktopAppSettings.tsx` (launch at login, minimize to tray, keep awake, Mac menu bar, Linux native frame, mini chat shortcut, Quake console mode) from `DesktopNetworkSettings.tsx` (LAN access and UI password).
- [x] Deduplicated `DefaultsSettings.tsx` in `OpenChamberPage.tsx` so it renders strictly under Sessions tab; restored Default Model selector mapped to OMP role `default`, Default Thinking Effort selector, and Default Session Mode selector (`main`/`plan`/`vibe`/`goal`).
- [x] Wired Default Session Mode to `useUIStore` and `session-ui-store.ts` `openNewSessionDraft`, verified with unit test in `session-ui-store.test.js`.
- [x] Restored container queries (`@xl:flex-row`) and shared trigger classes (`SETTINGS_SELECT_ROW_TRIGGER_CLASS`) on model and effort pickers.
- [x] Restored `MobileWorkspaceTabsSettings.tsx` with `@dnd-kit` sortable visibility list and mounted it under general mobile settings.
- [x] Restored `worktreeArchiveOnDoneEnabled` in `MergedWorktreeCleanupSettings.tsx` using localized keys from `settings.openchamber.finishedWorktrees`.
- [x] Restored `liveBrowserTabLimit` (1-20 stepper) in `OpenChamberVisualSettings.tsx` with shared `NumberInput` classes.
- [x] Restored inline Passkey label rename in `PasskeySettings.tsx` via `renameStoredPasskey`.
- [x] Restored `mobileReturnKeySends` (mobile-gated) and `savePastedImagesAsFiles` in `ChatSettings.tsx`.
- [x] Restored search registry coverage and anchors in `packages/ui/src/lib/settings/search.ts` with surface availability gating, verified with unit tests in `search.test.ts`.
- [x] Removed absolute Host paths from `behavior-routes.js` GET and PUT responses and verified with focused route test suite.
- [x] Executed live Web smoke via Chrome DevTools CLI on ports 5225/3955 with data dir `/tmp/m6-w5-data`, testing Settings, Behavior page default zero-injection and explicit preset selection, and Sessions restored controls.
