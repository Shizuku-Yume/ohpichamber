# 01: Phase 1 Audit List A — Mistakenly cut or deferred OpenChamber UX

**Effort:** m6-audit-and-polish
**Task type:** spike
**Base commit:** 76112ae00
**Started:** 2026-11-06
**Finished:** 2026-11-06
**Blocked by:** None
**Covers:** W1
**Files:** `.workflow/research/m6-audit-list-a-openchamber-ux.md`
**Read first:** `.workflow/specs/m6-audit-and-polish.md`; `.workflow/research/omp-opencode-openchamber-audit.md`; `.workflow/research/crude-port-ledger.md`
**Check:** `test -s .workflow/research/m6-audit-list-a-openchamber-ux.md && grep -q 'session-pins' .workflow/research/m6-audit-list-a-openchamber-ux.md && grep -q 'session-unread' .workflow/research/m6-audit-list-a-openchamber-ux.md && grep -q 'BehaviorPage' .workflow/research/m6-audit-list-a-openchamber-ux.md && .workflow/bin/workflow validate` → exits 0 with complete file-by-file inventory and restoration design.

- [x] Diff `0056bf6a9..HEAD` (`upstream/main..HEAD`) across `packages/ui/src/` and `packages/web/server/` to enumerate every deleted, hidden, stubbed, or gutted OpenChamber frontend/Host feature.
- [x] Classify each finding into either **(1) Restore in M6** (genuine OpenChamber workbench/Host UX with concrete Canonical/Host SQLite + SSE restoration design) or **(2) Keep Retired** (true OpenCode-only workaround or maintainer-excluded item: Host Goal Supervisor, Root Agent Picker, dual tool-permission mode switches, OpenCode Folder Trust, per-session cache warming, bundled `ripgrep`).
- [x] Provide exact file/line citations and restoration architecture for `sections/openchamber/*` (`GeneralWorkspaceSettings`, `DesktopAppSettings`, `DefaultsSettings`, `OpenChamberVisualSettings`, `NotificationSettings`, `VoiceSettings`, `PasskeysSettings`, `TunnelSettings`, etc.), `#1 session-pins`, `#2 session-unread` + `session-turn-duration` + tray/widget sync, `#4 BehaviorPage.tsx` (with `default` = zero injection), and any additional cut UI/Host capabilities discovered in the diff.

## Findings

Exhaustive audit across `packages/ui/src`, `packages/web/server`, and `packages/electron` against upstream baseline `0056bf6a9` and current tip `76112ae00` completed and recorded in `.workflow/research/m6-audit-list-a-openchamber-ux.md`.

Key findings:
1. **#1 Session Pins (`session-pins`):** In upstream, session pins were held authoritatively in session metadata (`session.metadata.openchamber.pinned = { at }`) and synchronized across devices via `sync/session-pins.ts` and `openchamber:session-metadata` SSE. In HEAD, `session-pins.ts` was deleted, `setSessionPinned` was dropped from `session-actions.ts`, and `useSessionPinnedStore.ts` was downgraded to client-local `localStorage`. Restored to Host SQLite (`host-metadata.sqlite`), Canonical metadata contract, and `openchamber-control` SSE.
2. **#2 Session Unread & Turn Duration:** In upstream OpenCode, `time.idle` and `time.viewed` provided unread status surviving reloads and driving desktop/mobile badges. In HEAD, `sync/session-unread.ts` was deleted and unread indicators were severed. Restored via Host SQLite `workbench = { lastIdleAt, viewedAt, lastTurnOutcome }` populated on Canonical `run.completed`/`run.failed` events, plus `turn = { endedAt, durationMs }` restored to the contract and recorded by Host gateway.
3. **#4 BehaviorPage & Response Styles:** `BehaviorPage.tsx` was deleted in commit `76cc860` because the crude port prepended synthetic `<system-reminder>` blocks to user prompts. Restored with a strict **default zero-injection** contract (`default` sends 0 extra prompt bytes; non-default presets pass cleanly into OMP personality / session creation options).
4. **Settings Sections Restoration:** Cleanly partitioned `DesktopAppSettings` (tray, window, launch at login, Quake) from `DesktopNetworkSettings`; restored `MobileWorkspaceTabsSettings` drag-and-drop visibility; restored `worktreeArchiveOnDoneEnabled`, `liveBrowserTabLimit`, passkey renaming, and default model & reasoning effort selectors.
5. **Maintained Retrenchments:** Confirmed retirement of Host Goal Supervisor, Root Agent Picker, dual tool-permission switches, OpenCode Folder Trust, per-session cache warming, and bundled ripgrep.
6. **Exhaustive Inventories:** Attached Appendix A (complete enumeration of all 566 deleted paths across electron, web/server, and UI) and Appendix B (named settings disposition ledger across all openchamber/git-identities settings files, citing no-regression and unchanged statuses).

## Progress

- [x] Read `common.md`, `m6-audit-and-polish.md` spec, prior research (`omp-opencode-openchamber-audit.md`, `crude-port-ledger.md`), and skills.
- [x] Ran exhaustive read-only git diff sweeps across `0056bf6a9..HEAD` in `packages/ui/src`, `packages/web/server`, and `packages/electron`.
- [x] Synthesized findings from both research substreams (`window-a-settings-notes.md` and `window-a-runtime-notes.md`).
- [x] Authored authoritative comprehensive audit report `.workflow/research/m6-audit-list-a-openchamber-ux.md`.
- [x] Copied report to `/home/shizuku/Project/ohpichamber-omp-artifacts/m6-phase1-audit-2026-11-06/m6-audit-list-a-openchamber-ux.md`.
- [x] Added exhaustive Appendix A (566 deleted files) and Appendix B (all named settings files).
