# 09: Implement session lifecycle and event projection

**Effort:** omp-through-m3
**Task type:** feature
**Base commit:** <commit-sha>

**Delivers:** The Agent Service creates/resumes/archives sessions, starts OMP turns, projects authoritative messages and status into Canonical DTOs, and supports bounded replay after reconnect.

**Blocked by:** 08
**Files:** `packages/agent-service/src/sessions/`, `packages/agent-service/src/projection/`, contract fixtures and service tests

**Read first:** `.workflow/specs/omp-through-m3.md` M2/W3/W8; contracts session/event/cursor sections; OMP AgentSession and event APIs; sync-state invariants skill; architecture persistence boundary
**Covers:** W3, W8

**Check:** `bun test packages/agent-service/src/sessions packages/agent-service/src/projection` plus one temporary service session scenario → create/resume/turn/terminal/reconnect produces ordered events, snapshot plus cursor, explicit gap/reset behavior and no fabricated completion on fetch failure. Record the command and remove temporary smoke code.

- [ ] Keep persisted session identity and live activity distinct.
- [ ] Map OMP lifecycle/message events into stable service events with terminal/error states.
- [ ] Persist or reconstruct the minimum cursor/replay state required by the contract.
- [ ] Make reconnect behavior explicit for stale/invalid cursors and worker restart.
- [ ] Preserve partial output and unrelated sessions when one turn fails.
