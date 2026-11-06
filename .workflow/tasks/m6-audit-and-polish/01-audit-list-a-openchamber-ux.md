# 01: Phase 1 Audit List A — Mistakenly cut or deferred OpenChamber UX

**Effort:** m6-audit-and-polish
**Task type:** spike
**Blocked by:** None
**Covers:** W1
**Files:** `.workflow/research/m6-audit-list-a-openchamber-ux.md`
**Read first:** `.workflow/specs/m6-audit-and-polish.md`; `.workflow/research/omp-opencode-openchamber-audit.md`; `.workflow/research/crude-port-ledger.md`
**Check:** `test -s .workflow/research/m6-audit-list-a-openchamber-ux.md && grep -q 'session-pins' .workflow/research/m6-audit-list-a-openchamber-ux.md && grep -q 'session-unread' .workflow/research/m6-audit-list-a-openchamber-ux.md && grep -q 'BehaviorPage' .workflow/research/m6-audit-list-a-openchamber-ux.md && .workflow/bin/workflow validate` → exits 0 with complete file-by-file inventory and restoration design.

- [ ] Diff `0056bf6a9..HEAD` (`upstream/main..HEAD`) across `packages/ui/src/` and `packages/web/server/` to enumerate every deleted, hidden, stubbed, or gutted OpenChamber frontend/Host feature.
- [ ] Classify each finding into either **(1) Restore in M6** (genuine OpenChamber workbench/Host UX with concrete Canonical/Host SQLite + SSE restoration design) or **(2) Keep Retired** (true OpenCode-only workaround or maintainer-excluded item: Host Goal Supervisor, Root Agent Picker, dual tool-permission mode switches, OpenCode Folder Trust, per-session cache warming, bundled `ripgrep`).
- [ ] Provide exact file/line citations and restoration architecture for `sections/openchamber/*` (`GeneralWorkspaceSettings`, `DesktopAppSettings`, `DefaultsSettings`, `OpenChamberVisualSettings`, `NotificationSettings`, `VoiceSettings`, `PasskeysSettings`, `TunnelSettings`, etc.), `#1 session-pins`, `#2 session-unread` + `session-turn-duration` + tray/widget sync, `#4 BehaviorPage.tsx` (with `default` = zero injection), and any additional cut UI/Host capabilities discovered in the diff.
