# 22: Usage dashboard correctness and the AuthStorage source

**Effort:** ux-feedback-2026-11-12
**Task type:** bugfix
**Blocked by:** 15
**Covers:** W9
**Files:** `packages/agent-service/src/worker/usage.ts` and its service route; `packages/agent-contract/src/usage.ts`; `packages/ui/src/components/sections/usage/UsagePage.tsx`; `packages/ui/src/components/views/usage/` (`UsageStatsView`, token segment and reasoning share helpers)
**Read first:** the independent review of task 15 in `/home/shizuku/Project/ohpichamber-omp-artifacts/ux-feedback-2026-11-13/independent-review/Review15.md` (all twelve findings); `.workflow/done/ux-feedback-2026-11-12/15-*.md`; `decisions.md` 2026-11-13 "The Usage page is an OMP-native dashboard"; OMP `omp-stats` sync and `session/session-stats.ts`, plus `authStorage` usage reports; skills `ui-api-decoupling`, `performance-engineering`, `enterprise-boundary`
**Check:** service tests must cover these, using real OMP session JSONL files as input rather than hand-inserted rows:
- TUI sessions are ingested before a report is built.
- The project filter limits every aggregate.
- Reasoning is counted once, and includes `model_usage` entries.
- A database failure produces an error, not an empty report.
- Configured custom-model pricing is used.
- TTFT is weighted by request count.
- Prompt counts are scoped by provider.
- Sanitized AuthStorage usage reports appear.

The usage UI tests must show: a native and a logical quota id merge into one row; model-only quotas and configured-provider errors still show; TTFT, tok/s and error rate appear in a single-provider view. All of these tests exit 0.
**Base commit:** 81e48cd715c2525dad96b3bd360a370063ac5f67
**Status:** active

Real path (Web, isolated `HOME` seeded with TUI and app sessions): per-provider views show performance metrics, a configured custom model shows its cost, and a project filter changes the totals. Screenshots go in `/home/shizuku/Project/ohpichamber-omp-artifacts/ux-feedback-2026-11-13/task22/`.

- [x] Fix each of the twelve findings in Review15, using the native OMP owner every time: OMP's incremental sync, OMP's model registry for pricing, and OMP's provider-attributed records.
- [x] Add the sanitized AuthStorage usage reports to the contract and the endpoint. Never return credentials.
- [x] Deletes: the silent empty-report fallback, and the double-counting in `tokenSegments()` and `reasoningShare()`.

## Progress

Review: pass. Independent worker session `ufb22-review-f` (read-only, approved, round 1; report `/home/shizuku/Project/ohpichamber-omp-artifacts/ux-feedback-2026-11-13/task22/review-round1.md`). All 12 blocking findings from Review15 verified fixed with no blockers.

Remarks:
- Finding 3 (output inclusive of reasoning) was confirmed in OMP source (`@oh-my-pi/pi-ai`) by the reviewer; output contains reasoning tokens so reasoning is treated as a subset of output rather than being summed twice.
- Single-provider TTFT, tok/s, and error rate are visible in screenshot 2 (`2-per-provider-view.png`) and 2b (`2b-ufb22-lab-metrics.png`).

Finding resolution map (Review15 findings 1–12):
- Finding 1 (P1 sync before query): `ed3c9fe9c` runs `await syncAllSessions()` over OMP's sessions directory before building the report.
- Finding 2 (P2 project/workspace filter): `ed3c9fe9c` filters every aggregate by session directory prefix (`sessionDirectories`), resolving authorized scopes in `registry.ts` and `workspace-routes.ts`.
- Finding 3 (P2 reasoning semantics): `570727f6a`, `2187bcca1`, `bb0f880ba` remove double counting from `tokenSegments()` and `reasoningShare()`, and document output inclusivity in the contract.
- Finding 4 (P2 DB failures throw): `ed3c9fe9c` drops silent catch fallbacks; DB/sync errors propagate as 503; `745cae8b2` surfaces error alert with retry in UI.
- Finding 5 (P2 configured custom-model pricing): `ed3c9fe9c` resolves pricing through `ModelRegistry.find()` reading `agentDirectory/models.yml`.
- Finding 6 (P2 model_usage auxiliary reasoning): `ed3c9fe9c` ingests reasoning tokens from `entry.type === 'model_usage'` as well as assistant messages.
- Finding 7 (P2 native and logical quota IDs merged): `745cae8b2` unifies `anthropic`/`claude` via `resolveQuotaProviderId` into one row with both quota and stats.
- Finding 8 (P2 model-only quotas & provider errors retained): `8b0f9cce0` admits model windows/budgets without top-level windows and retains configured-provider error cards.
- Finding 9 (P2 single-provider TTFT, tok/s, error rate): `2187bcca1`, `745cae8b2` hoist `EfficiencyTiles` out of the provider-count comparison guard.
- Finding 10 (P2 request-weighted TTFT at provider level): `ed3c9fe9c` accumulates TTFT sum and count across requests at provider level instead of averaging model averages.
- Finding 11 (P2 prompt counts scoped by provider): `ed3c9fe9c` scopes prompt count query to `user_messages` matching `provider = ?`.
- Finding 12 (P1 sanitized AuthStorage accounts): `bb0f880ba` adds strict schemas; `ed3c9fe9c` implements `getUsageAccounts` projecting only quota fields without credentials or identities.

Known limits:
- Scoped views count only transcripts under Host-registered root sessions folders. A TUI-only project folder with no registered root in OpenChamber appears only in the unscoped view.
- Reasoning requires re-reading in-window session JSONL transcripts per request (no cache added).
- Accounts reports call provider usage probes bounded to 15s (`USAGE_REPORT_TIMEOUT_MS = 15_000`).

Real path (Web surface, port 4122, isolated `HOME=/tmp/ufb22-home`, `OPENCHAMBER_DATA_DIR=/tmp/ufb22-data`, evidence `/home/shizuku/Project/ohpichamber-omp-artifacts/ux-feedback-2026-11-13/task22/`):
- `1-all-providers-view.png`: all-providers view showing seeded TUI sessions across anthropic, openai, and ufb22-lab.
- `2-per-provider-view.png`: anthropic view showing Efficiency tiles: TTFT 1,007 ms, Tok/s 99.3 tok/s, Error rate 25%, cache hit rate 28.8%, reasoning share 11.1%.
- `2b-ufb22-lab-metrics.png`: ufb22-lab view showing TTFT 360 ms, Tok/s 200 tok/s, Error rate 0%.
- `3-custom-model-cost.png`: custom model (`ufb22-lab` / `Custom X`) displays cost $0.01 (not a dash).
- `4-project-filter-changed.png`: scoped to `ufb22-alpha` showing 2 sessions, 6 prompts, $0.06 vs global 3 sessions, 10 prompts, $0.09.
- `stats-global.json` & `stats-scoped.json`: audited, credentials/secrets/emails: 0 matches.

- Check after: pass — path-scoped checks exit 0 (logged to `/home/shizuku/Project/ohpichamber-omp-artifacts/ux-feedback-2026-11-13/task22/check-after.log`):
  - `packages/agent-contract`: build exit 0; `bun test src/usage.test.ts` 5 pass, 0 fail (32 expect() calls).
  - `packages/agent-service`: `bun test --timeout 15000 src/worker/usage.test.ts` with isolated temp directory 10 pass, 0 fail (30 expect() calls).
  - `packages/ui`: `node ../../scripts/run-isolated-tests.mjs src/components/sections/usage src/components/views/usage` 7/7 test files passed.
  - Type-checks: `agent-contract` (tsc exit 0), `agent-service` (tsc exit 0), `ui` (bun check -b 3,535 files across 2 projects, 0 errors).
  - `bunx oxlint`: 0 findings across all 17 changed TS/TSX files.
  - `packages/agent-service build`: exit 0 (bundled 72 modules, index.js, worker/index.js, supervisor/host-authorization-protocol.js).
