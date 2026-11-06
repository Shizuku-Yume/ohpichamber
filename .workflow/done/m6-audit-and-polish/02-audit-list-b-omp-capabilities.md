# 02: Phase 1 Audit List B — Missing or partially wired OMP 18.16.0 capabilities

**Effort:** m6-audit-and-polish
**Task type:** spike
**Blocked by:** None
**Covers:** W1
**Files:** `.workflow/research/m6-audit-list-b-omp-capabilities.md`
**Read first:** `.workflow/specs/m6-audit-and-polish.md`; `.workflow/research/omp-tui-parity-audit.md`
**Check:** `test -s .workflow/research/m6-audit-list-b-omp-capabilities.md && grep -q 'Recap' .workflow/research/m6-audit-list-b-omp-capabilities.md && grep -q 'Agent Hub' .workflow/research/m6-audit-list-b-omp-capabilities.md && grep -q 'Marketplace' .workflow/research/m6-audit-list-b-omp-capabilities.md && .workflow/bin/workflow validate` → exits 0 with complete module-by-module inventory of `vendor/omp/650f3a10` and integration specifications.
**Base commit:** 76112ae00a5a8499ae4cbbd8077148c72f583eb6
**Started:** 2026-11-06T05:00:00Z
**Finished:** 2026-11-06T06:30:00Z

- [x] Audit every subsystem in `vendor/omp/650f3a10/packages/` (`coding-agent`, `ai`, `tui`, `stats`, `swarm-extension`, `mcp-client`, `lsp`, `python`, `natives`) against current `@openchamber/agent-contract`, `@openchamber/agent-service`, and `packages/ui`.
- [x] Document complete end-to-end wiring designs (OMP source files/symbols, Canonical Contract schema additions, Agent Service worker RPC/event hooks, and UI surfaces) for `Recap` (`archive/archive.ts`, `prompts/system/recap-user.md`, `SessionRecapSpacer.tsx`), `Agent Hub` (`modes/agent-hub-runtime.ts`), and `Marketplace` (`extensibility/plugins/marketplace/*`).
- [x] Identify and classify any other unwired or partially wired OMP `18.16.0` capabilities (tools, slash commands, session/archive features, stats/telemetry, provider/auth flows, extensibility hooks, or settings keys) with recommended M6 disposition.

## Findings

1. **Topology Clarification:** Several directories historically presumed to be separate packages (`packages/swarm-extension`, `packages/mcp-client`, `packages/lsp`, `packages/python`) are first-party submodules inside `@oh-my-pi/pi-coding-agent` (`src/modes/agent-hub-runtime.ts`, `src/mcp/`, `src/lsp/`, `src/tools/eval.ts`). The 12 genuine packages in pinned OMP 18.16.0 are `pi-coding-agent`, `pi-ai`, `omp-stats`, `pi-agent-core`, `pi-tui`, `pi-catalog`, `pi-mnemopi`, `pi-natives`, `pi-utils`, `pi-wire`, `snapcompact`, and `omptype`.
2. **Recap Subsystem Fracture:** OMP's native idle recap generator (`idle-maintenance.ts` + SQLite table `session_recaps` in `history.db`) was completely uncalled in `WorkerSession`. OpenChamber previously substituted an ad-hoc Web server watcher (`session-assist/runtime.js`) using `small-model` with an artificial 60-second client-side delay (`RECAP_VISIBILITY_DELAY_MS`), which fails in standalone Agent Service and Electron desktop shell.
3. **Agent Hub / Swarm Isolation:** Multi-agent runtime coordination (`agent-hub-runtime.ts`, `IrcBus`, `registerPersistedSubagents`, `sumSubagentTreeCost`) was reduced to an in-memory ephemeral map in `WorkerSession`. UI reloads wipe all subagents; parked subagents cannot be revived or messaged; transcripts are inaccessible in the GUI; and tree-wide recursive swarm costs are never aggregated.
4. **Plugin Marketplace Truncation:** While OMP's `MarketplaceManager` provides complete plugin registry management (`marketplaces.json`), update checking, and previewed upgrades, OhPiChamber's contract and UI severely truncated this to simple package install/uninstall, completely omitting marketplace browsing from `AddPluginDialog.tsx`.
5. **Analytics Engine Bypass:** `@oh-my-pi/omp-stats` is bundled as a dependency in `packages/agent-service`, but `worker/usage.ts` performs raw synchronous JSONL disk scans on every query rather than reading the native SQLite analytics database (`stats.db`).

## Progress

- Inspected all 13 pinned tarballs in `vendor/omp/650f3a10/tarballs/` down to symbol and method signatures.
- Audited all 85 subsystems across `coding-agent`, `ai`, `omp-stats`, and utility packages against `packages/agent-contract`, `packages/agent-service`, and `packages/ui`.
- Produced detailed deep-dive designs for Recap, Agent Hub, and Plugin Marketplace with exact source paths, Canonical API schemas, Agent Service worker hooks, and UI surfaces.
- Authored exhaustive report at `.workflow/research/m6-audit-list-b-omp-capabilities.md` and mirrored to `/home/shizuku/Project/ohpichamber-omp-artifacts/m6-phase1-audit-2026-11-06/m6-audit-list-b-omp-capabilities.md`.
