# 13: Chat message surface

**Effort:** upstream-refresh
**Task type:** feature
**Base commit:** <commit-sha>

**Delivers:** Upstream's chat message rendering (message list, turns, tool/activity rows, markdown bodies, attachments display) works on the fork's canonical session data.

**Blocked by:** 10, 12, 23
**Files:** Path list: `/home/shizuku/Project/ohpichamber-omp-artifacts/upstream-sync-2026-10-27/plan-paths/13.tsv` (198 paths: 118 clean/new, 56 both-side, 36 conflicts). Main locations: `packages/ui/src/components/chat/{message,lib,markdown,__tests__}`.

**Read first:** Spec W6; `.agents/skills/sync-state-invariants/SKILL.md`; `.agents/skills/performance-engineering/SKILL.md`; `.agents/skills/locale-ui-patterns/SKILL.md`; `packages/ui/src/sync/DOCUMENTATION.md`.
**Covers:** W6

**Check:** `bun install --frozen-lockfile` and `bun run type-check` and `bun run lint` and `bun run test` all exit 0, the chat rendering tests pass, and in the running app a session with assistant/user messages, tool calls and reasoning renders in order; the transcript survives reload and a long session scrolls without dropping messages. Real path: real provider chat per `standards.md`.

## Done when

- [ ] Message ordering, optimistic replacement and stale-generation handling stay with the fork's stores; the UI does not invent ordering.
- [ ] Tool calls, reasoning, errors and attachments render from canonical run data.
- [ ] Virtualization and streaming append keep their measured performance.
- [ ] No message field is duplicated from the legacy OpenCode shape.
