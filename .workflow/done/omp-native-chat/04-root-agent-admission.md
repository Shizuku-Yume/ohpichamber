# 04: Reject root agent overrides at Host admission

**Effort:** omp-native-chat
**Task type:** feature
**Base commit:** f40c95d22b89f33950cfb40ff25666601234d3bc
**Started:** 2026-10-26T00:00:00Z

**Delivers:** The Host refuses a root prompt, steer, follow-up or queue append that carries a non-null `agentId` or an `agentMention`, with 400 `INVALID_REQUEST`, before any queue write or dispatch. On start-up it rewrites stored queue and scheduled items that still carry a root `agentId` to `null` and logs the count.

**Blocked by:** 03
**Files:** `packages/web/server/lib/openchamber-sessions/routes.js` (`prepareDelivery`/`deliver`, 120-179), `packages/web/server/lib/message-queue/sqlite-store.js` (legacy migration 355-369 is the pattern), `packages/web/server/lib/message-queue/canonical-runtime.js`, `packages/web/server/lib/scheduled-tasks/`, `packages/agent-service/src/worker/session.ts` (`selectOptions` profile branch 290, 302-309; `prepare` 334-335), `.workflow/omp-migration/contracts.md` "Single Delivery Owner".

**Read first:** spec "Root agent retirement" and W2; decisions.md: 2026-10-25 - Replace root agent selection with session modes; `contracts.md` "Single Delivery Owner" and "Host metadata and queue response ownership".
**Covers:** W2

**Check:** Before: a web test posting `/runs` with `options.agentId: 'build'` reaches dispatch. After: `bun run --cwd packages/web test` shows 400 `INVALID_REQUEST` for `agentId` and for `agentMention` on `/runs`, `/steer`, `/follow-up` and queue append, with no queue row written; a migration test seeds a SQLite queue and a scheduled task with root `agentId`, restarts the store, and finds `agentId: null` and one log line with the count. `bun run --cwd packages/agent-service test` passes with the worker's root profile branch removed.

- [x] Admission rejects before persistence; the Problem Details `detail` names the field.
- [x] Queue and scheduled-task migration is idempotent and logs `changed=<n>`.
- [x] Worker no longer applies a root profile's tools or model; `restoreNonMCPToolPresentation` for profile switching is removed with it.
- [x] `contracts.md` states `agentId` must be `null` for root prompts and that `agentMention` is retired.
- [x] The worker test `profile tool allowlist does not block selected provider authorization` was removed because root profile selection is retired; task-agent allowlists remain outside root admission.

## Progress

- Dirty at start: none.
- Surfaces: Web, Electron desktop, hosted mobile and Capacitor mobile all use the same Host admission and durable stores; no renderer or native bridge contract changes.
- State owners: Host SQLite owns queued prompts and revisions; Host scheduled-task store owns scheduled configurations; OMP owns root tools and model selection.
- Check before: baseline `bun run test` had unrelated existing UI/i18n failures (ModelControls capitalization, DefaultsSettings locale, locale key parity, reviewFlow, session UI store, config store).
- Check after: task check passes after rebase (focused route, queue and direct-admission tests: 21 tests); earlier task evidence also has agent-service worker tests passing (252 pass, 7 skipped), with web and agent-service type-checks passing. Post-rebase `bun run test` remains red with 6 files / 21 tests failing across UI, agent-service and web suites, largely in unrelated UI/i18n and scheduled-task timer tests; command output was observed.
- Real path: attempted Web server on lane a ports and data dir; Host listened at 127.0.0.1:3911 and logged queue migration changed=0, but app startup could not complete because workspace dist exports `PlanReviewSchema` and `PlanReviewResponseSchema` are missing; agent service exited before listening. No UI path exercised.
- Review boundary: Base f40c95d22b89f33950cfb40ff25666601234d3bc + Host routes, queue/scheduled persistence, worker session and contracts; round: 1; briefs: quality; boundaries: Host prompt admission and persisted task data; findings: no blocking or nonblocking findings after manual quality/process review; fixed duplicate capture on accepted command replay before closure. No reviewer agent was available in this worker invocation, so both briefs were done manually.
- Decided without maintainer: shared admission guard is in message-queue because direct and queue delivery must enforce the same root invariant before their separate persistence owners.
**Finished:** 2026-10-26T08:24:00Z
