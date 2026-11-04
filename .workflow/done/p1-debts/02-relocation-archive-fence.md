# 02: Establish mutual fence between relocation and worktree archive

**Effort:** p1-debts
**Blocked by:** None
**Task type:** bugfix
**Covers:** W2
**Files:** packages/agent-service/src/supervisor/workers.ts, packages/agent-service/src/sessions/registry.ts, packages/agent-service/src/sessions/registry-native.test.ts, packages/agent-service/src/supervisor/service.ts
**Read first:** .workflow/technical-debt.md:131-140, /home/shizuku/Project/ohpichamber-omp-artifacts/upstream-refresh-35-2026-10-30/review-security.md finding3, skill://openchamber-change-discipline
**Check:** bun test packages/agent-service/src/supervisor/workers.test.ts packages/agent-service/src/sessions/registry-native.test.ts

- [x] Reproduce concurrent relocation and archive lease race with focused failing test proving relocation file move can race worktree archive removal.
- [x] In `WorkerRegistry`, add mutual fence/lease reservation mechanism between relocation paths and worktree lease acquisition.
- [x] In `SessionRegistry.prepareRelocation`, assert worktree lease allows destination (and source) BEFORE moving any session files on disk (`manager.moveTo`), and register active relocation fence.
- [x] In `WorkerRegistry.acquireWorktreeLease`, verify target directory does not overlap active relocation fences, rejecting concurrent acquire with 409 `COMMAND_IN_FLIGHT`.
- [x] Ensure failure cleanup and rollback in `prepareRelocation` release fence and restore session state without corrupting disk state.

## Progress

Check after: `bun test packages/agent-service/src/supervisor/service-worktree-lease.test.ts packages/agent-service/src/sessions/registry-native.test.ts` passed (32 passed, 0 failed, 231 assertions).
