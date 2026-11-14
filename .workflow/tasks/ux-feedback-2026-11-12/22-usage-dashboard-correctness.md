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

Real path (Web, isolated `HOME` seeded with TUI and app sessions): per-provider views show performance metrics, a configured custom model shows its cost, and a project filter changes the totals. Screenshots go in `/home/shizuku/Project/ohpichamber-omp-artifacts/ux-feedback-2026-11-13/task22/`.

- [ ] Fix each of the twelve findings in Review15, using the native OMP owner every time: OMP's incremental sync, OMP's model registry for pricing, and OMP's provider-attributed records.
- [ ] Add the sanitized AuthStorage usage reports to the contract and the endpoint. Never return credentials.
- [ ] Deletes: the silent empty-report fallback, and the double-counting in `tokenSegments()` and `reasoningShare()`.
