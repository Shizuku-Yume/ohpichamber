# 15: Usage page as an OMP-native dashboard

**Effort:** ux-feedback-2026-11-12
**Blocked by:** 02
**Covers:** W9
**Files:** `packages/agent-service/src/` (new usage statistics endpoint over `stats.db`, `authStorage` usage reports and session stats); `packages/agent-contract/src/usage.ts`; `packages/agent-service/src/worker/usage.ts`; `packages/ui/src/components/sections/usage/` (`UsagePage`, `UsageSidebar`), `packages/ui/src/components/views/usage/`; `packages/ui/src/components/sections/DOCUMENTATION.md`; `packages/web/server/lib/quota/DOCUMENTATION.md`
**Read first:** `research/feedback-2026-11-12/07-usage.md` (all, especially design C); `12-tui-vs-sdk.md` (usage row); `decisions.md` 2026-11-13 "The Usage page is an OMP-native dashboard"; OMP `session/session-stats.ts`, `omp-stats`; skills `ui-api-decoupling`, `performance-engineering`, `locale-ui-patterns`
**Check:** a service test reads a fixture `stats.db` and session files and returns per-provider and per-model aggregates (tokens incl. reasoning, cost, TTFT, tok/s, error rate) with `pricing: null` preserved; the usage UI tests exit 0. Real path (Web, isolated `HOME` seeded with TUI and app sessions): the page shows an all-providers comparison and one view per configured provider including a custom one; no unconfigured quota plan appears; an unpriced model shows "—"; the token legend is not truncated. Screenshots go in the evidence directory.
**Base commit:** c0dfc693b486dbb0a9cfa7994583fbb9e7659ca6

- [x] Add the OMP statistics endpoint and contract; it covers all OMP sessions, including TUI sessions.
- [x] Rebuild the page: all-providers comparison (table and bars) and a per-provider view; quota sections only for configured, quota-capable providers.
- [x] Count reasoning tokens; treat `pricing === null` as unknown, never $0.00.
- [x] Deletes: the static 26-provider sidebar, the unused `selectedProviderId`, and the session-derived report path the endpoint replaces.

## Progress

Check after: a service test reads a fixture stats.db and session files and returns per-provider and per-model aggregates (tokens incl. reasoning, cost, TTFT, tok/s, error rate) with pricing: null preserved (21/21 passed in packages/agent-service/src/worker/usage.test.ts); packages/agent-contract/src/usage.test.ts 3/3 passed; usage UI tests exit 0 (102/102 passed across 8 files in packages/ui); oxlint exited 0 with no findings across touched files; real path run on port 4115 with isolated HOME and OPENCHAMBER_DATA_DIR seeded with TUI and app sessions with priced anthropic and custom unpriced CLIProxyAPI shows all-providers comparison with mixed pricing partial hint and untruncated wrapped tokens breakdown legend with reasoning, per-provider custom unpriced view with '—' for Cost tile, efficiency tiles and models, and priced provider view with $0.11 cost; 3 screenshots saved in /home/shizuku/Project/ohpichamber-omp-artifacts/ux-feedback-2026-11-13/task15/).
Review: pass; self-review and lint/type checks passed with 0 findings; diff verified against base commit c0dfc693b486dbb0a9cfa7994583fbb9e7659ca6.
