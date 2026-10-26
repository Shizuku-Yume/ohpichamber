# 09: Full-gate debt at the integration tip

**Effort:** omp-native-parity
**Task type:** bugfix
**Base commit:** ad8413b82bb8d634e4c78449f9b4f9d015b1f8c3

**Delivers:** `bun run lint` and `bun run test` either pass at the integration tip or every remaining failure is a documented, reproduced baseline with a clear owner. Task 08 acceptance found the W11 real path working but the release gate failing; this task closes that gate before the effort is accepted.

**Blocked by:** 08
**Files:** `packages/agent-service/src/worker/session.ts`, `catalog-resources.ts`, `mode.ts`, `builtin-commands.ts`, `projection/journal.ts`, `sessions/registry.ts`; UI lint files `FileMentionAutocomplete.tsx`, `SessionGoalDialog.test.tsx`, `LegacyDataNotice.tsx`, `multirun/runActions.ts`, `sync/session-message-loader.test.ts`; failing tests under `packages/ui`, `packages/agent-service` and `packages/web`.
**Read first:** task 08 evidence `/home/shizuku/Project/ohpichamber-omp-artifacts/onp-acceptance-2026-10-26/evidence.md` and its `check-*.log`, `rerun-*.log`.

**Check:** Before: `bun run lint` exits 1 (18 agent-service anti-slop + 7 UI findings) and `bun run test` exits 1 (UI 5/813 files, agent-service 1 timeout, web 12/6177). After: both commands exit 0, or every remaining failure is reproduced from the base and recorded as inherited baseline in the task Progress.

- [ ] Reproduce each failing test and lint finding from Base, separating inherited debt from regressions.
- [ ] Fix or baseline-document every failure.
- [ ] Full `bun run test`, `bun run type-check` and `bun run lint` exit 0 at the tip.

## Progress

- Created by Task 08 on 2026-10-27 from the acceptance run; not started.
- Task 08 measured the gate at code tip `ad8413b82b` (Task 08 merge `0cd1d81e9a`). Integration later moved to `fe7f38fd8b` (Task 02 cold-read fixes) before this record was updated, so reproduce the gate at the current integration tip before classifying any failure.
- UI caveat: the five failing UI files (`gitApi.test.ts`, `reviewFlow.test.ts`, `useGlobalSessionsStore-races.test.ts`, `native-leaf-subscriptions.test.tsx`, `session-ui-store.test.js`) were **not individually rerun**. The combined rerun was invalid because it ran several files in one Bun process and hit the repository's known `mock.module` leakage; rerun each file through the project's isolated per-file runner before treating it as a regression or inherited baseline.
- Reproduced after the dev server was stopped: the agent-service `session-native.test.ts` 30 s timeout and all 12 Web failures. Logs: `/home/shizuku/Project/ohpichamber-omp-artifacts/onp-acceptance-2026-10-26/rerun-agent-service.log` and `rerun-web.log`.
