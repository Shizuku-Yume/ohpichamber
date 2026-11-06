# 02: Phase 1 Audit List B — Missing or partially wired OMP 18.16.0 capabilities

**Effort:** m6-audit-and-polish
**Task type:** spike
**Blocked by:** None
**Covers:** W1
**Files:** `.workflow/research/m6-audit-list-b-omp-capabilities.md`
**Read first:** `.workflow/specs/m6-audit-and-polish.md`; `.workflow/research/omp-tui-parity-audit.md`
**Check:** `test -s .workflow/research/m6-audit-list-b-omp-capabilities.md && grep -q 'Recap' .workflow/research/m6-audit-list-b-omp-capabilities.md && grep -q 'Agent Hub' .workflow/research/m6-audit-list-b-omp-capabilities.md && grep -q 'Marketplace' .workflow/research/m6-audit-list-b-omp-capabilities.md && .workflow/bin/workflow validate` → exits 0 with complete module-by-module inventory of `vendor/omp/650f3a10` and integration specifications.

- [ ] Audit every subsystem in `vendor/omp/650f3a10/packages/` (`coding-agent`, `ai`, `tui`, `stats`, `swarm-extension`, `mcp-client`, `lsp`, `python`, `natives`) against current `@openchamber/agent-contract`, `@openchamber/agent-service`, and `packages/ui`.
- [ ] Document complete end-to-end wiring designs (OMP source files/symbols, Canonical Contract schema additions, Agent Service worker RPC/event hooks, and UI surfaces) for `Recap` (`archive/archive.ts`, `prompts/system/recap-user.md`, `SessionRecapSpacer.tsx`), `Agent Hub` (`modes/agent-hub-runtime.ts`), and `Marketplace` (`extensibility/plugins/marketplace/*`).
- [ ] Identify and classify any other unwired or partially wired OMP `18.16.0` capabilities (tools, slash commands, session/archive features, stats/telemetry, provider/auth flows, extensibility hooks, or settings keys) with recommended M6 disposition.
