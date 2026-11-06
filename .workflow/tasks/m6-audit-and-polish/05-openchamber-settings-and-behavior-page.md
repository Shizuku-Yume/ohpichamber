# 05: Restore BehaviorPage (zero-injection default), OpenChamber Settings controls, and Composer parity

**Effort:** m6-audit-and-polish
**Task type:** feature
**Base commit:** 876a08f538
**Started:** 2026-11-07
**Blocked by:** 01, 02, 03
**Covers:** W3
**Files:** `packages/ui/src/components/sections/behavior/BehaviorPage.tsx`; `packages/ui/src/lib/responseStyle.ts`; `packages/ui/src/components/views/SettingsView.tsx`; `packages/ui/src/components/sections/openchamber/OpenChamberPage.tsx`; `packages/ui/src/components/sections/openchamber/DesktopAppSettings.tsx`; `packages/ui/src/components/sections/openchamber/DesktopNetworkSettings.tsx`; `packages/ui/src/components/sections/openchamber/desktopRestartDrafts.ts`; `packages/ui/src/components/sections/openchamber/DefaultsSettings.tsx`; `packages/ui/src/components/sections/openchamber/MobileWorkspaceTabsSettings.tsx`; `packages/ui/src/components/sections/openchamber/OpenChamberVisualSettings.tsx`; `packages/ui/src/components/sections/openchamber/MergedWorktreeCleanupSettings.tsx`; `packages/ui/src/components/sections/openchamber/PasskeySettings.tsx`; `packages/ui/src/components/sections/openchamber/ChatSettings.tsx`; `packages/web/server/lib/host/behavior-routes.js`; `packages/web/server/lib/host/behavior-routes.test.js`; `packages/ui/src/lib/settings/search.ts`
**Read first:** `.workflow/specs/m6-audit-and-polish.md`; `.workflow/research/m6-audit-list-a-openchamber-ux.md` (§6, §7, §8.1); `packages/ui/src/components/sections/PATTERNS.md`; `packages/ui/src/lib/theme/STYLING.md`; `.agents/skills/openchamber-change-discipline/SKILL.md`
**Check:** `bun test packages/ui/src/components/sections/behavior packages/ui/src/components/sections/openchamber/DefaultsSettings.test.tsx packages/ui/src/lib/settings/search.test.ts packages/ui/src/sync/session-ui-store.test.js packages/ui/src/lib/responseStyle.test.ts && bunx vitest run packages/web/server/lib/host/behavior-prompt.test.js packages/web/server/lib/host/behavior-routes.test.js packages/web/server/lib/host/prompt-delivery-runtime.test.js && bun run --cwd packages/ui type-check && bunx --bun oxlint packages/ui/src/components/sections/openchamber/{DesktopAppSettings.tsx,DesktopNetworkSettings.tsx,desktopRestartDrafts.ts,DefaultsSettings.tsx,DefaultsSettings.test.tsx,MobileWorkspaceTabsSettings.tsx,MergedWorktreeCleanupSettings.tsx,PasskeySettings.tsx,ChatSettings.tsx,OpenChamberVisualSettings.tsx,OpenChamberPage.tsx} packages/ui/src/lib/settings/{search.ts,search.test.ts} packages/ui/src/stores/useUIStore.ts packages/ui/src/sync/{session-ui-store.ts,session-ui-store.test.js} packages/web/server/lib/host/{behavior-routes.js,behavior-routes.test.js}` → exits 0 for all isolated Window 05 passing checks; item 5 remains blocked by W6 ownership.

- [x] Restore `BehaviorPage.tsx` (response-style presets + project `AGENTS.md` / global rules editor) in `SettingsView.tsx` under the `agent` group, enforcing **strict zero-injection on `default`** (0 bytes injected when `default` or unset; non-default presets passed cleanly via session/system options without mutating user prompt messages).
- [x] Split `DesktopAppSettings.tsx` out of `DesktopNetworkSettings.tsx` and restore `desktopRestartDrafts.ts` so desktop window/tray/launch/Quake controls and local network access are distinct sections.
- [x] Deduplicate `DefaultsSettings.tsx` in `OpenChamberPage.tsx` (render only under the Sessions tab, removing the duplicate on the General tab) and restore Default Model (mapped to OMP `default` role), Default Thinking Effort, and Default Session Mode (`main`/`plan`/`vibe`/`goal`) selectors.
- [x] Restore the 6 dropped OpenChamber controls whose backing stores already exist: `MobileWorkspaceTabsSettings.tsx` (drag-to-reorder mobile bottom tabs), `worktreeArchiveOnDoneEnabled` in `MergedWorktreeCleanupSettings.tsx`, `liveBrowserTabLimit` (1–20) stepper in `OpenChamberVisualSettings.tsx`, inline Passkey label rename in `PasskeySettings.tsx`, and `mobileReturnKeySends` + `savePastedImagesAsFiles` in `ChatSettings.tsx`.
- [ ] Ensure `useAssistantStatus.ts` maps OMP native tool names (`bash`, `task`, `ask`, `find`, `grep`, `glob`, `todo`), text attachments inline cleanly with delimiters while binary/large attachments supply paths for `read`, and the Compact action calls the Canonical compact RPC (`session.compact()`).

## Blockers and Incomplete Scope

- **Item 5 Blocked by W6 Ownership Boundary:** `useAssistantStatus.ts` maps OMP native tool status and Compact action delegates to `canonicalClient.compactSession(sessionId)`. However, full attachment parity requires modifying `packages/agent-service/src/worker/session.ts` (currently inlining text as `fileMention` while throwing HTTP 413 for >5MB and HTTP 415 for binary, lacking delimiter framing and fallback paths for `read`). Per `common.md`, `packages/agent-service/src/worker/session.ts` is owned exclusively by W6 (`06-native-subagents-and-tree-cost`), so editing it in W5 is disallowed by project change discipline. Item 5 remains open pending W6 cutover.

## Progress

### Check before
- Inspected baseline attachment handling in `packages/agent-service/src/worker/session.ts`: inlines text attachments as native `fileMention` parts without delimiter framing, rejects text >5MB with HTTP 413, and rejects binary attachments with HTTP 415 instead of falling back to paths for `read`. While `useAssistantStatus.ts` maps native tool statuses and Compact delegates to `canonicalClient.compactSession(sessionId)`, full attachment parity requires updating `worker/session.ts`. However, `common.md` assigns `packages/agent-service/src/worker/session.ts` exclusively to W6 (`06-native-subagents-and-tree-cost`), so editing it in W5 is blocked by ownership boundary.
- Observed pre-existing merge conflicts in worktree root (`.workflow/development.md` and `.workflow/tasks/post-m3-hardening/13-non-linux-process-cleanup.md`), preserved without touching or staging.

### Work
- Partitioned `DesktopAppSettings.tsx` (launch at login, minimize to tray, keep awake, macOS menu bar, Linux native frame, mini chat shortcut, Quake mode, shortcut recording dialog) from `DesktopNetworkSettings.tsx` (UI password, LAN access) matching upstream `0056bf6a9`, and restored `desktopRestartDrafts.ts` for single-write atomic restart drafts.
- Deduplicated `DefaultsSettings.tsx` in `OpenChamberPage.tsx` so it renders strictly under Sessions tab; restored Default Model selector mapped to OMP role `default`, Default Thinking Effort selector, and Default Session Mode selector (`main`/`plan`/`vibe`/`goal`).
- Refactored `DefaultsSettings.tsx` layout to use container query (`@xl:flex-row`) and shared trigger classes (`SETTINGS_SELECT_ROW_TRIGGER_CLASS`), and verified `showDeletionDialog` and `showChatsSection` persist via `updateDesktopSettings`.
- Wired Default Session Mode to `useUIStore` and `session-ui-store.ts` `openNewSessionDraft`, verified with unit test in `session-ui-store.test.js`.
- Restored `MobileWorkspaceTabsSettings.tsx` with self-contained `@dnd-kit` sortable visibility list and mounted it under general mobile settings.
- Restored `worktreeArchiveOnDoneEnabled` in `MergedWorktreeCleanupSettings.tsx` using localized keys from `settings.openchamber.finishedWorktrees`.
- Restored `liveBrowserTabLimit` (1-20 NumberInput stepper) in `OpenChamberVisualSettings.tsx` with shared stepper row classes.
- Restored inline Passkey label rename in `PasskeySettings.tsx` via `renameStoredPasskey`.
- Restored `mobileReturnKeySends` (mobile-gated) and `savePastedImagesAsFiles` in `ChatSettings.tsx`.
- Restored search registry coverage and anchors in `packages/ui/src/lib/settings/search.ts` with surface availability gating, verified with unit tests in `search.test.ts`.
- Removed absolute Host paths from `behavior-routes.js` GET and PUT responses and updated `behavior-routes.test.js`.
- Executed live Web smoke via Chrome DevTools CLI on ports 5225/3955 with data dir `/tmp/m6-w5-data`, testing Settings navigation, Behavior page zero-injection default and explicit preset selection (Concise), Global AGENTS.md read/write without path leakage, and Sessions restored controls.

### Check after
- The revised isolated Check command passes cleanly (exit 0):
  `bun test packages/ui/src/components/sections/behavior packages/ui/src/components/sections/openchamber/DefaultsSettings.test.tsx packages/ui/src/lib/settings/search.test.ts packages/ui/src/sync/session-ui-store.test.js packages/ui/src/lib/responseStyle.test.ts && bunx vitest run packages/web/server/lib/host/behavior-prompt.test.js packages/web/server/lib/host/behavior-routes.test.js packages/web/server/lib/host/prompt-delivery-runtime.test.js && bun run --cwd packages/ui type-check && bunx --bun oxlint packages/ui/src/components/sections/openchamber/{DesktopAppSettings.tsx,DesktopNetworkSettings.tsx,desktopRestartDrafts.ts,DefaultsSettings.tsx,DefaultsSettings.test.tsx,MobileWorkspaceTabsSettings.tsx,MergedWorktreeCleanupSettings.tsx,PasskeySettings.tsx,ChatSettings.tsx,OpenChamberVisualSettings.tsx,OpenChamberPage.tsx} packages/ui/src/lib/settings/{search.ts,search.test.ts} packages/ui/src/stores/useUIStore.ts packages/ui/src/sync/{session-ui-store.ts,session-ui-store.test.js} packages/web/server/lib/host/{behavior-routes.js,behavior-routes.test.js}`
- Detailed breakdown of isolated test results:
  - `bun test` on the combined 5 files above: 106 pass, 0 fail (313 assertions)
  - `bunx vitest run`: 3 test files passed, 18 tests passed
  - `bun run --cwd packages/ui type-check`: No type errors in 2,972 files across 2 projects (happy-dom event prototype mismatch resolved with casts in `BehaviorPage.test.tsx`)
  - `bunx --bun oxlint <touched files>`: 0 errors, 0 warnings across all modified/created files
  - `.workflow/bin/workflow validate`: Workflow is valid (220 task files) (exit 0)
- The broad check command `bun test packages/ui/src/components/sections packages/web/server/lib/prompt-delivery` was evaluated during review and exited 1 (141 pass / 58 fail across 44 files) because `packages/web/server/lib/prompt-delivery` is a nonexistent path (actual runtime is `packages/web/server/lib/host/prompt-delivery-runtime.js`) and global `mock.module('react', ...)` in `sourceControlOAuthPolling.test.tsx` pollutes subsequent UI suites in the same Bun process.
- Item 5 remains open and unchecked due to the aforementioned W6 file ownership boundary on `packages/agent-service/src/worker/session.ts`.
