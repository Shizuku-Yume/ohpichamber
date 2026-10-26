# 21: Diagnostics, overview, quota and session warming

**Effort:** upstream-refresh
**Task type:** feature
**Base commit:** <commit-sha>

**Delivers:** Upstream's diagnostics export, overview panel, quota/limit-failover handling, session warming and small-model routing work with the fork's providers.

**Blocked by:** 10, 22, 23
**Files:** Path list: `/home/shizuku/Project/ohpichamber-omp-artifacts/upstream-sync-2026-10-27/plan-paths/21.tsv` (80 paths: 52 clean/new, 28 both-side, 19 conflicts). Main locations: `packages/web/server/lib/{diagnostics,overview,quota,limit-failover,session-warming,session-assist,small-model}`, `packages/ui/src/lib/{diagnostics,overview,quota}`, `packages/ui/src/components/{overview,usage}`.

**Read first:** Spec W6; `.agents/skills/performance-engineering/SKILL.md`; `.agents/skills/enterprise-boundary/SKILL.md` (telemetry redaction); `.agents/skills/locale-ui-patterns/SKILL.md`.
**Covers:** W6

**Check:** `bun install --frozen-lockfile` and `bun run type-check` and `bun run lint` and `bun run test` all exit 0, the diagnostics/quota tests pass, and in the running app the overview lists waiting/running/finished work, the diagnostics export downloads a bounded and redacted timeline, and a quota failure shows its state. Real path: trigger one provider quota response or a named fixture.

## Done when

- [ ] Diagnostics output is bounded and contains no tokens, prompts or credentials.
- [ ] Overview derives live state and does not block on a slow provider.
- [ ] Quota/limit-failover behavior is intentional per provider and visible in the UI.
- [ ] Session warming respects the configured policy and is observable.
