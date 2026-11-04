# 01: Isolate workspace listing failure and preserve archived sessions

**Effort:** p1-debts
**Blocked by:** None
**Task type:** bugfix
**Covers:** W1
**Files:** packages/web/server/lib/openchamber-sessions/routes.js, packages/web/server/lib/host/agent-scope-runtime.js, packages/ui/src/stores/useGlobalSessionsStore.ts, packages/ui/src/components/session/sidebar/list/useSidebarGroupStatus.ts, packages/ui/src/components/views/ArchiveView.tsx
**Read first:** .workflow/technical-debt.md:63-73, skill://sync-state-invariants, skill://ui-api-decoupling
**Check:** bun test packages/web/server/lib/host/agent-scope-runtime.test.js packages/web/server/lib/openchamber-sessions/routes.test.js packages/ui/src/stores/useGlobalSessionsStore.test.ts packages/ui/src/components/session/sidebar/list/useSidebarGroupStatus.test.tsx packages/ui/src/components/views/ArchiveView.test.tsx

- [x] In `packages/web/server/lib/host/agent-scope-runtime.js` and `openchamber-sessions/routes.js`, ensure archived sessions of removed checkouts remain discoverable and resolvable without requiring the deleted checkout directory on disk.
- [x] In `packages/ui/src/stores/useGlobalSessionsStore.ts`, isolate workspace discovery errors into per-workspace error tracking so that healthy workspaces remain `ready` (`hasLoaded: true`) rather than poisoning the entire store status to `error`.
- [x] In `packages/ui/src/components/session/sidebar/list/useSidebarGroupStatus.ts`, ensure only groups belonging to failing workspaces degrade to `load-failed`, while healthy groups remain `ready`.
- [x] In `packages/ui/src/components/views/ArchiveView.tsx`, display archived sessions from healthy workspaces and removed checkouts; surface an explicit error state with a Retry action when discovery errors occur instead of rendering an authoritative empty list.

## Progress

Check after: `bun test packages/web/server/lib/host/agent-scope-runtime.test.js packages/web/server/lib/openchamber-sessions/routes.test.js packages/ui/src/stores/useGlobalSessionsStore.test.ts packages/ui/src/components/session/sidebar/list/useSidebarGroupStatus.test.tsx packages/ui/src/components/views/ArchiveView.test.tsx` passed with 0 failures across all suites (61 passed / 0 failed).
