# 14: Chat work status and shell

**Effort:** upstream-refresh
**Task type:** feature
**Base commit:** <commit-sha>

**Delivers:** Upstream's live work status, turn activity, prompt navigator, scroll-to-bottom, empty state and BTW panel work with OMP runs.

**Blocked by:** 10, 13, 23
**Files:** Path list: `/home/shizuku/Project/ohpichamber-omp-artifacts/upstream-sync-2026-10-27/plan-paths/14.tsv` (91 paths: 52 clean/new, 35 both-side, 19 conflicts). Main locations: `packages/ui/src/components/chat/{work-status,components,btw,hooks,workflows}`, top-level chat helpers and hooks.

**Read first:** Spec W6; `.agents/skills/sync-state-invariants/SKILL.md`; `.agents/skills/performance-engineering/SKILL.md`; `.agents/skills/locale-ui-patterns/SKILL.md`.
**Covers:** W6

**Check:** `bun install --frozen-lockfile` and `bun run type-check` and `bun run lint` and `bun run test` all exit 0, the chat status tests pass, and in the running app a running turn shows live activity that collapses to a summary, the prompt navigator jumps between prompts, and the BTW panel opens and closes without losing the main turn.

## Done when

- [ ] Live activity derives from live run state, never from persisted history.
- [ ] The empty state and suggestions do not fire network work on render.
- [ ] Scroll behavior stays pinned only when the user is at the bottom.
- [ ] BTW panel state is per session and does not leak across sessions.
