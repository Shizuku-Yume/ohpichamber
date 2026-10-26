# 09: Full-gate debt at the integration tip

**Effort:** omp-native-parity
**Task type:** bugfix
**Base commit:** ca20759c6fe260d4db9a2c63ff94964c86af7ac8
**Started:** 2026-10-27T02:50:00Z
**Finished:** 2026-10-27T03:25:20Z

**Delivers:** `bun run lint` and `bun run test` either pass at the integration tip or every remaining failure is a documented, reproduced baseline with a clear owner. Task 08 acceptance found the W11 real path working but the release gate failing; this task closes that gate before the effort is accepted.

**Blocked by:** 08
**Files:** `packages/agent-service/src/worker/session.ts`, `catalog-resources.ts`, `mode.ts`, `builtin-commands.ts`, `projection/journal.ts`, `sessions/registry.ts`; UI lint files `FileMentionAutocomplete.tsx`, `SessionGoalDialog.test.tsx`, `LegacyDataNotice.tsx`, `multirun/runActions.ts`, `sync/session-message-loader.test.ts`; failing tests under `packages/ui`, `packages/agent-service` and `packages/web`.
**Read first:** task 08 evidence `/home/shizuku/Project/ohpichamber-omp-artifacts/onp-acceptance-2026-10-26/evidence.md` and its `check-*.log`, `rerun-*.log`.

**Check:** Before: `bun run lint` exits 1 (18 agent-service anti-slop + 7 UI findings) and `bun run test` exits 1 (UI 5/813 files, agent-service 1 timeout, web 12/6177). After: both commands exit 0, or every remaining failure is reproduced from the base and recorded as inherited baseline in the task Progress.

- [x] Reproduce each failing test and lint finding from Base, separating inherited debt from regressions.
- [x] Fix or baseline-document every failure.
- [x] Full `bun run test`, `bun run type-check` and `bun run lint` exit 0 at the tip.

## Progress

- Created by Task 08 on 2026-10-27 from the acceptance run; not started.
- Task 08 measured the gate at code tip `ad8413b82b` (Task 08 merge `0cd1d81e9a`). Integration later moved to `fe7f38fd8b` (Task 02 cold-read fixes) before this record was updated, so reproduce the gate at the current integration tip before classifying any failure.
- UI caveat: the five failing UI files (`gitApi.test.ts`, `reviewFlow.test.ts`, `useGlobalSessionsStore-races.test.ts`, `native-leaf-subscriptions.test.tsx`, `session-ui-store.test.js`) were **not individually rerun**. The combined rerun was invalid because it ran several files in one Bun process and hit the repository's known `mock.module` leakage; rerun each file through the project's isolated per-file runner before treating it as a regression or inherited baseline.
- Reproduced after the dev server was stopped: the agent-service `session-native.test.ts` 30 s timeout and all 12 Web failures. Logs: `/home/shizuku/Project/ohpichamber-omp-artifacts/onp-acceptance-2026-10-26/rerun-agent-service.log` and `rerun-web.log`.
- Resumed at integration tip `ca20759c6f` (Base) on 2026-10-27T02:50Z. `Dirty at start: none`. Evidence: `/home/shizuku/Project/ohpichamber-omp-artifacts/onp-f-2026-10-27/`.
- Check before at the tip (`check-lint.log`, `check-test.log`): `bun run lint` exit 1 — agent-service 22 anti-slop errors (the two Task01 `journal.ts:88` and UI-test `:223` regressions plus two Task02 `registry.ts` `typeof` regressions, the rest inherited) and UI 7 errors/1 warning. `bun run test` exit 1 — 4/7 suites; UI 5/813 files, agent-service 1/323 tests (`approve-compact` 30 s timeout), web 21/6179 tests (six failing files, including nine `direct-command-admission-store` cases not in task 08's rerun). `bun run type-check` exit 0.
- Classification against base `b309346934` in throwaway worktree `onp-f-base` (`base-lint-agent-service.log`, `base-web-failing.log`, focused file runs): **inherited** — `reviewFlow.test.ts` (4 stale send-option expectations), `session-ui-store.test.js` (2 slash-binding expectations), backup-restore queue options, and all 19 agent-service anti-slop findings present at base. **Regressions from this effort** — `gitApi.test.ts` (catalog now requires `defaults`/`planRoleAvailable`), `useGlobalSessionsStore-races.test.ts` (Host title removal makes child metadata `null`/revision `0`), `native-leaf-subscriptions.test.tsx` (title no longer derived from metadata), agent-service `approve-compact` (no-op compaction failed the approved plan), routing/small-model/canonical-host/scheduled-defaults mocks (OMP catalog defaults and retired app defaults), session-state legacy-title fixtures, direct-command reopen fixture, and the two Task01 + two Task02 lint findings.
- Fixes: `planReference` extracted as a named schema; `mode.ts` parses `modeData` with its schema and replaces the reflection Proxy with a typed `RpcGoalSession` adapter; builtin command guards replace assertions; conditional empty-object spreads replaced by explicit objects; ENOENT narrowed with `instanceof Error`; `question.resolve`/approval casts removed; typed `SlashCommandRuntime` instead of a chained assertion. UI: unused imports/exports removed; legacy notice helpers made internal; stale expectations updated to OMP-owned titles/defaults/metadata; catalog fixtures carry `defaults`/`planRoleAvailable`; command-expansion `agentId` is applied again; plan approval with compact is best-effort (a too-small/already-compacted session still executes the approved plan) with a new regression test.
- Check after (raw logs in the evidence directory): `bun run type-check` exit 0 (`check-type-check-after.log`); `bun run lint` exit 0 with only the pre-existing `ChatInput.tsx` exhaustive-deps warning (`check-lint-after2.log`); `bun run test` exit 0, **7/7 suites passed** (`check-test-after.log`): scripts 22/22 files, sdk 23/23, UI 813/813 files, agent-contract 190 pass/0 fail, agent-service 324 pass/0 fail, electron 44/44 files, web 6051 passed/128 skipped (369 files passed, 9 skipped). Focused before the full run: UI seven files all pass, web seven files 96/96, agent-service `session-native.test.ts` 44/44.
- Review boundary: Base `ca20759c6f` + changed source/tests listed in the task; round 1; briefs: self-review + security pass; boundaries: prompt option binding (command expansion -> Host prompt) and plan approval trigger; no new listener, credential path or provider egress. Findings: none blocking. Decisions: `decisions.md: 2026-10-27 - Approve-and-compact proceeds when compaction is a no-op`, `2026-10-27 - Slash-command agent bindings still reach the send`; both `Mine: yes`.
- No technical-debt entry was needed: every failure was fixed rather than baselined.
