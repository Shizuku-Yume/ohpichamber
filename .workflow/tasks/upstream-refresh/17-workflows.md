# 17: Workflows

**Effort:** upstream-refresh
**Task type:** feature
**Base commit:** <commit-sha>

**Delivers:** Upstream's agent workflows (fan-out runs, schema-checked answers, project-wide runs) and their panel/persistence work.

**Blocked by:** 10, 22, 23
**Files:** Path list: `/home/shizuku/Project/ohpichamber-omp-artifacts/upstream-sync-2026-10-27/plan-paths/17.tsv` (25 paths: all clean/new). Main locations: `packages/web/server/lib/workflows/`, `packages/ui/src/lib/workflows/`. From task 23: consume `sync/workflow-activity.ts`'s turn state and feed the shared `SessionActivityIndicator` that task 25 delivers; do not land a second workflow-state source.

**Read first:** Spec W6; `.agents/skills/sync-state-invariants/SKILL.md`; `.agents/skills/ui-api-decoupling/SKILL.md`; `.agents/skills/locale-ui-patterns/SKILL.md`; `packages/ui/src/lib/workflows/DOCUMENTATION.md`.
**Covers:** W6

**Check:** `bun install --frozen-lockfile` and `bun run type-check` and `bun run lint` and `bun run test` all exit 0, the workflow tests pass, and in the running app a workflow starts, fans out to at least two agents, shows per-agent status and ends with its checked answer. Real path: use a small fixture workflow and a real provider.

## Done when

- [ ] Workflow runs are persisted and resumable; a failed branch does not erase the others.
- [ ] Schema answers are validated before display.
- [ ] Run status derives from live events and reconciles after reconnect.
- [ ] The panel lists project-wide runs without scanning every session on each render.
- [ ] Workflow activity reaches task 25's shared indicator through `sync/workflow-activity.ts`; the workflow store remains the only run-state source.
