# 04: Reject root agent overrides at Host admission

**Effort:** omp-native-chat
**Task type:** feature
**Base commit:** <commit-sha>

**Delivers:** The Host refuses a root prompt, steer, follow-up or queue append that carries a non-null `agentId` or an `agentMention`, with 400 `INVALID_REQUEST`, before any queue write or dispatch. On start-up it rewrites stored queue and scheduled items that still carry a root `agentId` to `null` and logs the count.

**Blocked by:** 03
**Files:** `packages/web/server/lib/openchamber-sessions/routes.js` (`prepareDelivery`/`deliver`, 120-179), `packages/web/server/lib/message-queue/sqlite-store.js` (legacy migration 355-369 is the pattern), `packages/web/server/lib/message-queue/canonical-runtime.js`, `packages/web/server/lib/scheduled-tasks/`, `packages/agent-service/src/worker/session.ts` (`selectOptions` profile branch 290, 302-309; `prepare` 334-335), `.workflow/omp-migration/contracts.md` "Single Delivery Owner".

**Read first:** spec "Root agent retirement" and W2; decisions.md: 2026-10-25 - Replace root agent selection with session modes; `contracts.md` "Single Delivery Owner" and "Host metadata and queue response ownership".
**Covers:** W2

**Check:** Before: a web test posting `/runs` with `options.agentId: 'build'` reaches dispatch. After: `bun run --cwd packages/web test` shows 400 `INVALID_REQUEST` for `agentId` and for `agentMention` on `/runs`, `/steer`, `/follow-up` and queue append, with no queue row written; a migration test seeds a SQLite queue and a scheduled task with root `agentId`, restarts the store, and finds `agentId: null` and one log line with the count. `bun run --cwd packages/agent-service test` passes with the worker's root profile branch removed.

- [ ] Admission rejects before persistence; the Problem Details `detail` names the field.
- [ ] Queue and scheduled-task migration is idempotent and logs `changed=<n>`.
- [ ] Worker no longer applies a root profile's tools or model; `restoreNonMCPToolPresentation` for profile switching is removed with it.
- [ ] `contracts.md` states `agentId` must be `null` for root prompts and that `agentMention` is retired.
- [ ] The worker test `profile tool allowlist does not block selected provider authorization` is rewritten or removed with a reason in `## Progress`.
