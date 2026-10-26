# 16: Project knowledge, memory and agent tool

**Effort:** upstream-refresh
**Task type:** feature
**Base commit:** <commit-sha>

**Delivers:** Upstream's notes/todos/plans/memory panel and the project-knowledge agent tool work with the fork's Host storage and canonical API.

**Blocked by:** 10, 22, 23
**Files:** Path list: `/home/shizuku/Project/ohpichamber-omp-artifacts/upstream-sync-2026-10-27/plan-paths/16.tsv` (32 paths: 22 clean/new, 10 both-side, 6 conflicts). Main locations: `packages/web/server/lib/{project-context,session-knowledge,agent-memory,agent-tool,context-obligatory,skills-catalog}`, `packages/ui/src/lib/sessionKnowledge*`, `packages/ui/src/components/sections/{agents,skills}`.

**Read first:** Spec W6; `.agents/skills/ui-api-decoupling/SKILL.md`; `.agents/skills/sync-state-invariants/SKILL.md`; `.agents/skills/locale-ui-patterns/SKILL.md`; architecture persistence rules.
**Covers:** W6

**Check:** `bun install --frozen-lockfile` and `bun run type-check` and `bun run lint` and `bun run test` all exit 0, the knowledge tests pass, and in the running app notes/todos/plans can be created, edited and linked to a plan, and an agent turn can read project knowledge through the tool. Real path: ask the agent a question whose answer is only in a note.

## Done when

- [ ] Knowledge is stored in the Host's owning store; the agent tool reads through the service boundary.
- [ ] Plan links and dependencies persist across restart.
- [ ] No OpenCode instruction-file mechanism is used as the only store.
- [ ] Deleted entries are not resurrected by a stale cache.
